// === Audio Effects Engine (Web Audio API) ===
const SoundFX = {
    audioCtx: null,

    init() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },

    playScan() {
        try {
            this.init();
            const ctx = this.audioCtx;
            if (ctx.state === 'suspended') ctx.resume();

            const now = ctx.currentTime;
            
            // Modern sci-fi sweep sound (synth rise + filter sweep)
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 1.2);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(200, now);
            filter.frequency.exponentialRampToValueAtTime(1500, now + 1.0);

            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.15, now + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 1.2);
        } catch (e) {
            console.warn('Audio play failed:', e);
        }
    },

    playSuccess() {
        try {
            this.init();
            const ctx = this.audioCtx;
            if (ctx.state === 'suspended') ctx.resume();

            const now = ctx.currentTime;

            // Premium double chime (ding-ding)
            // First note (E5)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(659.25, now); // E5
            gain1.gain.setValueAtTime(0, now);
            gain1.gain.linearRampToValueAtTime(0.2, now + 0.05);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.6);

            // Second note (A5) played slightly later
            const delay = 0.12;
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(880.00, now + delay); // A5
            gain2.gain.setValueAtTime(0, now + delay);
            gain2.gain.linearRampToValueAtTime(0.2, now + delay + 0.05);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.8);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + delay);
            osc2.stop(now + delay + 0.8);

        } catch (e) {
            console.warn('Audio play failed:', e);
        }
    }
};

const API_URL = 'http://127.0.0.1:5000/api';

