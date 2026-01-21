"""
Model Testing and Demonstration Script
=======================================

Loads the trained model and demonstrates predictions on test data.
Shows detailed results with visualizations.
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

# Set style
sns.set_style("whitegrid")
plt.rcParams['figure.figsize'] = (16, 10)

def load_model_and_data():
    """Load trained model, scaler, and test data."""
    print("\n" + "="*70)
    print("LOADING MODEL AND TEST DATA")
    print("="*70)
    
    # Load model and scaler
    print("\nLoading trained model...")
    model = joblib.load('models/rul_model.pkl')
    scaler = joblib.load('models/feature_scaler.pkl')
    print(f"[OK] Model loaded: {type(model).__name__}")
    print(f"[OK] Number of trees: {model.n_estimators}")
    
    # Load features
    print("\nLoading feature data...")
    df = pd.read_csv('data/features_engineered.csv', parse_dates=['date'])
    print(f"[OK] Total samples: {len(df):,}")
    
    # Get feature columns
    feature_cols = [col for col in df.columns 
                   if col not in ['scenario_id', 'day', 'date', 'RUL']]
    
    # Split by scenario (same as training)
    scenarios = df['scenario_id'].unique()
    np.random.seed(42)
    
    # Get test scenarios (same split as training)
    train_val_scenarios = np.random.choice(scenarios, size=int(len(scenarios)*0.85), replace=False)
    test_scenarios = [s for s in scenarios if s not in train_val_scenarios]
    
    # Get test data
    test_df = df[df['scenario_id'].isin(test_scenarios)].copy()
    X_test = test_df[feature_cols].values
    y_test = test_df['RUL'].values
    
    print(f"[OK] Test scenarios: {len(test_scenarios)}")
    print(f"[OK] Test samples: {len(X_test):,}")
    print(f"[OK] Features: {len(feature_cols)}")
    
    return model, scaler, test_df, X_test, y_test, feature_cols


def make_predictions(model, scaler, X_test):
    """Make predictions on test data."""
    print("\n" + "="*70)
    print("MAKING PREDICTIONS")
    print("="*70)
    
    print("\nScaling features...")
    X_test_scaled = scaler.transform(X_test)
    
    print("Generating predictions...")
    y_pred = model.predict(X_test_scaled)
    
    print(f"[OK] Predictions complete!")
    print(f"  Predicted RUL range: {y_pred.min():.1f} to {y_pred.max():.1f} days")
    
    return y_pred


def analyze_results(y_test, y_pred):
    """Analyze prediction results."""
    print("\n" + "="*70)
    print("PREDICTION ANALYSIS")
    print("="*70)
    
    # Calculate metrics
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
    
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    
    errors = y_test - y_pred
    
    # Accuracy metrics
    within_5 = (np.abs(errors) <= 5).mean() * 100
    within_10 = (np.abs(errors) <= 10).mean() * 100
    within_20 = (np.abs(errors) <= 20).mean() * 100
    
    print("\n" + "-"*70)
    print("PERFORMANCE METRICS")
    print("-"*70)
    print(f"MAE (Mean Absolute Error):      {mae:.2f} days")
    print(f"RMSE (Root Mean Squared Error): {rmse:.2f} days")
    print(f"R² Score:                       {r2:.4f}")
    print(f"\nAccuracy:")
    print(f"  Within ±5 days:   {within_5:.1f}%")
    print(f"  Within ±10 days:  {within_10:.1f}%")
    print(f"  Within ±20 days:  {within_20:.1f}%")
    
    print(f"\nError Statistics:")
    print(f"  Mean error:       {errors.mean():.2f} days")
    print(f"  Std deviation:    {errors.std():.2f} days")
    print(f"  Min error:        {errors.min():.2f} days")
    print(f"  Max error:        {errors.max():.2f} days")
    print(f"  Median error:     {np.median(errors):.2f} days")
    print("-"*70)
    
    return mae, rmse, r2, errors


def show_sample_predictions(test_df, y_pred, n_samples=20):
    """Show sample predictions with details."""
    print("\n" + "="*70)
    print(f"SAMPLE PREDICTIONS (Random {n_samples} examples)")
    print("="*70)
    
    # Random sample
    sample_idx = np.random.choice(len(test_df), size=n_samples, replace=False)
    sample_df = test_df.iloc[sample_idx].copy()
    sample_df['Predicted_RUL'] = y_pred[sample_idx]
    sample_df['Error'] = sample_df['RUL'] - sample_df['Predicted_RUL']
    sample_df['Error_Abs'] = np.abs(sample_df['Error'])
    
    # Sort by actual RUL for better visualization
    sample_df = sample_df.sort_values('RUL')
    
    print("\n{:<8} {:<12} {:<10} {:<10} {:<12} {:<10} {:<10}".format(
        "Scenario", "Date", "Actual", "Predicted", "Error", "Pressure_A", "Corrosion_B"
    ))
    print("-"*80)
    
    for idx, row in sample_df.iterrows():
        status = "[OK]" if abs(row['Error']) <= 10 else "[X]"
        print("{:<8} {:<12} {:<10.0f} {:<10.0f} {:>6.1f} days {} {:<10.2f} {:<10.4f}".format(
            row['scenario_id'],
            row['date'].strftime('%Y-%m-%d'),
            row['RUL'],
            row['Predicted_RUL'],
            row['Error'],
            status,
            row['pressure_A'],
            row['corrosion_B']
        ))
    
    print("\n[OK] = Error within ±10 days")
    print("[X] = Error exceeds ±10 days")


def create_visualizations(y_test, y_pred, errors):
    """Create comprehensive visualizations."""
    print("\n" + "="*70)
    print("CREATING VISUALIZATIONS")
    print("="*70)
    
    fig = plt.figure(figsize=(18, 12))
    
    # 1. Predictions vs Actual (Large plot)
    ax1 = plt.subplot(2, 3, (1, 4))
    ax1.scatter(y_test, y_pred, alpha=0.4, s=20, c=errors, cmap='RdYlGn_r', 
                vmin=-20, vmax=20, edgecolors='black', linewidth=0.5)
    ax1.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 
             'r--', lw=3, label='Perfect Prediction', zorder=5)
    
    # Add ±10 day bands
    ax1.fill_between([y_test.min(), y_test.max()], 
                     [y_test.min()-10, y_test.max()-10],
                     [y_test.min()+10, y_test.max()+10],
                     alpha=0.2, color='green', label='±10 days')
    
    ax1.set_xlabel('Actual RUL (days)', fontsize=14, fontweight='bold')
    ax1.set_ylabel('Predicted RUL (days)', fontsize=14, fontweight='bold')
    ax1.set_title('Predictions vs Actual RUL', fontsize=16, fontweight='bold', pad=20)
    ax1.legend(fontsize=12)
    ax1.grid(True, alpha=0.3)
    cbar = plt.colorbar(ax1.collections[0], ax=ax1)
    cbar.set_label('Prediction Error (days)', fontsize=12)
    
    # 2. Error Distribution
    ax2 = plt.subplot(2, 3, 2)
    ax2.hist(errors, bins=50, edgecolor='black', alpha=0.7, color='steelblue')
    ax2.axvline(0, color='red', linestyle='--', lw=2, label='Zero Error')
    ax2.axvline(errors.mean(), color='green', linestyle='--', lw=2, 
                label=f'Mean: {errors.mean():.2f}')
    ax2.set_xlabel('Prediction Error (days)', fontsize=12, fontweight='bold')
    ax2.set_ylabel('Frequency', fontsize=12, fontweight='bold')
    ax2.set_title('Error Distribution', fontsize=14, fontweight='bold')
    ax2.legend()
    ax2.grid(True, alpha=0.3, axis='y')
    
    # 3. Error by RUL Range
    ax3 = plt.subplot(2, 3, 3)
    rul_bins = [0, 50, 100, 200, 400, 800]
    rul_labels = ['0-50', '50-100', '100-200', '200-400', '400+']
    rul_categories = pd.cut(y_test, bins=rul_bins, labels=rul_labels)
    
    error_by_rul = pd.DataFrame({'RUL_Range': rul_categories, 'Error': np.abs(errors)})
    error_by_rul.boxplot(column='Error', by='RUL_Range', ax=ax3)
    ax3.set_xlabel('RUL Range (days)', fontsize=12, fontweight='bold')
    ax3.set_ylabel('Absolute Error (days)', fontsize=12, fontweight='bold')
    ax3.set_title('Error by RUL Range', fontsize=14, fontweight='bold')
    plt.sca(ax3)
    plt.xticks(rotation=45)
    ax3.get_figure().suptitle('')  # Remove default title
    
    # 4. Cumulative Error Distribution
    ax4 = plt.subplot(2, 3, 5)
    sorted_abs_errors = np.sort(np.abs(errors))
    cumulative = np.arange(1, len(sorted_abs_errors) + 1) / len(sorted_abs_errors) * 100
    ax4.plot(sorted_abs_errors, cumulative, linewidth=2, color='darkblue')
    ax4.axvline(5, color='green', linestyle='--', alpha=0.7, label='±5 days')
    ax4.axvline(10, color='orange', linestyle='--', alpha=0.7, label='±10 days')
    ax4.axvline(20, color='red', linestyle='--', alpha=0.7, label='±20 days')
    ax4.set_xlabel('Absolute Error (days)', fontsize=12, fontweight='bold')
    ax4.set_ylabel('Cumulative Percentage (%)', fontsize=12, fontweight='bold')
    ax4.set_title('Cumulative Error Distribution', fontsize=14, fontweight='bold')
    ax4.legend()
    ax4.grid(True, alpha=0.3)
    ax4.set_xlim(0, 50)
    
    # 5. Residual Plot
    ax5 = plt.subplot(2, 3, 6)
    ax5.scatter(y_pred, errors, alpha=0.4, s=20, edgecolors='black', linewidth=0.5)
    ax5.axhline(0, color='red', linestyle='--', lw=2)
    ax5.axhline(10, color='orange', linestyle=':', alpha=0.5)
    ax5.axhline(-10, color='orange', linestyle=':', alpha=0.5)
    ax5.set_xlabel('Predicted RUL (days)', fontsize=12, fontweight='bold')
    ax5.set_ylabel('Residual (days)', fontsize=12, fontweight='bold')
    ax5.set_title('Residual Plot', fontsize=14, fontweight='bold')
    ax5.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('results/test_predictions.png', dpi=150, bbox_inches='tight')
    print("\n[OK] Visualizations saved to: results/test_predictions.png")
    plt.close()


def main():
    """Main testing function."""
    print("\n" + "="*70)
    print(" "*20 + "MODEL TESTING DEMONSTRATION")
    print("="*70)
    print(f"\nStarted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Load model and data
    model, scaler, test_df, X_test, y_test, feature_cols = load_model_and_data()
    
    # Make predictions
    y_pred = make_predictions(model, scaler, X_test)
    
    # Analyze results
    mae, rmse, r2, errors = analyze_results(y_test, y_pred)
    
    # Show sample predictions
    show_sample_predictions(test_df, y_pred, n_samples=20)
    
    # Create visualizations
    create_visualizations(y_test, y_pred, errors)
    
    # Save detailed results
    print("\n" + "="*70)
    print("SAVING DETAILED RESULTS")
    print("="*70)
    
    results_df = test_df.copy()
    results_df['Predicted_RUL'] = y_pred
    results_df['Error'] = y_test - y_pred
    results_df['Absolute_Error'] = np.abs(results_df['Error'])
    results_df['Within_10_days'] = results_df['Absolute_Error'] <= 10
    
    results_df.to_csv('results/test_predictions_detailed.csv', index=False)
    print("\n[OK] Detailed results saved to: results/test_predictions_detailed.csv")
    
    # Summary
    print("\n" + "="*70)
    print(" "*25 + "TESTING COMPLETE!")
    print("="*70)
    print(f"\nFinished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\nGenerated Files:")
    print("  - results/test_predictions.png")
    print("  - results/test_predictions_detailed.csv")
    print("\n" + "="*70 + "\n")


if __name__ == "__main__":
    main()
