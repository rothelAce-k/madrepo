"""
Utility functions for P-Health Backend
Handles RUL formatting, driver attribution, and data transformations
"""

from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import numpy as np

def format_rul_display(rul_days: float) -> Dict[str, any]:
    """
    Convert raw RUL days into user-friendly display format
    
    Args:
        rul_days: Remaining useful life in days
        
    Returns:
        Dict with category, display_text, expected_date, confidence_band
    """
    # Tiered categories
    if rul_days > 3650:  # > 10 years
        category = "Excellent"
        display_text = "10+ years"
        color = "emerald"
        urgency = "low"
    elif rul_days > 1825:  # 5-10 years
        category = "Good"
        display_text = f"{int(rul_days/365)} years"
        color = "emerald"
        urgency = "low"
    elif rul_days > 730:  # 2-5 years
        category = "Fair"
        display_text = f"{int(rul_days/365)} years"
        color = "amber"
        urgency = "medium"
    elif rul_days > 365:  # 1-2 years
        category = "Caution"
        display_text = f"{int(rul_days/365)} year" + ("s" if rul_days > 730 else "")
        color = "amber"
        urgency = "medium"
    elif rul_days > 90:  # 3-12 months
        category = "Warning"
        display_text = f"{int(rul_days/30)} months"
        color = "orange"
        urgency = "high"
    elif rul_days > 30:  # 1-3 months
        category = "Critical"
        display_text = f"{int(rul_days/30)} months"
        color = "rose"
        urgency = "critical"
    else:  # < 1 month
        category = "URGENT"
        display_text = f"{int(rul_days)} days"
        color = "rose"
        urgency = "critical"
    
    # Calculate expected failure date
    expected_date = (datetime.now() + timedelta(days=rul_days)).strftime("%b %Y")
    
    # Confidence band (±5% for demo)
    confidence_lower = int(rul_days * 0.95)
    confidence_upper = int(rul_days * 1.05)
    
    return {
        "category": category,
        "display_text": display_text,
        "exact_days": int(rul_days),
        "expected_date": expected_date,
        "color": color,
        "urgency": urgency,
        "confidence_range": {
            "lower": confidence_lower,
            "upper": confidence_upper,
            "percentage": 95
        }
    }


