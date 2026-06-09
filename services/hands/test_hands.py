from fastapi.testclient import TestClient
from main import app
import pytest

client = TestClient(app)

def test_schedule_endpoint_mock_token():
    # Test local mock scheduling (when no google_token is passed)
    payload = {
        "title": "Meeting with Sarah",
        "description": "Discuss project Blitz",
        "start_time": "2026-10-15T14:00:00Z",
        "end_time": "2026-10-15T15:00:00Z",
        "google_token": None
    }
    
    response = client.post("/api/hands/schedule", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["message"] == "Event scheduled"

def test_schedule_endpoint_invalid_payload():
    payload = {
        "title": "Incomplete event"
    }
    
    response = client.post("/api/hands/schedule", json=payload)
    
    assert response.status_code == 422 # Pydantic validation error
