from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
from database import init_db, get_db

app = FastAPI(title="Onda Sonora Local API")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
def on_startup():
    init_db()

# Models
class UserResponse(BaseModel):
    id: int
    name: str
    avatar: str
    weekly_goal: int
    role: str
    total_review_seconds: int

class UserCreate(BaseModel):
    name: str
    avatar: str
    weekly_goal: int = 80
    role: str = "USER"

class IssueCreate(BaseModel):
    type: str
    description: str

class SessionCreate(BaseModel):
    user_id: int
    title: str
    context: str
    score: int
    practice_type: str = "VOICE"
    duration: int = 0
    issues: List[IssueCreate] = []

class SessionUpdate(BaseModel):
    score: int
    issues: List[IssueCreate] = []

class IssueResponse(BaseModel):
    id: int
    type: str
    description: str

class SessionResponse(BaseModel):
    id: int
    user_id: int
    title: str
    context: str
    date: str
    score: int
    practice_type: str
    duration: int
    issues: List[IssueResponse] = []

class VocabCreate(BaseModel):
    user_id: int
    word: str
    form: str
    meaning: str
    example: str

class VocabResponse(BaseModel):
    id: int
    word: str
    form: str
    meaning: str
    example: str

# Endpoints
@app.get("/api/users", response_model=List[UserResponse])
def get_users():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users")
    users = cursor.fetchall()
    conn.close()
    return [dict(u) for u in users]

@app.post("/api/users", response_model=UserResponse, status_code=201)
def create_user(user: UserCreate):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO users (name, avatar, weekly_goal, role) VALUES (?, ?, ?, ?)",
        (user.name, user.avatar, user.weekly_goal, user.role)
    )
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {**user.dict(), "id": user_id}

@app.put("/api/users/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user_data: UserCreate):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE users SET name = ?, avatar = ?, weekly_goal = ?, role = ? WHERE id = ?",
        (user_data.name, user_data.avatar, user_data.weekly_goal, user_data.role, user_id)
    )
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    conn.commit()
    conn.close()
    return {**user_data.dict(), "id": user_id}

@app.put("/api/users/{user_id}/review_time")
async def increment_review_time(user_id: int, seconds: int):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("UPDATE users SET total_review_seconds = total_review_seconds + ? WHERE id = ?", (seconds, user_id))
    db.commit()
    db.close()
    return {"status": "success"}

@app.delete("/api/users/{user_id}")
def delete_user(user_id: int):
    conn = get_db()
    cursor = conn.cursor()
    # Also cleanup sessions
    cursor.execute("DELETE FROM session_issues WHERE session_id IN (SELECT id FROM sessions WHERE user_id = ?)", (user_id,))
    cursor.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM vocab_bank WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    conn.commit()
    conn.close()
    return {"message": "User deleted"}

@app.get("/api/sessions", response_model=List[SessionResponse])
def get_sessions(user_id: Optional[int] = None):
    conn = get_db()
    cursor = conn.cursor()
    if user_id:
        cursor.execute("SELECT * FROM sessions WHERE user_id = ? ORDER BY id DESC", (user_id,))
    else:
        cursor.execute("SELECT * FROM sessions ORDER BY id DESC")
    db_sessions = cursor.fetchall()
    
    sessions = []
    for db_session in db_sessions:
        session_id = db_session["id"]
        cursor.execute("SELECT * FROM session_issues WHERE session_id = ?", (session_id,))
        issues = cursor.fetchall()
        
        sessions.append({
            "id": db_session["id"],
            "user_id": db_session["user_id"],
            "title": db_session["title"],
            "context": db_session["context"],
            "date": db_session["date"],
            "score": db_session["score"],
            "practice_type": db_session["practice_type"],
            "duration": db_session["duration"],
            "issues": [dict(issue) for issue in issues]
        })
    
    conn.close()
    return sessions

@app.post("/api/sessions", response_model=SessionResponse, status_code=201)
def create_session(session: SessionCreate):
    conn = get_db()
    cursor = conn.cursor()
    import datetime
    current_date = datetime.datetime.now().strftime("%b %d // %H:%M %p").upper()
    
    cursor.execute(
        "INSERT INTO sessions (user_id, title, context, date, score, practice_type, duration) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (session.user_id, session.title, session.context, current_date, session.score, session.practice_type, session.duration)
    )
    session_id = cursor.lastrowid
    
    issues_response = []
    for issue in session.issues:
        cursor.execute(
            "INSERT INTO session_issues (session_id, type, description) VALUES (?, ?, ?)",
            (session_id, issue.type, issue.description)
        )
        issues_response.append({
            "id": cursor.lastrowid,
            "type": issue.type,
            "description": issue.description
        })
        
    conn.commit()
    conn.close()
    
    return {
        "id": session_id,
        "user_id": session.user_id,
        "title": session.title,
        "context": session.context,
        "date": current_date,
        "score": session.score,
        "practice_type": session.practice_type,
        "duration": session.duration,
        "issues": issues_response
    }

@app.get("/api/vocab", response_model=List[VocabResponse])
def get_vocab(user_id: Optional[int] = None, search: Optional[str] = None):
    conn = get_db()
    cursor = conn.cursor()
    if user_id and search:
        cursor.execute(
            "SELECT * FROM vocab_bank WHERE user_id = ? AND (LOWER(word) LIKE ? OR LOWER(meaning) LIKE ?)",
            (user_id, f"%{search.lower()}%", f"%{search.lower()}%")
        )
    elif user_id:
        cursor.execute("SELECT * FROM vocab_bank WHERE user_id = ? ORDER BY id DESC", (user_id,))
    else:
        cursor.execute("SELECT * FROM vocab_bank ORDER BY id DESC")
    words = cursor.fetchall()
    conn.close()
    return [dict(w) for w in words]

@app.post("/api/vocab", response_model=VocabResponse, status_code=201)
def create_vocab(vocab: VocabCreate):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO vocab_bank (user_id, word, form, meaning, example) VALUES (?, ?, ?, ?, ?)",
        (vocab.user_id, vocab.word, vocab.form, vocab.meaning, vocab.example)
    )
    word_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {**vocab.dict(), "id": word_id}

@app.delete("/api/vocab/{word_id}")
def delete_vocab(word_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM vocab_bank WHERE id = ?", (word_id,))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Word not found")
    conn.commit()
    conn.close()
    return {"message": "Word deleted"}
@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM session_issues WHERE session_id = ?", (session_id,))
    cursor.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    conn.commit()
    conn.close()
    return {"message": "Session deleted"}
