"""Quick import check for main.py"""
import sys
import traceback

try:
    import backend.main
    print("SUCCESS: backend.main imported OK")
    routes = [r.path for r in backend.main.app.routes]
    print(f"Routes registered: {routes}")
except Exception as e:
    print(f"FAILED: {e}")
    traceback.print_exc()
