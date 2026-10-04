import os, subprocess, time, sys, urllib.request, json

def run(cmd):
    try:
        out = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT)
        print(f"> {cmd}\n{out.decode('utf-8', 'ignore')}\n")
        return out.decode('utf-8', 'ignore')
    except subprocess.CalledProcessError as e:
        print(f"> {cmd} FAILED\n{e.output.decode('utf-8', 'ignore')}\n")
        return ""

with open("manager_log.txt", "w", encoding='utf-8') as log:
    sys.stdout = log
    sys.stderr = log
    
    # 1. Kill any existing port 8000
    print("Finding processes on port 8000...")
    netstat = run("netstat -aon | findstr :8000")
    for line in netstat.splitlines():
        if "LISTENING" in line:
            pid = line.strip().split()[-1]
            print(f"Killing PID {pid}")
            run(f"taskkill /F /PID {pid}")
    
    time.sleep(2)
    
    # 2. Start new server detached
    print("Starting server...")
    cwd = r"d:\FDS pj (New)\FDS-Project-clean\FDS-Project-clean\backend"
    
    # Pass DEVNULL so it doesn't block shell exit
    p = subprocess.Popen([sys.executable, "-m", "uvicorn", "main:app", "--reload", "--port", "8000"],
                         cwd=cwd,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    print("Waiting 10 seconds for server startup (models.pkl is large)...")
    time.sleep(10)
    
    # 3. Test API via native python equivalent of curl
    print("Testing /checkin endpoint...")
    data = json.dumps({
        "stall_id": "S1", 
        "reported_crowd_level": "High", 
        "timestamp": "2026-08-17T19:00:00Z"
    }).encode()
    
    req = urllib.request.Request("http://127.0.0.1:8000/checkin", data=data, headers={'Content-Type': 'application/json'}, method='POST')
    try:
        resp = urllib.request.urlopen(req, timeout=5)
        print(f"\n--- API RESPONSE ---\n{resp.read().decode()}\n--------------------\n")
    except Exception as e:
        print(f"API Error: {e}")
