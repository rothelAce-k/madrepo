"""
Model Training and Evaluation Module
=====================================

Trains XGBoost model for RUL prediction with comprehensive evaluation.
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import xgboost as xgb
import joblib
from tqdm import tqdm
import warnings
warnings.filterwarnings('ignore')


class RULPredictor:
    """
    XGBoost-based RUL prediction model with comprehensive training and evaluation.
    """
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = None
        self.feature_importance = None
        
    def prepare_data(self, df, test_size=0.15, val_size=0.15, random_state=42):
        """
        Prepare data for training with proper train/val/test split.
        
        Args:
            df: DataFrame with engineered features
            test_size: Proportion for test set
            val_size: Proportion for validation set
            random_state: Random seed
            
        Returns:
            tuple: (X_train, X_val, X_test, y_train, y_val, y_test)
        """
        print("\n" + "="*70)
        print("DATA PREPARATION")
        print("="*70)
        
        # Separate features and target
        feature_cols = [col for col in df.columns 
                       if col not in ['scenario_id', 'day', 'date', 'RUL']]
        
        X = df[feature_cols].values
        y = df['RUL'].values
        self.feature_names = feature_cols
        
        print(f"\nFeatures: {len(feature_cols)}")
        print(f"Samples:  {len(X):,}")
        print(f"Target range: {y.min()} to {y.max()} days")
        
        # Split by scenario to prevent data leakage
        print("\nSplitting data by scenario (prevent leakage)...")
        scenarios = df['scenario_id'].unique()
        
        # First split: train+val vs test
        train_val_scenarios, test_scenarios = train_test_split(
            scenarios, test_size=test_size, random_state=random_state
        )
        
        # Second split: train vs val
        val_size_adjusted = val_size / (1 - test_size)
        train_scenarios, val_scenarios = train_test_split(
            train_val_scenarios, test_size=val_size_adjusted, random_state=random_state
        )
        
        # Create masks
        train_mask = df['scenario_id'].isin(train_scenarios)
        val_mask = df['scenario_id'].isin(val_scenarios)
        test_mask = df['scenario_id'].isin(test_scenarios)
        
        # Split data
        X_train, y_train = X[train_mask], y[train_mask]
        X_val, y_val = X[val_mask], y[val_mask]
        X_test, y_test = X[test_mask], y[test_mask]
        
        print(f"\nTrain scenarios: {len(train_scenarios):4d} ({len(X_train):,} samples)")
        print(f"Val scenarios:   {len(val_scenarios):4d} ({len(X_val):,} samples)")
        print(f"Test scenarios:  {len(test_scenarios):4d} ({len(X_test):,} samples)")
        
        # Scale features
        print("\nScaling features...")
        X_train = self.scaler.fit_transform(X_train)
        X_val = self.scaler.transform(X_val)
        X_test = self.scaler.transform(X_test)
        
        print("="*70 + "\n")
        
        return X_train, X_val, X_test, y_train, y_val, y_test
    
    def train(self, X_train, y_train, X_val, y_val):
        """
        Train XGBoost model with early stopping.
        
        Args:
            X_train: Training features
            y_train: Training targets
            X_val: Validation features
            y_val: Validation targets
        """
        print("\n" + "="*70)
        print("MODEL TRAINING")
        print("="*70)
        
        # XGBoost parameters (optimized for best performance)
        params = {
            'objective': 'reg:squarederror',
            'n_estimators': 1000,
            'max_depth': 8,
            'learning_rate': 0.03,
            'subsample': 0.8,
            'colsample_bytree': 0.8,
            'min_child_weight': 3,
            'gamma': 0.1,
            'reg_alpha': 0.1,
            'reg_lambda': 1.0,
            'random_state': 42,
            'n_jobs': -1,
            'verbosity': 0
        }
        
        print("\nXGBoost Parameters:")
        for key, value in params.items():
            print(f"  {key:20s}: {value}")
        
        # Create model
        self.model = xgb.XGBRegressor(**params)
        
        # Train with early stopping
        print("\nTraining with early stopping (patience=50)...")
        print("Progress:")
        
        self.model.fit(
            X_train, y_train,
            eval_set=[(X_train, y_train), (X_val, y_val)],
            eval_metric='mae',
            early_stopping_rounds=50,
            verbose=False
        )
        
        # Get training history
        results = self.model.evals_result()
        train_mae = results['validation_0']['mae']
        val_mae = results['validation_1']['mae']
        
        print(f"\nBest iteration: {self.model.best_iteration}")
        print(f"Best val MAE:   {self.model.best_score:.2f} days")
        
        # Calculate feature importance
        self.feature_importance = pd.DataFrame({
            'feature': self.feature_names,
            'importance': self.model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print("\nTop 10 Most Important Features:")
        for idx, row in self.feature_importance.head(10).iterrows():
            print(f"  {row['feature']:40s}: {row['importance']:.4f}")
        
        print("="*70 + "\n")
        
        return train_mae, val_mae
    
    def evaluate(self, X_test, y_test, save_path='results/'):
        """
        Comprehensive model evaluation.
        
        Args:
            X_test: Test features
            y_test: Test targets
            save_path: Where to save evaluation results
        """
        print("\n" + "="*70)
        print("MODEL EVALUATION")
        print("="*70)
        
        # Make predictions
        print("\nMaking predictions on test set...")
        y_pred = self.model.predict(X_test)
        
        # Calculate metrics
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)
        
        # Calculate accuracy (within ±10 days)
        within_10_days = np.abs(y_test - y_pred) <= 10
        accuracy_10d = within_10_days.mean() * 100
        
        # Calculate accuracy (within ±5 days)
        within_5_days = np.abs(y_test - y_pred) <= 5
        accuracy_5d = within_5_days.mean() * 100
        
        print("\n" + "-"*70)
        print("TEST SET PERFORMANCE")
        print("-"*70)
        print(f"MAE (Mean Absolute Error):     {mae:.2f} days")
        print(f"RMSE (Root Mean Squared Error): {rmse:.2f} days")
        print(f"R² Score:                       {r2:.4f}")
        print(f"Accuracy (±10 days):            {accuracy_10d:.1f}%")
        print(f"Accuracy (±5 days):             {accuracy_5d:.1f}%")
        print("-"*70)
        
        # Error distribution
        errors = y_test - y_pred
        print(f"\nError Statistics:")
        print(f"  Mean error:   {errors.mean():.2f} days")
        print(f"  Std error:    {errors.std():.2f} days")
        print(f"  Min error:    {errors.min():.2f} days")
        print(f"  Max error:    {errors.max():.2f} days")
        print(f"  Median error: {np.median(errors):.2f} days")
        
        # Create visualizations
        print("\nCreating evaluation plots...")
        self._create_evaluation_plots(y_test, y_pred, save_path)
        
        # Save metrics
        metrics = {
            'MAE': mae,
            'RMSE': rmse,
            'R2': r2,
            'Accuracy_10d': accuracy_10d,
            'Accuracy_5d': accuracy_5d,
            'Mean_Error': errors.mean(),
            'Std_Error': errors.std()
        }
        
        metrics_df = pd.DataFrame([metrics])
        metrics_df.to_csv(f'{save_path}evaluation_metrics.csv', index=False)
        
        print(f"\nMetrics saved to {save_path}evaluation_metrics.csv")
        print("="*70 + "\n")
        
        return metrics
    
    def _create_evaluation_plots(self, y_test, y_pred, save_path):
        """Create comprehensive evaluation visualizations."""
        
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        
        # 1. Predictions vs Actual
        ax = axes[0, 0]
        ax.scatter(y_test, y_pred, alpha=0.3, s=10)
        ax.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 
                'r--', lw=2, label='Perfect Prediction')
        ax.set_xlabel('Actual RUL (days)', fontsize=12)
        ax.set_ylabel('Predicted RUL (days)', fontsize=12)
        ax.set_title('Predictions vs Actual', fontsize=14, fontweight='bold')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        # 2. Error Distribution
        ax = axes[0, 1]
        errors = y_test - y_pred
        ax.hist(errors, bins=50, edgecolor='black', alpha=0.7)
        ax.axvline(0, color='r', linestyle='--', lw=2, label='Zero Error')
        ax.set_xlabel('Prediction Error (days)', fontsize=12)
        ax.set_ylabel('Frequency', fontsize=12)
        ax.set_title('Error Distribution', fontsize=14, fontweight='bold')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        # 3. Residual Plot
        ax = axes[1, 0]
        ax.scatter(y_pred, errors, alpha=0.3, s=10)
        ax.axhline(0, color='r', linestyle='--', lw=2)
        ax.set_xlabel('Predicted RUL (days)', fontsize=12)
        ax.set_ylabel('Residual (days)', fontsize=12)
        ax.set_title('Residual Plot', fontsize=14, fontweight='bold')
        ax.grid(True, alpha=0.3)
        
        # 4. Feature Importance (Top 15)
        ax = axes[1, 1]
        top_features = self.feature_importance.head(15)
        ax.barh(range(len(top_features)), top_features['importance'])
        ax.set_yticks(range(len(top_features)))
        ax.set_yticklabels(top_features['feature'], fontsize=9)
        ax.set_xlabel('Importance', fontsize=12)
        ax.set_title('Top 15 Feature Importance', fontsize=14, fontweight='bold')
        ax.grid(True, alpha=0.3, axis='x')
        ax.invert_yaxis()
        
        plt.tight_layout()
        plt.savefig(f'{save_path}evaluation_plots.png', dpi=150, bbox_inches='tight')
        print(f"  Plots saved to {save_path}evaluation_plots.png")
        plt.close()
    
    def save_model(self, model_path='models/rul_model.pkl', 
                   scaler_path='models/feature_scaler.pkl'):
        """Save trained model and scaler."""
        print(f"\nSaving model to {model_path}...")
        joblib.dump(self.model, model_path)
        
        print(f"Saving scaler to {scaler_path}...")
        joblib.dump(self.scaler, scaler_path)
        
        print("Model and scaler saved successfully!")
    
    def load_model(self, model_path='models/rul_model.pkl',
                   scaler_path='models/feature_scaler.pkl'):
        """Load trained model and scaler."""
        self.model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path)
        print(f"Model loaded from {model_path}")


def train_and_evaluate(features_path='data/features_engineered.csv'):
    """
    Main training pipeline.
    
    Args:
        features_path: Path to engineered features
    """
    # Load features
    print(f"\nLoading features from {features_path}...")
    df = pd.read_csv(features_path, parse_dates=['date'])
    
    # Initialize predictor
    predictor = RULPredictor()
    
    # Prepare data
    X_train, X_val, X_test, y_train, y_val, y_test = predictor.prepare_data(df)
    
    # Train model
    train_mae, val_mae = predictor.train(X_train, y_train, X_val, y_val)
    
    # Evaluate model
    metrics = predictor.evaluate(X_test, y_test)
    
    # Save model
    predictor.save_model()
    
    # Save feature importance
    predictor.feature_importance.to_csv('results/feature_importance.csv', index=False)
    print("\nFeature importance saved to results/feature_importance.csv")
    
    return predictor, metrics


if __name__ == "__main__":
    # Train and evaluate model
    predictor, metrics = train_and_evaluate()
    
    print("\n" + "="*70)
    print("TRAINING COMPLETE!")
    print("="*70)
    print("\nModel ready for deployment!")