def get_realistic_drivers(segment_id: str, current_day: int, sensor_data: Dict) -> List[Dict]:
    """
    Generate realistic degradation drivers based on segment and current state
    
    History Scenarios:
    - A-B: Good/Normal (healthy baseline)
    - B-C: Disturbed (early degradation signs)
    - C-D: Bad (critical failure)
    - D-E: Poor (significant wear)
    """
    drivers = []
    
    if segment_id == "A-B":
        # GOOD/NORMAL - Excellent condition
        drivers = [
            {
                "name": "Minimal Corrosion",
                "impact": 12,
                "severity": "low",
                "details": "Corrosion rate: 0.0005 mm/y (excellent)",
                "trend": "stable",
                "timeline": "━━━━━━━━━━",
                "color": "emerald"
            },
            {
                "name": "Stable Pressure",
                "impact": 8,
                "severity": "low",
                "details": "Pressure variance: ±0.1 bar (optimal)",
                "trend": "stable",
                "timeline": "━━━━━━━━━━",
                "color": "emerald"
            }
        ]
    
    elif segment_id == "B-C":
        # DISTURBED - Early warning signs, gradual degradation
        drivers = [
            {
                "name": "Moderate Corrosion Buildup",
                "impact": 48,
                "severity": "medium",
                "details": f"Corrosion rate: 0.008 mm/y (↑20% from baseline)",
                "trend": "rising",
                "timeline": "━━━━━━╱╱╱",
                "color": "amber"
            },
            {
                "name": "Pressure Fluctuations",
                "impact": 32,
                "severity": "medium",
                "details": "Daily cycles ±0.4 bar (pump scheduling issues)",
                "trend": "fluctuating",
                "timeline": "━━≈≈≈≈≈≈",
                "color": "amber"
            },
            {
                "name": "Flow Irregularities",
                "impact": 25,
                "severity": "low",
                "details": "Flow variance: ±5% (minor blockage suspected)",
                "trend": "gradual",
                "timeline": "━━━━━━━╱╱",
                "color": "amber"
            }
        ]
    
    elif segment_id == "C-D":
        # BAD - Critical failure scenario
        if current_day > 160:
            drivers = [
                {
                    "name": "Pressure Surge Event",
                    "impact": 82,
                    "severity": "critical",
                    "details": f"Day {160}: Spike from 5.2→7.8 bar (+50%)",
                    "trend": "spike",
                    "timeline": "━━━━━━━╱╱╱╱",
                    "color": "rose",
                    "event_day": 160
                },
                {
                    "name": "Severe Corrosion",
                    "impact": 75,
                    "severity": "critical",
                    "details": "Rate quadrupled: 0.008→0.032 mm/y (+400%)",
                    "trend": "accelerating",
                    "timeline": "━━━━━╱╱╱╱╱",
                    "color": "rose"
                },
                {
                    "name": "Active Leak",
                    "impact": 68,
                    "severity": "critical",
                    "details": "Flow loss: 18% (major leak detected)",
                    "trend": "expanding",
                    "timeline": "━━━━━━╱╱╱╱",
                    "color": "rose"
                },
                {
                    "name": "Structural Failure",
                    "impact": 55,
                    "severity": "critical",
                    "details": "Wall thickness compromised, imminent rupture risk",
                    "trend": "critical",
                    "timeline": "━━━━━━━╱╱╱",
                    "color": "rose"
                }
            ]
        else:
            # Before event - showing early signs
            drivers = [
                {
                    "name": "Elevated Corrosion",
                    "impact": 35,
                    "severity": "medium",
                    "details": "Corrosion rate: 0.012 mm/y (above normal)",
                    "trend": "rising",
                    "timeline": "━━━━━━━╱╱",
                    "color": "amber"
                }
            ]
    
    elif segment_id == "D-E":
        # POOR - Significant wear and tear
        drivers = [
            {
                "name": "High Fatigue Stress",
                "impact": 52,
                "severity": "high",
                "details": "Pressure cycles: 1,800/month (excessive)",
                "trend": "cyclic",
                "timeline": "━━≈≈≈≈≈≈≈",
                "color": "orange"
            },
            {
                "name": "Elevated Corrosion",
                "impact": 45,
                "severity": "medium",
                "details": "Corrosion rate: 0.018 mm/y (concerning)",
                "trend": "steady",
                "timeline": "━━━━━━━━╱╱",
                "color": "orange"
            },
            {
                "name": "Mechanical Wear",
                "impact": 38,
                "severity": "medium",
                "details": "Vibration levels elevated, bearing degradation",
                "trend": "increasing",
                "timeline": "━━━━━━╱╱╱",
                "color": "orange"
            },
            {
                "name": "Temperature Stress",
                "impact": 28,
                "severity": "low",
                "details": "Thermal cycling causing material fatigue",
                "trend": "gradual",
                "timeline": "━━━━━━━╱╱",
                "color": "orange"
            }
        ]
    
    return drivers


