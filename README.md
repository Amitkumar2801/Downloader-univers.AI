# ⚡ DOWNLOADYFY.AI — Universal Media Downloader & Converter

> **A modern, fast, and free universal media downloader for YouTube (8K/4K/MP3), Instagram (Reels & Posts), Facebook, TikTok (No Watermark), and Pinterest.**  
> Includes 1-click clipboard paste, fast concurrent downloads, and complete high-definition audio merging.

---

## 🌟 Key Features
- 🎬 **Ultra HD Downloads**: Download YouTube videos in **8K, 4K, 1440p, 1080p, 720p, 480p, and 360p** with crystal-clear universal AAC audio merged.
- 🎵 **High-Quality MP3 & FLAC**: Extract full songs and soundtracks in **320kbps MP3** or lossless formats.
- 📱 **Multi-Platform Support**: Works seamlessly with **YouTube, Instagram Reels, Facebook Videos, TikTok (No Watermark), and Pinterest**.
- 🔄 **Offline Media Converter**: Convert local MP4, MKV, WebM, MOV, and AVI files to 320kbps MP3, WAV, FLAC, or AAC.
- 📋 **1-Click Paste & Clear**: Mobile & Desktop friendly clipboard paste button for frictionless workflow.
- 🚫 **No Node.js / NPM Required**: Pure lightweight **Python Backend** and **Vanilla HTML/CSS/JS Frontend**. No complex node build tools or `npm install` needed.

---

## 📋 Prerequisites (What you need before running)

1. **Python 3.8 or Higher**:
   - Download from [python.org/downloads](https://www.python.org/downloads/).
   - ⚠️ **VERY IMPORTANT (Windows Users)**: During installation, make sure to check the box:  
     ✅ **"Add python.exe to PATH"** before clicking **Install Now**.
2. **Visual Studio Code (VS Code)** or any code editor / Terminal.

---

## 🚀 Quickest Way to Run (Windows 1-Click)

If you are on Windows, you can simply **double-click** the file:
👉 `run_app.bat`

This will automatically install dependencies, start both servers, and open `http://localhost:8000` in your web browser!

---

## 💻 Step-by-Step Guide for VS Code & Any IDE

Follow these simple steps to run the project locally on your computer with zero errors:

### Step 1: Open the Project in VS Code
1. Open **Visual Studio Code**.
2. Click on **File** (top-left menu) ➡️ **Open Folder...**
3. Select the folder `Downloader-univers.AI` and click **Select Folder**.

---

### Step 2: Open the Integrated Terminal in VS Code
1. In VS Code, press:
   - **Windows/Linux**: `Ctrl` + `~` (or `Ctrl` + `Shift` + `` ` ``)
   - **Mac**: `Cmd` + `~`
   - *Or click from the top menu: `Terminal` ➡️ `New Terminal`.*

---

### Step 3: Install Required Python Packages
In your VS Code terminal, run the following command to install all required libraries:

```bash
pip install -r backend/requirements.txt
```

*(If you are already inside the `backend` folder, you can run `pip install -r requirements.txt`)*

---

### Step 4: Start the Backend Server (Terminal 1)
In the same terminal, run:

```bash
python backend/app.py
```

You will see:
```text
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://127.0.0.1:5000
```
> 📌 **Keep this terminal running! Do not close it.**

---

### Step 5: Start the Frontend Web Server (Terminal 2)
1. In VS Code, open a **second terminal tab** by clicking the **`+`** icon on the top right of the terminal panel (or press `Ctrl` + `Shift` + `5`).
2. Run this command to serve the website:

```bash
python -m http.server 8000 --directory frontend
```

You will see:
```text
Serving HTTP on :: port 8000 (http://[::]:8000/) ...
```
> 📌 **Keep this terminal running as well!**

---

### Step 6: Open the App in Your Browser
Open your web browser (Google Chrome, Microsoft Edge, Safari, Brave, etc.) and visit:

👉 **[http://localhost:8000](http://localhost:8000)**

*Or for the direct downloader page:*  
👉 **[http://localhost:8000/downloader.html](http://localhost:8000/downloader.html)**

🎉 **Done!** Paste any video URL and start downloading!

---

## 🖥️ Alternative Guide (Using Standard Command Prompt / Terminal)

If you are not using VS Code and want to use your normal computer terminal:

### On Windows (Command Prompt / PowerShell):
1. Open Command Prompt and navigate to the project folder:
   ```cmd
   cd C:\Downloader-univers.AI
   ```
2. Install dependencies:
   ```cmd
   pip install -r backend\requirements.txt
   ```
3. Run the Backend:
   ```cmd
   python backend\app.py
   ```
4. Open a **new Command Prompt window**, navigate to the folder, and run the Frontend:
   ```cmd
   cd C:\Downloader-univers.AI
   python -m http.server 8000 --directory frontend
   ```
5. Open **`http://localhost:8000`** in your browser.

---

### On Mac / Linux:
1. Open Terminal and navigate to the project directory:
   ```bash
   cd ~/path/to/Downloader-univers.AI
   ```
2. Install packages:
   ```bash
   pip3 install -r backend/requirements.txt
   ```
3. Start the Backend:
   ```bash
   python3 backend/app.py
   ```
4. In a new Terminal tab:
   ```bash
   python3 -m http.server 8000 --directory frontend
   ```
5. Open **`http://localhost:8000`** in your browser.

---

## 📁 Project Structure

```text
Downloader-univers.AI/
├── backend/
│   ├── app.py                # Core Flask API & video/audio download logic
│   ├── requirements.txt      # Python dependencies (Flask, yt-dlp, ffmpeg, etc.)
│   └── quality_options.py    # 8K/4K/1080p format mapping
├── frontend/
│   ├── index.html            # Main home page
│   ├── downloader.html       # Universal video downloader tool
│   ├── converter.html        # Video to audio converter
│   ├── styles.css            # Responsive CSS stylesheet
│   ├── app.js                # Frontend client logic & clipboard paste handlers
│   └── sound-effects.js      # Interactive audio sound effects
├── downloads/                # Transient output folder for processed files
├── run_app.bat               # 1-Click launcher script for Windows
└── README.md                 # Complete documentation & user guide
```

---

## ❓ Troubleshooting & FAQs

### 1. Error: `'python' is not recognized as an internal or external command`
- **Cause**: Python was installed without checking the "Add to PATH" option.
- **Fix**: Re-download the Python installer from [python.org](https://www.python.org/downloads/), run it, choose **Modify**, and check **"Add Python to environment variables / PATH"**.

### 2. Error: `Address already in use` or `Port 5000/8000 is busy`
- **Cause**: Another instance of the app is already running in the background.
- **Fix**: Close all other Command Prompt/Terminal windows running Python, or restart your IDE.

### 3. Audio is missing in high resolution (1080p / 4K / 8K)
- **Fix**: The backend automatically uses `imageio-ffmpeg` to merge video and audio streams using standard AAC encoding. Ensure you installed all dependencies with `pip install -r backend/requirements.txt`.

### 4. How to clear the link quickly on mobile/desktop?
- Click the **`✕`** icon inside the input box to clear the link in one tap, or click the **`📋 Paste`** button to paste from clipboard instantly.

---

## 📜 License & Disclaimer
This software is intended for **personal, educational, and fair-use archiving purposes only**. Please respect the terms of service and intellectual property rights of respective platforms.
