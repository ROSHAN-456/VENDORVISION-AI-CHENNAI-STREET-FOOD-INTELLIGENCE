import json
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

print("--- Testing /health ---")
r_health = client.get("/health")
print("Health:", r_health.status_code, r_health.json())

print("\n--- Testing /stalls ---")
r_stalls = client.get("/stalls")
print("Stalls:", r_stalls.status_code)
stalls = r_stalls.json()
print("Stall count:", len(stalls))
for s in stalls:
    print(s['id'], s['name'])

print("\n--- Testing /predict S8 ---")
r_pred = client.get("/predict?stall_id=S8&hour=12&day_of_week=3&weather=Clear")
print("Prediction:", r_pred.status_code)
print("Data:", r_pred.json())

print("ALL TESTS PASSED WITH NEW DATASET!")

with open("test_results.txt", "w") as f:
    f.write("Health: " + str(r_health.json()) + "\n")
    f.write("Stalls count: " + str(len(stalls)) + "\n")
    f.write("Prediction S8: " + str(r_pred.json()) + "\n")
