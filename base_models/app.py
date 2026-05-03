from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import os
import numpy as np
import sys
import importlib

# Ensure models are in path
sys.path.append(os.getcwd())
try:
    whatif = importlib.import_module("07_whatif_simulator.predict")
    simulate_whatif = whatif.simulate_whatif
    what_if_loaded = True
except Exception as e:
    print(f"❌ Error loading What-If module: {e}")
    what_if_loaded = False

# Load Model 03 (Trend Predictor)
try:
    trend_module = importlib.import_module("03_trend_prediction.predict")
    predict_trend = trend_module.predict_trend
    trend_loaded = True
    print("✅ Model 03 (Trend) loaded successfully!")
except Exception as e:
    print(f"❌ Error loading Model 03 (Trend): {e}")
    trend_loaded = False

app = Flask(__name__)
# Enable CORS so the React frontend can communicate with this API
CORS(app)

# Load Model 01
MODEL_DIR = "01_health_predictor/model"
try:
    model1 = joblib.load(os.path.join(MODEL_DIR, "health_predictor_xgb.pkl"))
    le1 = joblib.load(os.path.join(MODEL_DIR, "label_encoder.pkl"))
    feature_cols1 = joblib.load(os.path.join(MODEL_DIR, "feature_columns.pkl"))
    print("✅ Model 01 loaded successfully!")
except Exception as e:
    print(f"❌ Error loading Model 01: {e}")
    model1, le1, feature_cols1 = None, None, None

@app.route("/api/predict/disease", methods=["POST"])
def predict_disease():
    if model1 is None:
        return jsonify({"error": "Model 01 not loaded on server."}), 500

    try:
        data = request.json
        if not data:
            return jsonify({"error": "No JSON payload provided."}), 400

        features = []
        defaults = {
            "heart_rate": 75, "spo2": 97, "temperature": 36.6,
            "respiratory_rate": 16, "systolic_bp": 120,
            "diastolic_bp": 75, "hr_variability": 8,
        }

        for col in feature_cols1:
            val = data.get(col, defaults.get(col, 0))
            # Also check for alternate names if standard ones missing
            if col == "systolic_bp" and "systolic_bp" not in data: val = data.get("bp_systolic", defaults["systolic_bp"])
            if col == "diastolic_bp" and "diastolic_bp" not in data: val = data.get("bp_diastolic", defaults["diastolic_bp"])
            features.append(float(val))

        X = np.array([features])
        
        probabilities = model1.predict_proba(X)[0]
        predicted_idx = np.argmax(probabilities)
        predicted_condition = le1.inverse_transform([predicted_idx])[0]

        all_probs = {
            le1.inverse_transform([i])[0]: round(float(p), 4)
            for i, p in enumerate(probabilities)
        }

        response = {
            "predicted_condition": predicted_condition,
            "confidence": round(float(probabilities[predicted_idx]), 4),
            "all_probabilities": all_probs
        }

        return jsonify(response)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/predict/whatif", methods=["POST"])
def predict_whatif():
    if not what_if_loaded:
        return jsonify({"error": "Model 07 What-If not loaded."}), 500
        
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No JSON payload provided."}), 400
            
        # The simulate_whatif function handles defaults if keys are missing
        result = simulate_whatif(data)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/predict/trend", methods=["POST"])
def predict_trend_route():
    if not trend_loaded:
        return jsonify({"error": "Model 03 Trend Predictor not loaded."}), 500
        
    try:
        data = request.json
        if not data or "sequence" not in data:
            return jsonify({"error": "No 'sequence' provided in JSON payload."}), 400
            
        result = predict_trend(data["sequence"])
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/predict/unified", methods=["POST"])
def predict_unified_route():
    """Unified endpoint calling both Model 01 and Model 03."""
    try:
        data = request.json
        if not data: return jsonify({"error": "No JSON payload"}), 400
        
        # 1. Run Diagnosis (Model 01)
        res_01 = {}
        if model1:
            features = []
            for col in feature_cols1:
                val = data.get(col, 0)
                if col == "systolic_bp" and "systolic_bp" not in data: val = data.get("bp_systolic", 120)
                if col == "diastolic_bp" and "diastolic_bp" not in data: val = data.get("bp_diastolic", 80)
                features.append(float(val))
            
            probs = model1.predict_proba(np.array([features]))[0]
            p_idx = np.argmax(probs)
            res_01 = {
                "status": "success",
                "predicted_condition": le1.inverse_transform([p_idx])[0],
                "confidence": round(float(probs[p_idx]), 4),
                "all_probabilities": {le1.inverse_transform([i])[0]: round(float(p), 4) for i, p in enumerate(probs)}
            }
        
        # 2. Run Trend (Model 03)
        res_03 = {"status": "error", "error": "No sequence"}
        if "sequence" in data and trend_loaded:
            res_03 = {"status": "success", **predict_trend(data["sequence"])}
            
        return jsonify({
            "status": "success",
            "diagnosis": res_01,
            "trend": res_03,
            "timestamp": "vitalsguard-flask"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/explain-trend", methods=["POST"])
def explain_trend_route():
    try:
        data = request.json
        trend = data.get("trend", "Stable")
        conf = data.get("confidence", 0.0)
        vitals = data.get("vitals", {})

        # Heuristic-based clinical reasoning
        hr = vitals.get("heart_rate", 75)
        spo2 = vitals.get("spo2", 96)
        temp = vitals.get("temperature", 36.6)
        
        explanation = f"Patient trajectory is {trend.lower()} with {conf*100:.0f}% confidence. "
        
        if trend.lower() == "deteriorating":
            if hr > 100 and spo2 < 94:
                explanation += "Rising heart rate combined with falling oxygen saturation indicates significant clinical stress."
            elif temp > 38.5:
                explanation += "Persistent high fever is contributing to the deteriorating trend."
            else:
                explanation += "Multiple vital markers are trending away from the normal baseline."
        elif trend.lower() == "improving":
            if hr < 100 and spo2 > 95:
                explanation += "Heart rate is stabilizing while oxygen saturation remains optimal."
            else:
                explanation += "Vitals are gradually returning to the expected physiological baseline."
        else:
            explanation += "Vitals remain within a stable range with no significant immediate changes detected."
            
        return jsonify({"explanation": explanation})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
