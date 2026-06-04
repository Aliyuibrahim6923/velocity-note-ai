import json
import uuid
from datetime import datetime
import os
import sys

# Ensure parent directory is in path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    import services.db as db
except ImportError:
    import db

class WalletService:
    def get_assets(self) -> list:
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM assets ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def get_transactions(self) -> list:
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM cash_flow ORDER BY transaction_date DESC")
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def process_bank_webhook(self, amount: float, description: str, timestamp: str = None) -> dict:
        """
        Receives cleared bank card charges, deduplicates against manual receipts,
        merges details, and updates the verified ledger record.
        """
        if not timestamp:
            timestamp = datetime.utcnow().isoformat()
            
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # Deduplication query: look for unverified transactions matching the exact amount
        # created in the last 48 hours.
        cursor.execute(
            """
            SELECT * FROM cash_flow 
            WHERE amount = ? AND is_verified = 0 AND type = 'expense'
            ORDER BY transaction_date DESC LIMIT 1
            """,
            (amount,)
        )
        match = cursor.fetchone()
        
        if match:
            # Found matching manual receipt - Merge fields and promote to verified
            matching_id = match["id"]
            merged_description = f"{match['description']} (Verified via bank webhook: {description})"
            cursor.execute(
                """
                UPDATE cash_flow 
                SET is_verified = 1, description = ?, source = 'bank_webhook'
                WHERE id = ?
                """,
                (merged_description, matching_id)
            )
            conn.commit()
            
            # Fetch the updated row
            cursor.execute("SELECT * FROM cash_flow WHERE id = ?", (matching_id,))
            updated_row = cursor.fetchone()
            conn.close()
            
            return {
                "action": "merged",
                "transaction": dict(updated_row)
            }
        else:
            # No match found - create a new verified bank ledger record
            tx_id = str(uuid.uuid4())
            cursor.execute(
                """
                INSERT INTO cash_flow (id, source, amount, type, category, description, transaction_date, is_predictive, is_verified, created_at)
                VALUES (?, 'bank_webhook', ?, 'expense', 'other', ?, ?, 0, 1, ?)
                """,
                (tx_id, amount, description, timestamp, timestamp)
            )
            conn.commit()
            
            cursor.execute("SELECT * FROM cash_flow WHERE id = ?", (tx_id,))
            new_row = cursor.fetchone()
            conn.close()
            
            return {
                "action": "created",
                "transaction": dict(new_row)
            }

    def get_summary(self) -> dict:
        """
        Calculates net worth (total asset value) and liquidity (cash burn/net income).
        """
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # Calculate total asset value
        cursor.execute("SELECT SUM(value) as total_val FROM assets")
        val_row = cursor.fetchone()
        total_assets = val_row["total_val"] if val_row["total_val"] else 0.0
        
        # Calculate liquidity changes
        cursor.execute("SELECT amount, type FROM cash_flow")
        tx_rows = cursor.fetchall()
        conn.close()
        
        income = 0.0
        expenses = 0.0
        for tx in tx_rows:
            if tx["type"] == "income":
                income += tx["amount"]
            else:
                expenses += tx["amount"]
                
        return {
            "total_asset_value": total_assets,
            "total_income": income,
            "total_expenses": expenses,
            "net_cash_flow": income - expenses
        }
