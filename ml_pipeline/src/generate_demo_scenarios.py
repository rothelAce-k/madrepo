"""
Generate Demo Scenarios
=======================

Generates 4 distinct 'Golden Scenario' CSV files for the P-Health Demo.
1. Segment A-B: Healthy (Good)
2. Segment B-C: Warning (Fast Corrosion)
3. Segment C-D: Critical (Leak/Pressure Surge)
4. Segment D-E: Stable (Fatigue)
"""

import sys
import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from generate_data import PipelineDegradationSimulator

def generate_golden_scenarios():
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'backend', 'data')
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Generating Golden Scenarios in {output_dir}...")

    # ==========================================
    # 1. Segment A-B: HEALTHY (Slow Corrosion)
    # ==========================================
    print("\nGenerating Segment A-B (Healthy)...")
    sim_ab = PipelineDegradationSimulator(
        scenario_type="slow_corrosion",
        duration_days=730,
        seed=42,
        initial_conditions={'pressure': 5.5, 'flow': 100, 'wall_thickness': 10.0}, # 5.5 bar ~ 80 psi
        degradation_rates={'corrosion': 0.0005}, 
        noise_level=0.01
    )
    df_ab = sim_ab.simulate_all() # Need to add simulate_all or loop manually?
    # The class has `simulate_day`. It does NOT have `simulate()` logic like I assumed in the new script using `sim_ab.simulate()`. 
    # `generate_scenario` function in generate_data.py has the loop.
    # I should expose a `simulate()` method in the class or write the loop in the script.
    # Let's add a `simulate()` method to the class in generate_data.py first to make it cleaner.
    pass

def run_simulation_loop(simulator):
    data = []
    wall_thickness = simulator.initial_wall_thickness
    current_date = datetime(2024, 1, 1)
    
    for day in range(1, simulator.duration_days + 1):
        result = simulator.simulate_day(day, wall_thickness)
        wall_thickness = result['wall_thickness']
        
        row = {
            'day': day,
            'date': current_date,
            'pressure_A': result['sensor_a']['pressure'],
            'flow_A': result['sensor_a']['flow'],
            'corrosion_A': result['sensor_a']['corrosion'],
            'acoustic_A': result['sensor_a']['acoustic'],
            'temperature_A': result['sensor_a']['temperature'],
            'pressure_B': result['sensor_b']['pressure'],
            'flow_B': result['sensor_b']['flow'],
            'corrosion_B': result['sensor_b']['corrosion'],
            'acoustic_B': result['sensor_b']['acoustic'],
            'temperature_B': result['sensor_b']['temperature'],
            'RUL': result['rul']
        }
        data.append(row)
        current_date += timedelta(days=1)
    return pd.DataFrame(data)

def generate_golden_scenarios():
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'backend', 'data')
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Generating Golden Scenarios in {output_dir}...")

    # 1. A-B
    print("Generating A-B...")
    sim_ab = PipelineDegradationSimulator("slow_corrosion", 730, seed=42, 
        initial_conditions={'pressure': 5.5, 'flow': 100}, degradation_rates={'corrosion': 0.0005})
    df_ab = run_simulation_loop(sim_ab)
    df_ab['scenario_id'] = 'A-B'
    df_ab['RUL'] = df_ab['RUL'].clip(lower=400)
    df_ab.to_csv(os.path.join(output_dir, 'history_AB.csv'), index=False)

    # 2. B-C
    print("Generating B-C...")
    sim_bc = PipelineDegradationSimulator("fast_corrosion", 730, seed=101, 
        initial_conditions={'pressure': 5.4, 'flow': 98}, degradation_rates={'corrosion': 0.005})
    df_bc = run_simulation_loop(sim_bc)
    df_bc['scenario_id'] = 'B-C'
    df_bc['RUL'] = df_bc['RUL'] * 0.7
    df_bc.to_csv(os.path.join(output_dir, 'history_BC.csv'), index=False)

    # 3. C-D
    print("Generating C-D...")
    sim_cd = PipelineDegradationSimulator("pressure_surge", 730, seed=666, 
        initial_conditions={'pressure': 5.2, 'flow': 95})
    df_cd = run_simulation_loop(sim_cd)
    df_cd['scenario_id'] = 'C-D'
    
    # Inject FAILURE
    mask_fail = df_cd['day'] > 160
    df_cd.loc[mask_fail, 'pressure_A'] *= 0.7
    df_cd.loc[mask_fail, 'pressure_B'] *= 0.4
    df_cd.loc[mask_fail, 'flow_A'] *= 1.2
    df_cd.loc[mask_fail, 'flow_B'] *= 0.6
    df_cd.loc[mask_fail, 'RUL'] *= 0.1
    df_cd.to_csv(os.path.join(output_dir, 'history_CD.csv'), index=False)

    # 4. D-E
    print("Generating D-E...")
    sim_de = PipelineDegradationSimulator("fatigue", 730, seed=99, 
        initial_conditions={'pressure': 4.8, 'flow': 90})
    df_de = run_simulation_loop(sim_de)
    df_de['scenario_id'] = 'D-E'
    df_de.to_csv(os.path.join(output_dir, 'history_DE.csv'), index=False)
    
    print("Done.")

if __name__ == "__main__":
    generate_golden_scenarios()
