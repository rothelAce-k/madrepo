"""
Main Execution Script
=====================

Runs complete ML pipeline from data generation to model training.
"""

import sys
import os
from datetime import datetime

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from generate_data import generate_synthetic_data
from feature_engineering import engineer_features
from model_training import train_and_evaluate


def main():
    """Run complete ML pipeline."""
    
    print("\n" + "="*70)
    print(" "*15 + "PIPELINE HEALTH PREDICTION SYSTEM")
    print(" "*20 + "Complete ML Pipeline")
    print("="*70)
    print(f"\nStarted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    start_time = datetime.now()
    
    try:
        # Phase 1: Generate Synthetic Data
        print("\n" + "#"*70)
        print("# PHASE 1: SYNTHETIC DATA GENERATION")
        print("#"*70)
        
        df_raw = generate_synthetic_data(
            num_scenarios=1000,
            output_path='data/synthetic_pipeline_data.csv'
        )
        
        # Phase 2: Feature Engineering
        print("\n" + "#"*70)
        print("# PHASE 2: FEATURE ENGINEERING")
        print("#"*70)
        
        df_features = engineer_features(
            input_path='data/synthetic_pipeline_data.csv',
            output_path='data/features_engineered.csv'
        )
        
        # Phase 3: Model Training
        print("\n" + "#"*70)
        print("# PHASE 3: MODEL TRAINING & EVALUATION")
        print("#"*70)
        
        predictor, metrics = train_and_evaluate(
            features_path='data/features_engineered.csv'
        )
        
        # Summary
        end_time = datetime.now()
        duration = end_time - start_time
        
        print("\n" + "="*70)
        print(" "*20 + "PIPELINE COMPLETE!")
        print("="*70)
        print(f"\nTotal execution time: {duration}")
        print(f"Finished at: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        print("\n" + "-"*70)
        print("FINAL MODEL PERFORMANCE")
        print("-"*70)
        print(f"MAE:              {metrics['MAE']:.2f} days")
        print(f"RMSE:             {metrics['RMSE']:.2f} days")
        print(f"R² Score:         {metrics['R2']:.4f}")
        print(f"Accuracy (±10d):  {metrics['Accuracy_10d']:.1f}%")
        print(f"Accuracy (±5d):   {metrics['Accuracy_5d']:.1f}%")
        print("-"*70)
        
        print("\nGenerated Files:")
        print("  Data:")
        print("    - data/synthetic_pipeline_data.csv")
        print("    - data/features_engineered.csv")
        print("  Models:")
        print("    - models/rul_model.pkl")
        print("    - models/feature_scaler.pkl")
        print("  Results:")
        print("    - results/evaluation_metrics.csv")
        print("    - results/feature_importance.csv")
        print("    - results/evaluation_plots.png")
        
        print("\n" + "="*70)
        print("Model is ready for deployment!")
        print("="*70 + "\n")
        
        return True
        
    except Exception as e:
        print(f"\n\nERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
