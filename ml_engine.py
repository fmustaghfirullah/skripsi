import joblib
import os
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import numpy as np

class BehaviorClassifier:
    def __init__(self, model_path='model.joblib'):
        self.model_path = model_path
        self.model = self._load_model()

    def _load_model(self):
        if os.path.exists(self.model_path):
            try:
                return joblib.load(self.model_path)
            except Exception as e:
                print(f"Error loading model: {e}")
        
        # Return a dummy/mock model if file not found
        return self._create_mock_model()

    def _create_mock_model(self):
        print("Creating mock model as no model.joblib found.")
        # Mock model that returns a random or fixed confidence score
        class MockModel:
            def predict_proba(self, X):
                # Return random probabilities for "Normal" (0) and "Cheating" (1)
                return np.array([[0.1, 0.9]]) 
        return MockModel()

    def predict_cheating(self, log_data):
        """
        Accepts log data (dict or df row) and returns a confidence score.
        For now, this is a simplified implementation.
        """
        # Feature engineering would normally happen here
        # For simplicity, we trigger a prediction
        try:
            # Placeholder feature vector: [blur_count, hidden_count, forbidden_key_count]
            # Since we predict per log, this is just a stub for now
            prediction = self.model.predict_proba([[1, 0, 0]]) # Dummy features
            confidence_cheating = prediction[0][1]
            return float(confidence_cheating)
        except:
            return 0.5
