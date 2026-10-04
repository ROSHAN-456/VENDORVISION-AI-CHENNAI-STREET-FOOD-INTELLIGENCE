"""
VendorVision AI - MVP crowd prediction model.

Trains two models on the synthetic dataset:
1. Regressor -> predicts expected footfall (used to derive wait time)
2. Classifier -> predicts crowd level (Low/Medium/High) directly for the
   customer-facing "how busy is this stall right now" feature.

Both use Random Forests since the dataset is small/tabular and RF gives
solid results with minimal tuning - good enough for an MVP demo.
"""

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.metrics import mean_absolute_error, r2_score, accuracy_score, classification_report
from sklearn.preprocessing import LabelEncoder

df = pd.read_csv("stall_footfall_data.csv")

# ---- Feature engineering ----
le_weather = LabelEncoder()
df["weather_enc"] = le_weather.fit_transform(df["weather"])

le_stall = LabelEncoder()
df["stall_enc"] = le_stall.fit_transform(df["stall_id"])

features = ["hour", "day_of_week", "is_weekend", "weather_enc", "stall_enc"]

# ======================================================
# MODEL 1: Footfall regression (-> used for wait time)
# ======================================================
X = df[features]
y_reg = df["footfall"]

X_train, X_test, y_train, y_test = train_test_split(X, y_reg, test_size=0.2, random_state=42)

reg = RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42)
reg.fit(X_train, y_train)
y_pred = reg.predict(X_test)

mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)
print("=== Footfall Regression ===")
print(f"MAE: {mae:.2f} customers")
print(f"R^2: {r2:.3f}\n")

# Feature importance chart
plt.figure(figsize=(6, 4))
importances = pd.Series(reg.feature_importances_, index=features).sort_values()
importances.plot(kind="barh", color="#7B9BD4")
plt.title("What drives footfall predictions (feature importance)")
plt.xlabel("Importance")
plt.tight_layout()
plt.savefig("feature_importance.png", dpi=150)
plt.close()

# Predicted vs actual chart
plt.figure(figsize=(6, 6))
plt.scatter(y_test, y_pred, alpha=0.4, color="#4C6EA8")
lims = [0, max(y_test.max(), y_pred.max()) + 5]
plt.plot(lims, lims, "r--", label="Perfect prediction")
plt.xlabel("Actual footfall")
plt.ylabel("Predicted footfall")
plt.title(f"Predicted vs Actual Footfall (R²={r2:.2f})")
plt.legend()
plt.tight_layout()
plt.savefig("predicted_vs_actual.png", dpi=150)
plt.close()

# ======================================================
# MODEL 2: Crowd level classification (Low/Medium/High)
# ======================================================
y_clf = df["crowd_level"]
X_train2, X_test2, y_train2, y_test2 = train_test_split(X, y_clf, test_size=0.2, random_state=42, stratify=y_clf)

clf = RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42)
clf.fit(X_train2, y_train2)
y_pred2 = clf.predict(X_test2)

acc = accuracy_score(y_test2, y_pred2)
print("=== Crowd Level Classification ===")
print(f"Accuracy: {acc:.3f}")
print(classification_report(y_test2, y_pred2))

# ======================================================
# Demo: predict for a specific stall/time (what the app would call)
# ======================================================
def predict_crowd(stall_id, hour, day_of_week, weather):
    is_weekend = 1 if day_of_week >= 5 else 0
    weather_enc = le_weather.transform([weather])[0]
    stall_enc = le_stall.transform([stall_id])[0]
    row = pd.DataFrame([{
        "hour": hour, "day_of_week": day_of_week, "is_weekend": is_weekend,
        "weather_enc": weather_enc, "stall_enc": stall_enc
    }])
    footfall_pred = reg.predict(row)[0]
    crowd_pred = clf.predict(row)[0]
    wait_est = round(max(0, (footfall_pred - 25) / 25) * 20, 1)
    return footfall_pred, crowd_pred, wait_est

print("\n=== Sample predictions (what the app would show a customer) ===")
samples = [
    ("S2", 13, 5, "Clear"),   # T Nagar Dosa, Saturday lunch, clear
    ("S2", 13, 5, "Rain"),    # same but raining
    ("S4", 10, 1, "Cloudy"),  # Adyar Juice, Tuesday morning
    ("S5", 20, 6, "Clear"),   # Avadi Bhajji, Sunday dinner peak
]
for stall_id, hour, dow, weather in samples:
    footfall, crowd, wait = predict_crowd(stall_id, hour, dow, weather)
    name = df[df.stall_id == stall_id].stall_name.iloc[0]
    day_name = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][dow]
    print(f"{name} | {day_name} {hour}:00 | {weather} -> "
          f"Predicted footfall: {footfall:.0f}, Crowd level: {crowd}, Est. wait: {wait} min")

# Save models info for reference
import joblib
joblib.dump({"reg": reg, "clf": clf, "le_weather": le_weather, "le_stall": le_stall},
            "models.pkl")
print("\nModels saved to models.pkl")