def get_segment_summary(segment_id: str, rul_info: Dict, drivers: List[Dict]) -> Dict:
    """
    Generate status and summary for a segment
    History: A-B good, B-C disturbed, C-D bad, D-E poor
    """
    category = rul_info["category"]
    
    # Status mapping based on segment history
    if segment_id == "A-B":
        # GOOD/NORMAL
        status = "Optimal Performance"
        status_color = "emerald"
        summary_text = "Maintained at peak condition for 6 months. No degradation detected. Exemplary maintenance record. All parameters within optimal range."
    
    elif segment_id == "B-C":
        # DISTURBED
        status = "Early Degradation Detected"
        status_color = "amber"
        summary_text = "Showing early warning signs after Month 3. Corrosion rate increasing gradually. Pressure fluctuations observed. Recommend inspection within 3-6 months."
    
    elif segment_id == "C-D":
        # BAD
        status = "CRITICAL ALERT"
        status_color = "rose"
        summary_text = "URGENT: Severe degradation detected. Pressure surge event (Day 160) caused catastrophic damage. Active leak with 18% flow loss. IMMEDIATE SHUTDOWN AND INSPECTION REQUIRED."
    
    elif segment_id == "D-E":
        # POOR
        status = "Significant Wear Detected"
        status_color = "orange"
        summary_text = "Experiencing significant wear from excessive pressure cycles and elevated corrosion. Material fatigue accumulating. Requires maintenance within 1-2 months to prevent failure."
    
    else:
        status = "Monitoring"
        status_color = "slate"
        summary_text = "Operating within monitored parameters."
    
    return {
        "status": status,
        "status_color": status_color,
        "summary": summary_text,
        "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "data_source": "simulation"
    }


def calculate_health_score(rul_days: float, segment_id: str = None) -> float:
    """
    Calculate health score (0-100%) based on NEW CSV data ranges
    
    NEW CSV Data Ranges (after regeneration):
    - A-B: 13,270-13,999 days → Target: >90%
    - B-C: 2,270-2,999 days → Target: 75-85%
    - C-D: 10-599 days → Target: <50%
    - D-E: 770-1,499 days → Target: 55-65%
    
    User's Desired Scale:
    - A-B: >90%
    - B-C: 75-85%
    - C-D: <50%
    - D-E: 55-65%
    """
    
    if segment_id == "A-B":
        # Target: >90% for RUL 13,000-14,000 days
        if rul_days >= 13500:
            return 92 + (rul_days - 13500) / 500 * 3  # 92-95%
        elif rul_days >= 13000:
            return 90 + (rul_days - 13000) / 500 * 2  # 90-92%
        else:
            # Below 13000, scale down
            return max(85, (rul_days / 13000) * 90)
    
    elif segment_id == "B-C":
        # Target: 75-85% for RUL 2,270-2,999 days
        if rul_days >= 2800:
            return 82 + (rul_days - 2800) / 200 * 3  # 82-85%
        elif rul_days >= 2500:
            return 78 + (rul_days - 2500) / 300 * 4  # 78-82%
        elif rul_days >= 2270:
            return 75 + (rul_days - 2270) / 230 * 3  # 75-78%
        else:
            # Below 2270, scale down
            return max(65, (rul_days / 2270) * 75)
    
    elif segment_id == "C-D":
        # Target: <50% for RUL 10-599 days
        # Map to 15-45% range
        if rul_days >= 400:
            return 40 + (rul_days - 400) / 199 * 5  # 40-45%
        elif rul_days >= 200:
            return 30 + (rul_days - 200) / 200 * 10  # 30-40%
        elif rul_days >= 100:
            return 22 + (rul_days - 100) / 100 * 8  # 22-30%
        elif rul_days >= 50:
            return 18 + (rul_days - 50) / 50 * 4  # 18-22%
        else:
            return max(15, 15 + (rul_days / 50) * 3)  # 15-18%
    
    elif segment_id == "D-E":
        # Target: 55-65% for RUL 770-1,499 days
        if rul_days >= 1300:
            return 62 + (rul_days - 1300) / 199 * 3  # 62-65%
        elif rul_days >= 1000:
            return 58 + (rul_days - 1000) / 300 * 4  # 58-62%
        elif rul_days >= 770:
            return 55 + (rul_days - 770) / 230 * 3  # 55-58%
        else:
            # Below 770, scale down
            return max(45, (rul_days / 770) * 55)
    
    else:
        # Fallback: Linear mapping
        score = (rul_days / 14000) * 100
        return max(0, min(100, score))


def calculate_health_score_simple(rul_days: float) -> float:
    """Simple fallback health score calculation"""
    return max(0, min(100, (rul_days / 14000) * 100))
