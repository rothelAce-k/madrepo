"""
Feature Engineering Module
===========================

Calculates 105 features from dual-sensor raw data for ML training.
"""

import numpy as np
import pandas as pd
from tqdm import tqdm
import warnings
warnings.filterwarnings('ignore')


class FeatureEngineer:
    """
    Feature engineering for pipeline health prediction.
    Calculates 105 features from dual-sensor data.
    """
    
    def __init__(self):
        self.feature_names = []
    
    def engineer_features(self, df):
        """
        Calculate all 105 features from raw sensor data.
        
        Args:
            df: DataFrame with raw sensor readings
            
        Returns:
            DataFrame: Engineered features with RUL target
        """
        print("\n" + "="*70)
        print("FEATURE ENGINEERING")
        print("="*70)
        
        print(f"\nInput data shape: {df.shape}")
        print(f"Scenarios: {df['scenario_id'].nunique()}")
        
        # Process each scenario separately (to avoid data leakage)
        print("\nCalculating features for each scenario...")
        
        all_features = []
        
        for scenario_id in tqdm(df['scenario_id'].unique(), desc="Processing scenarios", unit="scenario"):
            scenario_df = df[df['scenario_id'] == scenario_id].copy()
            scenario_features = self._calculate_scenario_features(scenario_df)
            all_features.append(scenario_features)
        
        # Combine all scenarios
        print("\nCombining features...")
        features_df = pd.concat(all_features, ignore_index=True)
        
        # Remove rows with NaN (first 90 days don't have 90-day features)
        print(f"Rows before removing NaN: {len(features_df):,}")
        features_df = features_df.dropna()
        print(f"Rows after removing NaN:  {len(features_df):,}")
        
        print("\n" + "-"*70)
        print("FEATURE ENGINEERING COMPLETE")
        print("-"*70)
        print(f"Total features:   {len(self.feature_names)}")
        print(f"Total rows:       {len(features_df):,}")
        print(f"Features shape:   {features_df.shape}")
        print("="*70 + "\n")
        
        return features_df
    
    def _calculate_scenario_features(self, df):
        """Calculate features for a single scenario."""
        
        features = pd.DataFrame()
        
        # Metadata
        features['scenario_id'] = df['scenario_id']
        features['day'] = df['day']
        features['date'] = df['date']
        
        # ===== RAW SENSOR READINGS (10 features) =====
        for sensor in ['A', 'B']:
            for metric in ['pressure', 'flow', 'corrosion', 'acoustic', 'temperature']:
                col_name = f'{metric}_{sensor}'
                features[col_name] = df[col_name]
        
        # ===== ROLLING AVERAGES (30 features) =====
        for sensor in ['A', 'B']:
            for metric in ['pressure', 'flow', 'corrosion', 'acoustic', 'temperature']:
                col_name = f'{metric}_{sensor}'
                
                # 7-day average
                features[f'{metric}_7d_avg_{sensor}'] = df[col_name].rolling(7, min_periods=1).mean()
                
                # 30-day average
                features[f'{metric}_30d_avg_{sensor}'] = df[col_name].rolling(30, min_periods=1).mean()
                
                # 90-day average
                features[f'{metric}_90d_avg_{sensor}'] = df[col_name].rolling(90, min_periods=90).mean()
        
        # ===== STANDARD DEVIATIONS (20 features) =====
        for sensor in ['A', 'B']:
            for metric in ['pressure', 'flow', 'corrosion', 'acoustic', 'temperature']:
                col_name = f'{metric}_{sensor}'
                
                # 7-day std
                features[f'{metric}_7d_std_{sensor}'] = df[col_name].rolling(7, min_periods=1).std()
                
                # 30-day std
                features[f'{metric}_30d_std_{sensor}'] = df[col_name].rolling(30, min_periods=1).std()
        
        # ===== RATE OF CHANGE (30 features) =====
        for sensor in ['A', 'B']:
            for metric in ['pressure', 'flow', 'corrosion', 'acoustic', 'temperature']:
                col_name = f'{metric}_{sensor}'
                
                # 7-day change
                features[f'{metric}_7d_change_{sensor}'] = df[col_name] - df[col_name].shift(7)
                
                # 30-day change
                features[f'{metric}_30d_change_{sensor}'] = df[col_name] - df[col_name].shift(30)
                
                # 90-day change
                features[f'{metric}_90d_change_{sensor}'] = df[col_name] - df[col_name].shift(90)
        
        # ===== DIFFERENTIAL FEATURES (15 features) =====
        
        # Pressure differentials
        features['pressure_drop_AB'] = df['pressure_A'] - df['pressure_B']
        features['pressure_gradient_AB'] = features['pressure_drop_AB'] / 0.5  # 500m = 0.5km
        features['pressure_ratio_AB'] = df['pressure_B'] / (df['pressure_A'] + 0.001)
        
        # Flow differentials
        features['flow_drop_AB'] = df['flow_A'] - df['flow_B']
        features['flow_efficiency_AB'] = df['flow_B'] / (df['flow_A'] + 0.001)
        features['flow_loss_percent_AB'] = (df['flow_A'] - df['flow_B']) / (df['flow_A'] + 0.001) * 100
        
        # Corrosion differentials
        features['corrosion_diff_AB'] = df['corrosion_B'] - df['corrosion_A']
        features['corrosion_ratio_AB'] = df['corrosion_B'] / (df['corrosion_A'] + 0.0001)
        
        # Acoustic differentials
        features['acoustic_diff_AB'] = df['acoustic_B'] - df['acoustic_A']
        features['acoustic_ratio_AB'] = df['acoustic_B'] / (df['acoustic_A'] + 0.001)
        
        # Temperature differentials
        features['temperature_diff_AB'] = df['temperature_B'] - df['temperature_A']
        features['temperature_avg_AB'] = (df['temperature_A'] + df['temperature_B']) / 2
        
        # Combined metrics
        features['flow_pressure_ratio_A'] = df['flow_A'] / (df['pressure_A'] + 0.001)
        features['flow_pressure_ratio_B'] = df['flow_B'] / (df['pressure_B'] + 0.001)
        features['segment_efficiency'] = features['flow_pressure_ratio_B'] / (features['flow_pressure_ratio_A'] + 0.001)
        
        # ===== TARGET =====
        features['RUL'] = df['RUL']
        
        # Store feature names (excluding metadata and target)
        if not self.feature_names:
            self.feature_names = [col for col in features.columns 
                                 if col not in ['scenario_id', 'day', 'date', 'RUL']]
        
        return features
    
    def get_feature_names(self):
        """Get list of all feature names."""
        return self.feature_names


def engineer_features(input_path='data/synthetic_pipeline_data.csv',
                     output_path='data/features_engineered.csv'):
    """
    Main function to engineer features from raw data.
    
    Args:
        input_path: Path to raw synthetic data
        output_path: Where to save engineered features
        
    Returns:
        DataFrame: Engineered features
    """
    # Load raw data
    print(f"\nLoading data from {input_path}...")
    df = pd.read_csv(input_path, parse_dates=['date'])
    
    # Engineer features
    engineer = FeatureEngineer()
    features_df = engineer.engineer_features(df)
    
    # Save engineered features
    print(f"Saving features to {output_path}...")
    features_df.to_csv(output_path, index=False)
    
    print(f"\nFeature names ({len(engineer.get_feature_names())} total):")
    for i, name in enumerate(engineer.get_feature_names(), 1):
        print(f"  {i:3d}. {name}")
    
    return features_df


if __name__ == "__main__":
    # Engineer features
    features_df = engineer_features()
    
    print("\nSample features:")
    print(features_df.head())
