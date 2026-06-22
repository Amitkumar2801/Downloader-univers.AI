#!/usr/bin/env python3
"""
YouTube Cookie Exporter for yt-dlp
Run this script with Chrome/Edge CLOSED to export YouTube cookies.
The cookies will be saved to yt_cookies.txt which the app will use automatically.
"""
import sys
import os
import subprocess

output_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'yt_cookies.txt')

print("=" * 60)
print("YouTube Cookie Exporter")
print("=" * 60)
print()

# Check if browsers are running
import psutil
chrome_running = any('chrome' in p.name().lower() or 'chromium' in p.name().lower() 
                     for p in psutil.process_iter(['name']) if p.info['name'])
edge_running = any('msedge' in p.name().lower() 
                   for p in psutil.process_iter(['name']) if p.info['name'])

if chrome_running:
    print("⚠️  WARNING: Google Chrome is running!")
    print("   Please CLOSE Chrome first, then run this script again.")
    input("Press Enter to continue anyway (may fail)...")

browsers_to_try = ['edge', 'chrome', 'brave', 'firefox']

for browser in browsers_to_try:
    print(f"Trying to export cookies from {browser}...")
    try:
        result = subprocess.run(
            ['python', '-m', 'yt_dlp', 
             '--cookies-from-browser', browser,
             '--cookies', output_file,
             '--skip-download', '--quiet',
             'https://www.youtube.com/'],
            capture_output=True, text=True, timeout=30
        )
        if os.path.exists(output_file) and os.path.getsize(output_file) > 100:
            print(f"✅ SUCCESS! Cookies exported from {browser}")
            print(f"   Saved to: {output_file}")
            print(f"   Size: {os.path.getsize(output_file)} bytes")
            print()
            print("🎉 Your app will now work with YouTube!")
            sys.exit(0)
        else:
            print(f"   ❌ Failed: {result.stderr[:200] if result.stderr else 'No output'}")
    except subprocess.TimeoutExpired:
        print(f"   ❌ Timeout for {browser}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

print()
print("❌ Could not export cookies automatically.")
print()
print("MANUAL METHOD:")
print("1. Install Chrome extension: 'Get cookies.txt LOCALLY'")
print("   https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc")
print("2. Go to https://www.youtube.com in Chrome")
print("3. Click the extension icon → Export cookies")
print(f"4. Save the file as: {output_file}")
print("5. Restart the app backend")
