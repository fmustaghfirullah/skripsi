"""
ml_bridge.py — Random Forest Inference Bridge untuk CBT Anti-Cheating
======================================================================
Dipanggil oleh Node.js via child_process spawn.
Input  : JSON feature vector via sys.argv[1]
Output : float antara 0.0 (aman) hingga 1.0 (sangat mencurigakan)
"""

import sys
import json
import os
import numpy as np

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'model.joblib')

FEATURE_NAMES = [
    'blur_count', 'hidden_count', 'forbidden_key_count', 'context_menu_count',
    'screenshot_attempt', 'devtools_open', 'copy_attempt', 'screen_share_detect',
    'window_resize_extreme', 'multi_touch_suspic', 'tab_switch_rapid', 'fullscreen_exit',
]

def rule_based_score(features: dict) -> float:
    """
    Skor berbasis aturan (fallback jika model tidak ada).
    Digunakan juga untuk validasi silang.
    """
    score = 0.0
    if features.get('screenshot_attempt', 0) >= 1:
        score += 0.45
    if features.get('devtools_open', 0) >= 1:
        score += 0.35
    if features.get('screen_share_detect', 0) >= 1:
        score += 0.50
    if features.get('forbidden_key_count', 0) >= 3:
        score += 0.25
    if features.get('blur_count', 0) >= 5:
        score += 0.20
    if features.get('copy_attempt', 0) >= 3:
        score += 0.20
    if features.get('tab_switch_rapid', 0) >= 3:
        score += 0.20
    if features.get('fullscreen_exit', 0) >= 2:
        score += 0.15
    if features.get('window_resize_extreme', 0) >= 2:
        score += 0.15
    if features.get('multi_touch_suspic', 0) >= 2:
        score += 0.20
    return min(1.0, score)


def predict(feature_json: str) -> float:
    try:
        features = json.loads(feature_json)
    except (json.JSONDecodeError, TypeError):
        # Legacy fallback: argv[1] = activity_type string
        activity = feature_json.strip().lower()
        legacy_map = {
            'blur': 0.40, 'forbidden_key': 0.70, 'context_menu': 0.25,
            'visibility_hidden': 0.35, 'screenshot_attempt': 0.90,
            'screen_share': 0.95, 'devtools_open': 0.80, 'copy_attempt': 0.50,
            'fullscreen_exit': 0.40, 'window_resize': 0.35,
        }
        return legacy_map.get(activity, 0.15)

    # Jika screenshot atau screen share → langsung tinggi
    if features.get('screenshot_attempt', 0) >= 1:
        return min(1.0, 0.85 + features.get('screenshot_attempt', 0) * 0.03)
    if features.get('screen_share_detect', 0) >= 1:
        return 0.95
    if features.get('devtools_open', 0) >= 2:
        return min(1.0, 0.75 + features.get('devtools_open', 0) * 0.05)

    # Coba load model joblib
    try:
        import joblib
        if os.path.exists(MODEL_PATH):
            bundle = joblib.load(MODEL_PATH)
            clf      = bundle['model']
            feat_ord = bundle['features']

            # Buat feature vector sesuai urutan model
            vector = [[float(features.get(f, 0)) for f in feat_ord]]
            proba  = clf.predict_proba(vector)[0]
            # proba[1] = probabilitas kelas 1 (Cheating)
            rf_score = float(proba[1])

            # Blending dengan rule-based untuk robustness
            rule_score = rule_based_score(features)
            final = 0.70 * rf_score + 0.30 * rule_score
            return round(min(1.0, max(0.0, final)), 4)
    except Exception:
        pass

    # Fallback: pure rule-based
    return round(rule_based_score(features), 4)


if __name__ == '__main__':
    if len(sys.argv) > 1:
        result = predict(sys.argv[1])
        print(result, flush=True)
    else:
        print(0.10, flush=True)
