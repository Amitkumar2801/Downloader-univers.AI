// === Super Rich Audio Effects Engine (Web Audio API) ===
const SoundFX = {
    audioCtx: null,
    muted: false,

    init() {
        if (!this.audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                this.audioCtx = new AudioContextClass();
            }
        }
    },

    resume() {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    },

    // 1. Crisp Micro Click (Buttons, Links, Quality Tabs)
    playClick() {
        if (this.muted) return;
        try {
            this.init();
            const ctx = this.audioCtx;
            if (!ctx) return;
            this.resume();
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, now);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.04);
        } catch (e) {}
    },

    // 2. Soft Pop / Expand (Drawer Open, Adding Segment, Tab Switch)
    playPop() {
        if (this.muted) return;
        try {
            this.init();
            const ctx = this.audioCtx;
            if (!ctx) return;
            this.resume();
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(750, now + 0.08);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.08);
        } catch (e) {}
    },

    // 3. Delete / Whoosh (Remove segment, close modal)
    playDelete() {
        if (this.muted) return;
        try {
            this.init();
            const ctx = this.audioCtx;
            if (!ctx) return;
            this.resume();
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(450, now);
            osc.frequency.exponentialRampToValueAtTime(120, now + 0.1);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.1);
        } catch (e) {}
    },

    // 4. Futuristic AI Parser / Telemetry Sweep
    playScan() {
        if (this.muted) return;
        try {
            this.init();
            const ctx = this.audioCtx;
            if (!ctx) return;
            this.resume();
            const now = ctx.currentTime;
            
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.exponentialRampToValueAtTime(950, now + 1.1);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(220, now);
            filter.frequency.exponentialRampToValueAtTime(1800, now + 0.9);

            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.18, now + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 1.1);
        } catch (e) {}
    },

    // 5. Rocket / Launch Start (Download Started)
    playStartDownload() {
        if (this.muted) return;
        try {
            this.init();
            const ctx = this.audioCtx;
            if (!ctx) return;
            this.resume();
            const now = ctx.currentTime;
            
            const notes = [523.25, 659.25, 783.99];
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const t = now + idx * 0.08;
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0.12, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.25);
            });
        } catch (e) {}
    },

    // 6. Crystal Success Harmony (Completion Chime)
    playSuccess() {
        if (this.muted) return;
        try {
            this.init();
            const ctx = this.audioCtx;
            if (!ctx) return;
            this.resume();
            const now = ctx.currentTime;

            const chords = [659.25, 830.61, 987.77, 1318.51];
            chords.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const t = now + idx * 0.09;
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.16, t + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.7);
            });
        } catch (e) {}
    },

    // 7. Error / Alert Sound
    playError() {
        if (this.muted) return;
        try {
            this.init();
            const ctx = this.audioCtx;
            if (!ctx) return;
            this.resume();
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.setValueAtTime(170, now + 0.12);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.3);
        } catch (e) {}
    },

    // 8. Mode / Theme Toggle Sound
    playToggle() {
        if (this.muted) return;
        try {
            this.init();
            const ctx = this.audioCtx;
            if (!ctx) return;
            this.resume();
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.07);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.07);
        } catch (e) {}
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

    // Master Hero Interactive Elements
    const btnPasteClipboard = document.getElementById('btnPasteClipboard');
    const btnClearUrl = document.getElementById('btnClearUrl');
    const detectedPlatformIcon = document.getElementById('detectedPlatformIcon');
    const platformChips = document.querySelectorAll('.platform-chip');

    // Platform SVG definitions
    const PLATFORM_ICONS = {
        default: `<svg class="link-icon" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`,
        youtube: `<svg viewBox="0 0 24 24" width="22" height="22" fill="#ff0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
        instagram: `<svg viewBox="0 0 24 24" width="22" height="22" fill="#e1306c"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
        facebook: `<svg viewBox="0 0 24 24" width="22" height="22" fill="#1877f2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
        tiktok: `<svg viewBox="0 0 24 24" width="22" height="22" fill="#00f2fe"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`,
        pinterest: `<svg viewBox="0 0 24 24" width="22" height="22" fill="#e60023"><path d="M12 0a12 12 0 0 0-4.37 23.18c-.05-.98-.1-2.48.02-3.55.11-.96.72-6.14.72-6.14s-.18-.37-.18-.92c0-.86.5-1.5 1.13-1.5.53 0 .79.4.79.88 0 .54-.34 1.34-.52 2.08-.15.62.31 1.12.92 1.12 1.1 0 1.95-1.16 1.95-2.84 0-1.48-1.07-2.52-2.59-2.52-1.77 0-2.8 1.33-2.8 2.7 0 .54.2.1.13.48.05.2.06.33.02.5-.06.26-.2.83-.23.95-.04.16-.13.2-.3.12-.9-.42-1.46-1.74-1.46-2.8 0-2.28 1.66-4.38 4.78-4.38 2.51 0 4.46 1.79 4.46 4.18 0 2.5-1.57 4.51-3.76 4.51-.73 0-1.43-.38-1.66-.83l-.45 1.73c-.16.63-.6 1.42-.9 1.89A12 12 0 1 0 12 0z"/></svg>`
    };

    function updateUrlInputState(val) {
        val = (val || '').trim();
        if (btnClearUrl) {
            if (val.length > 0) {
                btnClearUrl.classList.remove('hidden');
            } else {
                btnClearUrl.classList.add('hidden');
            }
        }

        const lower = val.toLowerCase();
        let detected = 'default';
        let statusText = 'AI PARSER STATE: READY // PASTE URL TO BEGIN';

        if (lower.includes('youtube.com') || lower.includes('youtu.be') || lower.includes('/shorts/')) {
            detected = 'youtube';
            statusText = 'AI PARSER STATE: MATCHED // YOUTUBE CORE EXTRACTOR ONLINE';
        } else if (lower.includes('instagram.com') || lower.includes('instagr.am')) {
            detected = 'instagram';
            statusText = 'AI PARSER STATE: MATCHED // INSTAGRAM MEDIA EXTRACTOR ONLINE';
        } else if (lower.includes('facebook.com') || lower.includes('fb.watch') || lower.includes('fb.com')) {
            detected = 'facebook';
            statusText = 'AI PARSER STATE: MATCHED // FACEBOOK REEL & VIDEO PARSER ONLINE';
        } else if (lower.includes('tiktok.com') || lower.includes('douyin.com')) {
            detected = 'tiktok';
            statusText = 'AI PARSER STATE: MATCHED // TIKTOK WATERMARK-FREE EXTRACTOR ONLINE';
        } else if (lower.includes('pinterest.com') || lower.includes('pin.it')) {
            detected = 'pinterest';
            statusText = 'AI PARSER STATE: MATCHED // PINTEREST HD ASSET ENGINE ONLINE';
        } else if (val.length > 5) {
            statusText = 'AI PARSER STATE: ANALYZING CUSTOM MEDIA STREAM...';
        }

        if (detectedPlatformIcon) {
            detectedPlatformIcon.innerHTML = PLATFORM_ICONS[detected] || PLATFORM_ICONS.default;
        }

        if (telemetryStatus) {
            telemetryStatus.textContent = statusText;
        }

        // Highlight matching platform chip
        platformChips.forEach(chip => {
            const p = chip.dataset.platform;
            if (detected === p) {
                chip.classList.add('active');
            } else if (detected !== 'default') {
                chip.classList.remove('active');
            }
        });
    }

    if (urlInput) {
        urlInput.addEventListener('input', (e) => {
            updateUrlInputState(e.target.value);
        });
    }

    if (btnClearUrl) {
        btnClearUrl.addEventListener('click', () => {
            if (urlInput) {
                urlInput.value = '';
                urlInput.focus();
                updateUrlInputState('');
            }
        });
    }

    if (btnPasteClipboard) {
        btnPasteClipboard.addEventListener('click', async () => {
            try {
                if (typeof SoundFX !== 'undefined' && SoundFX.playPop) {
                    SoundFX.playPop();
                }
                
                let text = '';
                if (navigator.clipboard && navigator.clipboard.readText) {
                    text = await navigator.clipboard.readText();
                } else {
                    // Fallback for some mobile webviews
                    text = prompt("Paste your link here:") || '';
                }
                
                if (text && text.trim()) {
                    if (urlInput) {
                        urlInput.value = text.trim();
                        updateUrlInputState(text.trim());
                        urlInput.focus();
                    }
                    // Visual feedback on paste button
                    const originalHTML = btnPasteClipboard.innerHTML;
                    btnPasteClipboard.innerHTML = `<span>✓</span><span class="btn-text">Pasted!</span>`;
                    setTimeout(() => {
                        btnPasteClipboard.innerHTML = originalHTML;
                    }, 1500);
                } else {
                    if (urlInput) urlInput.focus();
                }
            } catch (err) {
                console.warn('Clipboard read error:', err);
                if (urlInput) urlInput.focus();
            }
        });
    }

    // Platform chips switcher
    platformChips.forEach(chip => {
        chip.addEventListener('click', () => {
            platformChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const placeholder = chip.dataset.placeholder;
            if (urlInput && placeholder) {
                urlInput.placeholder = placeholder;
                urlInput.focus();
            }
            if (typeof SoundFX !== 'undefined' && SoundFX.playPop) {
                SoundFX.playPop();
            }
        });
    });

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

    // --- Multi-Segment Trim Interactive Listeners ---
    const closeTrimPanelBtn = document.getElementById('closeTrimPanelBtn');
    if (closeTrimPanelBtn) {
        closeTrimPanelBtn.addEventListener('click', () => switchDownloadMode('full'));
    }

    const modeFullBtn = document.getElementById('modeFullBtn');
    const modeTrimBtn = document.getElementById('modeTrimBtn');
    if (modeFullBtn) {
        modeFullBtn.addEventListener('click', () => switchDownloadMode('full'));
    }
    if (modeTrimBtn) {
        modeTrimBtn.addEventListener('click', () => switchDownloadMode('trim'));
    }

    const trimTypeVideo = document.getElementById('trimTypeVideo');
    const trimTypeAudio = document.getElementById('trimTypeAudio');
    const trimBtnText = document.getElementById('trimBtnText');

    if (trimTypeVideo) {
        trimTypeVideo.addEventListener('click', () => {
            trimTypeVideo.classList.add('active');
            if (trimTypeAudio) trimTypeAudio.classList.remove('active');
            currentTrimMediaType = 'video';
            if (trimBtnText) trimBtnText.textContent = 'Trim & Download Merged Video';
            if (currentVideoData) populateTrimQualityDropdown(currentVideoData);
        });
    }
    if (trimTypeAudio) {
        trimTypeAudio.addEventListener('click', () => {
            trimTypeAudio.classList.add('active');
            if (trimTypeVideo) trimTypeVideo.classList.remove('active');
            currentTrimMediaType = 'audio';
            if (trimBtnText) trimBtnText.textContent = 'Trim & Download Merged Audio';
            if (currentVideoData) populateTrimQualityDropdown(currentVideoData);
        });
    }

    const addSegmentBtn = document.getElementById('addSegmentBtn');
    if (addSegmentBtn) {
        addSegmentBtn.addEventListener('click', () => {
            if (currentTrimSegments.length >= 20) {
                showError("Maximum of 20 segments reached per trim session.");
                return;
            }
            const lastSeg = currentTrimSegments[currentTrimSegments.length - 1];
            const lastEndSec = parseInputTimeToSeconds(lastSeg ? lastSeg.end : '00:00') || 0;
            const nextStartSec = lastEndSec + 5;
            const nextEndSec = nextStartSec + 30;
            
            currentTrimSegments.push({
                start: formatSecondsToDisplay(nextStartSec),
                end: formatSecondsToDisplay(nextEndSec)
            });
            renderTrimSegmentRows();
        });
    }

    const resetSegmentsBtn = document.getElementById('resetSegmentsBtn');
    if (resetSegmentsBtn) {
        resetSegmentsBtn.addEventListener('click', () => {
            const videoDur = (currentVideoData && currentVideoData.duration) || 120;
            const defaultEnd = Math.min(60, videoDur);
            currentTrimSegments = [
                { start: '00:00', end: formatSecondsToDisplay(defaultEnd) }
            ];
            renderTrimSegmentRows();
        });
    }

    const startTrimDownloadBtn = document.getElementById('startTrimDownloadBtn');
    if (startTrimDownloadBtn) {
        startTrimDownloadBtn.addEventListener('click', async () => {
            if (!currentVideoData || !currentVideoData.url) {
                showError("Please analyze a video link first.");
                return;
            }
            
            // Validate segments
            const validatedSegments = [];
            for (let i = 0; i < currentTrimSegments.length; i++) {
                const seg = currentTrimSegments[i];
                const sSec = parseInputTimeToSeconds(seg.start);
                const eSec = parseInputTimeToSeconds(seg.end);
                
                if (sSec === null || eSec === null || isNaN(sSec) || isNaN(eSec)) {
                    showError(`Segment #${i + 1} contains an invalid timestamp. Please enter in MM:SS or seconds (e.g. 1:04 or 4:21).`);
                    return;
                }
                if (sSec < 0 || eSec <= sSec) {
                    showError(`Segment #${i + 1} Start Time (${seg.start}) must be before End Time (${seg.end}).`);
                    return;
                }
                validatedSegments.push({ start: seg.start, end: seg.end });
            }
            
            if (validatedSegments.length === 0) {
                showError("Please specify at least 1 valid segment to trim.");
                return;
            }
            
            const qualitySelect = document.getElementById('trimQualitySelect');
            const format_id = qualitySelect ? qualitySelect.value : 'best';
            const selectedOption = qualitySelect ? qualitySelect.selectedOptions[0] : null;
            const ext = (selectedOption && selectedOption.dataset.ext) ? selectedOption.dataset.ext : (currentTrimMediaType === 'video' ? 'mp4' : 'mp3');
            const height = (selectedOption && selectedOption.dataset.height) ? parseInt(selectedOption.dataset.height) : null;
            
            try {
                await initiateDownload(
                    currentVideoData.url,
                    format_id,
                    ext,
                    currentVideoData.title,
                    currentTrimMediaType,
                    null,
                    height,
                    null,
                    null,
                    validatedSegments
                );
            } catch (err) {
                console.error("Trim download error:", err);
                showError(err.message || "Failed to start trim download.");
            }
        });
    }

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

    // Load saved theme choice (default: light mode)
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        if (sunIcon) sunIcon.classList.add('hidden');
        if (moonIcon) moonIcon.classList.remove('hidden');
    } else {
        body.classList.add('light-theme');
        body.classList.remove('dark-theme');
        if (sunIcon) sunIcon.classList.remove('hidden');
        if (moonIcon) moonIcon.classList.add('hidden');
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('light-theme');
            const isLight = body.classList.contains('light-theme');
            if (isLight) {
                body.classList.remove('dark-theme');
            } else {
                body.classList.add('dark-theme');
            }
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

        const searchLower = url.toLowerCase();
        const trimKeywords = ['cut', 'trim', 'crop', 'split', 'edit', 'cutter', 'trimmer', 'music cut', 'song cut', 'mp3 cut', 'audio cut', 'cut music'];
        const hasTrimKeyword = trimKeywords.some(keyword => searchLower.includes(keyword));
        if (hasTrimKeyword) {
            window.location.href = 'trimmer.html';
            return;
        }

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

        // Initialize smart multi-segment trim panel for this media
        setupTrimPanel(data);
    }

    // --- SMART MULTI-SEGMENT TRIM & MERGE LOGIC ---
    let currentTrimSegments = [];
    let currentTrimMediaType = 'video'; // 'video' or 'audio'

    function formatSecondsToDisplay(totalSecs) {
        if (isNaN(totalSecs) || totalSecs < 0) return '0:00';
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = Math.floor(totalSecs % 60);
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function parseInputTimeToSeconds(inputStr) {
        if (inputStr === null || inputStr === undefined) return null;
        let s = String(inputStr).trim();
        if (!s) return null;
        
        // Support dot notation: "1.04" -> 1 min 4 sec = 64s
        if (/^\d+\.\d+$/.test(s)) {
            const parts = s.split('.');
            const m = parseInt(parts[0], 10);
            const sec = parseInt(parts[1], 10);
            return m * 60 + sec;
        }
        // Support "MM:SS" or "HH:MM:SS"
        if (s.includes(':')) {
            const parts = s.split(':').map(p => parseFloat(p));
            if (parts.some(isNaN)) return null;
            if (parts.length === 2) {
                return parts[0] * 60 + parts[1];
            } else if (parts.length === 3) {
                return parts[0] * 3600 + parts[1] * 60 + parts[2];
            }
        }
        // Support raw numeric seconds
        const num = parseFloat(s);
        return isNaN(num) ? null : num;
    }

    function setupTrimPanel(data) {
        // Reset to full download mode by default
        switchDownloadMode('full');
        
        // Initialize default initial segment
        const videoDur = data.duration || 120;
        const defaultEnd = Math.min(60, videoDur);
        currentTrimSegments = [
            { start: '00:00', end: formatSecondsToDisplay(defaultEnd) }
        ];
        
        // Populate Quality dropdown
        populateTrimQualityDropdown(data);
        
        // Render the segment rows
        renderTrimSegmentRows();
    }

    function switchDownloadMode(mode) {
        const fullBtn = document.getElementById('modeFullBtn');
        const trimBtn = document.getElementById('modeTrimBtn');
        const fullPanel = document.getElementById('fullDownloadPanel');
        const trimPanel = document.getElementById('trimDownloadPanel');
        
        if (mode === 'trim') {
            if (trimBtn) trimBtn.classList.add('active');
            if (fullBtn) fullBtn.classList.remove('active');
            if (trimPanel) {
                trimPanel.classList.remove('hidden');
                trimPanel.style.display = 'block';
            }
            if (fullPanel) {
                fullPanel.classList.add('hidden');
                fullPanel.style.display = 'none';
            }
            if (currentVideoData) {
                populateTrimQualityDropdown(currentVideoData);
            }
            renderTrimSegmentRows();
        } else {
            if (fullBtn) fullBtn.classList.add('active');
            if (trimBtn) trimBtn.classList.remove('active');
            if (fullPanel) {
                fullPanel.classList.remove('hidden');
                fullPanel.style.display = 'block';
            }
            if (trimPanel) {
                trimPanel.classList.add('hidden');
                trimPanel.style.display = 'none';
            }
        }
    }

    function populateTrimQualityDropdown(data) {
        const select = document.getElementById('trimQualitySelect');
        if (!select) return;
        select.innerHTML = '';
        
        if (currentTrimMediaType === 'video') {
            if (data.formats && data.formats.video && data.formats.video.length > 0) {
                const seen = new Set();
                data.formats.video.forEach(fmt => {
                    const h = fmt.height || parseInt(fmt.resolution) || 720;
                    const label = getQualityLabel(String(h)) || `${h}p`;
                    const key = `${h}-${fmt.ext}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        const opt = document.createElement('option');
                        opt.value = fmt.format_id;
                        opt.dataset.ext = fmt.ext || 'mp4';
                        opt.dataset.height = h;
                        opt.textContent = `🎬 ${label} (${h}p ${fmt.ext.toUpperCase()})`;
                        if (h === 1080 || (h <= 1080 && select.children.length === 0)) {
                            opt.selected = true;
                        }
                        select.appendChild(opt);
                    }
                });
            }
            if (select.children.length === 0) {
                const fallbackOpt = document.createElement('option');
                fallbackOpt.value = 'best';
                fallbackOpt.dataset.ext = 'mp4';
                fallbackOpt.textContent = '🎬 Best Available Quality (MP4)';
                select.appendChild(fallbackOpt);
            }
        } else {
            const audioOptions = [
                { id: '320k', label: '🎵 320kbps MP3 (Ultra High Quality)', ext: 'mp3' },
                { id: '256k', label: '🎵 256kbps MP3 (High Quality)', ext: 'mp3' },
                { id: '192k', label: '🎵 192kbps MP3 (Standard)', ext: 'mp3' },
                { id: '128k', label: '🎵 128kbps MP3 (Compact)', ext: 'mp3' },
                { id: 'flac', label: '🎵 Lossless FLAC (Studio Master)', ext: 'flac' },
                { id: 'wav', label: '🎵 Uncompressed WAV (Lossless Audio)', ext: 'wav' }
            ];
            audioOptions.forEach(a => {
                const opt = document.createElement('option');
                opt.value = a.id;
                opt.dataset.ext = a.ext;
                opt.textContent = a.label;
                if (a.id === '320k') opt.selected = true;
                select.appendChild(opt);
            });
        }
    }

    function renderTrimSegmentRows() {
        const container = document.getElementById('trimSegmentsList');
        const totalDurationEl = document.getElementById('trimTotalDurationSummary');
        if (!container) return;
        
        container.innerHTML = '';
        let totalCutSeconds = 0;
        
        currentTrimSegments.forEach((seg, idx) => {
            const row = document.createElement('div');
            row.className = 'trim-segment-row';
            
            const startSec = parseInputTimeToSeconds(seg.start);
            const endSec = parseInputTimeToSeconds(seg.end);
            let rowDurationText = '--';
            if (startSec !== null && endSec !== null && endSec > startSec) {
                const diff = endSec - startSec;
                totalCutSeconds += diff;
                rowDurationText = formatSecondsToDisplay(diff);
            }
            
            row.innerHTML = `
                <div class="segment-badge-col">
                    <span class="segment-number-badge">#${idx + 1}</span>
                </div>
                <div class="segment-input-col">
                    <div class="segment-field">
                        <label>Start Time</label>
                        <input type="text" class="segment-time-input seg-start-input" data-index="${idx}" value="${seg.start}" placeholder="e.g. 1:04">
                    </div>
                    <span class="segment-arrow-icon">➔</span>
                    <div class="segment-field">
                        <label>End Time</label>
                        <input type="text" class="segment-time-input seg-end-input" data-index="${idx}" value="${seg.end}" placeholder="e.g. 2:00">
                    </div>
                </div>
                <div class="segment-preview-col">
                    <span class="seg-duration-pill">⏱️ ${rowDurationText}</span>
                </div>
                <div class="segment-action-col">
                    <button type="button" class="delete-segment-btn" data-index="${idx}" title="Remove this segment" ${currentTrimSegments.length === 1 ? 'disabled style="opacity:0.3;cursor:not-allowed;"' : ''}>
                        🗑️
                    </button>
                </div>
            `;
            
            container.appendChild(row);
        });
        
        // Attach event listeners to input fields and delete buttons
        container.querySelectorAll('.seg-start-input').forEach(inp => {
            inp.addEventListener('input', (e) => {
                const i = parseInt(e.target.dataset.index, 10);
                if (currentTrimSegments[i]) {
                    currentTrimSegments[i].start = e.target.value;
                    updateTrimSummaryOnly();
                }
            });
        });
        
        container.querySelectorAll('.seg-end-input').forEach(inp => {
            inp.addEventListener('input', (e) => {
                const i = parseInt(e.target.dataset.index, 10);
                if (currentTrimSegments[i]) {
                    currentTrimSegments[i].end = e.target.value;
                    updateTrimSummaryOnly();
                }
            });
        });
        
        container.querySelectorAll('.delete-segment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const i = parseInt(e.currentTarget.dataset.index, 10);
                if (currentTrimSegments.length > 1) {
                    currentTrimSegments.splice(i, 1);
                    renderTrimSegmentRows();
                }
            });
        });
        
        if (totalDurationEl) {
            totalDurationEl.textContent = `Total Trimmed Duration: ${formatSecondsToDisplay(totalCutSeconds)} (${currentTrimSegments.length} clip${currentTrimSegments.length > 1 ? 's' : ''} merged)`;
        }
    }

    function updateTrimSummaryOnly() {
        let totalCutSeconds = 0;
        const container = document.getElementById('trimSegmentsList');
        if (!container) return;
        
        currentTrimSegments.forEach((seg, idx) => {
            const startSec = parseInputTimeToSeconds(seg.start);
            const endSec = parseInputTimeToSeconds(seg.end);
            const row = container.children[idx];
            if (row) {
                const pill = row.querySelector('.seg-duration-pill');
                if (startSec !== null && endSec !== null && endSec > startSec) {
                    const diff = endSec - startSec;
                    totalCutSeconds += diff;
                    if (pill) pill.textContent = `⏱️ ${formatSecondsToDisplay(diff)}`;
                } else {
                    if (pill) pill.textContent = '⏱️ Invalid';
                }
            }
        });
        
        const totalDurationEl = document.getElementById('trimTotalDurationSummary');
        if (totalDurationEl) {
            totalDurationEl.textContent = `Total Trimmed Duration: ${formatSecondsToDisplay(totalCutSeconds)} (${currentTrimSegments.length} clip${currentTrimSegments.length > 1 ? 's' : ''} merged)`;
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
        const row = document.createElement('div');
        row.className = 'format-card-row';
        
        const sizeText = format.filesize ? `${(format.filesize / 1024 / 1024).toFixed(1)} MB` : 'Size Unknown';
        
        let resText = format.resolution || format.format_note || 'Auto';
        if (type === 'video') {
            const label = getQualityLabel(resText);
            if (label && resText && !resText.toLowerCase().includes(label.toLowerCase())) {
                resText = `<strong class="res-badge">${label}</strong> <span class="res-sub">(${resText})</span>`;
            } else {
                resText = `<strong class="res-badge">${resText || label || 'Auto'}</strong>`;
            }
        } else {
            const label = format.format_note || format.format_id || 'Audio';
            resText = `<strong class="res-badge">${label}</strong>`;
        }

        row.innerHTML = `
            <div class="format-card-left">
                <span class="format-label">${resText} <span class="format-ext-pill">${format.ext}</span></span>
                <span class="format-size">${sizeText}</span>
            </div>
            <div class="format-card-actions">
                <button type="button" class="btn-direct-download" title="Direct download full file in this quality">
                    <span class="action-icon">⬇️</span>
                    <span class="action-text">Download</span>
                </button>
                <button type="button" class="btn-open-trim" title="Trim & cut specific parts before downloading in this quality">
                    <span class="action-icon">✂️</span>
                    <span class="action-text">Trim</span>
                </button>
            </div>
        `;

        // Direct download click with instant visual feedback
        const dlBtn = row.querySelector('.btn-direct-download');
        dlBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                dlBtn.disabled = true;
                dlBtn.innerHTML = '<span class="action-icon">⏳</span> <span class="action-text">Starting...</span>';
                dlBtn.classList.add('btn-downloading');
                await initiateDownload(url, format.format_id, format.ext, currentVideoData.title, type, format.filesize, format.height, null, null, null, dlBtn);
            } catch (err) {
                console.error("Single track download error:", err);
                dlBtn.disabled = false;
                dlBtn.innerHTML = '<span class="action-icon">⬇️</span> <span class="action-text">Download</span>';
                dlBtn.classList.remove('btn-downloading');
            }
        });

        // Open Trim mode with this quality pre-selected
        const trimBtn = row.querySelector('.btn-open-trim');
        trimBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Switch to trim mode tab
            switchDownloadMode('trim');
            
            // Switch output media type (video/audio)
            if (type === 'video') {
                const tv = document.getElementById('trimTypeVideo');
                if (tv) tv.click();
            } else {
                const ta = document.getElementById('trimTypeAudio');
                if (ta) ta.click();
            }
            
            // Select this format in dropdown if present
            const select = document.getElementById('trimQualitySelect');
            if (select) {
                for (let i = 0; i < select.options.length; i++) {
                    if (select.options[i].value === format.format_id) {
                        select.selectedIndex = i;
                        break;
                    }
                }
            }
            
            // Smoothly scroll to trim panel
            const trimPanel = document.getElementById('trimDownloadPanel');
            if (trimPanel) {
                trimPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });

        return row;
    }

    function populatePlaylistCard(data) {
        document.getElementById('playlistTitle').textContent = data.title || 'Unknown Playlist';
        document.getElementById('playlistCount').textContent = `${data.entries.length} videos / tracks found`;
        
        const playlistItems = document.getElementById('playlistItems');
        playlistItems.innerHTML = '';

        data.entries.forEach((entry, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'playlist-item';
            
            const optionsHTML = `
                <option value="bestvideo[height<=2160]+bestaudio[ext=m4a]/bestvideo[height<=2160]+bestaudio/best">4K Ultra HD (2160p)</option>
                <option value="bestvideo[height<=1440]+bestaudio[ext=m4a]/bestvideo[height<=1440]+bestaudio/best">2K Quad HD (1440p)</option>
                <option value="bestvideo[height<=1080]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best" selected>1080p Full HD</option>
                <option value="bestvideo[height<=720]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best">720p HD</option>
                <option value="bestvideo[height<=480]+bestaudio[ext=m4a]/bestvideo[height<=480]+bestaudio/best">480p SD</option>
                <option value="bestaudio/best">Audio Only (MP3)</option>
            `;
            
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
                const type = format_id.includes('video') ? 'video' : 'audio';
                const ext = (type === 'video') ? 'mp4' : 'mp3';
                
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
                    const type = format_id.includes('video') ? 'video' : 'audio';
                    const ext = (type === 'video') ? 'mp4' : 'mp3';
                    
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

    function initiateDownload(url, format_id, ext, title, type, filesize, height, itemIndex = null, token = null, segments = null, triggeringBtn = null) {
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

            // Show status panel and smoothly scroll into user's view
            statusBox.classList.remove('completed', 'failed', 'hidden');
            progressFill.style.width = '0%';
            statusBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

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
                const payload = { url, format_id, ext, title, type, height, device_id: deviceId, ad_token: token };
                if (segments && Array.isArray(segments) && segments.length > 0) {
                    payload.segments = segments;
                }

                const startRes = await fetch(`${API_URL}/start_download`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

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
                            if (triggeringBtn) {
                                triggeringBtn.innerHTML = `<span class="action-icon">⬇️</span> <span class="action-text">${job.progress}%</span>`;
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
                            if (triggeringBtn) {
                                triggeringBtn.innerHTML = '<span class="action-icon">✅</span> <span class="action-text">Saved!</span>';
                                triggeringBtn.classList.add('success-btn');
                                triggeringBtn.classList.remove('btn-downloading');
                                setTimeout(() => {
                                    triggeringBtn.disabled = false;
                                    triggeringBtn.innerHTML = '<span class="action-icon">⬇️</span> <span class="action-text">Download</span>';
                                    triggeringBtn.classList.remove('success-btn');
                                }, 8000);
                            }
                            
                            statusBox.classList.add('completed');
                            const fileDownloadUrl = `${API_URL}/download_file/${jobId}`;
                            statusText.innerHTML = `🎉 <strong>Download complete!</strong> File sent to Chrome (Check top-right or Ctrl+J). <a href="${fileDownloadUrl}" style="color:#ff7a00;text-decoration:underline;margin-left:8px;font-weight:600;">Manual Download</a>`;
                            stopCanvasParticles();
                            
                            // Play success chime
                            SoundFX.playSuccess();

                            // Trigger client-side download by creating a temporary link (concurrency safe)
                            const downloadLink = document.createElement('a');
                            downloadLink.href = fileDownloadUrl;
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
                            }, 10000);

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
        
        const isInstagram = document.body.classList.contains('theme-instagram');
        for (let i = 0; i < particleCount; i++) {
            let pColor = Math.random() > 0.5 ? '#2dd4bf' : '#6d28d9';
            if (isInstagram) {
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

    // === Instagram Theme and Rendering Functions ===
    function checkUrlTheme() {
        const url = urlInput.value.trim().toLowerCase();
        const isInstagram = url.includes('instagram.com');
        
        document.body.classList.toggle('theme-instagram', isInstagram);

        const logoText = document.querySelector('.navbar .logo .logo-text');
        const subtitle = document.querySelector('.hero-subtitle');
        if (logoText && subtitle) {
            if (isInstagram) {
                logoText.innerHTML = 'InstaSave<span>.AI</span>';
                subtitle.textContent = 'Premium Downloader for Instagram Reels, Posts & Stories';
            } else {
                logoText.innerHTML = 'Downloadyfy<span>.AI</span>';
                subtitle.textContent = 'Downloadyfy.AI – Smart AI Downloads Made Simple';
            }
        }

        if (telemetryStatus) {
            if (!url) {
                telemetryStatus.textContent = 'AI PARSER STATE: IDLE // AWAITING URL INPUT';
            } else if (isInstagram) {
                telemetryStatus.textContent = 'AI PARSER STATE: MATCHED // INSTAGRAM REEL DEEP-SCRAPER ENGAGED';
            } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
                telemetryStatus.textContent = 'AI PARSER STATE: MATCHED // YOUTUBE CORE EXTRACTOR ONLINE';
            } else if (url.includes('facebook.com') || url.includes('fb.watch') || url.includes('fb.com')) {
                telemetryStatus.textContent = 'AI PARSER STATE: MATCHED // FACEBOOK VIDEO PARSER LOADED';
            } else if (url.includes('tiktok.com')) {
                telemetryStatus.textContent = 'AI PARSER STATE: MATCHED // TIKTOK MEDIA EXTRACTOR ENGAGED';
            } else if (url.includes('pinterest.com') || url.includes('pin.it')) {
                telemetryStatus.textContent = 'AI PARSER STATE: MATCHED // PINTEREST MEDIA EXTRACTOR READY';
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

    // === Direct Access (No Ad Gating) ===
    function runWithAdGating(onAuthorizedCallback) {
        onAuthorizedCallback('unlimited_token');
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

    // Stats Count-Up Animation
    const statsSection = document.getElementById('statsSection');
    if (statsSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const elements = entry.target.querySelectorAll('.stat-num[data-target]');
                    elements.forEach(el => {
                        const target = parseFloat(el.getAttribute('data-target'));
                        if (isNaN(target)) return;
                        
                        const suffix = el.getAttribute('data-suffix') || '';
                        let current = 0;
                        const duration = 1200; // ms
                        const steps = 60;
                        const stepTime = duration / steps;
                        const increment = target / steps;
                        
                        const timer = setInterval(() => {
                            current += increment;
                            if (current >= target) {
                                el.textContent = target + suffix;
                                clearInterval(timer);
                            } else {
                                el.textContent = Math.floor(current) + suffix;
                            }
                        }, stepTime);
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });
        observer.observe(statsSection);
    }

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

// Note: Google Translate / Language Selection has been moved to language.js to share across all pages.

