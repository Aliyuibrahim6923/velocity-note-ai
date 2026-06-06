import unittest
import os
import sys
import tempfile
import sqlite3
from datetime import datetime, timedelta

# Ensure parent directory is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import services.db as db
from services.brain.service import BrainService
from services.wallet.service import WalletService
from services.hands.service import HandsService

class TestAIOSServices(unittest.TestCase):
    def setUp(self):
        # Redirect database to a temporary file
        self.db_fd, self.db_temp_path = tempfile.mkstemp()
        db.DB_PATH = self.db_temp_path
        db.init_db()
        
        self.brain = BrainService()
        self.wallet = WalletService()
        self.hands = HandsService()

    def tearDown(self):
        os.close(self.db_fd)
        os.remove(self.db_temp_path)

    def test_db_initialization(self):
        conn = db.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        self.assertIn("ambient_memories", tables)
        self.assertIn("assets", tables)
        self.assertIn("cash_flow", tables)
        self.assertIn("tasks_planner", tables)

    def test_brain_text_ingestion(self):
        # Spent cash command
        result = self.brain.add_text_memory("Spent $10 cash on parking")
        
        self.assertIsNotNone(result["id"])
        self.assertEqual(result["source"], "text")
        
        # Verify transaction database row
        txs = self.wallet.get_transactions()
        self.assertEqual(len(txs), 1)
        self.assertEqual(txs[0]["amount"], 10.0)
        self.assertEqual(txs[0]["type"], "expense")
        self.assertEqual(txs[0]["is_verified"], 0) # Pending/unverified

    def test_brain_document_upload_and_tasks(self):
        # Fridge manual upload
        result = self.brain.upload_document(
            filename="Fridge_Manual.pdf",
            file_type="application/pdf",
            file_content="clean fridge condenser coils every 180 days"
        )
        
        self.assertIsNotNone(result["memory_id"])
        self.assertEqual(result["asset"]["type"], "appliance")
        self.assertEqual(result["asset"]["name"], "Refrigerator")
        
        # Verify tasks generated
        tasks = self.hands.get_tasks()
        self.assertTrue(len(tasks) >= 1)
        task_titles = [t["title"] for t in tasks]
        self.assertIn("Clean fridge condenser coils", task_titles)
        
        # Verify asset link association
        target_task = next(t for t in tasks if t["title"] == "Clean fridge condenser coils")
        self.assertEqual(target_task["associated_asset_id"], result["asset"]["id"])

    def test_wallet_deduplication_match(self):
        # 1. Insert unverified manual cash flow
        self.brain.add_text_memory("Spent $10 cash on parking")
        
        # 2. Fire bank webhook card charge cleared for exact amount
        webhook_result = self.wallet.process_bank_webhook(10.0, "Card charge: city parking garage")
        
        self.assertEqual(webhook_result["action"], "merged")
        self.assertEqual(webhook_result["transaction"]["is_verified"], 1)
        self.assertIn("Verified via bank webhook", webhook_result["transaction"]["description"])
        
        # Verify single transaction exists in ledger (deduplicated)
        txs = self.wallet.get_transactions()
        self.assertEqual(len(txs), 1)

    def test_wallet_deduplication_no_match(self):
        # Fire bank webhook without any pre-existing manual cash entry
        webhook_result = self.wallet.process_bank_webhook(45.50, "Grocery supermarket charge")
        
        self.assertEqual(webhook_result["action"], "created")
        self.assertEqual(webhook_result["transaction"]["is_verified"], 1)
        self.assertEqual(webhook_result["transaction"]["amount"], 45.50)

    def test_bank_email_alert_ingestion(self):
        # Email bank transaction alert
        result = self.brain.receive_email_webhook(
            sender="alerts@chase.com",
            subject="Transaction Notification",
            body="Your card was charged $15.50 at Starbucks"
        )
        
        self.assertIsNotNone(result["id"])
        
        # Verify transaction database row
        txs = self.wallet.get_transactions()
        starbucks_tx = next((tx for tx in txs if "Starbucks" in tx["description"]), None)
        self.assertIsNotNone(starbucks_tx)
        self.assertEqual(starbucks_tx["amount"], 15.50)
        self.assertEqual(starbucks_tx["is_verified"], 1) # Auto-verified bank email alert
        self.assertEqual(starbucks_tx["source"], "email_alert")

    def test_hands_calendar_overrun_shifting(self):
        # 1. Schedule a fixed meeting
        t1_start = datetime(2026, 6, 4, 9, 0).isoformat()
        t1 = self.hands.add_task("Fixed Meeting", duration_minutes=30, start_time=t1_start, is_fixed=True)
        
        # 2. Schedule fluid tasks following the fixed meeting
        t2_start = datetime(2026, 6, 4, 9, 30).isoformat()
        t2 = self.hands.add_task("Fluid Task A", duration_minutes=30, start_time=t2_start, is_fixed=False)
        
        t3_start = datetime(2026, 6, 4, 10, 0).isoformat()
        t3 = self.hands.add_task("Fluid Task B", duration_minutes=30, start_time=t3_start, is_fixed=False)
        
        # 3. Task A overruns by 30 minutes (actual duration = 60)
        shifted = self.hands.resolve_calendar_overrun(t2["id"], actual_duration_minutes=60)
        
        # Verify Task B shifts by 30 minutes (start moves from 10:00 to 10:30)
        tasks = self.hands.get_tasks()
        task_map = {t["id"]: t for t in tasks}
        
        # T1 (Fixed) should remain unaffected
        self.assertEqual(task_map[t1["id"]]["start_time"], t1_start)
        
        # T2 (Overrun Task) duration updated
        self.assertEqual(task_map[t2["id"]]["duration_minutes"], 60)
        
        # T3 (Fluid Task B) should shift forward from 10:00 to 10:30
        expected_t3_start = datetime(2026, 6, 4, 10, 30).isoformat()
        self.assertEqual(task_map[t3["id"]]["start_time"], expected_t3_start)

if __name__ == "__main__":
    unittest.main()
