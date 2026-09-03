// AI Media Metadata & ID3 Cover Art Studio Engine
const API_URL = 'http://127.0.0.1:5000/api';

let currentAudioFile = null;
let currentCoverFile = null;
let currentCoverUrl = null;
let previewAudio = new Audio();
let isPlayingPreview = false;

document.addEventListener('DOMContentLoaded', () => {
    // Theme toggle init
    const themeToggle = document.getElementById('themeToggle');
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');

    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-theme');
        if (sunIcon) sunIcon.classList.remove('hidden');
        if (moonIcon) moonIcon.classList.add('hidden');
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            const isLight = document.body.classList.contains('light-theme');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
            if (sunIcon && moonIcon) {
                sunIcon.classList.toggle('hidden', !isLight);
                moonIcon.classList.toggle('hidden', isLight);
            }
        });
    }

    // Dropzone
    const dropzone = document.getElementById('taggerDropzone');
    const fileInput = document.getElementById('taggerFileInput');
    const selectBtn = document.getElementById('selectTagFileBtn');

    selectBtn.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('click', (e) => {
        if (e.target !== selectBtn) fileInput.click();
    });

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) handleUploadedAudio(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleUploadedAudio(e.target.files[0]);
    });

    // Custom Cover Art
    const coverInput = document.getElementById('coverFileInput');
    const uploadCoverBtn = document.getElementById('uploadCoverBtn');
    uploadCoverBtn.addEventListener('click', () => coverInput.click());
    coverInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            currentCoverFile = e.target.files[0];
            currentCoverUrl = null;
            const reader = new FileReader();
            reader.onload = (re) => {
                document.getElementById('vinylCoverImg').src = re.target.result;
            };
            reader.readAsDataURL(currentCoverFile);
        }
    });

    // Vinyl Disc Click to Play / Pause Preview
    const vinylDisc = document.getElementById('vinylDisc');
    vinylDisc.addEventListener('click', () => {
        if (!previewAudio.src) return;
        if (isPlayingPreview) {
            previewAudio.pause();
            vinylDisc.classList.remove('spinning');
            isPlayingPreview = false;
        } else {
            previewAudio.play();
            vinylDisc.classList.add('spinning');
            isPlayingPreview = true;
        }
    });

    previewAudio.onended = () => {
        vinylDisc.classList.remove('spinning');
        isPlayingPreview = false;
    };

    // Online Metadata Search
    const searchInput = document.getElementById('onlineMetaSearch');
    const searchBtn = document.getElementById('searchMetaBtn');
    searchBtn.addEventListener('click', searchOnlineMetadata);
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchOnlineMetadata();
        }
    });

    // Form Submit
    document.getElementById('metadataForm').addEventListener('submit', handleSaveMetadata);
});

function handleUploadedAudio(file) {
    if (!file) return;
    currentAudioFile = file;

    document.getElementById('taggerDropzone').classList.add('hidden');
    document.getElementById('taggerStudio').classList.remove('hidden');

    // Parse initial file name for Title & Artist
    let rawName = file.name.replace(/\.[^/.]+$/, "");
    let artist = '';
    let title = rawName;

    if (rawName.includes(' - ')) {
        const parts = rawName.split(' - ');
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
    }

    document.getElementById('tagTitle').value = title;
    document.getElementById('tagArtist').value = artist;
    document.getElementById('onlineMetaSearch').value = rawName;

    // Load into preview audio element
    previewAudio.src = URL.createObjectURL(file);

    // Auto trigger online search
    searchOnlineMetadata();
}

async function searchOnlineMetadata() {
    const query = document.getElementById('onlineMetaSearch').value.trim();
    if (!query) return;

    const resultsContainer = document.getElementById('metaSearchResults');
    const searchBtn = document.getElementById('searchMetaBtn');
    searchBtn.textContent = '⏳ Searching...';

    try {
        const res = await fetch(`${API_URL}/fetch-metadata?query=${encodeURIComponent(query)}`);
        const data = await res.json();
        resultsContainer.innerHTML = '';

        if (data.results && data.results.length > 0) {
            resultsContainer.classList.remove('hidden');
            data.results.forEach(item => {
                const card = document.createElement('div');
                card.className = 'meta-result-card';
                card.innerHTML = `
                    <img src="${item.artwork || 'https://via.placeholder.com/60'}" class="meta-result-img" alt="Art">
                    <div style="overflow: hidden;">
                        <h4 style="font-size: 0.85rem; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.title || 'Unknown'}</h4>
                        <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.artist || 'Unknown'}</p>
                    </div>
                `;

                card.addEventListener('click', () => {
                    // Fill form with metadata
                    if (item.title) document.getElementById('tagTitle').value = item.title;
                    if (item.artist) document.getElementById('tagArtist').value = item.artist;
                    if (item.album) document.getElementById('tagAlbum').value = item.album;
                    if (item.genre) document.getElementById('tagGenre').value = item.genre;
                    if (item.year) document.getElementById('tagYear').value = item.year;

                    if (item.artwork) {
                        currentCoverUrl = item.artwork;
                        currentCoverFile = null;
                        document.getElementById('vinylCoverImg').src = item.artwork;
                    }
                    resultsContainer.classList.add('hidden');
                });

                resultsContainer.appendChild(card);
            });
        } else {
            resultsContainer.classList.add('hidden');
        }
    } catch (e) {
        console.warn("Online metadata search failed:", e);
    } finally {
        searchBtn.textContent = 'Auto Fetch';
    }
}

async function handleSaveMetadata(e) {
    e.preventDefault();
    if (!currentAudioFile) return;

    const btn = document.getElementById('saveTagsBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Embedding Tags & Cover Art...';
    btn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('file', currentAudioFile);
        formData.append('title', document.getElementById('tagTitle').value);
        formData.append('artist', document.getElementById('tagArtist').value);
        formData.append('album', document.getElementById('tagAlbum').value);
        formData.append('genre', document.getElementById('tagGenre').value);
        formData.append('year', document.getElementById('tagYear').value);

        if (currentCoverFile) {
            formData.append('cover', currentCoverFile);
        } else if (currentCoverUrl) {
            formData.append('cover_url', currentCoverUrl);
        }

        const res = await fetch(`${API_URL}/edit-tags`, {
            method: 'POST',
            body: formData
        });

        if (!res.ok) throw new Error("Server failed to tag audio.");

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const artist = document.getElementById('tagArtist').value.trim();
        const title = document.getElementById('tagTitle').value.trim();
        const ext = currentAudioFile.name.split('.').pop();
        a.download = (artist && title) ? `${artist} - ${title}.${ext}` : currentAudioFile.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        btn.innerHTML = '✅ Tagged File Downloaded!';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 3000);
    } catch (err) {
        alert("Failed to save metadata tags: " + err.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
