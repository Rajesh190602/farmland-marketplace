import sqlite3

conn = sqlite3.connect("farmland.db")
cursor = conn.cursor()

try:
    cursor.execute(
        "ALTER TABLE lands ADD COLUMN image_url TEXT"
    )
    print("✅ image_url column added successfully.")
except sqlite3.OperationalError as e:
    print(e)

conn.commit()
conn.close()