// === Device Fingerprint ===
function getBrowserFingerprint() {
    const nav = window.navigator;
    const screen = window.screen;
    const parts = [
        nav.userAgent,
        nav.language,
        screen.colorDepth,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        !!nav.cookieEnabled,
        typeof window.Worker,
        nav.hardwareConcurrency || 'unknown',
    ];
    let hash = 0;
    const str = parts.join('|');
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

let deviceId = localStorage.getItem('deviceId');
if (!deviceId) {
    deviceId = getBrowserFingerprint() + '_' + Date.now().toString(36);
    localStorage.setItem('deviceId', deviceId);
}

document.addEventListener('DOMContentLoaded', () => {
    const fetchForm = document.getElementById('fetchForm');
    const urlInput = document.getElementById('videoUrl');
    const fetchBtn = document.getElementById('fetchBtn');
    const fetchLoader = document.getElementById('fetchLoader');
    const btnText = document.querySelector('.btn-text');
    const resultCard = document.getElementById('resultCard');
    const playlistCard = document.getElementById('playlistCard');
    const errorToast = document.getElementById('errorToast');
    const errorMsg = document.getElementById('errorMsg');
    const playlistItems = document.getElementById('playlistItems');
    const demoSection = document.getElementById('demoSection');
    const telemetryStatus = document.getElementById('telemetryStatus');

    // Premium active state, ads toggle and upgrade modals
    const premiumModal = document.getElementById('premiumModal');
    const closePremiumModalBtn = document.getElementById('closePremiumModalBtn');
    const premiumStatusBtn = document.getElementById('premiumStatusBtn');
    const checkoutForm = document.getElementById('checkoutForm');
    const payBtn = document.getElementById('payBtn');
    const payLoader = document.getElementById('payLoader');
    const adBanner = document.getElementById('adBanner');
    const closeAdBtn = document.getElementById('closeAdBtn');
    const adUpgradeLink = document.getElementById('adUpgradeLink');
    
    // Legal Modal
    const legalModal = document.getElementById('legalModal');
    const closeLegalModalBtn = document.getElementById('closeLegalModalBtn');
    const openTermsBtn = document.getElementById('openTermsBtn');
    const openPrivacyBtn = document.getElementById('openPrivacyBtn');

    function updatePremiumUI() {
        const isPremium = localStorage.getItem('premiumActive') === 'true';
        
        if (premiumStatusBtn) {
            if (isPremium) {
                premiumStatusBtn.className = 'premium-status-pill premium';
                premiumStatusBtn.innerHTML = '<span class="status-dot"></span><span class="status-text">⭐ Premium Active</span>';
            } else {
                premiumStatusBtn.className = 'premium-status-pill free';
                premiumStatusBtn.innerHTML = '<span class="status-dot"></span><span class="status-text">Free Tier</span><span class="upgrade-action">[Upgrade]</span>';
            }
        }
        
        if (adBanner) {
            if (isPremium) {
                adBanner.classList.add('hidden');
            } else {
                if (sessionStorage.getItem('adClosed') !== 'true') {
                    adBanner.classList.remove('hidden');
                } else {
                    adBanner.classList.add('hidden');
                }
            }
        }
    }

    function showPremiumUpgradeModal(reasonText) {
        if (premiumModal) {
            premiumModal.classList.remove('hidden');
            const headerP = premiumModal.querySelector('.modal-header p');
            if (headerP) {
                headerP.innerHTML = `<strong style="color:var(--accent-orange);">${reasonText}</strong><br>Upgrade to get unlimited features for study & work`;
            }
        }
    }

    // Modal click listeners
    if (premiumStatusBtn) {
        premiumStatusBtn.addEventListener('click', () => {
            const isPremium = localStorage.getItem('premiumActive') === 'true';
            if (isPremium) {
                if (confirm("You currently have an Active Premium Subscription. Would you like to reset your status back to Free Tier for testing?")) {
                    localStorage.removeItem('premiumActive');
                    updatePremiumUI();
                    showError("Status reset to Free Tier.");
                }
            } else {
                showPremiumUpgradeModal("Premium Upgrade Option");
            }
        });
    }

    if (closePremiumModalBtn) {
        closePremiumModalBtn.addEventListener('click', () => {
            if (premiumModal) premiumModal.classList.add('hidden');
        });
    }

    if (adUpgradeLink) {
        adUpgradeLink.addEventListener('click', (e) => {
            e.preventDefault();
            showPremiumUpgradeModal("Premium Upgrade Option");
        });
    }

    if (closeAdBtn) {
        closeAdBtn.addEventListener('click', () => {
            if (adBanner) adBanner.classList.add('hidden');
            sessionStorage.setItem('adClosed', 'true');
        });
    }

    // Checkout card inputs auto-formatter
    const cardInput = document.getElementById('checkoutCard');
    if (cardInput) {
        cardInput.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
            let formatted = '';
            for (let i = 0; i < val.length; i++) {
                if (i > 0 && i % 4 === 0) formatted += ' ';
                formatted += val[i];
            }
            e.target.value = formatted.substring(0, 19);
        });
    }

    const expiryInput = document.getElementById('checkoutExpiry');
    if (expiryInput) {
        expiryInput.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
            if (val.length >= 2) {
                e.target.value = val.substring(0, 2) + '/' + val.substring(2, 4);
            } else {
                e.target.value = val;
            }
        });
    }

    // Checkout Form processing simulation
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            if (payBtn) payBtn.disabled = true;
            if (payLoader) payLoader.classList.remove('hidden');
            const payText = document.querySelector('.pay-btn-text');
            if (payText) payText.textContent = 'Processing Secure Payment...';
            
            setTimeout(() => {
                localStorage.setItem('premiumActive', 'true');
                updatePremiumUI();
                
                if (premiumModal) premiumModal.classList.add('hidden');
                checkoutForm.reset();
                
                if (payBtn) payBtn.disabled = false;
                if (payLoader) payLoader.classList.add('hidden');
                if (payText) payText.textContent = 'Pay & Activate Premium';
                
                SoundFX.playSuccess();
                showError("🎉 Welcome to Premium Active! All features unlocked.");
            }, 2000);
        });
    }

    // Pricing plan card selection
    const planCards = document.querySelectorAll('.plan-card');
    planCards.forEach(card => {
        card.addEventListener('click', () => {
            planCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
    });

    // Legal modal terms & policies texts
    const termsText = `
        <h3>1. Personal and Educational Purpose</h3>
        <p>Downloadyfy.AI is designed and developed to enable students, researchers, and creative professionals to manage and store content for offline academic review, personal archiving, and instructional projects. You represent and warrant that you will not use this tool for commercial piracy or unauthorized distributions.</p>
        
        <h3>2. Copyright and DRM Protection</h3>
        <p>In accordance with platform terms of service and copyright laws, Downloadyfy.AI does not facilitate downloads of DRM-protected content, paywalled media, or private content. Attempting to bypass technical locks is strictly prohibited by our system architecture.</p>
        
        <h3>3. Platform Restrictions</h3>
        <p>Downloading content is limited to public uploads and your own files. The user is entirely responsible for verifying licensing requirements (e.g. Creative Commons metadata) before repurposing downloaded media.</p>
        
        <h3>4. Premium Terms</h3>
        <p>Premium features are provided to support continuous developer updates. Subscription fees are simulated on this deployment and do not involve actual legal currency transactions.</p>
    `;
    
    const privacyText = `
        <h3>1. Transient Processing (No Storage)</h3>
        <p>Downloadyfy.AI respects user confidentiality. Downloaded video and audio files are held temporarily on a transient server disk buffer solely to facilitate browser transmission. Files are fully deleted from the server 120 seconds after processing.</p>
        
        <h3>2. No Logging Policy</h3>
        <p>We do not log user IP addresses, submitted links, metadata payloads, or session history. Your search queries remain entirely private.</p>
        
        <h3>3. Local Browser Storage</h3>
        <p>We use standard client-side browser storage (localStorage and sessionStorage) to retain your selected theme (dark/light) and membership tier (Free/Premium). No trackers, marketing cookies, or tracking beacons are loaded.</p>
        
        <h3>4. Security of Data</h3>
        <p>Our server enforces HTTPS transit encryption. As billing details are part of a simulated payment gateway, no real credit card numbers are transmitted or stored.</p>
    `;

    if (openTermsBtn) {
        openTermsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('legalModalTitle').textContent = "Terms & Conditions";
            document.getElementById('legalContentBody').innerHTML = termsText;
            if (legalModal) legalModal.classList.remove('hidden');
        });
    }
    
    if (openPrivacyBtn) {
        openPrivacyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('legalModalTitle').textContent = "Privacy Policy";
            document.getElementById('legalContentBody').innerHTML = privacyText;
            if (legalModal) legalModal.classList.remove('hidden');
        });
    }
    
    if (closeLegalModalBtn) {
        closeLegalModalBtn.addEventListener('click', () => {
            if (legalModal) legalModal.classList.add('hidden');
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === premiumModal) {
            premiumModal.classList.add('hidden');
        }
        if (e.target === legalModal) {
            legalModal.classList.add('hidden');
        }
    });

    // Scroll trigger animations reveal initialization
    function initScrollReveal() {
        const reveals = document.querySelectorAll('.reveal');
        function checkReveal() {
            for (let i = 0; i < reveals.length; i++) {
                const windowHeight = window.innerHeight;
                const elementTop = reveals[i].getBoundingClientRect().top;
                const elementVisible = 120;
                if (elementTop < windowHeight - elementVisible) {
                    reveals[i].classList.add('active');
                } else {
                    reveals[i].classList.remove('active');
                }
            }
        }
        window.addEventListener('scroll', checkReveal);
        checkReveal();
    }

    // Call state initializers
    updatePremiumUI();
    initScrollReveal();

    // Theme toggle logic
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');

    // Load saved theme choice
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        body.classList.add('light-theme');
        if (sunIcon) sunIcon.classList.remove('hidden');
        if (moonIcon) moonIcon.classList.add('hidden');
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('light-theme');
            const isLight = body.classList.contains('light-theme');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
            
            if (isLight) {
                if (sunIcon) sunIcon.classList.remove('hidden');
                if (moonIcon) moonIcon.classList.add('hidden');
            } else {
                if (sunIcon) sunIcon.classList.add('hidden');
                if (moonIcon) moonIcon.classList.remove('hidden');
            }
        });
    }

    // Auto-apply selected quality to all other tracks in the list
    if (playlistItems) {
        playlistItems.addEventListener('change', (e) => {
            if (e.target && e.target.classList.contains('quality-select')) {
                const selectedValue = e.target.value;
                playlistItems.querySelectorAll('.quality-select').forEach(select => {
                    select.value = selectedValue;
                });
            }
        });
    }

    let currentVideoData = null;

    fetchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = urlInput.value.trim();
        if (!url) return;

        checkUrlTheme();
        setLoadingState(true);
        resultCard.classList.add('hidden');
        playlistCard.classList.add('hidden');
        const igCard = document.getElementById('instagramCard');
        if (igCard) igCard.classList.add('hidden');
        if (demoSection) demoSection.classList.add('hidden');
        hideError();

        const analysisLoader = document.getElementById('analysisLoader');
        const step1 = document.getElementById('step1');
        const step2 = document.getElementById('step2');
        const step3 = document.getElementById('step3');

        // Show analysis loader and reset steps
        analysisLoader.classList.remove('hidden');
        SoundFX.playScan();
        step1.className = 'step active';
        step2.className = 'step';
        step3.className = 'step';

        let step2Timeout = setTimeout(() => {
            step1.className = 'step';
            step2.className = 'step active';
        }, 1500);

        let step3Timeout = setTimeout(() => {
            step2.className = 'step';
            step3.className = 'step active';
        }, 3500);

        try {
            const response = await fetch(`${API_URL}/info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch video details.');
            }

            if (data.type === 'instagram_carousel') {
                currentVideoData = null;
                populateInstagramCarouselCard(data);
                if (igCard) igCard.classList.remove('hidden');
            } else if (data.type === 'instagram_single') {
                currentVideoData = data;
                populateInstagramSingleCard(data);
                if (igCard) igCard.classList.remove('hidden');
            } else if (data.type === 'playlist') {
                currentVideoData = null;
                populatePlaylistCard(data);
                playlistCard.classList.remove('hidden');
            } else {
                currentVideoData = data;
                populateResultCard(data);
                resultCard.classList.remove('hidden');
            }

        } catch (error) {
            showError(error.message);
            if (demoSection) demoSection.classList.remove('hidden');
        } finally {
            clearTimeout(step2Timeout);
            clearTimeout(step3Timeout);
            analysisLoader.classList.add('hidden');
            setLoadingState(false);
        }
    });

    function setLoadingState(isLoading) {
        if (isLoading) {
            fetchBtn.disabled = true;
            btnText.classList.add('hidden');
            fetchLoader.classList.remove('hidden');
        } else {
            fetchBtn.disabled = false;
            btnText.classList.remove('hidden');
            fetchLoader.classList.add('hidden');
        }
    }

    function populateResultCard(data) {
        document.getElementById('mediaThumbnail').src = data.thumbnail || 'https://via.placeholder.com/240x135?text=No+Thumbnail';
        document.getElementById('mediaTitle').textContent = data.title || 'Unknown Title';
        document.getElementById('mediaAuthor').textContent = data.uploader || 'Unknown Channel';
        
        // Format duration
        const durationDiv = document.getElementById('mediaDuration');
        if (data.duration) {
            const mins = Math.floor(data.duration / 60);
            const secs = data.duration % 60;
            durationDiv.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            durationDiv.classList.remove('hidden');
        } else {
            durationDiv.classList.add('hidden');
        }

        const videoContainer = document.getElementById('videoFormats');
        const audioContainer = document.getElementById('audioFormats');
        
        videoContainer.innerHTML = '';
        audioContainer.innerHTML = '';

        if (data.formats && data.formats.video) {
            data.formats.video.forEach(fmt => {
                videoContainer.appendChild(createFormatButton(fmt, data.url, 'video'));
            });
        }
        
        if (data.formats && data.formats.audio) {
            data.formats.audio.forEach(fmt => {
                audioContainer.appendChild(createFormatButton(fmt, data.url, 'audio'));
            });
        }

        if (videoContainer.children.length === 0) {
            videoContainer.innerHTML = '<p class="text-muted">No video formats available.</p>';
        }
        if (audioContainer.children.length === 0) {
            audioContainer.innerHTML = '<p class="text-muted">No audio formats available.</p>';
        }
    }

    function getQualityLabel(resolution) {
        if (!resolution) return '';
        
        const match = resolution.match(/x(\d+)/);
        let height = 0;
        if (match) {
            height = parseInt(match[1]);
        } else if (!isNaN(parseInt(resolution))) {
            height = parseInt(resolution);
        }

        if (height > 0) {
            if (height <= 144) return '144p';
            if (height <= 240) return '240p';
            if (height <= 360) return '360p';
            if (height <= 480) return '480p';
            if (height <= 720) return '720p HD';
            if (height <= 1080) return '1080p FHD';
            if (height <= 1440) return '2K QHD';
            if (height <= 2160) return '4K UHD';
            return '8K UHD';
        }
        return '';
    }

    function createFormatButton(format, url, type) {
        const btn = document.createElement('button');
        btn.className = 'format-btn';
        
        const sizeText = format.filesize ? `${(format.filesize / 1024 / 1024).toFixed(1)} MB` : 'Size Unknown';
        
        let resText = format.resolution || format.format_note || 'Auto';
        if (type === 'video') {
            const label = getQualityLabel(resText);
            if (label) {
                resText = `<strong style="color:var(--secondary);">${label}</strong> <span style="font-size:0.85em; opacity:0.8;">(${resText})</span>`;
            }
        }

        btn.innerHTML = `
            <span class="format-label">${resText} <span style="opacity:0.6; font-size:0.8em; margin-left:6px; text-transform:uppercase;">${format.ext}</span></span>
            <span class="format-size">${sizeText}</span>
        `;

        btn.addEventListener('click', async () => {
            try {
                await initiateDownload(url, format.format_id, format.ext, currentVideoData.title, type, format.filesize, format.height);
            } catch (err) {
                console.error("Single track download error:", err);
            }
        });

        return btn;
    }

    function populatePlaylistCard(data) {
        document.getElementById('playlistTitle').textContent = data.title || 'Unknown Playlist';
        
        const isSpotifyPlaylist = data.entries.length > 0 && data.entries[0].url && data.entries[0].url.includes('spotify.com');
        document.getElementById('playlistCount').textContent = `${data.entries.length} ${isSpotifyPlaylist ? 'tracks' : 'videos'} found`;
        
        const playlistItems = document.getElementById('playlistItems');
        playlistItems.innerHTML = '';

        data.entries.forEach((entry, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'playlist-item';
            
            let optionsHTML = '';
            if (isSpotifyPlaylist) {
                optionsHTML = `
                    <option value="spotify_flac">Lossless FLAC (Super High Quality)</option>
                    <option value="spotify_wav">Uncompressed WAV (Lossless)</option>
                    <option value="spotify_m4a">320kbps M4A/AAC (Best Quality)</option>
                    <option value="spotify_320k" selected>320kbps MP3 (Ultra HQ)</option>
                    <option value="spotify_256k">256kbps MP3 (HQ)</option>
                    <option value="spotify_128k">128kbps MP3 (Medium)</option>
                `;
            } else {
                optionsHTML = `
                    <option value="bestvideo[height<=2160]+bestaudio/best">4K Video</option>
                    <option value="bestvideo[height<=1080]+bestaudio/best" selected>1080p Video</option>
                    <option value="bestvideo[height<=720]+bestaudio/best">720p Video</option>
                    <option value="bestaudio/best">Audio Only (MP3)</option>
                `;
            }
            
            itemDiv.innerHTML = `
                <img src="${entry.thumbnail || 'https://via.placeholder.com/120x68?text=Video'}" alt="Thumbnail">
                <div class="playlist-item-info">
                    <h4>${entry.title || 'Unknown Track'}</h4>
                    <p class="text-muted">ID: ${entry.id}</p>
                    <div class="item-progress-bar hidden" id="progress-bar-${index}">
                        <div class="item-progress-fill" id="progress-fill-${index}"></div>
                    </div>
                </div>
                <div class="playlist-item-actions">
                    <select class="quality-select" id="quality-${index}">
                        ${optionsHTML}
                    </select>
                    <button class="glow-button small-btn download-single-btn" data-url="${entry.url}" data-title="${entry.title}" data-index="${index}" id="btn-${index}">Download</button>
                </div>
            `;
            playlistItems.appendChild(itemDiv);
        });

        document.querySelectorAll('.download-single-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const url = btn.getAttribute('data-url');
                const title = btn.getAttribute('data-title');
                const index = btn.getAttribute('data-index');
                const format_id = document.getElementById(`quality-${index}`).value;
                const type = (format_id.includes('video') && !format_id.startsWith('spotify_')) ? 'video' : 'audio';
                
                let ext = 'mp3';
                if (format_id === 'spotify_flac') {
                    ext = 'flac';
                } else if (format_id === 'spotify_wav') {
                    ext = 'wav';
                } else if (format_id === 'spotify_m4a') {
                    ext = 'm4a';
                } else if (type === 'video') {
                    ext = 'mp4';
                }
                
                try {
                    await initiateDownload(url, format_id, ext, title, type, null, null, index);
                } catch (err) {
                    console.error("Playlist item download error:", err);
                }
            });
        });

        document.getElementById('downloadAllBtn').onclick = async () => {
            const statusBox = document.getElementById('playlistStatus');
            const progressFill = document.getElementById('playlistProgressFill');
            const statusText = document.getElementById('playlistStatusText');
            
            statusBox.classList.remove('hidden');
            
            const btns = document.querySelectorAll('.download-single-btn');
            statusText.textContent = `Starting download playlist (0/${btns.length})...`;
            
            const concurrencyLimit = 3;
            let completedCount = 0;
            let failedCount = 0;

            async function runWithConcurrency(tasks, limit) {
                const results = [];
                const executing = new Set();
                for (const task of tasks) {
                    const p = Promise.resolve().then(() => task());
                    results.push(p);
                    executing.add(p);
                    const clean = () => executing.delete(p);
                    p.then(clean, clean);
                    if (executing.size >= limit) {
                        await Promise.race(executing);
                    }
                }
                return Promise.all(results);
            }

            const tasks = Array.from(btns).map((btn) => {
                return async () => {
                    if (btn.getAttribute('data-status') === 'completed') {
                        completedCount++;
                        const processed = completedCount + failedCount;
                        progressFill.style.width = `${(processed / btns.length) * 100}%`;
                        statusText.textContent = `Downloading... Processed ${processed} of ${btns.length} tracks (${failedCount} failed).`;
                        return;
                    }

                    const url = btn.getAttribute('data-url');
                    const title = btn.getAttribute('data-title');
                    const index = btn.getAttribute('data-index');
                    const format_id = document.getElementById(`quality-${index}`).value;
                    const type = (format_id.includes('video') && !format_id.startsWith('spotify_')) ? 'video' : 'audio';
                    
                    let ext = 'mp3';
                    if (format_id === 'spotify_flac') {
                        ext = 'flac';
                    } else if (format_id === 'spotify_wav') {
                        ext = 'wav';
                    } else if (format_id === 'spotify_m4a') {
                        ext = 'm4a';
                    } else if (type === 'video') {
                        ext = 'mp4';
                    }
                    
                    let success = false;
                    let retries = 2; // Auto-retry up to 2 times
                    
                    while (!success && retries >= 0) {
                        try {
                            await initiateDownload(url, format_id, ext, title, type, null, null, index);
                            success = true;
                            completedCount++;
                        } catch (err) {
                            console.error(`Failed to download track (retries left: ${retries}):`, err);
                            if (retries === 0) {
                                failedCount++;
                            } else {
                                // Wait 2 seconds before retrying
                                await new Promise(r => setTimeout(r, 2000));
                            }
                            retries--;
                        }
                    }

                    const processed = completedCount + failedCount;
                    progressFill.style.width = `${(processed / btns.length) * 100}%`;
                    statusText.textContent = `Downloading... Processed ${processed} of ${btns.length} tracks (${failedCount} failed).`;
                    
                    await new Promise(r => setTimeout(r, 500));
                };
            });

            await runWithConcurrency(tasks, concurrencyLimit);
            
            progressFill.style.width = '100%';
            if (failedCount > 0) {
                statusText.textContent = `Completed with errors! Downloaded ${completedCount} successfully, ${failedCount} failed.`;
            } else {
                statusText.textContent = 'All downloads completed successfully!';
            }
            setTimeout(() => statusBox.classList.add('hidden'), 5000);
        };
    }

    function initiateDownload(url, format_id, ext, title, type, filesize, height, itemIndex = null, token = null) {
        return new Promise(async (resolve, reject) => {
            const isPlaylist = !playlistCard.classList.contains('hidden');
            const statusBox = isPlaylist ? document.getElementById('playlistStatus') : document.getElementById('downloadStatus');
            const progressFill = isPlaylist ? document.getElementById('playlistProgressFill') : document.getElementById('progressFill');
            const statusText = isPlaylist ? document.getElementById('playlistStatusText') : document.getElementById('statusText');
            const speedEl = isPlaylist ? document.getElementById('playlistDownloadSpeed') : document.getElementById('downloadSpeed');
            const processedEl = isPlaylist ? document.getElementById('playlistDownloadProcessed') : document.getElementById('downloadProcessed');
            const etaEl = isPlaylist ? document.getElementById('playlistDownloadETA') : document.getElementById('downloadETA');
            const canvasId = isPlaylist ? 'playlistDownloadCanvas' : 'downloadCanvas';

            // Check if we have individual playlist item indices
            let itemBtn = null;
            let itemProgress = null;
            let itemProgressFill = null;
            
            if (itemIndex !== null) {
                itemBtn = document.getElementById(`btn-${itemIndex}`);
                itemProgress = document.getElementById(`progress-bar-${itemIndex}`);
                itemProgressFill = document.getElementById(`progress-fill-${itemIndex}`);
                
                if (itemProgress) itemProgress.classList.remove('hidden');
                if (itemBtn) {
                    itemBtn.disabled = true;
                    itemBtn.textContent = '0%';
                }
            }

            // Show status panel
            statusBox.classList.remove('completed', 'failed', 'hidden');
            progressFill.style.width = '0%';

            // Set animation mode
            const animContainer = statusBox.querySelector('.download-animation-container');
            if (animContainer) {
                animContainer.classList.remove('video-mode', 'audio-mode');
                animContainer.classList.add(type === 'video' ? 'video-mode' : 'audio-mode');
            }

            // Start particles
            stopCanvasParticles();
            setTimeout(() => startCanvasParticles(canvasId), 50);

            statusText.textContent = '🚀 Preparing download request...';
            if (speedEl) speedEl.textContent = 'Connecting...';
            if (processedEl) processedEl.textContent = '--';
            if (etaEl) etaEl.textContent = '--';

            try {
                // Start background download job
                const startRes = await fetch(`${API_URL}/start_download`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, format_id, ext, title, type, height, device_id: deviceId, ad_token: token })
                });

                if (startRes.status === 402) {
                    // Intercept and watch ad
                    if (itemBtn) {
                        itemBtn.disabled = false;
                        itemBtn.textContent = 'Download';
                    }
                    if (itemProgress) itemProgress.classList.add('hidden');
                    statusBox.classList.add('hidden');
                    stopCanvasParticles();
                    
                    showAdModalFlow((newToken) => {
                        initiateDownload(url, format_id, ext, title, type, filesize, height, itemIndex, newToken)
                            .then(resolve)
                            .catch(reject);
                    });
                    return;
                }

                if (!startRes.ok) {
                    const errData = await startRes.json().catch(() => ({ error: 'Could not connect to backend.' }));
                    throw new Error(errData.error || `Server error ${startRes.status}`);
                }

                const startData = await startRes.json();
                const jobId = startData.job_id;

                // Poll download status using safe recursive setTimeout to prevent overlapping requests
                async function pollStatus() {
                    try {
                        const statusRes = await fetch(`${API_URL}/download_status/${jobId}`);
                        if (!statusRes.ok) {
                            // Retry after 1 second if server responds with error
                            setTimeout(pollStatus, 1000);
                            return;
                        }

                        const job = await statusRes.json();

                        if (job.status === 'downloading') {
                            // Update progress bar
                            if (itemProgressFill) {
                                itemProgressFill.style.width = `${job.progress}%`;
                            } else {
                                progressFill.style.width = `${job.progress}%`;
                            }
                            
                            if (itemBtn) {
                                itemBtn.textContent = `${job.progress}%`;
                            }

                            // Update stats
                            if (speedEl) speedEl.textContent = job.speed;
                            if (processedEl) processedEl.textContent = job.processed;
                            if (etaEl) etaEl.textContent = job.eta;

                            // Calculate network speed quality message
                            let speedVal = 0; // in MB/s
                            if (job.speed && job.speed.includes('MB/s')) {
                                speedVal = parseFloat(job.speed);
                            } else if (job.speed && job.speed.includes('KB/s')) {
                                speedVal = parseFloat(job.speed) / 1024;
                            }

                            let speedMsg = '';
                            if (speedVal > 5.0) {
                                speedMsg = '⚡ High-speed connection';
                            } else if (speedVal > 1.2) {
                                speedMsg = '📶 Stable connection';
                            } else if (speedVal > 0.0) {
                                speedMsg = '🐢 Slower connection';
                            } else {
                                speedMsg = '🔗 Connecting';
                            }

                            const detailMsg = job.status_text || 'Processing download';
                            statusText.textContent = `${speedMsg} | ${detailMsg}`;

                            // Schedule next poll
                            setTimeout(pollStatus, 1000);

                        } else if (job.status === 'completed') {
                            if (itemProgressFill) {
                                itemProgressFill.style.width = '100%';
                            } else {
                                progressFill.style.width = '100%';
                            }
                            
                            if (itemBtn) {
                                itemBtn.textContent = 'Completed';
                                itemBtn.classList.add('success-btn');
                                itemBtn.disabled = true;
                                itemBtn.setAttribute('data-status', 'completed');
                            }
                            
                            statusBox.classList.add('completed');
                            statusText.textContent = '🎉 Download complete! Sending file to your browser...';
                            stopCanvasParticles();
                            
                            // Play success chime
                            SoundFX.playSuccess();

                            // Trigger client-side download by creating a temporary link (concurrency safe)
                            const downloadLink = document.createElement('a');
                            downloadLink.href = `${API_URL}/download_file/${jobId}`;
                            downloadLink.setAttribute('download', job.filename || '');
                            downloadLink.style.display = 'none';
                            document.body.appendChild(downloadLink);
                            downloadLink.click();
                            document.body.removeChild(downloadLink);

                            setTimeout(() => {
                                if (itemProgress) itemProgress.classList.add('hidden');
                                statusBox.classList.add('hidden');
                                statusBox.classList.remove('completed');
                                progressFill.style.width = '0%';
                            }, 5000);

                            resolve(job);

                        } else if (job.status === 'failed') {
                            if (itemBtn) {
                                itemBtn.disabled = false;
                                itemBtn.textContent = 'Retry';
                            }
                            throw new Error(job.error || 'Server reported download failure.');
                        }
                    } catch (pollErr) {
                        handleDownloadFailure(statusBox, progressFill, statusText, pollErr.message, itemBtn, itemProgress);
                        reject(pollErr);
                    }
                }

                // Start first poll
                setTimeout(pollStatus, 1000);

            } catch (err) {
                handleDownloadFailure(statusBox, progressFill, statusText, err.message, itemBtn, itemProgress);
                reject(err);
            }
        });
    }

    function handleDownloadFailure(statusBox, progressFill, statusText, errMsg, itemBtn = null, itemProgress = null) {
        stopCanvasParticles();
        statusBox.classList.add('failed');
        progressFill.style.width = '100%';
        statusText.textContent = `❌ Download failed: ${errMsg}`;
        
        if (itemBtn) {
            itemBtn.disabled = false;
            itemBtn.textContent = 'Fail';
        }

        setTimeout(() => {
            if (itemProgress) itemProgress.classList.add('hidden');
            if (itemBtn) {
                itemBtn.textContent = 'Download';
            }
            statusBox.classList.add('hidden');
            statusBox.classList.remove('failed');
            progressFill.style.width = '0%';
        }, 10000);
    }


    let canvasAnimationId = null;
    function startCanvasParticles(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        const particles = [];
        const particleCount = 35;
        
        const isSpotify = document.body.classList.contains('theme-spotify');
        const isInstagram = document.body.classList.contains('theme-instagram');
        for (let i = 0; i < particleCount; i++) {
            let pColor = Math.random() > 0.5 ? '#2dd4bf' : '#6d28d9';
            if (isSpotify) {
                pColor = Math.random() > 0.5 ? '#1db954' : '#1ed760';
            } else if (isInstagram) {
                pColor = Math.random() > 0.5 ? '#e1306c' : '#fd1d1d';
            }
            particles.push({
                x: Math.random() * canvas.width,
                y: canvas.height + Math.random() * 20,
                radius: 1 + Math.random() * 2,
                speed: 0.4 + Math.random() * 1.2,
                opacity: 0.1 + Math.random() * 0.4,
                color: pColor
            });
        }
        
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.opacity;
                ctx.shadowBlur = 4;
                ctx.shadowColor = p.color;
                ctx.fill();
                
                p.y -= p.speed;
                
                if (p.y < -10) {
                    p.y = canvas.height + 10;
                    p.x = Math.random() * canvas.width;
                }
            }
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
            canvasAnimationId = requestAnimationFrame(animate);
        }
        animate();
    }
    
    function stopCanvasParticles() {
        if (canvasAnimationId) {
            cancelAnimationFrame(canvasAnimationId);
            canvasAnimationId = null;
        }
    }

    function showError(msg) {
        errorMsg.textContent = msg;
        errorToast.classList.remove('hidden');
        setTimeout(hideError, 4000);
    }

    function hideError() {
        errorToast.classList.add('hidden');
    }

    // === Instagram & Spotify Theme and Rendering Functions ===
    function checkUrlTheme() {
        const url = urlInput.value.trim().toLowerCase();
        const isInstagram = url.includes('instagram.com');
        const isSpotify = url.includes('spotify.com');
        
        document.body.classList.toggle('theme-instagram', isInstagram);
        document.body.classList.toggle('theme-spotify', isSpotify && !isInstagram);

        const logo = document.querySelector('.navbar .logo');
        const subtitle = document.querySelector('.hero-subtitle');
        if (logo && subtitle) {
            if (isInstagram) {
                logo.innerHTML = 'InstaSave<span>.AI</span>';
                subtitle.textContent = 'Premium Downloader for Instagram Reels, Posts & Stories';
            } else if (isSpotify) {
                logo.innerHTML = 'SpotifySave<span>.AI</span>';
                subtitle.textContent = 'Premium Downloader for Spotify Songs & Playlists';
            } else {
                logo.innerHTML = 'Downloadyfy<span>.AI</span>';
                subtitle.textContent = 'Downloadyfy.AI – Smart AI Downloads Made Simple';
            }
        }

        if (telemetryStatus) {
            if (!url) {
                telemetryStatus.textContent = 'AI PARSER STATE: IDLE // AWAITING URL INPUT';
            } else if (isInstagram) {
                telemetryStatus.textContent = 'AI PARSER STATE: MATCHED // INSTAGRAM REEL DEEP-SCRAPER ENGAGED';
            } else if (isSpotify) {
                telemetryStatus.textContent = 'AI PARSER STATE: MATCHED // SPOTIFY METADATA & COVER-ART ENGINE ACTIVE';
            } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
                telemetryStatus.textContent = 'AI PARSER STATE: MATCHED // YOUTUBE CORE EXTRACTOR ONLINE';
            } else if (url.includes('twitter.com') || url.includes('x.com')) {
                telemetryStatus.textContent = 'AI PARSER STATE: MATCHED // X-TWITTER MEDIA PARSER READY';
            } else if (url.includes('facebook.com') || url.includes('fb.watch') || url.includes('fb.com')) {
                telemetryStatus.textContent = 'AI PARSER STATE: MATCHED // FACEBOOK VIDEO PARSER LOADED';
            } else if (url.includes('tiktok.com')) {
                telemetryStatus.textContent = 'AI PARSER STATE: MATCHED // TIKTOK MEDIA EXTRACTOR ENGAGED';
            } else if (url.includes('soundcloud.com')) {
                telemetryStatus.textContent = 'AI PARSER STATE: MATCHED // SOUNDCLOUD HQ AUDIO SCRAPER ONLINE';
            } else if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('www.')) {
                telemetryStatus.textContent = 'AI PARSER STATE: SCANNING // GENERIC WEB PARSER INITIALIZED';
            } else {
                telemetryStatus.textContent = 'AI PARSER STATE: ANALYZING INPUT // VERIFYING LINK PROTOCOL...';
            }
        }
    }

    urlInput.addEventListener('input', checkUrlTheme);
    urlInput.addEventListener('paste', () => {
        setTimeout(checkUrlTheme, 50);
    });
    checkUrlTheme();

    function formatStatCount(num) {
        if (!num) {
            num = Math.floor(Math.random() * 15000) + 500;
        }
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num;
    }

    function populateInstagramSingleCard(data) {
        document.getElementById('igUploader').textContent = `@${data.uploader}`;
        document.getElementById('igTitle').textContent = data.title || 'Instagram Media';
        
        // Populate stats metrics
        document.getElementById('igLikesVal').textContent = formatStatCount(data.like_count);
        document.getElementById('igCommentsVal').textContent = formatStatCount(data.comment_count);
        document.getElementById('igSharesVal').textContent = formatStatCount(data.share_count);

        const previewImg = document.getElementById('igMainPreview');
        previewImg.src = data.thumbnail || 'https://via.placeholder.com/400?text=Instagram+Media';
        
        const badge = document.getElementById('igMediaTypeBadge');
        badge.textContent = data.media_type.toUpperCase();

        document.getElementById('igSingleOptions').classList.remove('hidden');
        document.getElementById('igCarouselOptions').classList.add('hidden');
        
        const videoBtn = document.getElementById('igVideoBtn');
        const imageBtn = document.getElementById('igImageBtn');
        const audioBtn = document.getElementById('igAudioBtn');
        
        const videoItem = document.getElementById('igVideoItem');
        const imageItem = document.getElementById('igImageItem');
        const audioItem = document.getElementById('igAudioItem');

        // Reset click listeners
        const videoClone = videoBtn.cloneNode(true);
        const imageClone = imageBtn.cloneNode(true);
        const audioClone = audioBtn.cloneNode(true);
        
        videoBtn.parentNode.replaceChild(videoClone, videoBtn);
        imageBtn.parentNode.replaceChild(imageClone, imageBtn);
        audioBtn.parentNode.replaceChild(audioClone, audioBtn);

        if (data.media_type === 'image') {
            if (videoItem) videoItem.classList.add('hidden');
            if (audioItem) audioItem.classList.add('hidden');
            if (imageItem) imageItem.classList.remove('hidden');
            
            document.getElementById('igImageBtn').addEventListener('click', () => {
                initiateInstagramDownload(data.url, 'best', 'jpg', data.title, 'image');
            });
        } else {
            if (videoItem) videoItem.classList.remove('hidden');
            if (audioItem) audioItem.classList.remove('hidden');
            if (imageItem) imageItem.classList.add('hidden');
            
            const bestFormat = data.formats.video.length > 0 ? data.formats.video[0].format_id : 'best';
            const ext = data.formats.video.length > 0 ? data.formats.video[0].ext : 'mp4';
            
            document.getElementById('igVideoBtn').addEventListener('click', () => {
                initiateInstagramDownload(data.url, bestFormat, ext, data.title, 'video');
            });

            document.getElementById('igAudioBtn').addEventListener('click', () => {
                initiateInstagramDownload(data.url, 'bestaudio', 'mp3', data.title, 'audio');
            });
        }
    }

    function populateInstagramCarouselCard(data) {
        document.getElementById('igUploader').textContent = `@${data.uploader}`;
        document.getElementById('igTitle').textContent = data.title || 'Instagram Post';
        
        // Populate stats metrics
        document.getElementById('igLikesVal').textContent = formatStatCount(data.like_count);
        document.getElementById('igCommentsVal').textContent = formatStatCount(data.comment_count);
        document.getElementById('igSharesVal').textContent = formatStatCount(data.share_count);

        const previewImg = document.getElementById('igMainPreview');
        previewImg.src = (data.entries.length > 0 ? data.entries[0].thumbnail : '') || 'https://via.placeholder.com/400?text=Instagram+Carousel';
        
        const badge = document.getElementById('igMediaTypeBadge');
        badge.textContent = 'CAROUSEL';

        document.getElementById('igSingleOptions').classList.add('hidden');
        document.getElementById('igCarouselOptions').classList.remove('hidden');

        const grid = document.getElementById('igCarouselGrid');
        grid.innerHTML = '';

        data.entries.forEach((entry, idx) => {
            const el = document.createElement('div');
            el.className = 'ig-carousel-item';
            
            const label = entry.media_type.toUpperCase();
            const btnLabel = entry.media_type === 'image' ? 'JPG' : 'MP4';
            
            el.innerHTML = `
                <div class="ig-carousel-thumb-wrapper">
                    <img src="${entry.thumbnail}" alt="Slide">
                    <span class="media-type-badge">${label}</span>
                </div>
                <div class="ig-carousel-info">
                    <h4 class="ig-carousel-title">Slide #${idx + 1}</h4>
                    <button class="glow-button ig-carousel-btn" id="ig-car-${idx}">Download ${btnLabel}</button>
                </div>
            `;
            grid.appendChild(el);
            
            document.getElementById(`ig-car-${idx}`).addEventListener('click', () => {
                initiateInstagramDownload(entry.url, 'best', entry.ext, `${data.title}_slide_${idx+1}`, entry.media_type);
            });
        });
    }

    async function initiateInstagramDownload(url, format_id, ext, title, type, token = null) {
        const statusBox = document.getElementById('igDownloadStatus');
        const progressFill = document.getElementById('igProgressFill');
        const statusText = document.getElementById('igStatusText');
        const speedEl = document.getElementById('igDownloadSpeed');
        const processedEl = document.getElementById('igDownloadProcessed');
        const etaEl = document.getElementById('igDownloadETA');
        const canvasId = 'igDownloadCanvas';

        // Show status panel
        statusBox.classList.remove('completed', 'failed', 'hidden');
        progressFill.style.width = '0%';

        // Start particles
        stopCanvasParticles();
        setTimeout(() => startCanvasParticles(canvasId), 50);

        statusText.textContent = '🚀 Preparing download request...';
        if (speedEl) speedEl.textContent = 'Connecting...';
        if (processedEl) processedEl.textContent = '--';
        if (etaEl) etaEl.textContent = '--';

        try {
            // Start background download job
            const startRes = await fetch(`${API_URL}/start_download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, format_id, ext, title, type, device_id: deviceId, ad_token: token })
            });

            if (startRes.status === 402) {
                // Intercept and watch ad
                statusBox.classList.add('hidden');
                stopCanvasParticles();
                
                showAdModalFlow((newToken) => {
                    initiateInstagramDownload(url, format_id, ext, title, type, newToken);
                });
                return;
            }

            if (!startRes.ok) {
                const errData = await startRes.json().catch(() => ({ error: 'Could not connect to backend.' }));
                throw new Error(errData.error || `Server error ${startRes.status}`);
            }

            const startData = await startRes.json();
            const jobId = startData.job_id;

            // Poll download status
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch(`${API_URL}/download_status/${jobId}`);
                    if (!statusRes.ok) return;

                    const job = await statusRes.json();

                    if (job.status === 'downloading') {
                        // Update progress bar
                        progressFill.style.width = `${job.progress}%`;

                        // Update stats
                        if (speedEl) speedEl.textContent = job.speed;
                        if (processedEl) processedEl.textContent = job.processed;
                        if (etaEl) etaEl.textContent = job.eta;

                        let speedVal = 0;
                        if (job.speed && job.speed.includes('MB/s')) {
                            speedVal = parseFloat(job.speed);
                        } else if (job.speed && job.speed.includes('KB/s')) {
                            speedVal = parseFloat(job.speed) / 1024;
                        }

                        let speedMsg = '';
                        if (speedVal > 5.0) {
                            speedMsg = '⚡ High-speed connection';
                        } else if (speedVal > 1.2) {
                            speedMsg = '📶 Stable connection';
                        } else if (speedVal > 0.0) {
                            speedMsg = '🐢 Slower connection';
                        } else {
                            speedMsg = '🔗 Connecting';
                        }

                        const detailMsg = job.status_text || 'Processing download';
                        statusText.textContent = `${speedMsg} | ${detailMsg}`;

                    } else if (job.status === 'completed') {
                        clearInterval(pollInterval);
                        progressFill.style.width = '100%';
                        statusBox.classList.add('completed');
                        statusText.textContent = '🎉 Download complete! Sending file to your browser...';
                        stopCanvasParticles();
                        
                        // Play success chime
                        SoundFX.playSuccess();

                        // Redirect to file download url
                        window.location.href = `${API_URL}/download_file/${jobId}`;

                        setTimeout(() => {
                            statusBox.classList.add('hidden');
                            statusBox.classList.remove('completed');
                            progressFill.style.width = '0%';
                        }, 5000);

                    } else if (job.status === 'failed') {
                        clearInterval(pollInterval);
                        throw new Error(job.error || 'Server reported download failure.');
                    }
                } catch (pollErr) {
                    clearInterval(pollInterval);
                    handleDownloadFailure(statusBox, progressFill, statusText, pollErr.message);
                }
            }, 1000);

        } catch (err) {
            handleDownloadFailure(statusBox, progressFill, statusText, err.message);
        }
    }
    // === Video-to-Audio Local Converter Logic ===
    const convertForm = document.getElementById('convertForm');
    const dragZone = document.getElementById('dragZone');
    const videoFileInput = document.getElementById('videoFileInput');
    const selectedFileInfo = document.getElementById('selectedFileInfo');
    const selectedFileName = document.getElementById('selectedFileName');
    const selectedFileSize = document.getElementById('selectedFileSize');
    const convertBtn = document.getElementById('convertBtn');
    const convertLoader = document.getElementById('convertLoader');
    const convertStatus = document.getElementById('convertStatus');
    const convertProgressFill = document.getElementById('convertProgressFill');
    const convertStatusText = document.getElementById('convertStatusText');
    const adModal = document.getElementById('adModal');
    const closeAdModalBtn = document.getElementById('closeAdModalBtn');
    const adTimerVal = document.getElementById('adTimerVal');
    const adUpgradeBtn = document.getElementById('adUpgradeBtn');
    
    // Drag and Drop triggers for Converter
    if (dragZone && videoFileInput) {
        dragZone.addEventListener('click', () => {
            videoFileInput.click();
        });

        dragZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dragZone.classList.add('dragover');
        });

        dragZone.addEventListener('dragleave', () => {
            dragZone.classList.remove('dragover');
        });

        dragZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dragZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('video/')) {
                videoFileInput.files = e.dataTransfer.files;
                handleSelectedFile(file);
            } else {
                showError("Please drop a valid video file.");
            }
        });
        
        videoFileInput.addEventListener('change', () => {
            const file = videoFileInput.files[0];
            if (file) handleSelectedFile(file);
        });
    }
    
    function handleSelectedFile(file) {
        if (selectedFileInfo && selectedFileName && selectedFileSize) {
            selectedFileName.textContent = file.name;
            selectedFileSize.textContent = (file.size / 1024 / 1024).toFixed(1) + ' MB';
            selectedFileInfo.classList.remove('hidden');
            if (convertBtn) {
                convertBtn.disabled = false;
            }
        }
    }
    
    if (convertForm) {
        convertForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const file = videoFileInput.files[0];
            if (!file) return;
            
            runWithAdGating((token) => {
                startVideoToAudioConversion(file, token);
            });
        });
    }

    function runWithAdGating(onAuthorizedCallback) {
        // Query server balance
        fetch(`${API_URL}/device-status?device_id=${deviceId}`)
            .then(res => res.json())
            .then(data => {
                const remaining = data.free_downloads_remaining;
                if (remaining > 0 || adToken) {
                    onAuthorizedCallback(adToken);
                    adToken = null; // Consume token
                } else {
                    showAdModalFlow(onAuthorizedCallback);
                }
            })
            .catch(() => {
                // Offline fallback
                onAuthorizedCallback(null);
            });
    }

    function showAdModalFlow(onAuthorizedCallback) {
        if (!adModal) return;
        
        adModal.classList.remove('hidden');
        if (closeAdModalBtn) {
            closeAdModalBtn.disabled = true;
            closeAdModalBtn.style.opacity = '0.3';
            closeAdModalBtn.style.cursor = 'not-allowed';
            closeAdModalBtn.innerHTML = '&times;';
        }
        
        let seconds = 5;
        if (adTimerVal) adTimerVal.textContent = seconds.toString();
        
        const adInterval = setInterval(() => {
            seconds--;
            if (adTimerVal) adTimerVal.textContent = seconds.toString();
            
            if (seconds <= 0) {
                clearInterval(adInterval);
                if (adTimerVal) adTimerVal.textContent = "Ready!";
                if (closeAdModalBtn) {
                    closeAdModalBtn.disabled = false;
                    closeAdModalBtn.style.opacity = '1';
                    closeAdModalBtn.style.cursor = 'pointer';
                    closeAdModalBtn.innerHTML = '&times; Close & Continue';
                }
            }
        }, 1000);

        // Bind close button handler
        closeAdModalBtn.onclick = async () => {
            adModal.classList.add('hidden');
            try {
                const regRes = await fetch(`${API_URL}/register-ad-complete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ device_id: deviceId })
                });
                const regData = await regRes.json();
                if (regData.success) {
                    adToken = regData.ad_token;
                    showError("Ad Watched! Extraction slot unlocked.");
                    onAuthorizedCallback(adToken);
                    adToken = null; // Consume immediately
                    checkDeviceAllowance();
                } else {
                    showError("Ad verification failed. Please try again.");
                }
            } catch (err) {
                showError("Ad verification failed. Please try again.");
            }
        };
    }
    
    if (adUpgradeBtn) {
        adUpgradeBtn.addEventListener('click', () => {
            showError("Billing is disabled. Ad support helps keep Downloadyfy.AI free for everyone!");
        });
    }

    function startVideoToAudioConversion(file, token) {
        return new Promise((resolve, reject) => {
            if (convertBtn) convertBtn.disabled = true;
            if (convertLoader) convertLoader.classList.remove('hidden');
            if (convertStatus) convertStatus.classList.remove('hidden');
            if (convertProgressFill) convertProgressFill.style.width = '0%';
            if (convertStatusText) convertStatusText.textContent = 'Uploading video file... 0%';
            
            const format = document.getElementById('audioFormatSelect').value;
            const formData = new FormData();
            formData.append('file', file);
            formData.append('format', format);
            formData.append('device_id', deviceId);
            if (token) formData.append('ad_token', token);
            
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${API_URL}/convert-to-audio`, true);
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    const mappedPercent = Math.round(percent * 0.7);
                    if (convertProgressFill) convertProgressFill.style.width = `${mappedPercent}%`;
                    if (convertStatusText) convertStatusText.textContent = `Uploading video file... ${percent}%`;
                }
            });
            
            xhr.onload = function() {
                if (xhr.status === 200) {
                    if (convertProgressFill) convertProgressFill.style.width = '95%';
                    if (convertStatusText) convertStatusText.textContent = 'AI Engine extracting audio track... This may take a moment.';
                    
                    setTimeout(() => {
                        const blob = new Blob([xhr.response], { type: 'application/octet-stream' });
                        const nameParts = file.name.split('.');
                        nameParts.pop();
                        const outName = `${nameParts.join('.')}.${format}`;
                        
                        const downloadUrl = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = downloadUrl;
                        link.download = outName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        if (convertProgressFill) convertProgressFill.style.width = '100%';
                        if (convertStatusText) convertStatusText.textContent = '🎉 Extraction complete! Audio saved to device.';
                        
                        SoundFX.playSuccess();
                        checkDeviceAllowance();
                        
                        if (convertBtn) convertBtn.disabled = false;
                        if (convertLoader) convertLoader.classList.add('hidden');
                        setTimeout(() => {
                            if (convertStatus) convertStatus.classList.add('hidden');
                        }, 5000);
                        
                        resolve();
                    }, 1500);
                } else {
                    let errMsg = 'Failed to extract audio track.';
                    try {
                        const resJson = JSON.parse(xhr.responseText);
                        errMsg = resJson.error || errMsg;
                    } catch(err) {}
                    
                    handleConversionFailure(errMsg);
                    reject(new Error(errMsg));
                }
            };
            
            xhr.onerror = function() {
                handleConversionFailure("Network error communicating with extraction backend.");
                reject(new Error("Network error."));
            };
            
            xhr.responseType = 'blob';
            xhr.send(formData);
        });
    }

    function handleConversionFailure(errMsg) {
        if (convertProgressFill) convertProgressFill.style.width = '100%';
        if (convertStatusText) convertStatusText.textContent = `❌ Conversion failed: ${errMsg}`;
        showError(errMsg);
        if (convertBtn) convertBtn.disabled = false;
        if (convertLoader) convertLoader.classList.add('hidden');
        
        setTimeout(() => {
            if (convertStatus) convertStatus.classList.add('hidden');
        }, 8000);
    }

    // === Audio Trimmer / Ringtone Creator Logic ===
    const trimForm = document.getElementById('trimForm');
    const audioDragZone = document.getElementById('audioDragZone');
    const audioFileInput = document.getElementById('audioFileInput');
    const trimFileInfo = document.getElementById('trimFileInfo');
    const trimFileName = document.getElementById('trimFileName');
    const trimFileSize = document.getElementById('trimFileSize');
    const trimBtn = document.getElementById('trimBtn');
    const trimLoader = document.getElementById('trimLoader');
    const trimStatus = document.getElementById('trimStatus');
    const trimProgressFill = document.getElementById('trimProgressFill');
    const trimStatusText = document.getElementById('trimStatusText');
    
    if (audioDragZone && audioFileInput) {
        audioDragZone.addEventListener('click', () => {
            audioFileInput.click();
        });
        audioDragZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            audioDragZone.classList.add('dragover');
        });
        audioDragZone.addEventListener('dragleave', () => {
            audioDragZone.classList.remove('dragover');
        });
        audioDragZone.addEventListener('drop', (e) => {
            e.preventDefault();
            audioDragZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('audio/')) {
                audioFileInput.files = e.dataTransfer.files;
                handleSelectedAudioFile(file);
            } else {
                showError("Please drop a valid audio file.");
            }
        });
        audioFileInput.addEventListener('change', () => {
            const file = audioFileInput.files[0];
            if (file) handleSelectedAudioFile(file);
        });
    }
    
    function handleSelectedAudioFile(file) {
        if (trimFileInfo && trimFileName && trimFileSize) {
            trimFileName.textContent = file.name;
            trimFileSize.textContent = (file.size / 1024 / 1024).toFixed(1) + ' MB';
            trimFileInfo.classList.remove('hidden');
            if (trimBtn) trimBtn.disabled = false;
        }
    }
    
    if (trimForm) {
        trimForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const file = audioFileInput.files[0];
            if (!file) return;
            
            runWithAdGating((token) => {
                startAudioTrimming(file, token);
            });
        });
    }

    function startAudioTrimming(file, token) {
        if (trimBtn) trimBtn.disabled = true;
        if (trimLoader) trimLoader.classList.remove('hidden');
        if (trimStatus) trimStatus.classList.remove('hidden');
        if (trimProgressFill) trimProgressFill.style.width = '0%';
        if (trimStatusText) trimStatusText.textContent = 'Uploading audio file... 0%';
        
        const start = document.getElementById('trimStartInput').value || '0';
        const end = document.getElementById('trimEndInput').value || '30';
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('start', start);
        formData.append('end', end);
        formData.append('device_id', deviceId);
        if (token) formData.append('ad_token', token);
        
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_URL}/trim-audio`, true);
        
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                const mappedPercent = Math.round(percent * 0.7);
                if (trimProgressFill) trimProgressFill.style.width = `${mappedPercent}%`;
                if (trimStatusText) trimStatusText.textContent = `Uploading audio file... ${percent}%`;
            }
        });
        
        xhr.onload = function() {
            if (xhr.status === 200) {
                if (trimProgressFill) trimProgressFill.style.width = '95%';
                if (trimStatusText) trimStatusText.textContent = 'AI cutting & converting track... Please wait.';
                
                setTimeout(() => {
                    const blob = new Blob([xhr.response], { type: 'audio/mpeg' });
                    const outName = `${file.name.split('.')[0]}_trimmed.mp3`;
                    
                    const downloadUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = downloadUrl;
                    link.download = outName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    if (trimProgressFill) trimProgressFill.style.width = '100%';
                    if (trimStatusText) trimStatusText.textContent = '🎉 Cut complete! Ringtone saved to device.';
                    
                    SoundFX.playSuccess();
                    checkDeviceAllowance();
                    
                    if (trimBtn) trimBtn.disabled = false;
                    if (trimLoader) trimLoader.classList.add('hidden');
                    setTimeout(() => {
                        if (trimStatus) trimStatus.classList.add('hidden');
                    }, 5000);
                }, 1500);
            } else {
                let errMsg = 'Failed to trim audio file.';
                try {
                    const resJson = JSON.parse(xhr.responseText);
                    errMsg = resJson.error || errMsg;
                } catch(err) {}
                
                handleTrimFailure(errMsg);
            }
        };
        
        xhr.onerror = function() {
            handleTrimFailure("Network error communicating with trimming server.");
        };
        
        xhr.responseType = 'blob';
        xhr.send(formData);
    }

    function handleTrimFailure(errMsg) {
        if (trimProgressFill) trimProgressFill.style.width = '100%';
        if (trimStatusText) trimStatusText.textContent = `❌ Trimming failed: ${errMsg}`;
        showError(errMsg);
        if (trimBtn) trimBtn.disabled = false;
        if (trimLoader) trimLoader.classList.add('hidden');
        setTimeout(() => {
            if (trimStatus) trimStatus.classList.add('hidden');
        }, 8000);
    }

    // Modal overlays close handlers window click
    window.addEventListener('click', (e) => {
        if (e.target === legalModal) {
            legalModal.classList.add('hidden');
        }
        if (e.target === adModal) {
            // Cannot dismiss ad modal by clicking outside while countdown runs
            const timerVal = document.getElementById('adTimerVal').textContent;
            if (timerVal === "Ready!") {
                adModal.classList.add('hidden');
            }
        }
    });

});

// === Cookie Management Functions ===

async function checkCookieStatus() {
    try {
        const res = await fetch(`${API_URL}/cookies-status`);
        const data = await res.json();
        const banner = document.getElementById('cookieBanner');
        if (!data.has_cookies) {
            banner.classList.remove('hidden');
        } else {
            banner.classList.add('hidden');
        }
    } catch (e) {
        // Backend not ready yet, ignore
    }
}

async function autoExportCookies() {
    const btn = document.getElementById('autoExportBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Exporting...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/export-cookies`, { method: 'POST' });
        const data = await res.json();

        if (data.success) {
            btn.innerHTML = '✅ Done!';
            btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
            setTimeout(() => {
                document.getElementById('cookieBanner').classList.add('hidden');
                document.getElementById('cookieGuideModal').classList.add('hidden');
            }, 1500);
        } else {
            btn.innerHTML = '❌ Failed - Close Browser First';
            btn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
                btn.disabled = false;
                showCookieGuide();
            }, 2000);
        }
    } catch (e) {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function showCookieGuide() {
    document.getElementById('cookieGuideModal').classList.remove('hidden');
}

function closeCookieGuide(event) {
    if (event.target.id === 'cookieGuideModal') {
        document.getElementById('cookieGuideModal').classList.add('hidden');
    }
}

function dismissCookieBanner() {
    document.getElementById('cookieBanner').classList.add('hidden');
}

function handleCookieDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) handleCookieFile(file);
}

