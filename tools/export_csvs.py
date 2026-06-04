import sqlite3
import csv
import os

def export_all_tables():
    conn = sqlite3.connect('hospital.db')
    cursor = conn.cursor()
    tables = cursor.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall()

    os.makedirs('data/csv', exist_ok=True)

    for table_name in tables:
        table_name = table_name[0]
        # Skip sqlite internal tables
        if table_name.startswith('sqlite_'):
            continue
            
        cursor.execute(f'SELECT * FROM "{table_name}"')
        with open(f'data/csv/{table_name}.csv', 'w', newline='', encoding='utf-8') as csv_file:
            csv_writer = csv.writer(csv_file)
            csv_writer.writerow([i[0] for i in cursor.description])
            csv_writer.writerows(cursor)
        print(f"Exported {table_name}.csv")

    conn.close()
    print("All tables exported to data/csv/ successfully.")

if __name__ == "__main__":
    export_all_tables()
