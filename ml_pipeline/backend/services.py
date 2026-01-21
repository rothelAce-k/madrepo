import os
import pandas as pd
import numpy as np
import joblib
import json
import time
from typing import Dict, List, Optional
import sys
import asyncio

# Import utility functions
from utils import format_rul_display, get_realistic_drivers, get_segment_summary, calculate_health_score


# Hack to import from sibling src directory
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))
# Ensure FeatureEngineer is importable - assumes ml_pipeline/src contains feature_engineering.py
try:
    from feature_engineering import FeatureEngineer
except ImportError:
    # If standard import fails, try relative import trick
    pass

class MLService:
    def __init__(self, model_dir):
        self.model_dir = model_dir
        self.model = None
        self.scaler = None
        self.feature_engineer = None
        self.feature_names = None
        
    def load_models(self):
        """Load XGBoost model and Scaler from disk."""
        model_path = os.path.join(self.model_dir, "rul_model.pkl")
        scaler_path = os.path.join(self.model_dir, "feature_scaler.pkl")
        
        print(f"Loading Model from {model_path}...")
        self.model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path)
        
        # Initialize Feature Engineer logic
        self.feature_engineer = FeatureEngineer()
        
        # Extract feature names from scaler or dummy run?
        # Ideally we should have saved feature names. 
        # For now, we rely on FeatureEngineer to produce consistent columns.
        print("ML Models Loaded Successfully.")

    def predict_rul(self, daily_aggregated_data: pd.DataFrame) -> float:
        """
        Predict RUL given a single row of DAILY aggregated data.
        Input DF must have columns: pressure_A, flow_A, ... (raw daily avgs).
        """
        if self.model is None:
            return 365.0 # Fallback
            
        try:
            # 1. Engineer Features (Raw -> 105 Features)
            # FeatureEngineer expects a DataFrame with history to calculate rolling avgs.
            # But here we assume 'daily_aggregated_data' MIGHT contain history or we manage history state externally.
            # CRITICAL: FeatureEngineer needs HISTORY to work (rolling 90d).
            # The Aggregator (SimulationManager) should pass a Window of data, not just 1 row.
            
            # Use the full dataframe passed in (which should include history)
            features_df = self.feature_engineer.engineer_features(daily_aggregated_data)
            
            # Take the LAST row (the current day)
            current_features = features_df.iloc[[-1]] 
            
            # 2. Filter Columns (Keep only numeric features model expects)
            # We need to drop metadata like 'scenario_id', 'RUL', 'date', 'day'
            # The model expects strictly the columns it was trained on.
            # The Scaler handles ordering if names match? No, scaler returns array. 
            # We must ensure columns match scaler input.
            
            # Hack: Get columns by excluding known non-features
            train_cols = [c for c in current_features.columns if c not in ['scenario_id', 'day', 'date', 'RUL']]
            X = current_features[train_cols].values
            
            if X.shape[1] != self.scaler.n_features_in_:
                print(f"Feature Mismatch! Expected {self.scaler.n_features_in_}, Got {X.shape[1]}")
                # Try to auto-fix/pad or fail safely
                return 0.0
                
            # 3. Scale
            X_scaled = self.scaler.transform(X)
            
            # 4. Predict
            rul = self.model.predict(X_scaled)[0]
            
            # 5. Extract Feature Importance (Drivers)
            # (Simplified: Random top features for now, or true SHAP if we had it. 
            # Real implementation would use TreeExplainer here, but expensive for 2s loop.
            # We will approximate drivers based on values exceeding thresholds.)
            
            return float(rul)
        except Exception as e:
            print(f"Prediction Error: {e}")
            return 0.0


