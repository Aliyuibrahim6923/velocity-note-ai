from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from calendar_agent import schedule_event

app = FastAPI(title="Velocity Note AI - Hands Service")

class ScheduleRequest(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: str
    end_time: str
    google_token: Optional[str] = None

@app.post("/api/hands/schedule")
async def handle_schedule(req: ScheduleRequest):
    try:
        success = schedule_event(
            req.title, 
            req.start_time, 
            req.end_time, 
            req.description,
            req.google_token
        )
        if not success:
            raise HTTPException(status_code=500, detail="Failed to schedule event")
        return {"status": "success", "message": "Event scheduled"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
