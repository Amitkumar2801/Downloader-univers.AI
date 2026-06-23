# CUDA.AI – Chamgadar Universal Downloader AI

**A sleek, glass‑morphic web app that lets you download YouTube videos, Instagram reels, Spotify tracks/playlists, and other media with lightning‑fast speed, premium UI, and built‑in audio extraction.**

---

## 🚀 Why doesn't `npm run dev` work?

This project is built using a **Vanilla HTML/CSS/JavaScript** frontend and a **Python Flask** backend. 
- It does **NOT** use Node.js or `npm`.
- There are no `npm` packages to install and no `package.json` file.
- It runs entirely using Python, making the setup extremely lightweight and fast!

---

## 🛠️ How to Setup & Run locally

### 1. Prerequisites
Ensure you have **Python 3.8+** installed on your system. You can verify it by running:
```bash
python --version
```

### 2. Clone the Repository
```bash
git clone https://github.com/Amitkumar2801/Downloader-univers.AI.git
cd Downloader-univers.AI
```

### 3. Install Dependencies
Install the required Python packages (such as `yt-dlp`, `Flask`, `mutagen` for audio tagging, and `beautifulsoup4` for scraping):
```bash
pip install -r backend/requirements.txt
```

### 4. Start the Application
You need to run **two simple commands** to start both the backend and frontend:

#### Step A: Start the Backend (Flask Server)
The backend handles the scraping, downloading, and MP3 metadata tagging. It runs on `http://127.0.0.1:5000`.
```bash
python backend/app.py
```

#### Step B: Start the Frontend (HTTP Server)
Open a new terminal window/tab and serve the static files:
```bash
python -m http.server 8000 --directory frontend
```
*(Alternatively, you can just double-click the `frontend/index.html` file in your file explorer to open it, or use any local live server extension in VS Code!)*

Now, open your browser and navigate to:
👉 **[http://localhost:8000](http://localhost:8000)**

---

## 🎵 Premium Spotify Downloader Features

We've added a highly requested **Spotify Downloader** feature! Paste any Spotify track, playlist, or album link (e.g., `https://open.spotify.com/track/...` or `https://open.spotify.com/playlist/...`):

1. **Auto UI Theme Detection**: The site automatically detects Spotify URLs, dynamically transitioning to a gorgeous green Spotify brand design with matching glowing ambient particles.
2. **Metadata Tagging**: All downloaded Spotify tracks are converted to high-quality MP3s and automatically embedded with:
   - Track Title
   - Artist Name(s)
   - High-Resolution Cover Art
3. **Playlist / Album Parsing**: Inputting a playlist/album extracts all individual tracks. The UI updates to show a custom track list where you can choose specific bitrates (320kbps, 256kbps, 128kbps) to download individual tracks or download the entire playlist in one click.

---

## 📂 Project Structure

- `frontend/` - Static files containing `index.html` (the premium UI), `styles.css` (glassmorphism themes), and `app.js` (frontend downloading & polling client).
- `backend/` - Python server containing `app.py` (API endpoints) and `spotify_scraper.py` (unauthenticated Spotify embed scraper).
- `index.html` - Root redirect file pointing to the frontend folder (required to prevent 404s when deploying to platforms like GitHub Pages).

---

## 📝 License

This project is released under the MIT License – you are free to use, modify, and distribute it.

