"""
train_model.py — Random Forest Training Script untuk CBT Anti-Cheating
=======================================================================
Melatih model RandomForestClassifier dengan 12 fitur perilaku siswa.
Output: backend/model.joblib

Fitur (12 dimensi):
  0  blur_count           — berapa kali focus hilang
  1  hidden_count         — berapa kali halaman disembunyikan
  2  forbidden_key_count  — penggunaan tombol terlarang (Ctrl+C, F12, dll)
  3  context_menu_count   — klik kanan
  4  screenshot_attempt   — PrintScreen / Snipping Tool
  5  devtools_open        — Developer Tools terdeteksi
  6  copy_attempt         — clipboard copy terdeteksi
  7  screen_share_detect  — screen sharing via WebRTC
  8  window_resize_extreme— resize ekstrem (indikasi DevTools)
  9  multi_touch_suspic   — multi-touch mencurigakan (mobile)
  10 tab_switch_rapid     — berpindah tab sangat cepat (< 2 detik)
  11 fullscreen_exit      — keluar dari fullscreen
"""

import os
import sys
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib

# ── Path output model ──────────────────────────────────────────
SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
OUTPUT_PATH = os.path.join(SCRIPT_DIR, 'backend', 'model.joblib')

FEATURE_NAMES = [
    'blur_count', 'hidden_count', 'forbidden_key_count', 'context_menu_count',
    'screenshot_attempt', 'devtools_open', 'copy_attempt', 'screen_share_detect',
    'window_resize_extreme', 'multi_touch_suspic', 'tab_switch_rapid', 'fullscreen_exit',
]

def generate_synthetic_data(n_samples: int = 3000) -> pd.DataFrame:
    """
    Generate synthetic training data yang realistis.
    Label:
      0 = Normal   (jujur)
      1 = Cheating (curang)
    """
    rng = np.random.default_rng(42)

    rows = []

    # ── KELOMPOK 1: Siswa jujur (60% data) ──────────────────────
    n_normal = int(n_samples * 0.60)
    for _ in range(n_normal):
        row = {
            'blur_count':           rng.integers(0, 2),   # sesekali blur, wajar
            'hidden_count':         rng.integers(0, 2),
            'forbidden_key_count':  rng.integers(0, 1),
            'context_menu_count':   rng.integers(0, 1),
            'screenshot_attempt':   0,
            'devtools_open':        0,
            'copy_attempt':         rng.integers(0, 1),
            'screen_share_detect':  0,
            'window_resize_extreme':0,
            'multi_touch_suspic':   rng.integers(0, 1),
            'tab_switch_rapid':     0,
            'fullscreen_exit':      rng.integers(0, 1),
            'label':                0,
        }
        rows.append(row)

    # ── KELOMPOK 2: Curang via screenshot (15%) ──────────────────
    n_ss = int(n_samples * 0.15)
    for _ in range(n_ss):
        row = {
            'blur_count':           rng.integers(1, 5),
            'hidden_count':         rng.integers(1, 4),
            'forbidden_key_count':  rng.integers(1, 4),
            'context_menu_count':   rng.integers(0, 2),
            'screenshot_attempt':   rng.integers(1, 6),   # ← high
            'devtools_open':        0,
            'copy_attempt':         rng.integers(0, 3),
            'screen_share_detect':  rng.integers(0, 2),
            'window_resize_extreme':0,
            'multi_touch_suspic':   rng.integers(0, 2),
            'tab_switch_rapid':     rng.integers(1, 4),
            'fullscreen_exit':      rng.integers(1, 3),
            'label':                1,
        }
        rows.append(row)

    # ── KELOMPOK 3: Curang via DevTools / copy-paste (15%) ───────
    n_dt = int(n_samples * 0.15)
    for _ in range(n_dt):
        row = {
            'blur_count':           rng.integers(2, 7),
            'hidden_count':         rng.integers(1, 5),
            'forbidden_key_count':  rng.integers(3, 10),  # ← high
            'context_menu_count':   rng.integers(1, 5),
            'screenshot_attempt':   0,
            'devtools_open':        rng.integers(1, 4),   # ← high
            'copy_attempt':         rng.integers(2, 8),   # ← high
            'screen_share_detect':  0,
            'window_resize_extreme':rng.integers(1, 5),   # ← high
            'multi_touch_suspic':   rng.integers(0, 2),
            'tab_switch_rapid':     rng.integers(2, 8),
            'fullscreen_exit':      rng.integers(1, 4),
            'label':                1,
        }
        rows.append(row)

    # ── KELOMPOK 4: Curang via screen share / mobile (10%) ───────
    n_mob = int(n_samples * 0.10)
    for _ in range(n_mob):
        row = {
            'blur_count':           rng.integers(3, 8),
            'hidden_count':         rng.integers(3, 8),
            'forbidden_key_count':  rng.integers(0, 3),
            'context_menu_count':   rng.integers(0, 2),
            'screenshot_attempt':   rng.integers(1, 4),
            'devtools_open':        0,
            'copy_attempt':         rng.integers(0, 3),
            'screen_share_detect':  rng.integers(1, 3),   # ← high
            'window_resize_extreme':rng.integers(0, 2),
            'multi_touch_suspic':   rng.integers(2, 6),   # ← high
            'tab_switch_rapid':     rng.integers(3, 9),
            'fullscreen_exit':      rng.integers(2, 6),
            'label':                1,
        }
        rows.append(row)

    df = pd.DataFrame(rows)
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    return df


def train():
    print("=" * 60)
    print("  CBT Anti-Cheat — Random Forest Training")
    print("=" * 60)

    # 1. Generate data
    print(f"\n[1] Generating {3000} synthetic training samples...")
    df = generate_synthetic_data(3000)
    print(f"     Normal   : {(df.label == 0).sum()} sampel")
    print(f"     Cheating : {(df.label == 1).sum()} sampel")

    X = df[FEATURE_NAMES]
    y = df['label']

    # 2. Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # 3. Train
    print("\n[2] Training RandomForestClassifier (n_estimators=200, max_depth=10)...")
    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        min_samples_split=5,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(X_train, y_train)

    # 4. Evaluate
    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"\n[3] Evaluasi pada test set ({len(X_test)} sampel):")
    print(f"     Accuracy : {acc:.4f} ({acc*100:.1f}%)")
    print("\n     Classification Report:")
    print(classification_report(y_test, y_pred, target_names=['Normal', 'Cheating']))

    # 5. Feature importance
    importances = clf.feature_importances_
    print("     Top Feature Importances:")
    fi = sorted(zip(FEATURE_NAMES, importances), key=lambda x: -x[1])
    for name, imp in fi[:6]:
        bar = '█' * int(imp * 50)
        print(f"       {name:<25} {imp:.4f}  {bar}")

    # 6. Save
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    joblib.dump({'model': clf, 'features': FEATURE_NAMES}, OUTPUT_PATH)
    print(f"\n[4] Model disimpan ke: {OUTPUT_PATH}")
    print("=" * 60)
    print("  Training selesai! Jalankan backend untuk mulai inferensi.")
    print("=" * 60)


if __name__ == '__main__':
    train()
