import time
import requests
import subprocess
import threading
import pandas as pd
import json

# 1. Update backend/vendors.csv is already done
# 2. Get stall info from CSV to update SharedComponents (if needed)
df = pd.read_csv("Source/stall_footfall_data.csv")
stalls = df[['stall_id', 'stall_name', 'lat', 'lon']].drop_duplicates()
print("Stalls found in CSV:", stalls['stall_id'].tolist())

# 3. Start the backend app
print("Starting uvicorn server...")
proc = subprocess.Popen(["python", "-m", "uvicorn", "backend.main:app", "--port", "8000"], 
                        cwd="D:\\FDS pj (New)\\FDS-Project-clean\\FDS-Project-clean")

time.sleep(5)  # Wait for server to start

try:
    # 4. Hit endpoints
    print("\n--- Hitting GET /health ---")
    resp_health = requests.get("http://localhost:8000/health")
    print("Status:", resp_health.status_code)
    print("Data:", resp_health.json())

    print("\n--- Hitting GET /stalls ---")
    resp_stalls = requests.get("http://localhost:8000/stalls")
    print("Status:", resp_stalls.status_code)
    data = resp_stalls.json()
    print(f"Total Stalls returned: {len(data)}")
    if len(data) > 0:
        for s in data:
            print(f"- {s['id']}: {s['name']}")
    
    print("\n--- Testing GET /predict for S8 ---")
    resp_pred = requests.get("http://localhost:8000/predict?stall_id=S8&hour=12&day_of_week=3&weather=Clear")
    print("Status:", resp_pred.status_code)
    try:
        print("Data:", resp_pred.json())
    except:
        print("Data:", resp_pred.text)

finally:
    # 5. Shut it down
    proc.terminate()
    print("\nServer terminated.")
