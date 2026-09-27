"""Local-only JSON API for Nodula's example checklist."""

import json
import os
import sqlite3
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


DEFAULT_DB = Path(__file__).resolve().parent / "ideas.sqlite3"
# DEFAULT_DB = Path.home() / ".page-framework" / "ideas.sqlite3"
INITIAL_IDEAS = (
    ("Sketch out a weekend garden", False),
    ("Make a tiny thing that feels good", True),
    ("Share an idea with a friend", False),
)


@contextmanager
def connect(db_path):
    connection = sqlite3.connect(db_path, timeout=5)
    connection.row_factory = sqlite3.Row
    try:
        with connection:
            yield connection
    finally:
        connection.close()


def initialize(db_path):
    db_path = Path(db_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    new_database = not db_path.exists()
    with connect(db_path) as connection:
        connection.execute("CREATE TABLE IF NOT EXISTS ideas (id INTEGER PRIMARY KEY, text TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0)")
        # Seed the example only when a new database file is initialized.
        if new_database:
            connection.executemany("INSERT INTO ideas (text, done) VALUES (?, ?)", INITIAL_IDEAS)


def handler_for(db_path):
    class IdeasHandler(BaseHTTPRequestHandler):
        def send_json(self, status, value):
            body = json.dumps(value).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def local_request(self):
            host = self.headers.get("Host", "").split(":", 1)[0].lower()
            origin = self.headers.get("Origin")
            if host not in ("localhost", "127.0.0.1"):
                self.send_json(403, {"error": "Only local requests are allowed."})
                return False
            if origin and urlsplit(origin).hostname not in ("localhost", "127.0.0.1"):
                self.send_json(403, {"error": "Only local requests are allowed."})
                return False
            return True

        def read_json(self):
            if self.headers.get("Content-Type", "").split(";")[0].strip().lower() != "application/json":
                raise ValueError("Content-Type must be application/json.")
            try:
                length = int(self.headers.get("Content-Length", ""))
                if not 0 < length <= 4096:
                    raise ValueError()
                value = json.loads(self.rfile.read(length))
            except (ValueError, json.JSONDecodeError):
                raise ValueError("Request body must be valid JSON under 4096 bytes.") from None
            if not isinstance(value, dict):
                raise ValueError("Request body must be an object.")
            return value

        def route(self):
            path = urlsplit(self.path).path
            if path == "/api/ideas":
                return None
            if path.startswith("/api/ideas/") and path[len("/api/ideas/"):].isdigit():
                return int(path[len("/api/ideas/"):])
            return False

        def do_GET(self):
            if not self.local_request():
                return
            if urlsplit(self.path).path == "/api/info":
                try:
                    with connect(db_path) as connection:
                        connection.execute("SELECT 1").fetchone()
                except sqlite3.Error:
                    return self.send_json(503, {"error": "Database unavailable."})
                return self.send_json(200, {
                    "status": "connected",
                    "database": "SQLite",
                    "storage": "Server-side file",
                    "endpoint": "/api/ideas",
                })
            if self.route() is not None:
                return self.send_json(404, {"error": "Not found."})
            with connect(db_path) as connection:
                rows = connection.execute("SELECT id, text, done FROM ideas ORDER BY id").fetchall()
            self.send_json(200, [{"id": row["id"], "text": row["text"], "done": bool(row["done"])} for row in rows])

        def do_POST(self):
            if not self.local_request():
                return
            if self.route() is not None:
                return self.send_json(404, {"error": "Not found."})
            try:
                data = self.read_json()
                text = data.get("text")
                if set(data) != {"text"} or not isinstance(text, str) or not 0 < len(text.strip()) <= 200:
                    raise ValueError("text must be between 1 and 200 characters.")
            except ValueError as error:
                return self.send_json(400, {"error": str(error)})
            with connect(db_path) as connection:
                cursor = connection.execute("INSERT INTO ideas (text, done) VALUES (?, 0)", (text.strip(),))
                item = {"id": cursor.lastrowid, "text": text.strip(), "done": False}
            self.send_json(201, item)

        def do_PATCH(self):
            if not self.local_request():
                return
            item_id = self.route()
            if item_id is False or item_id is None:
                return self.send_json(404, {"error": "Not found."})
            try:
                data = self.read_json()
                if set(data) != {"done"} or type(data["done"]) is not bool:
                    raise ValueError("done must be a boolean.")
            except ValueError as error:
                return self.send_json(400, {"error": str(error)})
            with connect(db_path) as connection:
                cursor = connection.execute("UPDATE ideas SET done = ? WHERE id = ?", (data["done"], item_id))
                row = connection.execute("SELECT id, text, done FROM ideas WHERE id = ?", (item_id,)).fetchone() if cursor.rowcount else None
            if row is None:
                return self.send_json(404, {"error": "Idea not found."})
            self.send_json(200, {"id": row["id"], "text": row["text"], "done": bool(row["done"])})

        def do_DELETE(self):
            if not self.local_request():
                return
            item_id = self.route()
            if item_id is False or item_id is None:
                return self.send_json(404, {"error": "Not found."})
            with connect(db_path) as connection:
                cursor = connection.execute("DELETE FROM ideas WHERE id = ?", (item_id,))
            if not cursor.rowcount:
                return self.send_json(404, {"error": "Idea not found."})
            self.send_json(200, {"id": item_id})

    return IdeasHandler


def main():
    db_path = Path(os.environ.get("NODULA_DB_PATH", DEFAULT_DB))
    initialize(db_path)
    port = int(os.environ.get("NODULA_API_PORT", "8000"))
    with ThreadingHTTPServer(("127.0.0.1", port), handler_for(db_path)) as server:
        print(f"Nodula API listening on http://127.0.0.1:{server.server_port}", flush=True)
        server.serve_forever()


if __name__ == "__main__":
    main()