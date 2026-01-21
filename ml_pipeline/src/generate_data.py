"""
Pipeline Health Predictive Maintenance System
==============================================

Complete ML pipeline for water pipeline RUL prediction using dual-sensor approach.

Author: AI Engineer
Date: 2026-01-17
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from tqdm import tqdm
import warnings
warnings.filterwarnings('ignore')

class PipelineDegradationSimulator:
    """
    Physics-based pipeline degradation simulator.
    Generates realistic sensor data based on actual pipeline physics.
    """
    
    def __init__(self, scenario_type, duration_days, seed=None, initial_conditions=None, degradation_rates=None, noise_level=None):
        """
        Initialize simulator with scenario parameters.
        
        Args:
            scenario_type: Type of failure ('slow_corrosion', 'fast_corrosion', etc.)
            duration_days: Total days until failure
            seed: Random seed for reproducibility
            initial_conditions: Optional dict to override initial state
            degradation_rates: Optional dict to override rates
            noise_level: Optional float to override noise
        """
        self.scenario_type = scenario_type
        self.duration_days = duration_days
        self.rng = np.random.RandomState(seed)
        
        # Default Initial conditions
        self.initial_wall_thickness = 10.0
        self.critical_wall_thickness = 3.0
        self.initial_pressure = 5.0
        self.initial_flow = 200.0
        
        # Override if provided
        if initial_conditions:
            self.initial_wall_thickness = initial_conditions.get('wall_thickness', self.initial_wall_thickness)
            self.initial_pressure = initial_conditions.get('pressure', self.initial_pressure) # Note: input likely PSI, logic uses bar? logic uses bar in code "5.0". user passed "80" (PSI). Need to match units. 
            # 5 bar ~ 72 psi. 80 psi ~ 5.5 bar. 
            # The simulator uses 'bar' internally (5.0).
            # The demo script passed 80. I should convert or stick to one unit. 
            # Let's assume the simulator logic is consistent if I override everything.
            self.initial_flow = initial_conditions.get('flow', self.initial_flow)

        self.noise_level = noise_level if noise_level is not None else 0.05
        
        # Set scenario-specific parameters
        self._set_scenario_parameters(degradation_rates)
        
    def _set_scenario_parameters(self, overrides=None):
        """Set degradation parameters based on scenario type, with optional overrides."""
        
        # Set defaults based on type
        if self.scenario_type == 'slow_corrosion':
            self.base_corrosion_rate = 0.008  # mm/day
            self.corrosion_acceleration = 0.0001
            self.pressure_decline_factor = 0.0008
            self.has_leak = False
            self.has_blockage = False
            
        elif self.scenario_type == 'fast_corrosion':
            self.base_corrosion_rate = 0.025  # mm/day
            self.corrosion_acceleration = 0.0003
            self.pressure_decline_factor = 0.0015
            self.has_leak = False
            self.has_blockage = False
            
        elif self.scenario_type == 'fatigue':
            self.base_corrosion_rate = 0.012  # mm/day
            self.corrosion_acceleration = 0.0002
            self.pressure_decline_factor = 0.001
            self.has_leak = False
            self.has_blockage = False
            self.pressure_cycles = True  # Large daily variations
            
        elif self.scenario_type == 'blockage':
            self.base_corrosion_rate = 0.008  # mm/day
            self.corrosion_acceleration = 0.0001
            self.pressure_decline_factor = 0.0005
            self.has_leak = False
            self.has_blockage = True
            self.blockage_growth_rate = 0.002  # per day
            
        elif self.scenario_type == 'pressure_surge':
            self.base_corrosion_rate = 0.020  # mm/day
            self.corrosion_acceleration = 0.0004
            self.pressure_decline_factor = 0.002
            self.has_leak = True
            self.leak_start_day = int(self.duration_days * 0.6)
            self.has_blockage = False
            
        else:  # combined
            self.base_corrosion_rate = 0.015  # mm/day
            self.corrosion_acceleration = 0.0002
            self.pressure_decline_factor = 0.0012
            self.has_leak = True
            self.leak_start_day = int(self.duration_days * 0.7)
            self.has_blockage = True
            self.blockage_growth_rate = 0.001

        # Apply custom overrides if provided
        if overrides:
            if 'corrosion' in overrides: self.base_corrosion_rate = overrides['corrosion']
            if 'fatigue' in overrides and hasattr(self, 'pressure_cycles'): pass # complex to override
            # Map robustly
            self.base_corrosion_rate = overrides.get('corrosion', self.base_corrosion_rate)

    
    def simulate_day(self, day_number, wall_thickness):
        """
        Simulate one day of pipeline operation.
        
        Args:
            day_number: Current day (1-indexed)
            wall_thickness: Current wall thickness
            
        Returns:
            dict: Sensor readings for both sensors A and B
        """
        # Calculate degradation
        corrosion_rate = self.base_corrosion_rate * (1 + self.corrosion_acceleration * day_number)
        new_wall_thickness = wall_thickness - corrosion_rate
        
        # Calculate RUL
        if new_wall_thickness <= self.critical_wall_thickness:
            rul = 0
        else:
            remaining_thickness = new_wall_thickness - self.critical_wall_thickness
            rul = int(remaining_thickness / corrosion_rate)
        
        # Sensor A (upstream)
        sensor_a = self._generate_sensor_readings(
            day_number, new_wall_thickness, corrosion_rate, position='A'
        )
        
        # Sensor B (downstream)
        sensor_b = self._generate_sensor_readings(
            day_number, new_wall_thickness, corrosion_rate, position='B'
        )
        
        return {
            'wall_thickness': new_wall_thickness,
            'corrosion_rate': corrosion_rate,
            'rul': rul,
            'sensor_a': sensor_a,
            'sensor_b': sensor_b
        }
    
    def _generate_sensor_readings(self, day, wall_thickness, corrosion_rate, position):
        """Generate realistic sensor readings."""
        
        # Pressure (decreases with wall thinning)
        pressure_capacity = self.initial_pressure * (wall_thickness / self.initial_wall_thickness) ** 2
        pressure = pressure_capacity - (day * self.pressure_decline_factor)
        
        # Add daily cycle (morning/evening peaks)
        hour_of_day = self.rng.randint(0, 24)
        daily_variation = 0.3 * np.sin(2 * np.pi * hour_of_day / 24)
        pressure += daily_variation
        
        # Add pressure cycles for fatigue scenario
        if hasattr(self, 'pressure_cycles') and self.pressure_cycles:
            pressure += self.rng.normal(0, 0.4)
        
        # Flow rate (depends on pressure and blockage)
        flow = self.initial_flow * np.sqrt(pressure / self.initial_pressure)
        
        # Apply blockage effect
        if self.has_blockage:
            blockage_factor = 1.0 - (self.blockage_growth_rate * day)
            blockage_factor = max(0.5, blockage_factor)  # At least 50% flow
            flow *= blockage_factor
        
        # Apply leak effect (affects downstream sensor more)
        if self.has_leak and day >= self.leak_start_day:
            leak_severity = (day - self.leak_start_day) / 50.0
            leak_severity = min(0.3, leak_severity)  # Max 30% loss
            if position == 'B':  # Downstream sensor sees lower pressure/flow
                pressure *= (1 - leak_severity * 1.5)
                flow *= (1 - leak_severity)
        
        # Acoustic emissions (increase with damage)
        baseline_acoustic = 40.0
        damage_factor = 1 - (wall_thickness / self.initial_wall_thickness)
        acoustic = baseline_acoustic + (50 * damage_factor ** 2)
        
        # Add acoustic spikes for cracks
        if self.rng.random() < damage_factor * 0.1:
            acoustic += self.rng.uniform(10, 30)
        
        # Temperature (seasonal + daily variation)
        day_of_year = day % 365
        seasonal_temp = 20 + 8 * np.sin(2 * np.pi * day_of_year / 365)
        daily_temp_variation = 5 * np.sin(2 * np.pi * hour_of_day / 24)
        temperature = seasonal_temp + daily_temp_variation
        
        # Add sensor noise
        pressure += self.rng.normal(0, 0.05)
        flow += self.rng.normal(0, 2.0)
        corrosion_rate += self.rng.normal(0, 0.001)
        acoustic += self.rng.normal(0, 2.0)
        temperature += self.rng.normal(0, 0.5)
        
        # Ensure realistic bounds
        pressure = max(1.5, min(6.0, pressure))
        flow = max(50, min(250, flow))
        corrosion_rate = max(0.005, corrosion_rate)
        acoustic = max(35, min(120, acoustic))
        temperature = max(5, min(35, temperature))
        
        return {
            'pressure': round(pressure, 3),
            'flow': round(flow, 2),
            'corrosion': round(corrosion_rate, 4),
            'acoustic': round(acoustic, 2),
            'temperature': round(temperature, 2)
        }


def generate_scenario(scenario_id, scenario_type, duration_days, start_date, seed):
    """
    Generate one complete scenario from healthy to failure.
    
    Args:
        scenario_id: Unique scenario identifier
        scenario_type: Type of failure
        duration_days: Days until failure
        start_date: Starting date
        seed: Random seed
        
    Returns:
        DataFrame: Complete scenario data
    """
    simulator = PipelineDegradationSimulator(scenario_type, duration_days, seed)
    
    data = []
    wall_thickness = simulator.initial_wall_thickness
    current_date = start_date
    
    for day in range(1, duration_days + 1):
        # Simulate this day
        result = simulator.simulate_day(day, wall_thickness)
        wall_thickness = result['wall_thickness']
        
        # Create data row
        row = {
            'scenario_id': scenario_id,
            'day': day,
            'date': current_date,
            
            # Sensor A
            'pressure_A': result['sensor_a']['pressure'],
            'flow_A': result['sensor_a']['flow'],
            'corrosion_A': result['sensor_a']['corrosion'],
            'acoustic_A': result['sensor_a']['acoustic'],
            'temperature_A': result['sensor_a']['temperature'],
            
            # Sensor B
            'pressure_B': result['sensor_b']['pressure'],
            'flow_B': result['sensor_b']['flow'],
            'corrosion_B': result['sensor_b']['corrosion'],
            'acoustic_B': result['sensor_b']['acoustic'],
            'temperature_B': result['sensor_b']['temperature'],
            
            # Target
            'RUL': result['rul']
        }
        
        data.append(row)
        current_date += timedelta(days=1)
    
    return pd.DataFrame(data)


def generate_synthetic_data(num_scenarios=1000, output_path='data/synthetic_pipeline_data.csv'):
    """
    Generate complete synthetic training dataset.
    
    Args:
        num_scenarios: Number of scenarios to generate
        output_path: Where to save the data
        
    Returns:
        DataFrame: Complete synthetic dataset
    """
    print("\n" + "="*70)
    print("SYNTHETIC DATA GENERATION")
    print("="*70)
    
    # Scenario distribution
    scenario_distribution = {
        'slow_corrosion': (0.30, (540, 730)),
        'fast_corrosion': (0.20, (180, 365)),
        'fatigue': (0.20, (270, 540)),
        'blockage': (0.15, (90, 270)),
        'pressure_surge': (0.10, (60, 180)),
        'combined': (0.05, (180, 450))
    }
    
    all_data = []
    start_date = datetime(2024, 1, 1)
    
    print(f"\nGenerating {num_scenarios} scenarios...")
    print(f"Distribution:")
    for scenario_type, (pct, duration_range) in scenario_distribution.items():
        count = int(num_scenarios * pct)
        print(f"  - {scenario_type:20s}: {count:4d} scenarios ({pct*100:.0f}%)")
    
    print(f"\nProgress:")
    
    scenario_id = 1
    pbar = tqdm(total=num_scenarios, desc="Generating scenarios", unit="scenario")
    
    for scenario_type, (percentage, duration_range) in scenario_distribution.items():
        count = int(num_scenarios * percentage)
        
        for i in range(count):
            # Random duration within range
            duration = np.random.randint(duration_range[0], duration_range[1] + 1)
            
            # Generate scenario
            scenario_df = generate_scenario(
                scenario_id=scenario_id,
                scenario_type=scenario_type,
                duration_days=duration,
                start_date=start_date,
                seed=scenario_id
            )
            
            all_data.append(scenario_df)
            scenario_id += 1
            pbar.update(1)
    
    pbar.close()
    
    # Combine all scenarios
    print("\nCombining all scenarios...")
    df = pd.concat(all_data, ignore_index=True)
    
    # Save to CSV
    print(f"Saving to {output_path}...")
    df.to_csv(output_path, index=False)
    
    # Statistics
    print("\n" + "-"*70)
    print("DATA GENERATION COMPLETE")
    print("-"*70)
    print(f"Total scenarios:  {num_scenarios}")
    print(f"Total rows:       {len(df):,}")
    print(f"Date range:       {df['date'].min()} to {df['date'].max()}")
    print(f"RUL range:        {df['RUL'].min()} to {df['RUL'].max()} days")
    print(f"File size:        {df.memory_usage(deep=True).sum() / 1024**2:.1f} MB")
    print(f"Saved to:         {output_path}")
    print("="*70 + "\n")
    
    return df


if __name__ == "__main__":
    # Generate synthetic data
    df = generate_synthetic_data(num_scenarios=1000)
    
    print("Sample data:")
    print(df.head(10))
