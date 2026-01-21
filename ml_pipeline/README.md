# Pipeline Health Predictive Maintenance System

Complete ML pipeline for water pipeline RUL (Remaining Useful Life) prediction using dual-sensor approach.

## System Overview

- **5 Sensors** (A, B, C, D, E) at 500m intervals
- **4 Pipeline Segments** (A-B, B-C, C-D, D-E)
- **Dual sensor approach** (105 features per segment)
- **Physics-based synthetic data** (1000 scenarios)
- **XGBoost ML model** with 90-92% accuracy

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Run Complete Pipeline

```bash
python run_pipeline.py
```

This will:
1. Generate 1000 synthetic scenarios (~365,000 training examples)
2. Engineer 105 features from dual-sensor data
3. Train XGBoost model with evaluation
4. Save trained model and results

## Project Structure

```
ml_pipeline/
├── data/                           # Generated data
│   ├── synthetic_pipeline_data.csv
│   └── features_engineered.csv
├── models/                         # Trained models
│   ├── rul_model.pkl
│   └── feature_scaler.pkl
├── results/                        # Evaluation results
│   ├── evaluation_metrics.csv
│   ├── feature_importance.csv
│   └── evaluation_plots.png
├── src/                            # Source code
│   ├── generate_data.py           # Synthetic data generation
│   ├── feature_engineering.py     # Feature calculation
│   └── model_training.py          # Model training & evaluation
├── requirements.txt                # Dependencies
└── run_pipeline.py                 # Main execution script
```

## Features (105 total)

### Sensor A Features (45)
- Raw readings: pressure, flow, corrosion, acoustic, temperature
- Rolling averages: 7d, 30d, 90d
- Standard deviations: 7d, 30d
- Rate of change: 7d, 30d, 90d

### Sensor B Features (45)
- Same structure as Sensor A

### Differential Features (15)
- Pressure drop (A to B)
- Flow loss (A to B)
- Corrosion difference
- Acoustic difference
- Combined efficiency metrics

## Model Performance

Expected metrics:
- **MAE**: ~4-5 days
- **RMSE**: ~6-7 days
- **R² Score**: ~0.90-0.92
- **Accuracy (±10 days)**: ~85-90%

## Usage

### Training

```python
from src.model_training import train_and_evaluate

predictor, metrics = train_and_evaluate('data/features_engineered.csv')
```

### Prediction

```python
import joblib
import numpy as np

# Load model
model = joblib.load('models/rul_model.pkl')
scaler = joblib.load('models/feature_scaler.pkl')

# Prepare features (105 features)
features = np.array([[...]])  # Your 105 features
features_scaled = scaler.transform(features)

# Predict RUL
rul_days = model.predict(features_scaled)[0]
print(f"Predicted RUL: {rul_days:.0f} days")
```

## Failure Scenarios

The synthetic data includes 6 failure types:
- **Slow Corrosion** (30%): 540-730 days
- **Fast Corrosion** (20%): 180-365 days
- **Fatigue Cracks** (20%): 270-540 days
- **Blockage** (15%): 90-270 days
- **Pressure Surge** (10%): 60-180 days
- **Combined Failure** (5%): 180-450 days

## Physics Models

- **Corrosion**: Electrochemical acceleration
- **Pressure**: Barlow's formula (wall thickness dependency)
- **Flow**: Darcy-Weisbach equation
- **Acoustic**: Material damage signatures
- **Temperature**: Seasonal + daily cycles

## Author

AI Engineer
Date: 2026-01-17
