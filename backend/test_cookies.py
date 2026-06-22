
import sqlite3

cookie_db = r'C:\Users\amitk\AppData\Local\Google\Chrome\User Data\Default\Network\Cookies'

try:
    conn = sqlite3.connect('file:' + cookie_db.replace('\\', '/') + '?immutable=1', uri=True)
    cursor = conn.execute("SELECT host_key, name FROM cookies WHERE host_key LIKE '%youtube%' OR host_key LIKE '%google%' LIMIT 5")
    rows = cursor.fetchall()
    print('SUCCESS! Found cookies:', len(rows))
    for r in rows[:3]:
        print(' -', r)
    conn.close()
except Exception as e:
    print('FAILED:', e)
