import unittest
from app.main import app

class TestNotifications(unittest.TestCase):
    def test_router_endpoints_registered(self):
        openapi_paths = app.openapi()["paths"]
        expected_paths = [
            "/notifications/me",
            "/notifications/mark-read",
            "/notifications/{notification_id}/read",
            "/notifications/{notification_id}",
            "/notifications/clear-all",
            "/notifications/test"
        ]
        for path in expected_paths:
            self.assertIn(path, openapi_paths, f"Expected endpoint {path} not found in registered routes.")

if __name__ == "__main__":
    unittest.main()
