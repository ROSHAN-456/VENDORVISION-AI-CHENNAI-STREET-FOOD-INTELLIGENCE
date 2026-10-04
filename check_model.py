import pandas as pd
import joblib

# Check CSV
df = pd.read_csv(r"Source/stall_footfall_data.csv")
print("Shape:", df.shape)
print("Columns:", list(df.columns))
print("\nUnique stalls:")
print(df[["stall_id","stall_name","lat","lon"]].drop_duplicates().to_string(index=False))

# Check model
m = joblib.load(r"Source/models.pkl")
print("\nModel keys:", list(m.keys()))
print("le_stall classes:", list(m["le_stall"].classes_))
print("le_weather classes:", list(m["le_weather"].classes_))
print("\nAll checks passed!")
