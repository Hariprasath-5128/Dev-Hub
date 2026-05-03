"""Quick backend test script — run with: python test_api.py"""
import json, urllib.request, urllib.error

BASE = "http://localhost:8000"

def post(path, data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(
        f"{BASE}{path}", data=body,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f"HTTP {e.code}: {err}")
        return None

def get(path):
    with urllib.request.urlopen(f"{BASE}{path}", timeout=10) as r:
        return json.loads(r.read())

VITALS = {"heart_rate": 112, "spo2": 91, "temperature": 38.4, "ecg_irregularity": 0.72}

print("\n=== /api/health ===")
print(get("/api/health"))

print("\n=== /api/ews (fast, no LLM) ===")
r = post("/api/ews", VITALS)
print(json.dumps(r, indent=2))

print("\n=== /api/fingerprint ===")
r = post("/api/fingerprint", VITALS)
print(json.dumps(r, indent=2))

print("\n=== /api/analyze-vitals (full pipeline, takes ~30s) ===")
r = post("/api/analyze-vitals", VITALS)
if r:
    print(json.dumps(r, indent=2))
