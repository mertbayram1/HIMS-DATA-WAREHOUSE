import sqlite3
import csv
import os
import argparse
from pathlib import Path

# List of generated columns to exclude during insertion because SQLite computes them automatically
GENERATED_COLUMNS = {
    'fact_prescription_detail': {'total_amount'},
    'fact_invoice': {'net_amount'}
}

# Database triggers to drop temporarily during CSV data loading
TRIGGERS_TO_DROP = [
    "trg_prescription_before_insert_check_stock",
    "trg_prescription_after_insert_apply_stock",
    "trg_prescription_before_update_check_stock",
    "trg_prescription_after_update_apply_stock",
    "trg_prescription_after_delete_apply_stock",
    "trg_medication_resolve_alerts"
]

def run_etl(db_path, csv_dir):
    print(f"========================================================")
    print(f"HIMS - CSV Data Integration to SQLite")
    print(f"Database: {db_path}")
    print(f"CSV Directory: {csv_dir}")
    print(f"========================================================")

    if not os.path.exists(csv_dir):
        print(f"[ERROR] CSV dizini bulunamadi: {csv_dir}")
        return

    # Connect to SQLite database
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    
    # Disable foreign keys temporarily for clean bulk loading without insertion ordering constraints
    conn.execute('PRAGMA foreign_keys = OFF')

    # Drop triggers temporarily
    print("[INFO] Tetikleyiciler (Triggers) gecici olarak devredisi birakiliyor...")
    for trigger in TRIGGERS_TO_DROP:
        conn.execute(f"DROP TRIGGER IF EXISTS {trigger}")

    # Get list of CSV files
    csv_files = [f for f in os.listdir(csv_dir) if f.endswith('.csv')]
    
    success_count = 0

    for filename in csv_files:
        table_name = filename[:-4] # Strip '.csv'
        csv_path = os.path.join(csv_dir, filename)
        
        # Verify if target table exists in SQLite schema
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
        if not cursor.fetchone():
            print(f"[WARNING] Semada '{table_name}' tablosu bulunamadigi icin atlandi.")
            continue

        # Clear target table
        conn.execute(f'DELETE FROM "{table_name}"')
        
        # Read CSV file and load data
        try:
            with open(csv_path, newline='', encoding='utf-8') as f:
                reader = csv.reader(f)
                headers = next(reader, None)
                if not headers:
                    print(f"[INFO] Bos CSV dosyasi atlandi: {filename}")
                    continue
                
                # Filter out generated columns
                skip_cols = GENERATED_COLUMNS.get(table_name, set())
                insert_headers = [h for h in headers if h not in skip_cols]
                skip_indices = [i for i, h in enumerate(headers) if h in skip_cols]
                
                cols = ','.join(f'"{h}"' for h in insert_headers)
                placeholders = ','.join('?' for _ in insert_headers)
                insert_sql = f'INSERT INTO "{table_name}" ({cols}) VALUES ({placeholders})'
                
                rows = []
                for row in reader:
                    # Filter out values belonging to generated columns
                    processed_row = [val if val != '' else None for i, val in enumerate(row) if i not in skip_indices]
                    rows.append(processed_row)
                    
                if rows:
                    conn.executemany(insert_sql, rows)
                    print(f"[OK] {len(rows)} satir '{table_name}' tablosuna entegre edildi.")
                    success_count += 1
        except Exception as e:
            print(f"[ERROR] '{table_name}' tablosu entegre edilirken hata: {str(e)}")

    conn.commit()
    
    # Re-create triggers from the SQL DDL file
    print("[INFO] Tetikleyiciler (Triggers) yeniden olusturuluyor...")
    base_dir = Path(__file__).resolve().parents[1]
    triggers_file_path = base_dir / "sql" / "03_Advanced_SQL" / "02_triggers.sql"
    
    if triggers_file_path.exists():
        try:
            with open(triggers_file_path, 'r', encoding='utf-8') as f:
                conn.executescript(f.read())
            print("[OK] Tetikleyiciler basariyla geri yuklendi.")
        except Exception as e:
            print(f"[ERROR] Tetikleyiciler yuklenirken hata olustu: {str(e)}")
    else:
        print(f"[WARNING] Tetikleyiciler SQL dosyasi bulunamadi: {triggers_file_path}")

    # Re-enable foreign key constraints checks
    conn.execute('PRAGMA foreign_keys = ON')
    conn.close()
    
    print(f"========================================================")
    print(f"[SUCCESS] Toplam {success_count} adet CSV dosyasi veritabanina entegre edildi!")
    print(f"========================================================")

def main():
    parser = argparse.ArgumentParser(description="HIMS CSV to SQLite Data Integration Tool")
    parser.add_argument('--db', default='hospital.db', help='Target SQLite database file')
    parser.add_argument('--csv-dir', default='data/csv', help='Source directory containing CSV files')
    args = parser.parse_args()
    
    run_etl(args.db, args.csv_dir)

if __name__ == '__main__':
    main()
