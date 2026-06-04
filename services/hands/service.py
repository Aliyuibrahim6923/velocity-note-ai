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

class HandsService:
    def get_tasks(self) -> list:
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM tasks_planner ORDER BY start_time ASC")
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def add_task(self, title: str, duration_minutes: int, start_time: str, priority: int = 2, is_fixed: bool = False, associated_asset_id: str = None) -> dict:
        conn = db.get_connection()
        cursor = conn.cursor()
        task_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat()
        cursor.execute(
            """
            INSERT INTO tasks_planner (id, title, duration_minutes, start_time, end_time, priority, is_fixed, associated_asset_id, created_at)
            VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?)
            """,
            (task_id, title, duration_minutes, start_time, priority, 1 if is_fixed else 0, associated_asset_id, created_at)
        )
        conn.commit()
        
        cursor.execute("SELECT * FROM tasks_planner WHERE id = ?", (task_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row)

    def resolve_calendar_overrun(self, task_id: str, actual_duration_minutes: int) -> list:
        """
        Adjusts the duration of the current task. Loops through remaining scheduled
        non-fixed tasks and shifts their start times forward by the overrun difference.
        """
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # 1. Fetch current task
        cursor.execute("SELECT * FROM tasks_planner WHERE id = ?", (task_id,))
        task = cursor.fetchone()
        if not task:
            conn.close()
            return []
            
        original_duration = task["duration_minutes"]
        delta = actual_duration_minutes - original_duration
        
        # If no overrun, we don't need to shift anything
        if delta <= 0:
            cursor.execute("UPDATE tasks_planner SET duration_minutes = ? WHERE id = ?", (actual_duration_minutes, task_id))
            conn.commit()
            conn.close()
            return []
            
        # Update current task duration
        cursor.execute("UPDATE tasks_planner SET duration_minutes = ? WHERE id = ?", (actual_duration_minutes, task_id))
        
        # 2. Find all subsequent non-fixed tasks
        task_start = task["start_time"]
        cursor.execute(
            """
            SELECT * FROM tasks_planner 
            WHERE start_time > ? AND is_fixed = 0 AND id != ?
            ORDER BY start_time ASC
            """,
            (task_start, task_id)
        )
        subsequent_tasks = cursor.fetchall()
        
        updated_tasks = []
        for sub_task in subsequent_tasks:
            orig_start_str = sub_task["start_time"]
            if not orig_start_str:
                continue
                
            orig_start = datetime.fromisoformat(orig_start_str)
            new_start = orig_start + timedelta(minutes=delta)
            new_start_str = new_start.isoformat()
            
            cursor.execute(
                "UPDATE tasks_planner SET start_time = ? WHERE id = ?",
                (new_start_str, sub_task["id"])
            )
            
            # Record updated item
            updated_item = dict(sub_task)
            updated_item["start_time"] = new_start_str
            updated_tasks.append(updated_item)
            
        conn.commit()
        conn.close()
        return updated_tasks
