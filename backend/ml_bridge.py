import sys
import joblib
import os
import numpy as np

# Path to the model
MODEL_PATH = 'model.joblib'

def predict(activity_type, details):
    # This script is called by Node.js for real-time inference
    # In a real scenario, this would load the model.joblib
    # For now, we simulate the output based on activity_type
    
    score = 0.1
    if activity_type == 'blur':
        score = 0.75
    elif activity_type == 'forbidden_key':
        score = 0.95
    elif activity_type == 'context_menu':
        score = 0.4
        
    # If model exists, we could use it:
    # if os.path.exists(MODEL_PATH):
    #     model = joblib.load(MODEL_PATH)
    #     # process features...
    #     # score = model.predict_proba([[features]])[0][1]
    
    return score

if __name__ == "__main__":
    if len(sys.argv) > 1:
        activity = sys.argv[1]
        detail = sys.argv[2] if len(sys.argv) > 2 else ""
        print(predict(activity, detail))
    else:
        print(0.1)
