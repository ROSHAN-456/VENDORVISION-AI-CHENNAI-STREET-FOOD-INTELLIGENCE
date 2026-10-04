# VendorVision AI

AI-powered crowd prediction and vendor management platform for street food stalls in Chennai. Uses Random Forest models trained on synthetic footfall data to predict crowd levels and wait times in real time.

---

## Prerequisites

Make sure you have the following installed before proceeding:

| Tool | Minimum Version | Check with |
|---|---|---|
| **Node.js** | v18+ | `node -v` |
| **npm** | v9+ | `npm -v` |
| **Python** | 3.10+ | `python --version` or `py --version` |
| **pip** | latest | `pip --version` or `py -m pip --version` |

> **Windows users:** If `python` is not recognized, use `py` instead in all commands below.

---

## Quick Start (Windows One-Click)

The fastest way to run everything:

1. Open the project folder in File Explorer.
2. Double-click **`start.bat`**.
3. Two terminal windows will open automatically:
   - **Backend** → `http://localhost:8000`
   - **Frontend** → `http://localhost:5173`
4. Open `http://localhost:5173` in your browser.

> `start.bat` kills any existing processes on ports 8000/5173, starts the backend, waits 3 seconds, then starts the frontend.

---

## Manual Setup (Step-by-Step)

### Step 1: Navigate to the Project Directory

Open a terminal and `cd` into the project root (the folder containing `package.json` and the `backend/` folder):

```bash
cd "D:\FDS pj (New)\FDS-Project-clean\FDS-Project-clean"
```

### Step 2: Configure Environment Variables

#### Backend (`backend/.env`)

Copy the example and fill in your credentials:

```bash
cd backend
copy .env.example .env
```

Edit `backend/.env` and add:

```env
EMAIL_SENDER=your-gmail@gmail.com
EMAIL_APP_PASSWORD=your-gmail-app-password
VENDOR_EMAIL=fallback-vendor@example.com
OPENWEATHER_API_KEY=your-openweathermap-api-key
```

