
import sqlite3, os

db = r'C:\Users\amitk\AppData\Local\Google\Chrome\User Data\Profile 3\Network\Cookies'
conn = sqlite3.connect('file:' + db.replace('\\', '/') + '?immutable=1', uri=True)
rows = conn.execute("SELECT host_key, name FROM cookies WHERE host_key LIKE '%youtube%' OR host_key LIKE '%google%' LIMIT 10").fetchall()
print('YouTube/Google cookies:', len(rows))
for r in rows[:5]:
    print(' -', r)
conn.close()