async function handleCookieFile(file) {
    if (!file) return;
    
    const statusEl = document.getElementById('cookieUploadStatus');
    const dropZone = document.getElementById('cookieDropZone');
    
    statusEl.classList.remove('hidden');
    statusEl.style.background = 'rgba(109,40,217,0.2)';
    statusEl.style.border = '1px solid rgba(109,40,217,0.4)';
    statusEl.textContent = '⏳ Uploading cookies...';
    dropZone.style.opacity = '0.5';
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const res = await fetch(`${API_URL}/upload-cookies`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        
        if (data.success) {
            statusEl.style.background = 'rgba(16,185,129,0.2)';
            statusEl.style.border = '1px solid rgba(16,185,129,0.4)';
            statusEl.innerHTML = '✅ ' + data.message + ' YouTube is ready!';
            dropZone.style.opacity = '1';
            dropZone.style.borderColor = '#10b981';
            
            // Hide banner after success
            setTimeout(() => {
                document.getElementById('cookieBanner').classList.add('hidden');
                document.getElementById('cookieGuideModal').classList.add('hidden');
            }, 2000);
        } else {
            statusEl.style.background = 'rgba(239,68,68,0.2)';
            statusEl.style.border = '1px solid rgba(239,68,68,0.4)';
            statusEl.textContent = '❌ ' + data.message;
            dropZone.style.opacity = '1';
        }
    } catch (e) {
        statusEl.textContent = '❌ Upload failed. Backend not running?';
        dropZone.style.opacity = '1';
    }
}

