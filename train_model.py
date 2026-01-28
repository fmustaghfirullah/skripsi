import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib
from models import db, EventLog, SessionMonitoring
from flask import Flask
from config import Config
import os

def train_from_db():
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)

    with app.app_context():
        # 1. Fetch data from DB
        # This is a conceptual implementation. Real data would need labeling.
        # For simulation, we'll generate some synthetic labeled data if DB is empty
        query = db.session.query(EventLog.activity_type, SessionMonitoring.user_id) \
                  .join(SessionMonitoring, EventLog.session_id == SessionMonitoring.session_id)
        
        df = pd.read_sql(query.statement, db.engine)

        if df.empty:
            print("Database empty. Generating synthetic data for training demonstration.")
            # Synthetic features: [is_blur, is_hidden, is_forbidden_key]
            data = {
                'is_blur': [1, 0, 0, 1, 1, 0, 0, 1],
                'is_hidden': [0, 1, 0, 1, 0, 1, 0, 1],
                'is_forbidden': [0, 0, 1, 0, 0, 0, 0, 1],
                'label': [0, 0, 1, 1, 0, 0, 0, 1] # 0: Normal, 1: Cheating
            }
            df = pd.DataFrame(data)
            X = df.drop('label', axis=1)
            y = df['label']
        else:
            # Process real data: encode activity_type and create labels
            # (Note: In a real skripsi, labels would be manually annotated or rule-generated)
            X = pd.get_dummies(df['activity_type'])
            # Mock labels for demonstration
            y = (X.sum(axis=1) > 0).astype(int) 

        # 2. Train Model
        model = RandomForestClassifier(n_estimators=100)
        model.fit(X, y)

        # 3. Save Model
        joblib.dump(model, 'model.joblib')
        print("Model trained and saved as model.joblib")

if __name__ == "__main__":
    train_from_db()