class SimulationManager:
    def __init__(self, data_dir):
        self.data_dir = data_dir
        self.scenarios = {} # {'A-B': df, 'B-C': df}
        self.current_day = 180
        self.speed_multiplier = 1.0 # 1 sec = 1 day logic? No, 2s ticks.
        # Logic: 
        # Day 1 -> 180: Pre-loaded.
        # Day 181+: Live Simulation.
        # We index into the pre-generated dataframe to simulating "Live" data coming in.
        
        self.running = True
        self.last_update_time = time.time()
        
    def load_scenarios(self):
        """Load the 4 Golden CSVs."""
        files = {
            'A-B': 'history_AB.csv', 
            'B-C': 'history_BC.csv', 
            'C-D': 'history_CD.csv', 
            'D-E': 'history_DE.csv'
        }
        print(f"\n{'='*60}")
        print(f"LOADING CSV FILES FROM: {self.data_dir}")
        print(f"{'='*60}")
        
        for seg, filename in files.items():
            path = os.path.join(self.data_dir, filename)
            if os.path.exists(path):
                df = pd.read_csv(path)
                self.scenarios[seg] = df
                
                # DEBUG: Show RUL range
                rul_min = df['RUL'].min()
                rul_max = df['RUL'].max()
                day180_rul = df[df['day']==180]['RUL'].values[0] if len(df[df['day']==180]) > 0 else 'N/A'
                
                print(f"[OK] Loaded {seg}: {len(df)} rows")
                print(f"  RUL range: {rul_min:.1f} - {rul_max:.1f} days")
                print(f"  Day 180 RUL: {day180_rul}")
            else:
                print(f"[ERROR] Warning: {path} not found.")
        
        print(f"{'='*60}\n")

    def get_history(self, segment_id):
        """Get history up to current_day."""
        if segment_id not in self.scenarios: return None
        df = self.scenarios[segment_id]
        # Return only up to current_day
        mask = df['day'] <= self.current_day
        # Limit to last 180 days for UI
        subset = df[mask].tail(180)
        
        # Format for Recharts: [{day: 'Day 1', score: 98}, ...]
        result = []
        for _, row in subset.iterrows():
            # Convert RUL to Health Score using segment-specific calculation
            score = calculate_health_score(row['RUL'], segment_id)
            
            # Parse corrosion from sensor_a JSON
            try:
                import ast
                sensor_a_str = str(row.get('sensor_a', '{}'))
                sensor_a = ast.literal_eval(sensor_a_str) if sensor_a_str != 'nan' else {}
                corrosion_val = sensor_a.get('corrosion', 0)
            except:
                corrosion_val = 0
            
            result.append({
                "day": f"Day {int(row['day'])}",
                "score": round(float(score), 1),
                "rul": round(float(row['RUL']), 1), 
                "corrosion": round(float(corrosion_val), 4)
            })
        return result

    def get_latest_health(self):
        """Get snapshot of all segments at current_day with enhanced data."""
        snapshot = {}
        for seg, df in self.scenarios.items():
            # Find row for current_day
            row = df[df['day'] == int(self.current_day)]
            if row.empty:
                # If simulation ended, take last
                row = df.iloc[[-1]]
            
            # Extract raw RUL
            rul_raw = float(row['RUL'].values[0])
            
            # Format RUL for display
            rul_info = format_rul_display(rul_raw)
            
            # Calculate health score (segment-specific)
            score = calculate_health_score(rul_raw, seg)
            
            # Get sensor data for driver calculation
            row_data = row.iloc[0]
            
            # Parse sensor data from JSON string
            try:
                import json
                import ast
                sensor_a_str = str(row_data['sensor_a'])
                # Try to parse as dict (it's stored as string representation of dict)
                sensor_a = ast.literal_eval(sensor_a_str) if sensor_a_str != 'nan' else {}
                
                sensor_data = {
                    'pressure_A': float(sensor_a.get('pressure', 0)),
                    'flow_A': float(sensor_a.get('flow', 0)),
                    'corrosion_A': float(sensor_a.get('corrosion', 0))
                }
            except Exception as e:
                # Fallback to default values if parsing fails
                sensor_data = {
                    'pressure_A': 0.0,
                    'flow_A': 0.0,
                    'corrosion_A': 0.0
                }
            
            # Get realistic drivers for this segment
            drivers_list = get_realistic_drivers(seg, int(self.current_day), sensor_data)
            
            # Get status and summary
            summary_info = get_segment_summary(seg, rul_info, drivers_list)
            
            # Determine overall status for backward compatibility
            status = 'Good'
            if rul_info['urgency'] == 'critical':
                status = 'Critical'
            elif rul_info['urgency'] in ['high', 'medium']:
                status = 'Warning'
                
            snapshot[seg] = {
                "rul": rul_raw,  # Keep raw for calculations
                "rul_display": rul_info,  # Formatted display info
                "health_score": round(score, 1),
                "status": status,
                "status_detail": summary_info['status'],
                "summary": summary_info['summary'],
                "drivers": drivers_list,  # Full driver objects
                "driver_names": [d['name'] for d in drivers_list],  # Simple list for backward compat
                "last_updated": summary_info['last_updated'],
                "data_source": summary_info['data_source']
            }
        return snapshot

    def safe_float(self, val, default=0.0):
        try:
            f = float(val)
            if np.isnan(f) or np.isinf(f): return default
            return f
        except:
            return default

    def get_current_state(self):
        """Return the RAW sensor readings for the current moment (simulated)."""
        # This streams the 'Day' row as if it were a 2-second live tick.
        readings = {}
        for seg, df in self.scenarios.items():
            row = df[df['day'] == int(self.current_day)]
            if row.empty:
                row = df.iloc[[-1]]
            
            row_data = row.iloc[0]
            
            # Parse sensor data from JSON
            try:
                import ast
                sensor_a_str = str(row_data.get('sensor_a', '{}'))
                sensor_a = ast.literal_eval(sensor_a_str) if sensor_a_str != 'nan' else {}
            except:
                sensor_a = {}
            
            # Get latest health info for summary and status
            latest_health_snapshot = self.get_latest_health()
            segment_health_info = latest_health_snapshot.get(seg, {})
            
            readings[seg] = {
                "day": int(self.current_day),
                "rul": float(row_data['RUL']),
                "pressure": self.safe_float(sensor_a.get('pressure', 0)),
                "flow": self.safe_float(sensor_a.get('flow', 0)),
                "corrosion": self.safe_float(sensor_a.get('corrosion', 0)),
                "temperature": self.safe_float(sensor_a.get('temperature', 0)),
                "vibration": self.safe_float(sensor_a.get('acoustic', 0)),
                "summary": segment_health_info.get('summary', 'N/A'),
                "status": segment_health_info.get('status_detail', 'N/A')
            }
        
        return {
            "timestamp": time.strftime("%H:%M:%S"),
            "day_index": int(self.current_day),
            "segments": readings,
            "system_health": self.get_latest_health()
        }

    async def run_loop(self, ml_service):
        """Background loop to advance time."""
        while True:
            if self.running and self.speed_multiplier > 0:
                # Advance day every 'X' seconds
                # Real simulation would be complex.
                # Demo Logic: Increment day every 2 seconds * multiplier
                
                self.current_day += 1
                
                # Loop back if end of data
                if self.current_day > 730:
                    self.current_day = 180 # Loop back to start of demo
                    
                # In a real system, here we would:
                # 1. Get new 2s tick.
                # 2. Add to aggregator.
                # 3. If day complete, call ml_service.predict_rul(agg_data).
                
            await_time = 5.0 # Update "Day" every 5 seconds for demo pacing
            await asyncio.sleep(await_time)

    def set_speed(self, speed):
        self.speed_multiplier = speed

    def reset(self):
        self.current_day = 180
        self.running = True
        
    def get_status(self):
        return "Running" if self.running else "Paused"
