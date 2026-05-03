"""
VitalsGuard AI — Model 01 Health Predictor Backend
Simple Flask server that exposes the Model 01 predictor as a REST API
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
import logging
import importlib.util

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("model01_server")

# Add base_models to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../base_models'))

app = Flask(__name__)
CORS(app)

# Import Model 01 predictor
try:
    import importlib.util
    spec = importlib.util.spec_from_file_location("predict_module", 
        os.path.join(os.path.dirname(__file__), '../../base_models/01_health_predictor/predict.py'))
    predict_module = importlib.util.module_from_spec(spec)
    sys.modules['predict_module'] = predict_module
    spec.loader.exec_module(predict_module)
    predict_condition = predict_module.predict_condition
    logger.info("✓ Model 01 loaded successfully")
except Exception as e:
    logger.error(f"✗ Failed to load Model 01: {e}")
    predict_condition = None

# Import Model 07 (What-If Simulator)
try:
    spec07 = importlib.util.spec_from_file_location("predict_module_07", 
        os.path.join(os.path.dirname(__file__), '../../base_models/07_whatif_simulator/predict.py'))
    predict_module_07 = importlib.util.module_from_spec(spec07)
    sys.modules['predict_module_07'] = predict_module_07
    spec07.loader.exec_module(predict_module_07)
    simulate_whatif = predict_module_07.simulate_whatif
    logger.info("✓ Model 07 loaded successfully")
except Exception as e:
    logger.error(f"✗ Failed to load Model 07: {e}")
    simulate_whatif = None


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "service": "VitalsGuard Model 01 Backend",
        "model_loaded": predict_condition is not None
    })


@app.route('/api/predict/disease', methods=['POST'])
def predict_disease():
    """
    Model 01 Health Predictor endpoint
    
    Request JSON:
    {
        "heart_rate": 75,
        "spo2": 98,
        "temperature": 36.6,
        "respiratory_rate": 16,
        "systolic_bp": 120,
        "diastolic_bp": 75,
        "hr_variability": 8
    }
    
    Response JSON:
    {
        "status": "success",
        "predicted_condition": "Normal",
        "confidence": 0.98,
        "all_probabilities": { ... }
    }
    """
    try:
        if not predict_condition:
            return jsonify({
                "status": "error",
                "error": "Model not loaded"
            }), 500
        
        # Get JSON payload
        data = request.get_json()
        
        # Prepare vitals dictionary
        vitals_dict = {
            "heart_rate": data.get("heart_rate", 75),
            "spo2": data.get("spo2", 97),
            "temperature": data.get("temperature", 36.6),
            "respiratory_rate": data.get("respiratory_rate", 16),
            "systolic_bp": data.get("systolic_bp", 120),
            "diastolic_bp": data.get("diastolic_bp", 75),
            "hr_variability": data.get("hr_variability", 8),
        }
        
        # Get prediction from Model 01
        result = predict_condition(vitals_dict)
        
        return jsonify({
            "status": "success",
            "predicted_condition": result["predicted_condition"],
            "confidence": result["confidence"],
            "all_probabilities": result["all_probabilities"],
        })
    
    except Exception as exc:
        logger.exception("Model 01 prediction failed")
        return jsonify({
            "status": "error",
            "error": str(exc)
        }), 500


@app.route('/api/simulate', methods=['GET'])
def simulate_vitals():
    """Returns sample vitals for testing"""
    return jsonify({
        "heart_rate": 85,
        "spo2": 97,
        "temperature": 37.0,
        "respiratory_rate": 16,
        "systolic_bp": 120,
        "diastolic_bp": 75,
        "hr_variability": 8,
    })


@app.route('/api/predict/trajectory', methods=['POST'])
def predict_trajectory():
    """
    Predict 24-hour risk trajectory based on Model 01 confidence
    
    Request JSON:
    {
        "heart_rate": 85,
        "spo2": 97,
        "temperature": 37.0,
        "bp_systolic": 120,
        "bp_diastolic": 75
    }
    
    Response: 24-hour risk forecast
    """
    try:
        if not predict_condition:
            return jsonify({
                "status": "error",
                "error": "Model not loaded"
            }), 500
        
        # Get JSON payload
        data = request.get_json()
        
        # Prepare vitals dictionary
        vitals_dict = {
            "heart_rate": data.get("heart_rate", 75),
            "spo2": data.get("spo2", 97),
            "temperature": data.get("temperature", 36.6),
            "respiratory_rate": data.get("respiratory_rate", 16),
            "systolic_bp": data.get("systolic_bp", 120),
            "diastolic_bp": data.get("diastolic_bp", 75),
            "hr_variability": data.get("hr_variability", 8),
        }
        
        # Get current prediction confidence
        result = predict_condition(vitals_dict)
        current_confidence = result["confidence"] * 100
        
        # Predict trajectory based on abnormality patterns
        vitals = data
        is_abnormal = (vitals.get("heart_rate", 75) > 100 or 
                      vitals.get("spo2", 97) < 94 or 
                      vitals.get("temperature", 36.6) > 38 or 
                      vitals.get("systolic_bp", 120) > 140)
        
        trajectory_data = []
        
        for hour in range(0, 26, 2):
            if is_abnormal:
                # Abnormal vitals: risk increases initially then plateaus/decreases
                if hour == 0:
                    risk_value = current_confidence
                elif hour <= 8:
                    # Risk increases for first 8 hours
                    risk_value = min(current_confidence + (hour * 1.5), 95)
                elif hour <= 16:
                    # Risk plateaus
                    risk_value = 95
                else:
                    # Risk decreases with treatment
                    risk_value = max(95 - ((hour - 16) * 1.2), current_confidence)
            else:
                # Normal vitals: risk gradually decreases
                if hour == 0:
                    risk_value = current_confidence
                else:
                    # Gradual improvement
                    risk_value = max(current_confidence - (hour * 1.8), 20)
            
            risk_value = max(0, min(100, risk_value))
            trajectory_data.append({
                "hour": hour,
                "risk": round(risk_value, 1)
            })
        
        return jsonify({
            "status": "success",
            "trajectory": trajectory_data,
            "current_confidence": round(current_confidence, 1),
            "prediction_type": "abnormal_progression" if is_abnormal else "normal_recovery"
        })
    
    except Exception as exc:
        logger.exception("Trajectory prediction failed")
        return jsonify({
            "status": "error",
            "error": str(exc)
        }), 500


@app.route('/api/model07/whatif', methods=['POST'])
def model07_whatif():
    """
    Model 07: What-If Health Simulator
    Predicts health risk progression at 2h, 6h, 12h, 24h
    
    Request JSON:
    {
        "heart_rate": 85,
        "spo2": 97,
        "temperature": 37.0,
        "respiratory_rate": 16,
        "systolic_bp": 120
    }
    
    Response JSON:
    {
        "status": "success",
        "predictions": {
            "2h": {"risk_score": 0.15, "condition": "...", "risk_level": "low", "confidence": 0.92},
            "6h": {...},
            "12h": {...},
            "24h": {...}
        },
        "overall_trajectory": "improving|stable|deteriorating"
    }
    """
    try:
        if not simulate_whatif:
            return jsonify({
                "status": "error",
                "error": "Model 07 not loaded"
            }), 500
        
        # Get JSON payload
        data = request.get_json()
        
        # Prepare vitals dictionary for Model 07
        vitals_dict = {
            "heart_rate": data.get("heart_rate", 75),
            "spo2": data.get("spo2", 97),
            "temperature": data.get("temperature", 36.6),
            "respiratory_rate": data.get("respiratory_rate", 16),
            "systolic_bp": data.get("systolic_bp", 120),
        }
        
        # Get prediction from Model 07
        result = simulate_whatif(vitals_dict)
        
        return jsonify({
            "status": "success",
            "predictions": {
                "2h": result.get("2h", {}),
                "6h": result.get("6h", {}),
                "12h": result.get("12h", {}),
                "24h": result.get("24h", {}),
            },
            "overall_trajectory": result.get("overall_trajectory", "stable")
        })
    
    except Exception as exc:
        logger.exception("Model 07 What-If simulation failed")
        return jsonify({
            "status": "error",
            "error": str(exc)
        }), 500


@app.route('/api/integrated/analysis', methods=['POST'])
def integrated_analysis():
    """
    Combined analysis: Model 01 (current diagnosis) + Model 07 (24h projection)
    
    Returns comprehensive health analysis with current state and future projections
    """
    try:
        data = request.get_json()
        
        # Prepare vitals
        vitals_dict = {
            "heart_rate": data.get("heart_rate", 75),
            "spo2": data.get("spo2", 97),
            "temperature": data.get("temperature", 36.6),
            "respiratory_rate": data.get("respiratory_rate", 16),
            "systolic_bp": data.get("systolic_bp", 120),
            "diastolic_bp": data.get("diastolic_bp", 75),
            "hr_variability": data.get("hr_variability", 8),
        }
        
        response = {
            "status": "success",
            "model01": {},
            "model07": {},
            "overall_risk_level": "unknown"
        }
        
        # Model 01 - Current Diagnosis
        if predict_condition:
            try:
                m01_result = predict_condition(vitals_dict)
                response["model01"] = {
                    "predicted_condition": m01_result.get("predicted_condition", "Unknown"),
                    "confidence": m01_result.get("confidence", 0),
                    "all_probabilities": m01_result.get("all_probabilities", {}),
                    "diagnosis": "Current health assessment"
                }
            except Exception as e:
                logger.warning(f"Model 01 failed: {e}")
                response["model01"]["error"] = str(e)
        
        # Model 07 - What-If Projections
        if simulate_whatif:
            try:
                m07_result = simulate_whatif(vitals_dict)
                response["model07"] = {
                    "predictions": {
                        "2h": m07_result.get("2h", {}),
                        "6h": m07_result.get("6h", {}),
                        "12h": m07_result.get("12h", {}),
                        "24h": m07_result.get("24h", {}),
                    },
                    "overall_trajectory": m07_result.get("overall_trajectory", "stable")
                }
            except Exception as e:
                logger.warning(f"Model 07 failed: {e}")
                response["model07"]["error"] = str(e)
        
        # Determine overall risk
        if response["model01"]:
            confidence = response["model01"].get("confidence", 0)
            if confidence > 0.7:
                response["overall_risk_level"] = "high"
            elif confidence > 0.4:
                response["overall_risk_level"] = "moderate"
            else:
                response["overall_risk_level"] = "low"
        
        return jsonify(response)
    
    except Exception as exc:
        logger.exception("Integrated analysis failed")
        return jsonify({
            "status": "error",
            "error": str(exc)
        }), 500


if __name__ == '__main__':
    logger.info("Starting VitalsGuard Model 01 & 07 Backend on http://0.0.0.0:5000")
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=True)
