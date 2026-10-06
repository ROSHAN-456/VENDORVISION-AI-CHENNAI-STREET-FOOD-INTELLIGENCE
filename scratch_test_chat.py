import requests
import json
import time

API = "http://localhost:8000/chat"

requests_data = [
    {"message": "which stall is least crowded now", "language": "en-IN"},
    {"message": "wait time at adyar", "language": "en-IN"},
    {"message": "best time to visit adyar", "language": "en-IN"},
    {"message": "how is the weather", "language": "en-IN"},
    {"message": "how to check-in", "language": "en-IN"},
    {"message": "who are you?", "language": "en-IN"},
    {"message": "கூட்டம் குறைவு", "language": "ta-IN"},
    {"message": "इंतजार का समय", "language": "hi-IN"},
]

results = []
for req in requests_data:
    try:
        resp = requests.post(API, json=req)
        results.append({"req": req, "resp": resp.json()})
    except Exception as e:
        results.append({"req": req, "error": str(e)})

with open("scratch_test_chat_out.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print("Done")
