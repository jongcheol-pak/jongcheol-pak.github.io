import http.server
import socketserver
import json
import os
import base64

PORT = 5000
PROJECTS_DIR = os.path.join(os.getcwd(), "_projects")
IMAGES_DIR = os.path.join(os.getcwd(), "assets", "img", "uploads")

class RequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        # Parse query parameters manually
        if '?' in self.path:
            path, query = self.path.split('?', 1)
            params = {}
            for param in query.split('&'):
                if '=' in param:
                    key, value = param.split('=', 1)
                    params[key] = value
            
            if path == '/api/project' and 'filename' in params:
                filename = params['filename']
                filepath = os.path.join(PROJECTS_DIR, filename)
                
                if os.path.exists(filepath):
                    try:
                        with open(filepath, 'r', encoding='utf-8') as f:
                            content = f.read()
                        
                        self.send_response(200)
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.send_header('Content-type', 'application/json')
                        self.end_headers()
                        self.wfile.write(json.dumps({"status": "success", "content": content}).encode())
                    except Exception as e:
                        self.send_error(500, str(e))
                else:
                    self.send_error(404, "File not found")
            else:
                self.send_error(404, "Not Found")
        else:
             super().do_GET()

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data)
            
            # Case 1: Image Upload
            if "image_data" in data and "filename" in data:
                filename = data["filename"]
                image_data = data["image_data"]
                b64_string = image_data.split(',')[1] if ',' in image_data else image_data
                
                # Determine target directory
                if "project_slug" in data and data["project_slug"]:
                    target_dir = os.path.join(os.getcwd(), "assets", "img", "projects", data["project_slug"])
                    rel_dir = f"/assets/img/projects/{data['project_slug']}"
                else:
                    target_dir = IMAGES_DIR
                    rel_dir = "/assets/img/uploads"

                os.makedirs(target_dir, exist_ok=True)
                filepath = os.path.join(target_dir, filename)
                
                with open(filepath, "wb") as f:
                    f.write(base64.b64decode(b64_string))
                
                rel_path = f"{rel_dir}/{filename}"
                
                response = {"status": "success", "url": rel_path}
                print(f"[API] Saved image: {filepath}")

            # Case 2: Markdown Save
            elif "content" in data and "filename" in data:
                filename = data["filename"]
                content = data["content"]
                
                os.makedirs(PROJECTS_DIR, exist_ok=True)
                filepath = os.path.join(PROJECTS_DIR, filename)
                
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(content)
                
                response = {"status": "success", "path": filepath}
                print(f"[API] Saved project: {filepath}")
                
            else:
                raise ValueError("Invalid request format")

            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode())
            print(f"[API] Error: {e}")

if __name__ == "__main__":
    print(f"Starting Local Admin API on port {PORT}...")
    print(f"Projects Dir: {PROJECTS_DIR}")
    print(f"Images Dir: {IMAGES_DIR}")
    with socketserver.TCPServer(("", PORT), RequestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
        httpd.server_close()
