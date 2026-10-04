"""
VendorVision AI — FastAPI backend
Endpoints:
  GET  /health
  GET  /predict?stall_id=X&hour=N&day_of_week=N&weather=X
  GET  /stalls
  POST /checkin
"""

import os
import time
import urllib.request
import json
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import smtplib
from email.mime.text import MIMEText
from datetime import datetime, timedelta
from dotenv import load_dotenv
import csv
import sqlite3
import base64
from apscheduler.schedulers.background import BackgroundScheduler
from contextlib import asynccontextmanager

load_dotenv()
START_TIME = time.time()

# ── Paths (relative to this file so the server can be started from any cwd) ──
BASE = Path(__file__).parent.parent  # project root (FDS-Project-clean)
SOURCE = BASE / "Source"
MODEL_PATH = SOURCE / "models.pkl"
CSV_PATH = SOURCE / "stall_footfall_data.csv"
CHECKINS_PATH = SOURCE / "checkins.csv"
VENDORS_CSV = BASE / "backend" / "vendors.csv"
DB_PATH = BASE / "backend" / "vendorvision.db"

# ── Load models at startup ────────────────────────────────────────────────────
models = joblib.load(MODEL_PATH)
reg        = models["reg"]
clf        = models["clf"]
le_weather = models["le_weather"]
le_stall   = models["le_stall"]

