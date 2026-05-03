# VitalsGuard-AI Frontend UI

This is a React + Vite project scaffolding built to match the VIT internship special track requirements for a health analytics dashboard.

## Features implemented
- Separate login for admin, doctor, patient
- Doctor page: patient list, vital trend charts, AI prediction text, emergency mode toggle, send alert
- Patient page: own vital display, trend charts, anomaly fingerprint, emergency mode
- Admin page: system overview, pie chart distribution, marketplace placeholder
- Normal vs Critical mode toggle UI with overlay
- Recharts graphs + simulated data
- Simple client-side role gating via routes

## Setup
1. `npm install`
2. `npm run dev`

Open `http://localhost:5173`.

## Roles credentials (mock)
- `admin` role: any user ID
- `doctor` role: any user ID
- `patient` role: use `p1` or `p2` for sample data

## Notes
- Backend and ML logic not included. This is UI with mock dataset and simple rule-based sensitivity.
- Add your own network data endpoint to `/src/data/mockVitals.js` and wire in real-time streams.
