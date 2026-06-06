import json
import uuid
from datetime import datetime, timedelta
import os
import sys

# Ensure parent directory is in path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    import services.db as db
except ImportError:
    import db
from llm.service import LLMService

class BrainService:
    def __init__(self):
        self.llm = LLMService()

    def add_text_memory(self, content: str, source: str = "text", timestamp: str = None) -> dict:
        """
        Parses raw text, extracts metadata/entities, and stores memory.
        """
        if not timestamp:
            timestamp = datetime.utcnow().isoformat()
            
        memory_id = str(uuid.uuid4())
        
        # Save raw ambient memory
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO ambient_memories (id, content, source, created_at) VALUES (?, ?, ?, ?)",
            (memory_id, content, source, timestamp)
        )
        conn.commit()
        conn.close()
        
        # Extract structured items using LLM/Deterministic Parser
        extracted_json = self.llm.query(content)
        try:
            extracted = json.loads(extracted_json)
        except Exception:
            extracted = {"type": "text_note", "data": {"content": content}}
            
        # If it is a transaction, Route to wallet service or add directly
        if extracted.get("type") == "transaction":
            self._save_extracted_transaction(extracted["data"], timestamp)
        # If it is a reminder, Route to hands service or add directly
        elif extracted.get("type") == "reminder":
            self._save_extracted_reminder(extracted["data"], timestamp)
            
        return {
            "id": memory_id,
            "content": content,
            "source": source,
            "created_at": timestamp,
            "extracted": extracted
        }

    def receive_email_webhook(self, sender: str, subject: str, body: str, received_at: str = None) -> dict:
        """
        Ingests emails as an inbound stream webhook.
        """
        if not received_at:
            received_at = datetime.utcnow().isoformat()
            
        combined_text = f"Email from {sender} - Subject: {subject}. Body: {body}"
        return self.add_text_memory(combined_text, source="email", timestamp=received_at)

    def upload_document(self, filename: str, file_type: str, file_content: str, uploaded_at: str = None) -> dict:
        """
        Processes physical document uploads, runs simulated OCR, and registers assets/tasks.
        """
        if not uploaded_at:
            uploaded_at = datetime.utcnow().isoformat()
            
        # Simulated OCR text extraction: we just use file_content as the raw text
        raw_text = file_content
        
        # Add entry to ambient memories
        memory_id = str(uuid.uuid4())
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO ambient_memories (id, content, source, created_at) VALUES (?, ?, ?, ?)",
            (memory_id, f"Uploaded document: {filename}. Content: {raw_text}", "document", uploaded_at)
        )
        conn.commit()
        conn.close()
        
        # Parse document metadata via LLM
        extracted_json = self.llm.query(raw_text)
        try:
            extracted = json.loads(extracted_json)
        except Exception:
            extracted = {"type": "text_note", "data": {}}
            
        asset_info = None
        created_tasks = []
        
        if extracted.get("type") == "document_extraction":
            data = extracted["data"]
            asset_id = str(uuid.uuid4())
            asset_name = data.get("asset_name", filename)
            asset_type = data.get("asset_type", "other")
            value = data.get("value", 0.0)
            
            # Insert Asset record
            conn = db.get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO assets (id, name, type, value, purchase_date, maintenance_cycle_days, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (asset_id, asset_name, asset_type, value, uploaded_at[:10], 90, uploaded_at)
            )
            conn.commit()
            conn.close()
            
            asset_info = {
                "id": asset_id,
                "name": asset_name,
                "type": asset_type,
                "value": value
            }
            
            # Insert Associated Maintenance Tasks
            for task in data.get("tasks", []):
                task_id = str(uuid.uuid4())
                title = task.get("title", "Maintenance Task")
                cycle_days = task.get("cycle_days", 90)
                priority = task.get("priority", 2)
                
                # Calculate next occurrence date
                start_date = (datetime.utcnow() + timedelta(days=cycle_days)).isoformat()
                
                conn = db.get_connection()
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO tasks_planner (id, title, duration_minutes, start_time, end_time, priority, is_fixed, associated_asset_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (task_id, title, 60, start_date, None, priority, 0, asset_id, uploaded_at)
                )
                conn.commit()
                conn.close()
                
                created_tasks.append({
                    "id": task_id,
                    "title": title,
                    "start_time": start_date,
                    "priority": priority
                })
                
        return {
            "memory_id": memory_id,
            "filename": filename,
            "file_type": file_type,
            "asset": asset_info,
            "created_tasks": created_tasks
        }

    def _save_extracted_transaction(self, data: dict, timestamp: str):
        conn = db.get_connection()
        cursor = conn.cursor()
        tx_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO cash_flow (id, source, amount, type, category, description, transaction_date, is_predictive, is_verified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                tx_id,
                data.get("source", "cash"),
                data.get("amount", 0.0),
                data.get("type", "expense"),
                data.get("category", "other"),
                data.get("description", "Cash transaction"),
                timestamp,
                0, # is_predictive = false
                1 if data.get("is_verified", False) else 0, # is_verified
                timestamp
            )
        )
        conn.commit()
        conn.close()

    def _save_extracted_reminder(self, data: dict, timestamp: str):
        conn = db.get_connection()
        cursor = conn.cursor()
        task_id = str(uuid.uuid4())
        days_offset = data.get("days_offset", 1)
        start_date = (datetime.utcnow() + timedelta(days=days_offset)).replace(hour=9, minute=0, second=0, microsecond=0).isoformat()
        cursor.execute(
            "INSERT INTO tasks_planner (id, title, duration_minutes, start_time, end_time, priority, is_fixed, associated_asset_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                task_id,
                data.get("title", "Reminder Task"),
                30, # default 30 min duration
                start_date,
                None,
                data.get("priority", 2),
                data.get("is_fixed", 0),
                None,
                timestamp
            )
        )
        conn.commit()
        conn.close()
