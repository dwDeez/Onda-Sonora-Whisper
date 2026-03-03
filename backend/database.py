import sqlite3
import os
from dotenv import load_dotenv
from typing import List, Dict, Any
from pathlib import Path

# Load environment variables
load_dotenv()

DB_PATH = os.getenv("DATABASE_URL", str(Path(__file__).parent / "onda_sonora.db"))

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create Users table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        avatar TEXT NOT NULL,
        weekly_goal INTEGER DEFAULT 80,
        role TEXT DEFAULT 'USER',
        total_review_seconds INTEGER DEFAULT 0
    )
    ''')

    # Migration for existing DBs
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'USER'")
    except sqlite3.OperationalError:
        pass # Column already exists

    try:
        cursor.execute("ALTER TABLE users ADD COLUMN total_review_seconds INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass # Column already exists

    # Seed default users if empty
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO users (name, avatar, weekly_goal, role) VALUES (?, ?, ?, ?)", 
                       ("ADMIN_01", "https://picsum.photos/seed/admin/100/100", 100, "ADMIN"))
        cursor.execute("INSERT INTO users (name, avatar, weekly_goal, role) VALUES (?, ?, ?, ?)", 
                       ("USER_01", "https://picsum.photos/seed/cyberpunk/100/100", 82, "USER"))
        default_user_id = cursor.lastrowid
    else:
        cursor.execute("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1")
        admin = cursor.fetchone()
        if not admin:
            # Upgrade first user to admin if no admin exists
            cursor.execute("UPDATE users SET role = 'ADMIN' WHERE id = (SELECT MIN(id) FROM users)")
        
        cursor.execute("SELECT id FROM users LIMIT 1")
        default_user_id = cursor.fetchone()[0]


    # Create Sessions table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT NOT NULL,
        context TEXT NOT NULL,
        date TEXT NOT NULL,
        score INTEGER NOT NULL,
        practice_type TEXT DEFAULT 'VOICE',
        duration INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    # Migrar sesiones antiguas si no tienen user_id 
    try:
        cursor.execute("ALTER TABLE sessions ADD COLUMN user_id INTEGER REFERENCES users(id)")
    except sqlite3.OperationalError:
        pass # Column already exists
    
    try:
        cursor.execute("ALTER TABLE sessions ADD COLUMN practice_type TEXT DEFAULT 'VOICE'")
    except sqlite3.OperationalError:
        pass # Column already exists

    try:
        cursor.execute("ALTER TABLE sessions ADD COLUMN duration INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass # Column already exists

    cursor.execute("UPDATE sessions SET user_id = ? WHERE user_id IS NULL", (default_user_id,))
    cursor.execute("UPDATE sessions SET practice_type = 'VOICE' WHERE practice_type IS NULL")
    cursor.execute("UPDATE sessions SET duration = 0 WHERE duration IS NULL")

    # Create Session Issues table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS session_issues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions (id)
    )
    ''')

    # Create Vocab Bank table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS vocab_bank (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        word TEXT NOT NULL,
        form TEXT NOT NULL,
        meaning TEXT NOT NULL,
        example TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')

    try:
        cursor.execute("ALTER TABLE vocab_bank ADD COLUMN user_id INTEGER REFERENCES users(id)")
    except sqlite3.OperationalError:
        pass # Column already exists
    
    cursor.execute("UPDATE vocab_bank SET user_id = ? WHERE user_id IS NULL", (default_user_id,))

    # Insert mock vocab data if empty
    cursor.execute("SELECT COUNT(*) FROM vocab_bank")
    if cursor.fetchone()[0] == 0:
        cursor.executemany('''
        INSERT INTO vocab_bank (word, form, meaning, example) VALUES (?, ?, ?, ?)
        ''', [
            ("Ephemeral", "ADJ", "Lasting for a very short time.", "Fashions are ephemeral, changing with every season."),
            ("Ubiquitous", "ADJ", "Present, appearing, or found everywhere.", "Smartphones have become ubiquitous in daily life.")
        ])

    conn.commit()
    conn.close()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn
