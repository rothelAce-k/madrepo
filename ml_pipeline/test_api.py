import requests
import json

print("="*60)
print("TESTING BACKEND API")
print("="*60)

try:
    response = requests.get('http://localhost:8000/api/health')
    data = response.json()
    
    print("\nAPI Response:")
    print(json.dumps(data, indent=2))
    
    print("\n" + "="*60)
    print("HEALTH SCORES FROM API:")
    print("="*60)
    
    for seg_id, seg_data in data.items():
        if isinstance(seg_data, dict) and 'health_score' in seg_data:
            print(f"{seg_id}: {seg_data['health_score']}% (RUL: {seg_data.get('rul', 'N/A')})")
    
except Exception as e:
    print(f"Error: {e}")
