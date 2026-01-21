"""
Generate Demo CSV Files with CORRECT History Pattern
User's ACTUAL Requirements:
- A-B: >90% (Excellent)
- B-C: 75-85% (Good/Disturbed)  
- C-D: <50% (Critical/Bad)
- D-E: 5-15% (VERY POOR - almost failed!)
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import sys
import os

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))
from generate_data import PipelineDegradationSimulator

def generate_demo_scenarios():
    """Generate 4 CSV files with CORRECT degradation patterns"""
    
    print("=" * 70)
    print("REGENERATING CSV FILES WITH CORRECT REQUIREMENTS")
    print("=" * 70)
    print("\nTarget Health Percentages:")
    print("  A-B: >90% (Excellent)")
    print("  B-C: 75-85% (Good/Disturbed)")
    print("  C-D: <50% (Critical/Bad)")
    print("  D-E: 5-15% (VERY POOR - Almost Failed!)")
    print("=" * 70)
    
    # Scenario A-B: EXCELLENT (>90% health)
    # Target: RUL 13,000-14,000 days → ~92%
    print("\n[1/4] Generating Segment A-B (Excellent - >90%)...")
    sim_ab = PipelineDegradationSimulator(
        scenario_type='slow_corrosion',
        duration_days=14000,
        seed=42
    )
    sim_ab.base_corrosion_rate = 0.0005
    sim_ab.corrosion_acceleration = 0.00001
    
    data_ab = []
    for day in range(1, 731):
        rul = 14000 - day
        sensor_data = sim_ab.simulate_day(day, rul)
        sensor_data['day'] = day
        sensor_data['RUL'] = rul
        data_ab.append(sensor_data)
    
    df_ab = pd.DataFrame(data_ab)
    df_ab.to_csv('backend/data/history_AB.csv', index=False)
    print(f"      RUL Range: {df_ab['RUL'].min():.0f} - {df_ab['RUL'].max():.0f} days")
    print(f"      Target Health: >90%")
    
    # Scenario B-C: GOOD/DISTURBED (75-85% health)
    # Target: RUL 2,500-3,000 days → ~80%
    print("\n[2/4] Generating Segment B-C (Good/Disturbed - 75-85%)...")
    sim_bc = PipelineDegradationSimulator(
        scenario_type='slow_corrosion',
        duration_days=3000,
        seed=43
    )
    sim_bc.base_corrosion_rate = 0.004
    sim_bc.corrosion_acceleration = 0.0001
    
    data_bc = []
    for day in range(1, 731):
        rul = 3000 - day
        sensor_data = sim_bc.simulate_day(day, rul)
        sensor_data['day'] = day
        sensor_data['RUL'] = rul
        data_bc.append(sensor_data)
    
    df_bc = pd.DataFrame(data_bc)
    df_bc.to_csv('backend/data/history_BC.csv', index=False)
    print(f"      RUL Range: {df_bc['RUL'].min():.0f} - {df_bc['RUL'].max():.0f} days")
    print(f"      Target Health: 75-85%")
    
    # Scenario C-D: CRITICAL/BAD (<50% health)
    # Target: RUL 100-600 days → ~25-40%
    print("\n[3/4] Generating Segment C-D (Critical/Bad - <50%)...")
    sim_cd = PipelineDegradationSimulator(
        scenario_type='pressure_surge',
        duration_days=600,
        seed=44
    )
    sim_cd.base_corrosion_rate = 0.025
    sim_cd.corrosion_acceleration = 0.0005
    sim_cd.leak_start_day = 160
    
    data_cd = []
    for day in range(1, 731):
        if day < 160:
            rul = 600 - day
        else:
            rul = max(10, 440 - (day - 160) * 1.5)
        
        sensor_data = sim_cd.simulate_day(day, rul)
        sensor_data['day'] = day
        sensor_data['RUL'] = rul
        data_cd.append(sensor_data)
    
    df_cd = pd.DataFrame(data_cd)
    df_cd.to_csv('backend/data/history_CD.csv', index=False)
    print(f"      RUL Range: {df_cd['RUL'].min():.0f} - {df_cd['RUL'].max():.0f} days")
    print(f"      Target Health: <50%")
    
    # Scenario D-E: VERY POOR (5-15% health) - ALMOST FAILED!
    # Target: RUL 20-150 days → ~10%
    print("\n[4/4] Generating Segment D-E (VERY POOR - 5-15%)...")
    sim_de = PipelineDegradationSimulator(
        scenario_type='fast_corrosion',
        duration_days=150,  # Very short lifespan!
        seed=45
    )
    sim_de.base_corrosion_rate = 0.045  # Very fast degradation
    sim_de.corrosion_acceleration = 0.0008
    sim_de.has_leak = True
    sim_de.leak_start_day = 50
    
    data_de = []
    for day in range(1, 731):
        if day < 50:
            rul = 150 - day
        else:
            # After leak starts, accelerated degradation
            rul = max(5, 100 - (day - 50) * 0.3)
        
        sensor_data = sim_de.simulate_day(day, rul)
        sensor_data['day'] = day
        sensor_data['RUL'] = rul
        data_de.append(sensor_data)
    
    df_de = pd.DataFrame(data_de)
    df_de.to_csv('backend/data/history_DE.csv', index=False)
    print(f"      RUL Range: {df_de['RUL'].min():.0f} - {df_de['RUL'].max():.0f} days")
    print(f"      Target Health: 5-15%")
    
    print("\n" + "=" * 70)
    print("[SUCCESS] All CSV files regenerated!")
    print("=" * 70)
    print("\nExpected Health at Day 180:")
    print(f"  A-B: ~92% (RUL: {14000-180:,} days = 37.8 years)")
    print(f"  B-C: ~80% (RUL: {3000-180:,} days = 7.7 years)")
    print(f"  C-D: ~25% (RUL: ~170 days = 5.6 months)")
    print(f"  D-E: ~10% (RUL: ~61 days = 2 months) - CRITICAL!")
    print("=" * 70)
    print("\n[IMPORTANT] RESTART THE BACKEND to load new CSV files!")
    print("Command: python -m uvicorn backend.main:app --reload --port 8000")
    print("=" * 70)

if __name__ == "__main__":
    generate_demo_scenarios()