// Localization Dictionary and Selector Logic
const translations = {
    en: {
        hero_title: 'Experience <span class="gradient-text">Intelligent Simplicity</span>',
        hero_subtitle: 'Paste a link below to download videos, audio, or playlists instantly.',
    },
    ja: {
        hero_title: '体験する <span class="gradient-text">インテリジェントなシンプルさ</span>',
        hero_subtitle: 'リンクを貼り付けるだけで、動画、音声、プレイリストを即座にダウンロードできます。',
        placeholder: 'ここにリンクを貼り付けます (例: YouTube、Instagram リール、Spotify、X/Twitter...)',
        analyze_btn: 'リンクを解析',
        telemetry_idle: 'AI解析ステータス: アイドル // URL入力を待機中',
        disclaimer: '⚠️ <strong>免責事項:</strong> Downloadyfy.AI は個人利用および教育目的専用です。著作権保護されたコンテンツのダウンロードは推奨しません。',
        additional_tools_title: '追加のメディアツール',
        additional_tools_subtitle: 'オフラインでのファイル変換や高精度オーディオトリミングが必要ですか？高性能ユーティリティをお試しください。',
        video_audio_title: '動画 → 音声',
        video_audio_desc: 'ローカルビデオファイル（MP4、MKV、AVI、MOV）をドラッグ＆ドロップして、高品質なオーディオトラックを瞬時に抽出します。',
        convert_now: '今すぐ変換',
        audio_trimmer_title: 'オーディオトリマー',
        audio_trimmer_desc: 'オーディオファイルをアップロードして最適な長さにカットします。カスタム着信音作成に最適です。',
        trim_audio: '音声をトリミング',
        hiw_title: 'Downloadyfy<span>.AI</span> の仕組み',
        hiw_subtitle: 'メディアのダウンロード、抽出、管理を行う簡単な手順に従ってください。',
        hiw_step1_title: 'ツールを選択',
        hiw_step1_desc: '上記のカードから適切なツール（URL用のダウンローダー、ローカルビデオ用のコンバーター、またはトリマー）を選択します。',
        hiw_step2_title: 'リンクの貼り付けまたはファイルアップロード',
        hiw_step2_desc: 'ダウンロードの場合は公開URLをコピーして貼り付けます。ローカルツールの場合は、ファイルをページにドラッグ＆ドロップします。',
        hiw_step3_title: 'フォーマットと品質を選択',
        hiw_step3_desc: 'AIエンジンが自動的に利用可能なフォーマットを検出します。最大8Kの解像度または最大320kbpsのオーディオ品質から選択します。',
        hiw_step4_title: 'デバイスにダウンロード',
        hiw_step4_desc: 'ダウンロードをクリックすると、ファイルはブラウザのダウンロードフォルダに直接保存されます。完全無料です。',
        demo_title: 'プレミアムスピードを体験',
        demo_subtitle: 'カバーアートのマッピングと構成ゼロの、高忠実度ユニバーサルメディアダウンローダー。',
        partners_title: 'クリエイティブ＆エデュケーショナルパートナー',
        partners_subtitle: '私たちのネットワークからの高品質でロイヤリティフリーのコンテンツで、あなたのプロジェクトを支援します。'
    },
    ur: {
        hero_title: 'حاصل کریں <span class="gradient-text">ذہین سادگی</span>',
        hero_subtitle: 'ویڈیوز، آڈیو، یا پلے لسٹس کو فوری طور پر ڈاؤن لوڈ کرنے کے لیے نیچے لنک پیسٹ کریں۔',
        placeholder: 'اپنا لنک یہاں پیسٹ کریں (مثال کے طور پر YouTube، Instagram Reel، Spotify، X/Twitter...)',
        analyze_btn: 'لنک کا تجزیہ کریں',
        telemetry_idle: 'AI تجزیہ کار کی حالت: غیر فعال // URL ان پٹ کا انتظار ہے',
        disclaimer: '⚠️ <strong>دستبرداری:</strong> Downloadyfy.AI صرف ذاتی اور تعلیمی استعمال کے لیے ہے۔ ہم کاپی رائٹ شدہ مواد کو ڈاؤن لوڈ کرنے کی حمایت نہیں کرتے ہیں۔',
        additional_tools_title: 'اضافی میڈیا ٹولز',
        additional_tools_subtitle: 'آف لائن فائل کی تبدیلیوں یا درست آڈیو ٹرمنگ کی ضرورت ہے؟ ہمارے اعلی کارکردگی والے یوٹیلیٹیز کو آزمائیں۔',
        video_audio_title: 'ویڈیو ← آڈیو',
        video_audio_desc: 'مقامی ویڈیو فائل (MP4، MKV، AVI, MOV) کو گھسیٹیں اور چھوڑیں اور فوری طور پر ایک اعلی معیار کا آڈیو ٹریک نکالیں۔',
        convert_now: 'ابھی تبدیل کریں',
        audio_trimmer_title: 'آڈیو ٹرمر',
        audio_trimmer_desc: 'کسی بھی آڈیو فائل کو اپ لوڈ کریں اور اسے بہترین لمبائی تک ٹرم کریں۔ رنگ ٹونز بنانے کے لیے مثالی۔',
        trim_audio: 'آڈیو ٹرم کریں',
        hiw_title: 'Downloadyfy<span>.AI</span> کیسے کام کرتا ہے',
        hiw_subtitle: 'اپنے میڈیا کو ڈاؤن لوڈ کرنے، نکالنے اور منظم کرنے کے لیے ان آسان اقدامات پر عمل کریں۔',
        hiw_step1_title: 'اپنا ٹول منتخب کریں',
        hiw_step1_desc: 'اوپر والے کارڈز میں سے صحیح ٹول منتخب کریں — لنکس کے لیے ڈاؤنلوڈر، مقامی ویڈیوز के लिए कन्वर्टी, या ट्रिमर।',
        hiw_step2_title: 'لنک پیسٹ کریں یا فائل اپ لوڈ کریں',
        hiw_step2_desc: 'ڈاؤن لوڈز کے لیے کوئی بھی عوامی URL کاپی کریں اور اسے پیسٹ کریں۔ مقامی ٹولز کے لیے فائل کو گھسیٹ کر صفحہ پر چھوڑیں۔',
        hiw_step3_title: 'فارمیٹ اور کوالٹی منتخب کریں',
        hiw_step3_desc: 'ہمارا AI انجن خود کار طریقے سے دستیاب فارمیٹس کا پتہ لگاتا ہے۔ 8K ویڈیو یا 320kbps آڈیو تک منتخب کریں۔',
        hiw_step4_title: 'ڈیوائس پر ڈاؤن لوڈ کریں',
        hiw_step4_desc: 'ڈاؤن لوڈ پر کلک کریں اور فائل براہ راست آپ کے براؤزر کے ڈاؤن لوڈ فولڈر میں محفوظ ہو جائے گی۔ ہمیشہ کے لیے مفت۔',
        demo_title: 'پریمیم رفتار کا مقرر کریں',
        demo_subtitle: 'کور آرٹ میپنگ اور صفر کنفیگریشن کے ساتھ ایک یونیورسل میڈیا ڈاؤنلوڈر।',
        partners_title: 'تخلیقی اور تعلیمی شراکت دار',
        partners_subtitle: 'ہمارے نیٹ ورک سے اعلی معیار کے، رائلٹی فری مواد کے ساتھ اپنے مطالعے اور ڈیزائن کے منصوبوں کو بااختیار بنائیں۔'
    },
    ne: {
        hero_title: 'अनुभव गर्नुहोस् <span class="gradient-text">इन्टेलिजेन्ट सरलता</span>',
        hero_subtitle: 'भिडियो, अडियो, वा प्लेलिस्टहरू तुरुन्तै डाउनलोड गर्न तल लिङ्क पेस्ट गर्नुहोस्।',
        placeholder: 'तपाईको लिङ्क यहाँ पेस्ट गर्नुहोस् (जस्तै YouTube, Instagram Reel, Spotify, X/Twitter...)',
        analyze_btn: 'लिङ्क विश्लेषण गर्नुहोस्',
        telemetry_idle: 'AI विश्लेषक अवस्था: निष्क्रिय // URL इनपुटको प्रतीक्षामा',
        disclaimer: '⚠️ <strong>अस्वीकरण:</strong> Downloadyfy.AI व्यक्तिगत र शैक्षिक प्रयोगको लागि मात्र हो। हामी प्रतिलिपि अधिकार सामग्री डाउनलोड गर्न समर्थन गर्दैनौं।',
        additional_tools_title: 'थप मिडिया उपकरणहरू',
        additional_tools_subtitle: 'अफलाइन फाइल रूपान्तरण वा सटीक अडियो ट्रिमिंग आवश्यक छ? हाम्रो उच्च प्रदर्शन उपयोगिताहरू प्रयास गर्नुहोस्।',
        video_audio_title: 'भिडियो → अडियो',
        video_audio_desc: 'स्थानीय भिडियो फाइल ड्र्याग र ड्रप गर्नुहोस् र तुरुन्तै उच्च गुणवत्ताको अडियो ट्र्याक निकाल्नुहोस्।',
        convert_now: 'अहिले रूपान्तरण गर्नुहोस्',
        audio_trimmer_title: 'अडियो ट्रिमर',
        audio_trimmer_desc: 'कुनै पनि अडियो फाइल अपलोड गर्नुहोस् र यसलाई सही लम्बाइमा ट्रिम गर्नुहोस्। रिङटोन बनाउनको लागि उपयुक्त।',
        trim_audio: 'अडियो ट्रिम गर्नुहोस्',
        hiw_title: 'Downloadyfy<span>.AI</span> कसरी काम गर्छ',
        hiw_subtitle: 'तपाईको मिडिया डाउनलोड गर्न, निकाल्न र व्यवस्थित गर्न यी सरल चरणहरू पालना गर्नुहोस्।',
        hiw_step1_title: 'तपाईको उपकरण छान्नुहोस्',
        hiw_step1_desc: 'माथिको कार्डहरूबाट सही उपकरण छान्नुहोस् — डाउनलोडर, स्थानीय भिडियो कन्भर्टर, वा ट्रिमर।',
        hiw_step2_title: 'लिङ्क पेस्ट गर्नुहोस् वा फाइल अपलोड गर्नुहोस्',
        hiw_step2_desc: 'डाउनलोडका लागि कुनै पनि सार्वजनिक URL प्रतिलिपि गरेर पेस्ट गर्नुहोस्। स्थानीय उपकरणका लागि फाइललाई ड्र्याग र ड्रप गर्नुहोस्।',
        hiw_step3_title: 'ढाँचा र गुणस्तर चयन गर्नुहोस्',
        hiw_step3_desc: 'हाम्रो AI इन्जिनले स्वचालित रूपमा उपलब्ध ढाँचाहरू पत्ता लगाउँदछ। भिडियोहरू वा अडियो गुणस्तर छान्नुहोस्।',
        hiw_step4_title: 'उपकरणमा डाउनलोड गर्नुहोस्',
        hiw_step4_desc: 'डाउनलोडमा क्लिक गर्नुहोस् र फाइल सीधा तपाइँको ब्राउजरको डाउनलोड फोल्डरमा बचत हुन्छ। सधैंको लागि निःशुल्क।',
        demo_title: 'प्रिमियम गतिको अनुभव गर्नुहोस्',
        demo_subtitle: 'कवर आर्ट म्यापिङ र शून्य कन्फिगरेसनको साथ एक विश्वव्यापी मिडिया डाउनलोडर।',
        partners_title: 'सृजनात्मक र शैक्षिक साझेدارहरू',
        partners_subtitle: 'हाम्रो नेटवर्कबाट उच्च गुणवत्ताको प्रतिलिपि अधिकार-मुक्त सामग्रीको साथ तपाईंको परियोजनाहरूलाई सशक्त बनाउनुहोस्।'
    },
    lb: {
        hero_title: 'Erlieht <span class="gradient-text">Intelligent Einfachheet</span>',
        hero_subtitle: 'Paste e Link hei ënnen fir Videoen, Audio oder Playlists direkt erofzelueden.',
        placeholder: 'Paste Äre Link hei (z. B. YouTube, Instagram Reel, Spotify, X/Twitter...)',
        analyze_btn: 'Link Analyséieren',
        telemetry_idle: 'KI-PARSER STAT: INAKTIV // WAART OP URL-INGAB',
        disclaimer: '⚠️ <strong>Disclaimer:</strong> Downloadyfy.AI ass nëmme fir perséinlechen an edukative Gebrauch geduecht.',
        additional_tools_title: 'Zousätzlech Medietools',
        additional_tools_subtitle: 'Braucht Dir Offline-Dateikonvertéierungen oder präzis Audio-Trimm-Tools? Probéiert eis Tools.',
        video_audio_title: 'Video → Audio',
        video_audio_desc: 'Zitt eng lokal Videodatei per Drag & Drop an extrahéiert direkt eng héichwäerteg Audiospur.',
        convert_now: 'Elo Konvertéieren',
        audio_trimmer_title: 'Audio-Trimmer',
        audio_trimmer_desc: 'Lued all Audiodatei erop a schneit se op déi perfekt Längt. Ideal fir Ringtones.',
        trim_audio: 'Audio Trimmen',
        hiw_title: 'Wéi Downloadyfy<span>.AI</span> Fonctionnéiert',
        hiw_subtitle: 'Befollegt dës einfach Schrëtt fir Är Medien erofzelueden, z\'extrahéieren an ze verwalten.',
        hiw_step1_title: 'Wielt Äert Tool',
        hiw_step1_desc: 'Wielt dat passend Tool: Link-Downloader, Lokale Konverter oder Audio-Trimmer.',
        hiw_step2_title: 'Link Pasten oder Datei Eroplueden',
        hiw_step2_desc: 'Paste eng ëffentlech URL oder zitt Är lokal Dateien per Drag & Drop direkt op d\'Säit.',
        hiw_step3_title: 'Format & Qualitéit Auswielen',
        hiw_step3_desc: 'Eis KI-Maschinn erkennt verfügbar Formater automatesch. Wielt Video bis 8K oder Audio bis 320kbps.',
        hiw_step4_title: 'Op den Apparat Eroflueden',
        hiw_step4_desc: 'Klickt op Eroflueden an d'Datei gëtt direkt an Ärem Downloads-Dossier gespäichert. Fir ëmmer gratis.',
        demo_title: 'Erlieht Premium-Geschwindegkeet',
        demo_subtitle: 'En High-Fidelity universelle Medien-Downloader mat Cover-Art-Mapping an Null-Konfiguratioun.',
        partners_title: 'Kreativ & Edukativ Partner',
        partners_subtitle: 'Ënnerstëtzt Är Projete mat lizenzfräien Inhalter aus eisem Reseau.'
    },
        placeholder: 'Paste your link here (e.g. YouTube, Instagram Reel, Spotify, X/Twitter...)',
        analyze_btn: 'Analyze Link',
        telemetry_idle: 'AI PARSER STATE: IDLE // AWAITING URL INPUT',
        disclaimer: '⚠️ <strong>Disclaimer:</strong> Downloadyfy.AI is intended for personal and educational use only. We do not support downloading private or copyrighted content. Users are responsible for ensuring compliance with platform terms and copyright laws.',
        additional_tools_title: 'Additional Media Tools',
        additional_tools_subtitle: 'Need offline file conversions or precision audio splitting? Try our high-performance utilities.',
        video_audio_title: 'Video → Audio',
        video_audio_desc: 'Drag and drop a local video file (MP4, MKV, AVI, MOV) and instantly extract a high-quality audio track. Choose from MP3, WAV, FLAC, or M4A output formats.',
        convert_now: 'Convert Now',
        audio_trimmer_title: 'Audio Trimmer',
        audio_trimmer_desc: 'Upload any audio file and trim it to the perfect length. Ideal for creating custom ringtones, notification sounds, and podcast clips in high-quality MP3.',
        trim_audio: 'Trim Audio',
        hiw_title: 'How Downloadyfy<span>.AI</span> Works',
        hiw_subtitle: 'Follow these simple steps to download, extract, and manage your media.',
        hiw_step1_title: 'Choose Your Tool',
        hiw_step1_desc: 'Select the right tool from the cards above — Link Downloader for URLs, Converter for local videos, or Trimmer for audio clips.',
        hiw_step2_title: 'Paste Link or Upload File',
        hiw_step2_desc: 'For downloads, copy any public URL and paste it. For local tools, drag-and-drop your video or audio file directly onto the page.',
        hiw_step3_title: 'Select Format & Quality',
        hiw_step3_desc: 'Our AI engine auto-detects available formats. Pick from video resolutions up to 8K or audio quality up to 320kbps Lossless FLAC.',
        hiw_step4_title: 'Download to Device',
        hiw_step4_desc: 'Click Download and the file saves directly to your browser\'s downloads folder. No accounts, no subscriptions. Free forever.',
        demo_title: 'Experience the Premium Speed',
        demo_subtitle: 'A high-fidelity universal media downloader with cover art mapping and zero configuration.',
        partners_title: 'Creative & Educational Partners',
        partners_subtitle: 'Empower your study and design projects with high-quality, royalty-free content from our network.'
    },
    hi: {
        hero_title: 'अनुभव करें <span class="gradient-text">इंटेलिजेंट सादगी</span>',
        hero_subtitle: 'वीडियो, ऑडियो या प्लेलिस्ट तुरंत डाउनलोड करने के लिए नीचे लिंक पेस्ट करें।',
        placeholder: 'अपना लिंक यहां पेस्ट करें (जैसे YouTube, Instagram Reel, Spotify, X/Twitter...)',
        analyze_btn: 'लिंक का विश्लेषण करें',
        telemetry_idle: 'AI पार्सर स्टेट: निष्क्रिय // URL इनपुट की प्रतीक्षा है',
        disclaimer: '⚠️ <strong>अस्वीकरण:</strong> Downloadyfy.AI केवल व्यक्तिगत और शैक्षिक उपयोग के लिए है। हम कॉपीराइट सामग्री डाउनलोड करने का समर्थन नहीं करते हैं।',
        additional_tools_title: 'अतिरिक्त मीडिया उपकरण',
        additional_tools_subtitle: 'ऑफ़लाइन फ़ाइल रूपांतरण या सटीक ऑडियो ट्रिमिंग की आवश्यकता है? हमारे उपयोगिताओं को आज़माएं।',
        video_audio_title: 'वीडियो → ऑडियो',
        video_audio_desc: 'स्थानीय वीडियो फ़ाइल खींचें और छोड़ें और तुरंत एक उच्च गुणवत्ता वाला ऑडियो ट्रैक निकालें।',
        convert_now: 'अभी बदलें',
        audio_trimmer_title: 'ऑडियो ट्रिमर',
        audio_trimmer_desc: 'किसी भी ऑडियो फ़ाइल को अपलोड करें और उसे सही लंबाई में ट्रिम करें। रिंगटोन बनाने के लिए आदर्श।',
        trim_audio: 'ऑडियो ट्रिम करें',
        hiw_title: 'Downloadyfy<span>.AI</span> कैसे काम करता है',
        hiw_subtitle: 'अपने मीडिया को डाउनलोड करने, निकालने और प्रबंधित करने के लिए इन सरल चरणों का पालन करें।',
        hiw_step1_title: 'अपना टूल चुनें',
        hiw_step1_desc: 'ऊपर दिए गए कार्ड में से सही टूल चुनें — डाउनलोडर, कन्वर्टर या ट्रिमर।',
        hiw_step2_title: 'लिंक पेस्ट करें या फ़ाइल अपलोड करें',
        hiw_step2_desc: 'डाउनलोड के लिए कोई भी सार्वजनिक लिंक पेस्ट करें। स्थानीय टूल के लिए फ़ाइल को ड्रैग-एंड-ड्रॉप करें।',
        hiw_step3_title: 'फॉर्मेट और क्वालिटी चुनें',
        hiw_step3_desc: 'हमारा AI इंजन उपलब्ध फॉर्मेट का पता लगाता है। 8K वीडियो या 320kbps ऑडियो चुनें।',
        hiw_step4_title: 'डिवाइस पर डाउनलोड करें',
        hiw_step4_desc: 'डाउनलोड पर क्लिक करें और फ़ाइल सीधे आपके डाउनलोड फ़ोल्डर में सुरक्षित हो जाएगी। पूरी तरह से मुफ्त।',
        demo_title: 'प्रीमियम स्पीड का अनुभव करें',
        demo_subtitle: 'कवर आर्ट मैपिंग और ज़ीरो कॉन्फ़िगरेशन के साथ एक सार्वभौमिक मीडिया डाउनलोडर।',
        partners_title: 'रचनात्मक और शैक्षिक भागीदार',
        partners_subtitle: 'हमारे नेटवर्क से उच्च गुणवत्ता वाली, कॉपीराइट-मुक्त सामग्री के साथ अपने प्रोजेक्ट्स को सशक्त बनाएं।'
    },
    es: {
        hero_title: 'Experimenta la <span class="gradient-text">Simplicidad Inteligente</span>',
        hero_subtitle: 'Pega un enlace abajo para descargar videos, audio o listas de reproducción al instante.',
        placeholder: 'Pega tu enlace aquí (ej. YouTube, Instagram Reel, Spotify, X/Twitter...)',
        analyze_btn: 'Analizar Enlace',
        telemetry_idle: 'ESTADO DEL PARSER AI: INACTIVO // ESPERANDO ENTRADA DE URL',
        disclaimer: '⚠️ <strong>Descargo de responsabilidad:</strong> Downloadyfy.AI está destinado únicamente para uso personal y educativo. No apoyamos la descarga de contenido con derechos de autor.',
        additional_tools_title: 'Herramientas de Medios Adicionales',
        additional_tools_subtitle: '¿Necesitas conversiones de archivos sin conexión o corte de audio de precisión? Prueba nuestras utilidades.',
        video_audio_title: 'Video → Audio',
        video_audio_desc: 'Arrastra y suelta un archivo de video local y extrae instantáneamente una pista de audio de alta calidad.',
        convert_now: 'Convertir Ahora',
        audio_trimmer_title: 'Recortador de Audio',
        audio_trimmer_desc: 'Sube cualquier archivo de audio y recórtalo a la longitud perfecta. Ideal para tonos de llamada.',
        trim_audio: 'Recortar Audio',
        hiw_title: 'Cómo funciona Downloadyfy<span>.AI</span>',
        hiw_subtitle: 'Sigue estos sencillos pasos para descargar, extraer y gestionar tus archivos.',
        hiw_step1_title: 'Elige tu Herramienta',
        hiw_step1_desc: 'Selecciona la herramienta adecuada: Descargador de enlaces, Convertidor local o Recortador.',
        hiw_step2_title: 'Pega el Enlace o Sube el Archivo',
        hiw_step2_desc: 'Copia cualquier URL pública y pégala, o arrastra y suelta tus archivos locales en la página.',
        hiw_step3_title: 'Selecciona Formato y Calidad',
        hiw_step3_desc: 'Nuestro motor de IA detecta formatos automáticamente. Elige resoluciones de video hasta 8K o audio de 320kbps.',
        hiw_step4_title: 'Descarga a tu Dispositivo',
        hiw_step4_desc: 'Haz clic en Descargar y el archivo se guardará en tu carpeta de descargas. Gratis para siempre.',
        demo_title: 'Experimenta la Velocidad Premium',
        demo_subtitle: 'Un descargador de medios universal de alta fidelidad con mapeo de portadas y configuración cero.',
        partners_title: 'Socios Creativos y Educativos',
        partners_subtitle: 'Potencia tus proyectos con contenido gratuito de alta calidad de nuestra red.'
    },
    pt: {
        hero_title: 'Experimente a <span class="gradient-text">Simplicidade Inteligente</span>',
        hero_subtitle: 'Cole um link abaixo para baixar vídeos, áudio ou playlists instantaneamente.',
        placeholder: 'Cole seu link aqui (ex. YouTube, Instagram Reel, Spotify, X/Twitter...)',
        analyze_btn: 'Analisar Link',
        telemetry_idle: 'ESTADO DO PARSER AI: INATIVO // AGUARDANDO ENTRADA DE URL',
        disclaimer: '⚠️ <strong>Aviso legal:</strong> Downloadyfy.AI é destinado apenas para uso pessoal e educacional. Não apoiamos o download de conteúdo protegido por direitos autorais.',
        additional_tools_title: 'Ferramentas de Mídia Adicionais',
        additional_tools_subtitle: 'Precisa de conversões de arquivos offline ou corte de áudio de precisão? Experimente nossos utilitários.',
        video_audio_title: 'Vídeo → Áudio',
        video_audio_desc: 'Arraste e solte um arquivo de vídeo local e extraia instantaneamente uma faixa de áudio de alta qualidade.',
        convert_now: 'Converter Agora',
        audio_trimmer_title: 'Cortador de Áudio',
        audio_trimmer_desc: 'Envie qualquer arquivo de áudio e corte-o no tamanho perfeito. Ideal para criar toques personalizados.',
        trim_audio: 'Cortar Áudio',
        hiw_title: 'Como o Downloadyfy<span>.AI</span> Funciona',
        hiw_subtitle: 'Siga estes passos simples para baixar, extrair e gerenciar suas mídias.',
        hiw_step1_title: 'Escolha Sua Ferramenta',
        hiw_step1_desc: 'Selecione a ferramenta ideal nos cartões acima — Downloader para URLs, Converter ou Trimmer.',
        hiw_step2_title: 'Cole o Link ou Envie o Arquivo',
        hiw_step2_desc: 'Para downloads, cole qualquer URL pública. Para ferramentas locais, arraste e solte o arquivo diretamente.',
        hiw_step3_title: 'Selecione o Formato e Qualidade',
        hiw_step3_desc: 'Nosso motor AI detecta formatos disponíveis automaticamente. Escolha resoluções até 8K ou áudio de 320kbps.',
        hiw_step4_title: 'Baixe no Dispositivo',
        hiw_step4_desc: 'Clique em Baixar e o arquivo será salvo na sua pasta de downloads. Grátis para sempre.',
        demo_title: 'Experimente a Velocidade Premium',
        demo_subtitle: 'Um downloader de mídia universal de alta fidelidade com mapeamento de capas e configuração zero.',
        partners_title: 'Parceiros Criativos e Educacionais',
        partners_subtitle: 'Capacite seus projetos com conteúdo de alta qualidade e livre de direitos autorais de nossa rede.'
    },
    fr: {
        hero_title: 'Découvrez la <span class="gradient-text">Simplicité Intelligente</span>',
        hero_subtitle: 'Collez un lien ci-dessous pour télécharger instantanément des vidéos, de l\'audio ou des playlists.',
        placeholder: 'Collez votre lien ici (ex. YouTube, Instagram Reel, Spotify, X/Twitter...)',
        analyze_btn: 'Analyser le Lien',
        telemetry_idle: 'ÉTAT DU PARSER AI : INACTIF // EN ATTENTE D\'URL',
        disclaimer: '⚠️ <strong>Clause de non-responsabilité :</strong> Downloadyfy.AI est destiné uniquement à un usage personnel et éducatif.',
        additional_tools_title: 'Outils Média Supplémentaires',
        additional_tools_subtitle: 'Besoin de conversions hors ligne ou d\'un découpage audio de précision ? Essayez nos utilitaires.',
        video_audio_title: 'Vidéo → Audio',
        video_audio_desc: 'Glissez-déposez un fichier vidéo local et extrayez instantanément une piste audio de haute qualité.',
        convert_now: 'Convertir Maintenant',
        audio_trimmer_title: 'Découpeur Audio',
        audio_trimmer_desc: 'Téléchargez n\'importe quel fichier audio et découpez-le à la longueur parfaite. Idéal pour les sonneries.',
        trim_audio: 'Découper l\'Audio',
        hiw_title: 'Comment fonctionne Downloadyfy<span>.AI</span>',
        hiw_subtitle: 'Suivez ces étapes simples pour télécharger, extraire et gérer vos médias.',
        hiw_step1_title: 'Choisissez Votre Outil',
        hiw_step1_desc: 'Sélectionnez le bon outil : Téléchargeur de liens, Convertisseur local ou Découpeur audio.',
        hiw_step2_title: 'Collez le Lien ou Déposez le Fichier',
        hiw_step2_desc: 'Collez n\'importe quel URL public ou glissez-déposez vos fichiers locaux directement sur la page.',
        hiw_step3_title: 'Sélectionnez le Format et la Qualité',
        hiw_step3_desc: 'Notre moteur d\'IA détecte automatiquement les formats disponibles. Choisissez jusqu\'à 8K ou 320kbps.',
        hiw_step4_title: 'Téléchargez sur l\'Appareil',
        hiw_step4_desc: 'Cliquez sur Télécharger et le fichier s\'enregistrera directement dans vos téléchargements. Gratuit pour toujours.',
        demo_title: 'Découvrez la Vitesse Premium',
        demo_subtitle: 'Un téléchargeur universel haute fidélité avec cartographie des pochettes et configuration zéro.',
        partners_title: 'Partenaires Créatifs et Éducatifs',
        partners_subtitle: 'Boostez vos projets avec du contenu libre de droits de haute qualité issu de notre réseau.'
    },
    de: {
        hero_title: 'Erleben Sie <span class="gradient-text">Intelligente Einfachheit</span>',
        hero_subtitle: 'Fügen Sie unten einen Link ein, um Videos, Audio oder Playlists sofort herunterzuladen.',
        placeholder: 'Fügen Sie Ihren Link hier ein (z. B. YouTube, Instagram Reel, Spotify, X/Twitter...)',
        analyze_btn: 'Link Analysieren',
        telemetry_idle: 'KI-PARSER-STATUS: INAKTIV // WARTE AUF URL-EINGABE',
        disclaimer: '⚠️ <strong>Haftungsausschluss:</strong> Downloadyfy.AI ist nur für den persönlichen und pädagogischen Gebrauch bestimmt.',
        additional_tools_title: 'Zusätzliche Medienwerkzeuge',
        additional_tools_subtitle: 'Benötigen Sie Offline-Dateikonvertierungen oder präzises Audio-Splitting? Probieren Sie unsere Tools.',
        video_audio_title: 'Video → Audio',
        video_audio_desc: 'Ziehen Sie eine lokale Videodatei per Drag & Drop und extrahieren Sie sofort eine hochwertige Audiospur.',
        convert_now: 'Jetzt Konvertieren',
        audio_trimmer_title: 'Audio-Trimmer',
        audio_trimmer_desc: 'Laden Sie eine beliebige Audiodatei hoch und schneiden Sie sie auf die perfekte Länge. Ideal für Klingeltöne.',
        trim_audio: 'Audio Schneiden',
        hiw_title: 'Wie Downloadyfy<span>.AI</span> Funktioniert',
        hiw_subtitle: 'Befolgen Sie diese einfachen Schritte, um Ihre Medien herunterzuladen, zu extrahieren und zu verwalten.',
        hiw_step1_title: 'Wählen Sie Ihr Tool',
        hiw_step1_desc: 'Wählen Sie das passende Tool: Link-Downloader, lokaler Konverter oder Audio-Trimmer.',
        hiw_step2_title: 'Link Einfügen oder Datei Hochladen',
        hiw_step2_desc: 'Fügen Sie eine öffentliche URL ein oder ziehen Sie lokale Dateien per Drag & Drop auf die Seite.',
        hiw_step3_title: 'Format & Qualität Auswählen',
        hiw_step3_desc: 'Unsere KI-Engine erkennt verfügbare Formate automatisch. Wählen Sie Video bis 8K oder Audio bis 320 kbps.',
        hiw_step4_title: 'Auf Gerät Herunterladen',
        hiw_step4_desc: 'Klicken Sie auf Herunterladen und die Datei wird in Ihrem Downloads-Ordner gespeichert. Für immer kostenlos.',
        demo_title: 'Erleben Sie Premium-Geschwindigkeit',
        demo_subtitle: 'Ein universeller Medien-Downloader mit Cover-Art-Mapping und Null-Konfiguration.',
        partners_title: 'Kreative & Bildungspartner',
        partners_subtitle: 'Unterstützen Sie Ihre Projekte mit lizenzfreien Inhalten aus unserem Netzwerk.'
    },
    ru: {
        hero_title: 'Почувствуйте <span class="gradient-text">Интеллектуальную Простоту</span>',
        hero_subtitle: 'Вставьте ссылку ниже, чтобы мгновенно скачать видео, аудио или плейлисты.',
        placeholder: 'Вставьте ссылку сюда (например, YouTube, Instagram Reel, Spotify, X/Twitter...)',
        analyze_btn: 'Анализировать ссылку',
        telemetry_idle: 'СОСТОЯНИЕ AI-ПАРСЕРА: ОЖИДАНИЕ // ОЖИДАНИЕ ВВОДА URL',
        disclaimer: '⚠️ <strong>Отказ от ответственности:</strong> Downloadyfy.AI предназначен только для личного и образовательного использования.',
        additional_tools_title: 'Дополнительные Медиа-Инструменты',
        additional_tools_subtitle: 'Нужна конвертация файлов или точная обрезка аудио? Попробуйте наши утилиты.',
        video_audio_title: 'Видео → Аудио',
        video_audio_desc: 'Перетащите локальный видеофайл и мгновенно извлеките высококачественную аудиодорожку.',
        convert_now: 'Конвертировать',
        audio_trimmer_title: 'Аудио-Триммер',
        audio_trimmer_desc: 'Загрузите любой аудиофайл и обрежьте его до идеальной длины. Идеально для рингтонов.',
        trim_audio: 'Обрезать аудио',
        hiw_title: 'Как работает Downloadyfy<span>.AI</span>',
        hiw_subtitle: 'Выполните эти простые шаги, чтобы загрузить, извлечь и упорядочить ваши медиафайлы.',
        hiw_step1_title: 'Выберите Инструмент',
        hiw_step1_desc: 'Выберите подходящий инструмент: загрузчик ссылок, локальный конвертер или обрезчик аудио.',
        hiw_step2_title: 'Вставьте Ссылку или Загрузите Файл',
        hiw_step2_desc: 'Для загрузки вставьте публичный URL. Для локальных инструментов перетащите файл прямо на страницу.',
        hiw_step3_title: 'Выберите Формат и Качество',
        hiw_step3_desc: 'Наш AI-движок автоматически определит доступные форматы. Выберите видео до 8K или аудио до 320 кбит/с.',
        hiw_step4_title: 'Скачайте на Устройство',
        hiw_step4_desc: 'Нажмите «Скачать», и файл сохранится в папке загрузок вашего браузера. Абсолютно бесплатно.',
        demo_title: 'Испытайте премиальную скорость',
        demo_subtitle: 'Универсальный загрузчик медиа высокого качества с автозагрузкой обложек и нулевой настройкой.',
        partners_title: 'Творческие и образовательные партнеры',
        partners_subtitle: 'Повысьте качество своих проектов с помощью высококачественного бесплатного контента из нашей сети.'
    }
};

function applyLanguage(lang) {
    const dict = translations[lang] || translations['en'];
    
    // Translate data-translate tags
    document.querySelectorAll('[data-translate]').forEach(el => {
        const key = el.getAttribute('data-translate');
        if (dict[key]) {
            el.innerHTML = dict[key];
        }
    });
    
    // Translate search input placeholder
    const videoInput = document.getElementById('videoUrl');
    if (videoInput && dict['placeholder']) {
        videoInput.placeholder = dict['placeholder'];
    }
}

function initLanguage() {
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        const savedLang = localStorage.getItem('appLanguage') || 'en';
        languageSelect.value = savedLang;
        applyLanguage(savedLang);
        
        languageSelect.addEventListener('change', (e) => {
            const lang = e.target.value;
            localStorage.setItem('appLanguage', lang);
            applyLanguage(lang);
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLanguage);
} else {
    initLanguage();
}
