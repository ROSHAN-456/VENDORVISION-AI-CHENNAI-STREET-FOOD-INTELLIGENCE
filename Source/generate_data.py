"""
Generates a synthetic dataset for VendorVision AI's crowd-prediction MVP.

Since real vendor footfall / POS data isn't available yet, this creates a
realistic proxy dataset with known patterns (lunch/dinner peaks, weekend
boost, rain reducing footfall) so the ML model has something believable
to learn from. Swap this out for real POS/footfall-sensor data later.
"""

import numpy as np
import pandas as pd

np.random.seed(42)

STALLS = [
    {"stall_id": "S1", "name": "Anna Nagar Chaat Corner", "lat": 13.0850, "lon": 80.2101, "base_popularity": 1.3},
    {"stall_id": "S2", "name": "T Nagar Dosa Point",      "lat": 13.0418, "lon": 80.2341, "base_popularity": 1.6},
    {"stall_id": "S3", "name": "Velachery Kabab Stall",   "lat": 12.9791, "lon": 80.2183, "base_popularity": 1.0},
    {"stall_id": "S4", "name": "Adyar Juice & Snacks",    "lat": 13.0012, "lon": 80.2565, "base_popularity": 0.9},
    {"stall_id": "S5", "name": "Avadi Evening Bhajji Cart","lat": 13.1147,"lon": 80.0970, "base_popularity": 1.1},
]

WEATHER_OPTIONS = ["Clear", "Cloudy", "Rain", "Hot"]
WEATHER_EFFECT = {"Clear": 1.0, "Cloudy": 0.95, "Rain": 0.55, "Hot": 0.85}

def hour_effect(hour):
    # Two peaks: lunch (~13h) and dinner (~20h), quiet late night/morning
    lunch = np.exp(-((hour - 13) ** 2) / (2 * 2.0 ** 2))
    dinner = np.exp(-((hour - 20) ** 2) / (2 * 2.5 ** 2))
    base = 0.15
    return base + 0.85 * lunch + 1.0 * dinner

def generate_dataset(days=60, hours_per_day=range(10, 23)):
    rows = []
    start_date = pd.Timestamp("2026-04-01")

    for day_offset in range(days):
        date = start_date + pd.Timedelta(days=day_offset)
        day_of_week = date.dayofweek  # 0=Mon
        is_weekend = 1 if day_of_week >= 5 else 0
        weather = np.random.choice(WEATHER_OPTIONS, p=[0.45, 0.25, 0.15, 0.15])

        for hour in hours_per_day:
            for stall in STALLS:
                weekend_boost = 1.25 if is_weekend else 1.0
                noise = np.random.normal(1.0, 0.12)

                expected_footfall = (
                    30
                    * stall["base_popularity"]
                    * hour_effect(hour)
                    * WEATHER_EFFECT[weather]
                    * weekend_boost
                    * noise
                )
                footfall = max(0, int(round(expected_footfall)))

                # Derive queue/wait time roughly from footfall (capacity ~ 8 people served/hr per stall)
                capacity_per_hour = 25
                wait_minutes = round(max(0, (footfall - capacity_per_hour) / capacity_per_hour) * 20, 1)

                if footfall < 15:
                    crowd_level = "Low"
                elif footfall < 30:
                    crowd_level = "Medium"
                else:
                    crowd_level = "High"

                rows.append({
                    "date": date.date().isoformat(),
                    "day_of_week": day_of_week,
                    "is_weekend": is_weekend,
                    "hour": hour,
                    "weather": weather,
                    "stall_id": stall["stall_id"],
                    "stall_name": stall["name"],
                    "lat": stall["lat"],
                    "lon": stall["lon"],
                    "footfall": footfall,
                    "wait_minutes": wait_minutes,
                    "crowd_level": crowd_level,
                })

    return pd.DataFrame(rows)

if __name__ == "__main__":
    df = generate_dataset()
    df.to_csv("stall_footfall_data.csv", index=False)
    print(f"Generated {len(df)} rows")
    print(df.head(10))
    print("\nCrowd level distribution:")
    print(df["crowd_level"].value_counts())