| Variable | How to get it |
|---|---|
| `EMAIL_SENDER` | Your Gmail address |
| `EMAIL_APP_PASSWORD` | Generate at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) (requires 2FA enabled) |
| `OPENWEATHER_API_KEY` | Sign up free at [openweathermap.org/api](https://openweathermap.org/api) |
| `VENDOR_EMAIL` | Fallback email for vendor notifications |

#### Frontend (`.env` in project root — optional for local dev)

```bash
cd ..
copy .env.example .env
```

The defaults work for local development (`VITE_API_BASE=http://localhost:8000`). Only change these if deploying or using Google OAuth.

### Step 3: Start the Backend

Open **Terminal 1** in the project root:

```bash
cd backend
pip install -r requirements.txt
python main.py
```

You should see:

```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

> **Verify it works:** Open `http://localhost:8000/health` in your browser — you should see `{"status":"ok"}`.

### Step 4: Start the Frontend

Open **Terminal 2** in the project root (keep Terminal 1 running):

```bash
npm install
npm run dev
```

You should see:

```
VITE v5.4.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

### Step 5: Open the App

Open **http://localhost:5173** in your browser. You'll see the login screen with options for Customer, Vendor, and Admin roles.

---

## Verify API Endpoints

With the backend running, you can test these endpoints:

```bash
# Health check
curl http://localhost:8000/health

# List all stalls
curl http://localhost:8000/stalls

# Get AI prediction (Clear weather)
curl "http://localhost:8000/predict?stall_id=S1&hour=13&day_of_week=5&weather=Clear"

# Get AI prediction (Rainy weather)
curl "http://localhost:8000/predict?stall_id=S2&hour=13&day_of_week=5&weather=Rain"

# Get live weather for a stall's location
curl "http://localhost:8000/weather?lat=13.085&lon=80.210"

# Submit a crowd check-in
curl -X POST http://localhost:8000/checkin -H "Content-Type: application/json" -d "{\"stall_id\":\"S1\",\"reported_crowd_level\":\"High\",\"timestamp\":\"2026-10-04T14:00:00\"}"

# Admin: Get all platform data
curl http://localhost:8000/admin/everything
```

---

## Regenerate ML Models (Optional)

The pre-trained model (`Source/models.pkl`) is included. If you need to regenerate the synthetic dataset or retrain:

```bash
cd Source

# Step 1: Generate synthetic footfall data (~37,960 rows)
python generate_data.py

# Step 2: Train the Random Forest models and save models.pkl
pip install matplotlib
python train_model.py
```

Expected output:

```
=== Footfall Regression ===
MAE: ~2.92 customers
R²: ~0.877

=== Crowd Level Classification ===
Accuracy: ~0.848
```

> **Note:** `train_model.py` requires `matplotlib` for generating charts. Install it with `pip install matplotlib` if not already available.

---

## Project Structure

```
FDS-Project-clean/
├── backend/
│   ├── main.py              # FastAPI backend (all endpoints)
│   ├── requirements.txt     # Python dependencies
│   ├── vendors.csv          # Vendor-to-stall email mapping
│   ├── vendorvision.db      # SQLite database (auto-created)
│   ├── Dockerfile           # Docker config for deployment
│   ├── .env.example         # Backend env template
│   └── .env                 # Backend secrets (gitignored)
├── Source/
│   ├── generate_data.py     # Synthetic dataset generator
│   ├── train_model.py       # ML training script
│   ├── models.pkl           # Trained RF models (~40 MB)
│   └── stall_footfall_data.csv  # Training dataset
├── src/
│   ├── CustomerApp.jsx      # Customer-facing app
│   ├── VendorApp.jsx        # Vendor dashboard
│   ├── AdminApp.jsx         # Admin portal
│   ├── SharedComponents.jsx # Shared UI components
│   └── main.jsx             # React entry point
├── VendorVisionApp.jsx      # Root app with login/routing
├── index.html               # HTML entry point (loads Leaflet, Vite)
├── package.json             # Node.js dependencies
├── vite.config.js           # Vite configuration
├── render.yaml              # Render deployment config (backend)
├── vercel.json              # Vercel deployment config (frontend)
├── start.bat                # Windows one-click launcher
├── .env.example             # Frontend env template
└── .gitignore
```

---

## Environment Variables Reference

| Variable | File | Required | Description |
|---|---|---|---|
| `EMAIL_SENDER` | `backend/.env` | For email alerts | Gmail address for sending vendor notifications |
| `EMAIL_APP_PASSWORD` | `backend/.env` | For email alerts | Gmail App Password ([generate here](https://myaccount.google.com/apppasswords)) |
| `OPENWEATHER_API_KEY` | `backend/.env` | For live weather | OpenWeatherMap API key ([sign up free](https://openweathermap.org/api)) |
| `VENDOR_EMAIL` | `backend/.env` | For email alerts | Fallback vendor notification email |
| `VITE_API_BASE` | `.env` (root) | For deployment | Backend API URL (defaults to `http://localhost:8000`) |
| `VITE_GOOGLE_CLIENT_ID` | `.env` (root) | Optional | Google OAuth Client ID (falls back to demo login if empty) |

> **Important:** Vite env vars must be prefixed with `VITE_` to be exposed to the client bundle.

---

## Deploying

### Frontend → Vercel

1. Import this repo into [Vercel](https://vercel.com).
2. Vercel auto-detects Vite via `vercel.json`.
3. Add environment variables in **Project Settings → Environment Variables**:
   - `VITE_API_BASE` → your deployed backend URL (e.g. `https://vendorvision-api.onrender.com`)
   - `VITE_GOOGLE_CLIENT_ID` → your Google OAuth Client ID (leave empty for demo mode)
4. Deploy.

### Backend → Render

1. Push to GitHub.
2. Render auto-deploys via `render.yaml`.
3. Set the env vars (`EMAIL_SENDER`, `EMAIL_APP_PASSWORD`, `OPENWEATHER_API_KEY`, `VENDOR_EMAIL`, `FRONTEND_URL`) in the Render dashboard.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `python` not recognized (Windows) | Use `py` instead, e.g. `py main.py`, `py -m pip install -r requirements.txt` |
| Port 8000 already in use | Kill the process: `netstat -aon \| findstr :8000` then `taskkill /PID <pid> /F` |
| Port 5173 already in use | Kill the process or run `npm run dev -- --port 5174` |
| `InconsistentVersionWarning` on startup | Safe to ignore. Retrain the model with `python Source/train_model.py` to fix permanently. |
| Weather endpoint returns `"source": "fallback_no_key"` | Add a valid `OPENWEATHER_API_KEY` to `backend/.env` |
| Email notifications fail | Ensure `EMAIL_SENDER` and `EMAIL_APP_PASSWORD` are set. The app password must be from a Gmail with 2FA enabled. |
| Frontend shows "Failed to load real data" | Make sure the backend is running on port 8000 before opening the frontend |

---

## Notes

- `Source/models.pkl` is the pre-trained Random Forest model (regressor + classifier). It is ~40 MB.
- `node_modules/` is excluded from git — run `npm install` to regenerate.
- `backend/.env` is gitignored and must be created manually from `backend/.env.example`.
- The SQLite database (`vendorvision.db`) is auto-created on first backend startup.
