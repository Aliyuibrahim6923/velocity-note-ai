from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from gmail_agent import fetch_and_parse_emails

app = FastAPI(title="Velocity Note AI - Mail Service")

class SyncRequest(BaseModel):
    google_token: str

@app.post("/api/mail/sync")
def sync_emails(req: SyncRequest):
    try:
        results = fetch_and_parse_emails(req.google_token)
        return {"status": "success", "items": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
