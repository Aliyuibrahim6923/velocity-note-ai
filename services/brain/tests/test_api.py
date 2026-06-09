import pytest
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from unittest.mock import patch
from main import app

client = TestClient(app)

@patch("main.ocr.extract_text_from_image")
@patch("main.graph.create_document_node")
def test_upload_document(mock_graph, mock_ocr):
    mock_ocr.return_value = "Extracted test text"
    mock_graph.return_value = 123
    
    response = client.post(
        "/api/documents/upload",
        files={"file": ("test.png", b"fake_image_bytes", "image/png")}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["extracted_text"] == "Extracted test text"
    assert data["neo4j_node_id"] == 123
