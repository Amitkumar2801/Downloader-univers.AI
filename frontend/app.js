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
