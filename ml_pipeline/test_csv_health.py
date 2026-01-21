import pandas as pd
import sys
sys.path.insert(0, 'backend')
from utils import calculate_health_score

# Check what RUL values are in CSV at Day 180
print("="*60)
print("CSV DATA AT DAY 180:")
print("="*60)

segments = ['AB', 'BC', 'CD', 'DE']
seg_map = {'AB': 'A-B', 'BC': 'B-C', 'CD': 'C-D', 'DE': 'D-E'}

for seg_file in segments:
    df = pd.read_csv(f'backend/data/history_{seg_file}.csv')
    day180 = df[df['day'] == 180]
    
    if not day180.empty:
        rul_value = day180['RUL'].values[0]
        seg_id = seg_map[seg_file]
        health = calculate_health_score(rul_value, seg_id)
        
        print(f"\n{seg_id}:")
        print(f"  RUL at Day 180: {rul_value}")
        print(f"  Calculated Health: {health:.1f}%")

print("\n" + "="*60)
print("EXPECTED vs ACTUAL:")
print("="*60)
print("Expected: A-B >90%, B-C 75-85%, C-D <50%, D-E 5-15%")
