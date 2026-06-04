import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "os_data.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Ambient memories table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ambient_memories (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        source TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)
    
    # 2. Assets table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        value REAL NOT NULL,
        purchase_date TEXT,
        maintenance_cycle_days INTEGER,
        created_at TEXT NOT NULL
    )
    """)
    
    # 3. Cash flow/transactions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cash_flow (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        category TEXT,
        description TEXT NOT NULL,
        transaction_date TEXT NOT NULL,
        is_predictive INTEGER NOT NULL DEFAULT 0,
        is_verified INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
    )
    """)
    
    # 4. Tasks planner / Calendar table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tasks_planner (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        start_time TEXT,
        end_time TEXT,
        priority INTEGER NOT NULL,
        is_fixed INTEGER NOT NULL DEFAULT 0,
        associated_asset_id TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(associated_asset_id) REFERENCES assets(id)
    )
    """)
    
    conn.commit()
    conn.close()

def clear_db():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    init_db()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at:", DB_PATH)
