import http.server
import socketserver
import json
import os
import urllib.parse
from datetime import datetime

# Import services
from services.db import init_db, clear_db
from services.brain.service import BrainService
from services.wallet.service import WalletService
from services.hands.service import HandsService

PORT = 8000
DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app")

class OSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        if parsed_url.path.startswith("/api/"):
            self.handle_api_get(parsed_url.path)
        else:
            # Serve static files from app/
            super().do_GET()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        if parsed_url.path.startswith("/api/"):
            self.handle_api_post(parsed_url.path)
        else:
            self.send_error(404, "Not Found")

    def handle_api_get(self, path):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        
        try:
            if path == "/api/status":
                response = {"status": "running", "timestamp": datetime.utcnow().isoformat()}
                
            elif path == "/api/wallet":
                wallet = WalletService()
                response = {
                    "assets": wallet.get_assets(),
                    "transactions": wallet.get_transactions(),
                    "summary": wallet.get_summary()
                }
                
            elif path == "/api/hands":
                hands = HandsService()
                response = {
                    "tasks": hands.get_tasks()
                }
                
            else:
                response = {"error": "Not Found"}
                
            self.wfile.write(json.dumps(response).encode("utf-8"))
        except Exception as e:
            self.send_error(500, str(e))

    def handle_api_post(self, path):
        # Read request body
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else ""
        
        try:
            data = json.loads(body) if body else {}
        except Exception:
            self.send_error(400, "Invalid JSON body")
            return

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()

        try:
            brain = BrainService()
            wallet = WalletService()
            hands = HandsService()
            
            if path == "/api/brain/text":
                content = data.get("content", "")
                result = brain.add_text_memory(content, source="text")
                response = {"success": True, "result": result}
                
            elif path == "/api/brain/email":
                sender = data.get("sender", "")
                subject = data.get("subject", "")
                email_body = data.get("body", "")
                result = brain.receive_email_webhook(sender, subject, email_body)
                response = {"success": True, "result": result}
                
            elif path == "/api/brain/upload":
                filename = data.get("filename", "")
                file_type = data.get("file_type", "")
                file_content = data.get("file_content", "")
                result = brain.upload_document(filename, file_type, file_content)
                response = {"success": True, "result": result}
                
            elif path == "/api/wallet/webhook":
                amount = float(data.get("amount", 0.0))
                description = data.get("description", "")
                result = wallet.process_bank_webhook(amount, description)
                response = {"success": True, "result": result}
                
            elif path == "/api/hands/task":
                title = data.get("title", "")
                duration = int(data.get("duration", 30))
                start_time = data.get("start_time", "")
                priority = int(data.get("priority", 2))
                is_fixed = bool(data.get("is_fixed", False))
                result = hands.add_task(title, duration, start_time, priority, is_fixed)
                response = {"success": True, "result": result}
                
            elif path == "/api/hands/overrun":
                task_id = data.get("task_id", "")
                actual_duration = int(data.get("actual_duration", 0))
                result = hands.resolve_calendar_overrun(task_id, actual_duration)
                response = {"success": True, "result": result}
                
            elif path == "/api/reset":
                clear_db()
                response = {"success": True, "message": "Database reset completed"}
                
            else:
                response = {"error": "Not Found"}
                
            self.wfile.write(json.dumps(response).encode("utf-8"))
        except Exception as e:
            self.send_error(500, str(e))

def run_server():
    # Make sure app directory exists
    os.makedirs(DIRECTORY, exist_ok=True)
    
    # Initialize DB
    init_db()
    
    # Run server
    handler = OSHTTPRequestHandler
    # Allow port reuse
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"AI Life & Wealth OS Server running at http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")

if __name__ == "__main__":
    run_server()
