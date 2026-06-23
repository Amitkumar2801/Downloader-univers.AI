# CUDA.AI – Universal Downloader Web App

**A simple, beautiful website to download YouTube videos, Instagram reels, and Spotify songs/playlists in high-quality (320kbps MP3) with cover art.**

---

## 🚀 NOTE: No Node.js / NPM needed!
This project is built using simple **HTML/CSS/JS (Frontend)** and **Python (Backend)**. 
- You do **NOT** need to install `node` or run `npm run dev`.
- It runs purely on **Python**.

---

## 🛠️ Step-by-Step Guide for Beginners

If you are new to GitHub or coding, follow these simple steps to run this project on your computer:

### Step 1: Install Python (Must do)
1. Go to [python.org/downloads](https://www.python.org/downloads/) and download the installer for your computer.
2. Open the installer.
3. **IMPORTANT**: Make sure to check the box that says **"Add python.exe to PATH"** before clicking Install.

### Step 2: Download this Project
* **Option A (Easy)**: Click the green **Code** button on top of this GitHub page, click **Download ZIP**, and extract (unzip) it on your computer.
* **Option B (Using Git)**: Open your terminal and run:
  ```bash
  git clone https://github.com/Amitkumar2801/Downloader-univers.AI.git
  cd Downloader-univers.AI
  ```

### Step 3: Install Required Packages
1. Open the project folder on your computer.
2. In the folder path bar (at the top of the file explorer window), type `cmd` and press Enter to open the Command Prompt directly inside the folder.
3. Run this command to install the download tools:
   ```bash
   pip install -r backend/requirements.txt
   ```

### Step 4: Run the Project
To run the app, you need to open **two terminal windows**:

#### Window 1: Start the Backend (Flask Server)
1. In your first Command Prompt window, run:
   ```bash
   python backend/app.py
   ```
2. You will see a message: `* Running on http://127.0.0.1:5000`. 
3. **Do not close this window!** Leave it running.

#### Window 2: Start the Frontend (Web Server)
1. Open a **new, separate Command Prompt window** inside the same project folder.
2. Run this command:
   ```bash
   python -m http.server 8000 --directory frontend
   ```
3. You will see a message: `Serving HTTP on :: port 8000`.
4. **Do not close this window!** Leave it running.

---

## 🎈 Step 5: Open the Web App
Open your web browser (Chrome, Edge, Safari, etc.) and type this address:
👉 **[http://localhost:8000](http://localhost:8000)**

Now paste your YouTube, Instagram, or Spotify URL and click **Fetch** to download!

---

## 📂 Project Files
* `frontend/` - Contains the website styling and visual components.
* `backend/` - Contains the server logic that parses URLs and processes audio/video downloads.


