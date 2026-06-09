from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_sync_endpoint_mock_token():
    payload = {"google_token": "mock_token_123"}
    response = client.post("/api/mail/sync", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    # Even with a mock token, our agent falls back to mock data
    assert len(data["items"]) >= 1
    item = data["items"][0]
    assert item["category"] == "FINANCIAL_LOG"
