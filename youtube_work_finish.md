# youtube work finish

This document serves as the official project state checkpoint, documenting the completed, working YouTube downloader functionality. If the project ever crashes, or if another developer or AI agent needs to resume work, they must read this document first to avoid altering the verified YouTube downloading and UI components.

---

## 📌 Project Architecture

The project consists of a **Flask Python backend** and a **Vanilla HTML/CSS/JS frontend**, served locally:
* **Frontend Port**: `8000` (Served via Python `http.server`)
* **Backend Port**: `5000` (Served via Flask with CORS enabled)

```
[Project Root]
 ├── backend/
 │    ├── app.py (Main server & download dispatcher)
 │    ├── quality_options.py (Resolution mappings)
 │    ├── export_cookies.py (Cookie extraction utilities)
 │    ├── check_yt_cookies.py (Cookie check helper)
 │    ├── test_cookies.py (Verification script)
 │    ├── requirements.txt (Dependencies: flask, flask-cors, yt-dlp, imageio-ffmpeg)
 │    └── downloads/ (Temporary storage directory for active downloads)
 └── frontend/
      ├── index.html (UI Layout & Modal structures)
      ├── styles.css (Glassmorphism & animations design system)
      └── app.js (Dynamic UI controllers, polling, Sound FX, particles)
```

---

## ⚡ Core Features & Implemented Logic

### 1. Sequential Stream Progress Handler (Anti-Reset Logic)
* **Problem Solved**: High-resolution YouTube downloads stream video and audio separately. Standard progress hooks restart from `0%` when transitioning from video to audio, confusing users.
* **Implemented Logic** (`backend/app.py` -> `make_progress_hook`):
  * The backend detects whether the format requires two streams (`+` character in format specifier).
  * Tracks track changes dynamically by comparing `filename` between hook ticks.
  * **Progress Mapping**:
    * **Video stream**: maps smoothly to `0%` - `70%` of overall progress.
    * **Audio stream**: maps smoothly to `70%` - `90%` of overall progress.
    * **Post-processing & Merging (FFmpeg)**: maps to `90%` - `99%` of overall progress.
    * **Completed**: set to `100%` when file is written.

### 2. Professional Status Messages
* **Language & Tone**: Clean, premium English messages indicating connection speed and track-specific actions.
* **Connection Indicators** (based on real-time network speeds):
  * `⚡ High-speed connection` (> 5.0 MB/s)
  * `📶 Stable connection` (> 1.2 MB/s)
  * `🐢 Slower connection` (> 0.0 MB/s)
  * `🔗 Connecting` (0.0 MB/s or initializing)
* **Backend Sub-Track Descriptions** (`job.status_text`):
  * `Downloading video track... X%`
  * `Downloading audio track... X%`
  * `Merging video and audio tracks... This may take a moment.`
* **Resulting Status Text**: `${speedMsg} | ${detailMsg}`

### 3. Browser-Generated Audio Feedback
* **Implementation** (`frontend/app.js` -> `SoundFX`):
  * Created a synthesizer utilizing browser native **Web Audio API** to bypass loading audio files and eliminate network latency.
  * **Scan Sound (`SoundFX.playScan()`)**: futuristic filter sweep frequency ramp played when a link analysis begins.
  * **Success Ding (`SoundFX.playSuccess()`)**: premium double-chime ding (frequencies E5 and A5) played when a download is finished.

### 4. Robust Server-Side Rename Lock Healing
* Windows locks files in thread transitions, which frequently raises `PermissionError` (WinError 32) when yt-dlp tries renaming temporary `.part` files.
* **Healing Logic**: Inside `backend/app.py`'s download thread, if a rename failure occurs, a self-heal loop retries renaming the locked file with a `1.0s` sleep cycle up to 5 times.

---

## 🔒 YouTube Section Lock (DO NOT TOUCH)

The following components are fully functional and **MUST NOT** be modified unless explicitly instructed:
1. **Flask API Endpoints**:
   * `POST /api/info`: Fetches formats, sizes, durations, uploader details. Handles playlists and single videos.
   * `POST /api/start_download`: Dispatches daemon thread `run_download_thread`.
   * `GET /api/download_status/<job_id>`: Returns the status dictionary (includes `status_text`, progress percentage, speed, processed MB, and eta).
   * `GET /api/download_file/<job_id>`: Streams file download to browser client and schedules a timer thread to clean up/remove files `120s` later.
2. **Web Audio API Sound Engine (`SoundFX`)** in `app.js`.
3. **Download Loop and Polling Code** in `app.js` -> `initiateDownload()`.

---

## 🚀 How to Run the Project

### Prerequisites
* Python 3.10+
* FFmpeg (Handled automatically by `imageio-ffmpeg` package)

### Steps to Run
1. **Install python requirements**:
   ```bash
   pip install -r backend/requirements.txt
   ```
2. **Start Backend Server**:
   ```bash
   python backend/app.py
   ```
   *(Server starts on http://127.0.0.1:5000)*
3. **Start Frontend Server**:
   ```bash
   python -m http.server 8000 --directory frontend
   ```
   *(Site runs on http://localhost:8000)*
