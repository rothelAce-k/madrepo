"""
Database module for P-Health Backend
Handles SQLite database operations for persistent storage
"""

import sqlite3
import pandas as pd
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional

class PHealthDatabase:
    def __init__(self, db_path='p_health.db'):
        self.db_path = db_path
        self.conn = None
        self.initialize_database()
    
    def initialize_database(self):
        """Create database and tables if they don't exist"""
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        cursor = self.conn.cursor()
        
        # Create sensor_data table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sensor_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                segment_id TEXT NOT NULL,
                day INTEGER NOT NULL,
                date TEXT NOT NULL,
                pressure_A REAL,
                flow_A REAL,
                corrosion_A REAL,
                acoustic_A REAL,
                temperature_A REAL,
                pressure_B REAL,
                flow_B REAL,
                corrosion_B REAL,
                acoustic_B REAL,
                temperature_B REAL,
                rul REAL,
                health_score REAL,
                data_source TEXT DEFAULT 'simulation',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(segment_id, day)
            )
        ''')
        
        # Create index for faster queries
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_segment_day 
            ON sensor_data(segment_id, day)
        ''')
        
        self.conn.commit()
        print(f"Database initialized: {self.db_path}")
    
    def load_csv_data(self, data_dir):
        """Load CSV files into database (one-time migration)"""
        cursor = self.conn.cursor()
        
        # Check if data already loaded
        cursor.execute("SELECT COUNT(*) FROM sensor_data")
        count = cursor.fetchone()[0]
        
        if count > 0:
            print(f"Database already contains {count} rows. Skipping CSV load.")
            return
        
        print("Loading CSV data into database...")
        
        csv_files = {
            'A-B': 'history_AB.csv',
            'B-C': 'history_BC.csv',
            'C-D': 'history_CD.csv',
            'D-E': 'history_DE.csv'
        }
        
        start_date = datetime(2024, 1, 1)
        
        for segment_id, filename in csv_files.items():
            filepath = os.path.join(data_dir, filename)
            if not os.path.exists(filepath):
                print(f"Warning: {filepath} not found, skipping...")
                continue
            
            df = pd.read_csv(filepath)
            
            # Add date column
            df['date'] = [(start_date + timedelta(days=int(d)-1)).strftime('%Y-%m-%d') 
                          for d in df['day']]
            df['segment_id'] = segment_id
            df['data_source'] = 'simulation'
            
            # Calculate health score
            df['health_score'] = df['RUL'].apply(lambda x: min(100, max(0, (x / 14000) * 100)))
            
            # Insert into database
            df.to_sql('sensor_data', self.conn, if_exists='append', index=False,
                     dtype={'segment_id': 'TEXT', 'day': 'INTEGER', 'date': 'TEXT',
                            'rul': 'REAL', 'health_score': 'REAL', 'data_source': 'TEXT'})
            
            print(f"Loaded {len(df)} rows for segment {segment_id}")
        
        self.conn.commit()
        print("CSV data loaded successfully!")
    
    def get_latest_day(self, segment_id):
        """Get the latest day number for a segment"""
        cursor = self.conn.cursor()
        cursor.execute(
            "SELECT MAX(day) FROM sensor_data WHERE segment_id = ?",
            (segment_id,)
        )
        result = cursor.fetchone()[0]
        return result if result else 0
    
    def get_data_by_day(self, segment_id, day):
        """Get sensor data for a specific day"""
        cursor = self.conn.cursor()
        cursor.execute(
            "SELECT * FROM sensor_data WHERE segment_id = ? AND day = ?",
            (segment_id, day)
        )
        row = cursor.fetchone()
        
        if not row:
            return None
        
        columns = [desc[0] for desc in cursor.description]
        return dict(zip(columns, row))
    
    def get_history(self, segment_id, days=180):
        """Get historical data for a segment"""
        cursor = self.conn.cursor()
        cursor.execute(
            """SELECT day, date, health_score as score, rul, corrosion_A as corrosion
               FROM sensor_data 
               WHERE segment_id = ? 
               ORDER BY day DESC 
               LIMIT ?""",
            (segment_id, days)
        )
        
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        
        # Convert to list of dicts and reverse (oldest first)
        data = [dict(zip(columns, row)) for row in rows]
        return list(reversed(data))
    
    def get_last_n_days(self, segment_id, n=90):
        """Get last N days of data for feature engineering"""
        cursor = self.conn.cursor()
        cursor.execute(
            """SELECT * FROM sensor_data 
               WHERE segment_id = ? 
               ORDER BY day DESC 
               LIMIT ?""",
            (segment_id, n)
        )
        
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        
        df = pd.DataFrame(rows, columns=columns)
        return df.sort_values('day').reset_index(drop=True)
    
    def insert_day_data(self, segment_id, day, date, sensor_data, rul, health_score):
        """Insert new day's data"""
        cursor = self.conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO sensor_data 
            (segment_id, day, date, pressure_A, flow_A, corrosion_A, acoustic_A, temperature_A,
             pressure_B, flow_B, corrosion_B, acoustic_B, temperature_B, rul, health_score, data_source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'simulation')
        ''', (
            segment_id, day, date,
            sensor_data.get('pressure_A', 0),
            sensor_data.get('flow_A', 0),
            sensor_data.get('corrosion_A', 0),
            sensor_data.get('acoustic_A', 0),
            sensor_data.get('temperature_A', 0),
            sensor_data.get('pressure_B', 0),
            sensor_data.get('flow_B', 0),
            sensor_data.get('corrosion_B', 0),
            sensor_data.get('acoustic_B', 0),
            sensor_data.get('temperature_B', 0),
            rul, health_score
        ))
        
        self.conn.commit()
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