def notify_all_vendors_job():
    print("Running scheduled job: notify_all_vendors_job")
    if not VENDORS_CSV.exists():
        print("vendors.csv not found!")
        return
    results = []
    with open(VENDORS_CSV, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            stall_id = row["stall_id"]
            vendor_email = row["vendor_email"]
            try:
                send_vendor_notification(stall_id, vendor_email)
                results.append({"stall_id": stall_id, "status": "sent"})
            except Exception as e:
                results.append({"stall_id": stall_id, "status": "error", "message": str(e)})
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    for res in results:
        if res["status"] == "sent":
            c.execute("INSERT INTO vendor_actions (stall_id, action_type, timestamp) VALUES (?, ?, ?)",
                      (res["stall_id"], "notify_all", datetime.now().isoformat()))
    conn.commit()
    conn.close()
    
    return results

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT UNIQUE,
            role TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS checkins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            stall_id TEXT,
            reported_crowd_level TEXT,
            timestamp TEXT,
            user_id INTEGER NULL
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS vendor_actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            stall_id TEXT,
            action_type TEXT,
            timestamp TEXT
        )
    ''')
    
    c.execute("SELECT COUNT(*) FROM checkins")
    if c.fetchone()[0] == 0 and CHECKINS_PATH.exists():
        try:
            df = pd.read_csv(CHECKINS_PATH)
            for _, row in df.iterrows():
                c.execute(
                    "INSERT INTO checkins (stall_id, reported_crowd_level, timestamp) VALUES (?, ?, ?)",
                    (str(row.get('stall_id', '')), str(row.get('reported_crowd_level', '')), str(row.get('timestamp', '')))
                )
        except Exception as e:
            print("Failed to migrate checkins:", e)

    conn.commit()
    conn.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    scheduler = BackgroundScheduler()
    scheduler.add_job(notify_all_vendors_job, 'cron', hour=8, minute=0)
    scheduler.start()
    yield
    scheduler.shutdown()

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="VendorVision AI", version="1.0.0", lifespan=lifespan)

origins = ["http://localhost:5173"]
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helpers ───────────────────────────────────────────────────────────────────
def predict_crowd(stall_id: str, hour: int, day_of_week: int, weather: str):
    """Replicates the logic from Source/train_model.py predict_crowd()."""
    try:
        weather_enc = le_weather.transform([weather])[0]
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unknown weather value '{weather}'. "
                            f"Valid values: {list(le_weather.classes_)}")
    try:
        stall_enc = le_stall.transform([stall_id])[0]
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unknown stall_id '{stall_id}'. "
                            f"Valid values: {list(le_stall.classes_)}")

    is_weekend = 1 if day_of_week >= 5 else 0
    row = pd.DataFrame([{
        "hour": hour,
        "day_of_week": day_of_week,
        "is_weekend": is_weekend,
        "weather_enc": weather_enc,
        "stall_enc": stall_enc,
    }])
    footfall_pred = float(reg.predict(row)[0])
    crowd_pred    = str(clf.predict(row)[0])
    wait_est      = round(max(0.0, (footfall_pred - 25) / 25) * 20, 1)
    return footfall_pred, crowd_pred, wait_est


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/predict")
def predict(
    stall_id:    str = Query(..., description="e.g. S1"),
    hour:        int = Query(..., ge=0, le=23),
    day_of_week: int = Query(..., ge=0, le=6),
    weather:     str = Query(..., description="Clear | Cloudy | Rain | Hot"),
):
    footfall, crowd_level, wait_minutes = predict_crowd(stall_id, hour, day_of_week, weather)
    
    source = "model"
    votes = {"Low": 0, "Medium": 0, "High": 0}
    vote_count = 0
    model_crowd = crowd_level

    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        window = int(os.getenv("CHECKIN_WINDOW_MINUTES", 30))
        min_votes = int(os.getenv("MIN_VOTES", 3))
        cutoff = (datetime.now() - timedelta(minutes=window)).isoformat()
        
        c.execute("SELECT reported_crowd_level, COUNT(*) FROM checkins WHERE stall_id = ? AND timestamp >= ? GROUP BY reported_crowd_level", (stall_id, cutoff))
        rows = c.fetchall()
        
        c.execute("INSERT INTO vendor_actions (stall_id, action_type, timestamp) VALUES (?, ?, ?)", 
                  (stall_id, "predict", datetime.now().isoformat()))
        conn.commit()
        conn.close()
        
        for lvl, count in rows:
            if lvl in votes:
                votes[lvl] = count
                vote_count += count
        
        # Only let check-in votes override the model for the CURRENT hour/day.
        # Forecast queries (future hours) always get the pure model prediction.
        now = datetime.now()
        is_current_slot = (hour == now.hour and day_of_week == now.weekday())
                
        if is_current_slot and vote_count >= min_votes:
            max_votes = max(votes.values())
            winners = [k for k, v in votes.items() if v == max_votes]
            if len(winners) == 1:
                source = "crowd_votes"
                crowd_level = winners[0]
                if crowd_level == "Low":
                    wait_minutes = 2.0
                elif crowd_level == "Medium":
                    wait_minutes = 8.0
                elif crowd_level == "High":
                    wait_minutes = 16.0
    except Exception as e:
        print("predict vote error:", e)
        
    return {
        "footfall":     round(footfall, 1),
        "crowd_level":  crowd_level,
        "wait_minutes": wait_minutes,
        "source":       source,
        "votes":        votes,
        "vote_count":   vote_count,
        "model_crowd_level": model_crowd,
    }


@app.get("/stalls")
def stalls():
    df = pd.read_csv(CSV_PATH)
    deduped = (
        df[["stall_id", "stall_name", "lat", "lon"]]
        .drop_duplicates(subset="stall_id")
        .rename(columns={"stall_id": "id", "stall_name": "name"})
    )
    return deduped.to_dict(orient="records")


class CheckInRequest(BaseModel):
    stall_id: str
    reported_crowd_level: str
    timestamp: str

class GoogleAuthRequest(BaseModel):
    credential: str
    role: str

def decode_jwt_payload(token: str):
    parts = token.split('.')
    if len(parts) != 3:
        raise Exception("Invalid JWT token")
    payload_b64 = parts[1]
    payload_b64 += "=" * ((4 - len(payload_b64) % 4) % 4)
    return json.loads(base64.urlsafe_b64decode(payload_b64).decode("utf-8"))

@app.post("/auth/google")
def auth_google(req: GoogleAuthRequest):
    try:
        payload = decode_jwt_payload(req.credential)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    email = payload.get("email")
    name = payload.get("name")
    
    if not email:
        raise HTTPException(status_code=400, detail="Token missing email")
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    # Simple check or create
    c.execute("SELECT * FROM users WHERE email = ?", (email,))
    user = c.fetchone()
    
    if not user:
        c.execute("INSERT INTO users (name, email, role) VALUES (?, ?, ?)", (name, email, req.role))
        conn.commit()
        user_id = c.lastrowid
        c.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = c.fetchone()
    else:
        # Update role if different or just keep latest (we'll just use what's there for now but ensure we return role)
        # We can update the role on login if needed, for simplicity let's just update role to latest requested role
        c.execute("UPDATE users SET name = ?, role = ? WHERE email = ?", (name, req.role, email))
        conn.commit()
        c.execute("SELECT * FROM users WHERE email = ?", (email,))
        user = c.fetchone()
        
    conn.close()
    return dict(user)

# Simple in-memory cache for weather: {(lat, lon): (timestamp, mapped_weather)}
weather_cache = {}
CACHE_DURATION = 15 * 60  # 15 minutes

@app.get("/weather")
def get_weather(lat: float, lon: float):
    cache_key = (round(lat, 3), round(lon, 3))
    now = time.time()
    
    if cache_key in weather_cache:
        cached_time, cached_weather = weather_cache[cache_key]
        if now - cached_time < CACHE_DURATION:
            return {"weather": cached_weather, "source": "cache"}
            
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key:
        # Fallback if no API key is provided
        return {"weather": "Clear", "source": "fallback_no_key"}
        
    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric"
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
    except Exception as e:
        return {"weather": "Clear", "source": f"fallback_error_{e}"}

    # Map OWM data to our 4 categories: Clear, Cloudy, Rain, Hot
    # OWM main groups: Thunderstorm, Drizzle, Rain, Snow, Clear, Clouds, etc.
    main_weather = data.get("weather", [{}])[0].get("main", "Clear")
    temp = data.get("main", {}).get("temp", 30)

    mapped = "Clear"
    if main_weather in ["Rain", "Drizzle", "Thunderstorm", "Snow"]:
        mapped = "Rain"
    elif main_weather == "Clouds":
        mapped = "Cloudy"
    elif main_weather == "Clear" and temp > 35:
        mapped = "Hot"
    elif main_weather == "Clear":
        mapped = "Clear"
    else:
        # For Haze, Mist, etc., if temp is very high it could be hot, otherwise default to Clear/Cloudy
        mapped = "Hot" if temp > 35 else "Clear"

    weather_cache[cache_key] = (now, mapped)
    return {"weather": mapped, "source": "api"}


@app.post("/checkin")
def checkin(data: CheckInRequest):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO checkins (stall_id, reported_crowd_level, timestamp) VALUES (?, ?, ?)", 
              (data.stall_id, data.reported_crowd_level, data.timestamp))
    conn.commit()
    conn.close()
    return {"status": "ok"}


class NotifyRequest(BaseModel):
    stall_id: str

def send_vendor_notification(stall_id: str, vendor_email: str):
    sender = os.getenv("EMAIL_SENDER")
    pwd = os.getenv("EMAIL_APP_PASSWORD")
    
    if not all([sender, pwd, vendor_email]):
        raise Exception("Email configuration missing in .env or missing vendor email")

    # Get current time info
    now = datetime.now()
    hour = now.hour
    day_of_week = now.weekday()
    
    # We default weather to Clear for notification purposes if realtime isn't fetched
    weather = "Clear"
    
    stalls_df = pd.read_csv(CSV_PATH)
    stall_row = stalls_df[stalls_df["stall_id"] == stall_id]
    stall_name = stall_row["stall_name"].iloc[0] if not stall_row.empty else stall_id
    
    footfall, crowd, wait = predict_crowd(stall_id, hour, day_of_week, weather)
        
    day_name = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][day_of_week]
    time_period = f"{hour}:00"
    
    subject = f"VendorVision Alert: {stall_name}"
    body = f"{stall_name}: {day_name} {time_period} — {crowd} crowd expected. Estimated wait: {wait} min."
    
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = f"VendorVision <{sender}>"
    msg['To'] = vendor_email
    
    try:
        import socket
        host = 'smtp.gmail.com'
        port = 587
        host_ip = socket.gethostbyname(host)
        
        server = smtplib.SMTP(host_ip, port)
        server._host = host 
        server.starttls()
        server.login(sender, pwd)
        server.send_message(msg)
        server.quit()
    except Exception as e:
        raise Exception(f"Failed to send email: {e}")

@app.post("/notify-vendor")
def notify_vendor(req: NotifyRequest):
    vendor_email = None
    if VENDORS_CSV.exists():
        with open(VENDORS_CSV, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row["stall_id"] == req.stall_id:
                    vendor_email = row["vendor_email"]
                    break
    
    if not vendor_email:
        vendor_email = os.getenv("VENDOR_EMAIL") # generic fallback if not found in CSV

    try:
        send_vendor_notification(req.stall_id, vendor_email)
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("INSERT INTO vendor_actions (stall_id, action_type, timestamp) VALUES (?, ?, ?)", 
                  (req.stall_id, "notify_vendor", datetime.now().isoformat()))
        conn.commit()
        conn.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    return {"status": "sent"}

@app.post("/notify-all")
def notify_all():
    results = notify_all_vendors_job()
    return {"status": "success", "results": results}

@app.get("/admin/activity")
def admin_activity():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    # Combined events query
    query = """
    SELECT id, stall_id, 'checkin' as event_type, timestamp, reported_crowd_level as detail
    FROM checkins
    UNION ALL
    SELECT id, stall_id, action_type as event_type, timestamp, '' as detail
    FROM vendor_actions
    ORDER BY timestamp DESC
    LIMIT 20
    """
    c.execute(query)
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/admin/users")
def admin_users():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM users ORDER BY created_at DESC")
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]
    
@app.get("/admin/everything")
def admin_everything():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    c.execute("SELECT COUNT(*) FROM users")
    users_count = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM checkins")
    checkins_count = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM vendor_actions")
    actions_count = c.fetchone()[0]
    
    c.execute("SELECT * FROM users ORDER BY created_at DESC")
    users = [dict(r) for r in c.fetchall()]
    
    c.execute("SELECT * FROM checkins ORDER BY timestamp DESC")
    checkins = [dict(r) for r in c.fetchall()]
    
    c.execute("SELECT * FROM vendor_actions ORDER BY timestamp DESC")
    actions = [dict(r) for r in c.fetchall()]
    
    query = """
    SELECT id, stall_id, 'checkin' as event_type, timestamp, reported_crowd_level as detail
    FROM checkins
    UNION ALL
    SELECT id, stall_id, action_type as event_type, timestamp, '' as detail
    FROM vendor_actions
    ORDER BY timestamp DESC
    LIMIT 1000
    """
    c.execute(query)
    activity_feed = [dict(r) for r in c.fetchall()]
    
    conn.close()
    
    model_mtime = os.path.getmtime(MODEL_PATH)
    uptime = time.time() - START_TIME
    
    vendors = []
    if VENDORS_CSV.exists():
        with open(VENDORS_CSV, mode="r", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                email = row.get("vendor_email", "")
                masked = email[:2] + "****" + email[email.find("@"):] if "@" in email else email
                vendors.append({"stall_id": row.get("stall_id"), "masked_email": masked})
                
    stalls_df = pd.read_csv(CSV_PATH)
    deduped = stalls_df[["stall_id", "stall_name", "lat", "lon"]].drop_duplicates().rename(columns={"stall_id": "id", "stall_name": "name"})
    stalls_list = deduped.to_dict(orient="records")
    
    def get_stall_area(lat, lon):
        CENTER_LAT = 13.0827
        CENTER_LON = 80.2707
        lat_diff = lat - CENTER_LAT
        lon_diff = lon - CENTER_LON
        if abs(lat_diff) > abs(lon_diff):
            return "North Area" if lat_diff > 0 else "South Area"
        else:
            return "East Area" if lon_diff > 0 else "West Area"
        
    for s in stalls_list:
        s["area"] = get_stall_area(s["lat"], s["lon"])
        s["vendor_email"] = next((v["masked_email"] for v in vendors if v["stall_id"] == s["id"]), "N/A")
        
    return {
        "metrics": {
            "users_count": users_count,
            "checkins_count": checkins_count,
            "actions_count": actions_count,
            "uptime_seconds": uptime,
            "model_last_retrained": model_mtime,
            "next_schedule": "Next triggered today at 08:00 AM" 
        },
        "users": users,
        "checkins": checkins,
        "vendor_actions": actions,
        "activity_feed": activity_feed,
        "stalls": stalls_list
    }



# ── Dev entry-point ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
