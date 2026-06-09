import os
import json
import base64
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import uuid
from datetime import datetime

def parse_financial_from_text(subject, text_body):
    # Mock LLM/Heuristic parser for now to keep it lightweight.
    # In reality, this would pass the text to window.ai or local LLM.
    text = (subject + " " + text_body).lower()
    
    amount = 0.0
    merchant = "Unknown"
    is_finance = False
    
    if "receipt" in text or "invoice" in text or "order" in text or "payment" in text:
        is_finance = True
        # Simple regex-like extraction mock
        if "uber" in text:
            merchant = "Uber"
            amount = -15.50
        elif "amazon" in text:
            merchant = "Amazon"
            amount = -45.99
        elif "salary" in text or "payroll" in text:
            merchant = "Employer"
            amount = 3000.00
        else:
            merchant = "Misc Vendor"
            amount = -10.00

    if is_finance:
        return {
            "id": str(uuid.uuid4()),
            "content": f"[EMAIL SYNC]: {subject}",
            "category": "FINANCIAL_LOG",
            "metadata_json": json.dumps({
                "type": "income" if amount > 0 else "expense",
                "amount": abs(amount),
                "merchant": merchant,
                "source": "gmail"
            }),
            "created_at": datetime.utcnow().isoformat()
        }
    return None

def fetch_and_parse_emails(token):
    # 1. Connect to Gmail API
    creds = Credentials(token)
    try:
        service = build('gmail', 'v1', credentials=creds)
        # Fetch last 10 emails
        results = service.users().messages().list(userId='me', maxResults=10).execute()
        messages = results.get('messages', [])
        
        parsed_logs = []
        for msg in messages:
            msg_data = service.users().messages().get(userId='me', id=msg['id'], format='full').execute()
            
            # Extract Subject
            headers = msg_data['payload'].get('headers', [])
            subject = next((h['value'] for h in headers if h['name'] == 'Subject'), "No Subject")
            
            # Extract Body (Snippet is easiest)
            snippet = msg_data.get('snippet', '')
            
            # Parse
            log_item = parse_financial_from_text(subject, snippet)
            if log_item:
                parsed_logs.append(log_item)
                
        return parsed_logs
        
    except Exception as e:
        print("Gmail Sync Error:", str(e))
        # If token is invalid or API fails, return mock data for testing/demo purposes
        return [
            {
                "id": str(uuid.uuid4()),
                "content": "[MOCK EMAIL SYNC]: Your Amazon.com order #113-492",
                "category": "FINANCIAL_LOG",
                "metadata_json": json.dumps({
                    "type": "expense",
                    "amount": 45.99,
                    "merchant": "Amazon",
                    "source": "gmail"
                }),
                "created_at": datetime.utcnow().isoformat()
            }
        ]
