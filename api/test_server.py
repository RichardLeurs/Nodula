import json
import os
import socket
import subprocess
import tempfile
import time
import threading
import unittest
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlencode

from server import DEFAULT_DB, handler_for, initialize


class IdeasApiTest(unittest.TestCase):
    def test_default_database_is_next_to_api_server(self):
        self.assertEqual(DEFAULT_DB, Path(__file__).resolve().parent / "ideas.sqlite3")

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp.name) / "ideas.sqlite3"
        initialize(self.db_path)
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), handler_for(self.db_path))
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

    def request(self, method, path, data=None, headers=None):
        client = HTTPConnection("127.0.0.1", self.server.server_port)
        payload = json.dumps(data) if data is not None else None
        request_headers = {"Content-Type": "application/json"} if payload is not None else {}
        request_headers.update(headers or {})
        client.request(method, path, payload, request_headers)
        response = client.getresponse()
        result = response.status, json.loads(response.read())
        client.close()
        return result

    def test_crud_persists_and_empty_database_is_not_reseeded(self):
        status, ideas = self.request("GET", "/api/ideas")
        self.assertEqual(status, 200)
        self.assertEqual(len(ideas), 3)
        status, created = self.request("POST", "/api/ideas", {"text": "  test idea  "})
        self.assertEqual(status, 201)
        self.assertEqual(created["text"], "test idea")
        status, updated = self.request("PATCH", f"/api/ideas/{created['id']}", {"done": True})
        self.assertEqual((status, updated["done"]), (200, True))
        initialize(self.db_path)
        self.assertEqual(len(self.request("GET", "/api/ideas")[1]), 4)
        for item in self.request("GET", "/api/ideas")[1]:
            self.assertEqual(self.request("DELETE", f"/api/ideas/{item['id']}")[0], 200)
        initialize(self.db_path)
        self.assertEqual(self.request("GET", "/api/ideas"), (200, []))

    def test_validation_not_found_and_parameterized_queries(self):
        self.assertEqual(self.request("POST", "/api/ideas", {"text": ""})[0], 400)
        self.assertEqual(self.request("POST", "/api/ideas", {"text": "x" * 201})[0], 400)
        self.assertEqual(self.request("POST", "/api/ideas", {"text": "ok", "done": True})[0], 400)
        self.assertEqual(self.request("PATCH", "/api/ideas/1", {"done": 1})[0], 400)
        self.assertEqual(self.request("POST", "/api/ideas", {"text": "'); DROP TABLE ideas; --"})[0], 201)
        self.assertEqual(len(self.request("GET", "/api/ideas")[1]), 4)
        self.assertEqual(self.request("DELETE", "/api/ideas/999999")[0], 404)
        self.assertEqual(self.request("PATCH", "/api/ideas/999999", {"done": True})[0], 404)
        self.assertEqual(self.request("GET", "/api/missing")[0], 404)
        self.assertEqual(self.request("POST", "/api/ideas", {"text": "ok"}, {"Content-Type": "text/plain"})[0], 400)
        self.assertEqual(self.request("POST", "/api/ideas", {"text": "ok"}, {"Origin": "https://elsewhere.example"})[0], 403)
        self.assertEqual(self.request("GET", "/api/ideas", headers={"Host": "elsewhere.example"})[0], 403)

    def test_info_reports_only_public_metadata_and_requires_a_database(self):
        status, info = self.request("GET", "/api/info")
        self.assertEqual(status, 200)
        self.assertEqual(info, {
            "status": "connected",
            "database": "SQLite",
            "storage": "Server-side file",
            "endpoint": "/api/ideas",
        })
        self.assertNotIn(str(self.db_path), json.dumps(info))
        self.assertEqual(self.request("GET", "/api/info", headers={"Origin": "https://elsewhere.example"})[0], 403)
        self.assertEqual(self.request("POST", "/api/info", {"text": "no"})[0], 404)
        self.server.RequestHandlerClass = handler_for(Path(self.temp.name) / "missing" / "ideas.sqlite3")
        self.assertEqual(self.request("GET", "/api/info"), (503, {"error": "Database unavailable."}))


class PhpIdeasApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.api_file = Path(__file__).resolve().parent / "index.php"
        if not cls.api_file.exists():
            raise unittest.SkipTest("PHP deployment API source is not present.")
        try:
            version = subprocess.run(["php", "-v"], check=True, capture_output=True, text=True)
            modules = subprocess.run(["php", "-m"], check=True, capture_output=True, text=True)
        except (FileNotFoundError, subprocess.CalledProcessError) as error:
            raise unittest.SkipTest(f"PHP CLI is unavailable: {error}") from error
        if "sqlite" not in modules.stdout.lower():
            raise unittest.SkipTest("PHP PDO SQLite extension is unavailable.")
        cls.php_version = version.stdout.splitlines()[0]

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.document_root = Path(self.temp.name) / "site" / "public_html"
        self.document_root.mkdir(parents=True)
        self.database_path = Path(self.temp.name) / "private-data" / "ideas.sqlite3"
        self.router_path = Path(self.temp.name) / "router.php"
        self.router_path.write_text(
            f"<?php $_SERVER['DOCUMENT_ROOT'] = {json.dumps(str(self.document_root))}; "
            "$_SERVER['SCRIPT_NAME'] = '/api/index.php'; "
            f"require {json.dumps(str(self.api_file))};",
            encoding="utf-8",
        )
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", 0))
            self.port = listener.getsockname()[1]
        environment = os.environ | {"NODULA_DB_PATH": str(self.database_path)}
        self.process = subprocess.Popen(
            ["php", "-S", f"127.0.0.1:{self.port}", str(self.router_path)],
            env=environment,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        for _ in range(100):
            if self.process.poll() is not None:
                self.fail("PHP built-in server exited during startup.")
            try:
                with socket.create_connection(("127.0.0.1", self.port), timeout=0.1):
                    break
            except OSError:
                time.sleep(0.02)
        else:
            self.fail("PHP built-in server did not start.")

    def tearDown(self):
        self.process.terminate()
        self.process.wait(timeout=5)
        self.temp.cleanup()

    def request_php(self, method, path, data=None, origin="", extra_headers=None):
        client = HTTPConnection("127.0.0.1", self.port)
        body = json.dumps(data) if data is not None else None
        headers = dict(extra_headers or {})
        if data is not None:
            headers["Content-Type"] = "application/json"
        if origin:
            headers["Origin"] = origin
        client.request(method, path, body=body, headers=headers)
        response = client.getresponse()
        result = response.status, response.getheaders(), response.read()
        client.close()
        return result

    def test_deployed_api_supports_cors_and_crud(self):
        origin = "http://localhost:5174"
        status, headers, body = self.request_php("GET", "/api/ideas", origin=origin)
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)[0]["text"], "Sketch out a weekend garden")

        response_headers = dict(headers)
        self.assertEqual(response_headers["Access-Control-Allow-Origin"], origin)
        preflight_status, preflight_headers, _ = self.request_php(
            "OPTIONS", "/api/ideas/1", origin=origin,
            extra_headers={
                "Access-Control-Request-Method": "PATCH",
                "Access-Control-Request-Headers": "content-type",
            },
        )
        self.assertEqual(preflight_status, 204)
        preflight_headers = dict(preflight_headers)
        self.assertIn("PATCH", preflight_headers["Access-Control-Allow-Methods"])
        self.assertEqual(preflight_headers["Access-Control-Allow-Headers"], "Content-Type")

        post_status, _, post_body = self.request_php("POST", "/api/ideas", {"text": "PHP hosted item"}, origin)
        self.assertEqual(post_status, 201)
        created = json.loads(post_body)
        self.assertEqual(created["text"], "PHP hosted item")
        self.assertFalse(created["done"])
        patch_status, _, patch_body = self.request_php("PATCH", f"/api/ideas/{created['id']}", {"done": True}, origin)
        self.assertEqual(patch_status, 200)
        self.assertTrue(json.loads(patch_body)["done"])
        delete_status, _, _ = self.request_php("DELETE", f"/api/ideas/{created['id']}", origin=origin)
        self.assertEqual(delete_status, 200)

        self.assertTrue(self.database_path.exists())
        self.assertFalse(self.database_path.is_relative_to(self.document_root))
        self.assertFalse((self.document_root / 'api' / 'ideas.sqlite3').exists())

    def test_deployed_api_rejects_unlisted_origin_and_invalid_input(self):
        denied_status, denied_headers, denied_body = self.request_php("GET", "/api/ideas", origin="https://evil.example")
        self.assertEqual(denied_status, 403)
        self.assertNotIn("Access-Control-Allow-Origin", dict(denied_headers))
        self.assertEqual(json.loads(denied_body)["error"], "Origin not allowed.")

        denied_preflight, _, _ = self.request_php(
            "OPTIONS", "/api/ideas", origin="https://evil.example",
            extra_headers={"Access-Control-Request-Method": "GET"},
        )
        self.assertEqual(denied_preflight, 403)

        invalid_status, _, invalid_body = self.request_php("POST", "/api/ideas", {"text": "   "}, "http://localhost:5174")
        self.assertEqual(invalid_status, 400)
        self.assertIn("text must be between", json.loads(invalid_body)["error"])


if __name__ == "__main__":
    unittest.main()