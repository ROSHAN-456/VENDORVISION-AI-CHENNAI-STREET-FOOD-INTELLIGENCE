# VendorVision AI

## Setup

**Note on Navigation:** Before running the setup commands, ensure your terminal is navigated into the main project directory (the folder containing `package.json` and the `backend` folder). 
For example: `cd "D:\FDS pj (New)\FDS-Project-clean\FDS-Project-clean"`

### Frontend
Open a terminal in the project directory and run:
```bash
npm install
npm run dev
```

### Backend
Open a **new** terminal in the project directory (to keep the frontend running) and run:
```bash
cd backend
# Note for Windows users: If 'pip' or 'python' are not recognized, use the Windows Python launcher ('py') instead:
# py -m pip install -r requirements.txt
# py main.py
pip install -r requirements.txt
python main.py
```
The API starts at `http://localhost:8000`.

### Model (regenerate if needed)
```bash
cd Source
# Note for Windows users: use 'py' instead of 'python' if needed
python generate_data.py
python train_model.py
```

## Environment Variables

Copy `.env.example` to `.env` (frontend) and configure `backend/.env` (backend).

| Variable | Where | Description |
|---|---|---|
| `VITE_API_BASE` | Frontend (Vite) | Backend API URL, e.g. `https://your-api.onrender.com` |
| `VITE_GOOGLE_CLIENT_ID` | Frontend (Vite) | Google OAuth 2.0 Client ID (optional — falls back to demo login) |
| `EMAIL_SENDER` | Backend | Gmail address for sending vendor alerts |
| `EMAIL_APP_PASSWORD` | Backend | Gmail app password (generate at myaccount.google.com/apppasswords) |
| `OPENWEATHER_API_KEY` | Backend | OpenWeatherMap API key |
| `VENDOR_EMAIL` | Backend | Fallback vendor notification email |

## Deploying to Vercel (Frontend)

1. Import this repo into [Vercel](https://vercel.com).
2. Vercel will auto-detect Vite via `vercel.json` (`buildCommand: "npm run build"`, `outputDirectory: "dist"`).
3. **Before deploying**, go to **Project Settings → Environment Variables** and add:
   - `VITE_API_BASE` — set to your deployed backend URL (e.g. `https://vendorvision-api.onrender.com`)
   - `VITE_GOOGLE_CLIENT_ID` — set to your Google OAuth Client ID (leave empty for demo mode)
4. Deploy. Vercel will inject these at build time via `import.meta.env`.

> **Important:** Vite env vars must be prefixed with `VITE_` to be exposed to the client bundle.

## Deploying Backend (Render)

The backend is configured via `render.yaml`. Push to GitHub and Render will auto-deploy the FastAPI service. Set the backend env vars (`EMAIL_SENDER`, `EMAIL_APP_PASSWORD`, `OPENWEATHER_API_KEY`, `VENDOR_EMAIL`) in the Render dashboard.

## Notes
- `Source/models.pkl` is the trained Random Forest model (regressor + classifier).
- `node_modules/` is intentionally excluded — run `npm install` to regenerate it.
- `backend/.env` is gitignored and never committed.

