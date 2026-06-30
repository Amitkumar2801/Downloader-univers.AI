// ===== CONVERTER.JS — Video to Audio Converter Logic =====
// Standalone script for converter.html page

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

let adToken = null;

// === Sound FX ===
const SoundFX = {
    audioCtx: null,
    init() { if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); },
    playSuccess() {
        try {
            this.init();
            const ctx = this.audioCtx;
            if (ctx.state === 'suspended') ctx.resume();
            const now = ctx.currentTime;
            [{ freq: 659.25, delay: 0 }, { freq: 880.00, delay: 0.12 }].forEach(({ freq, delay }) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + delay);
                gain.gain.setValueAtTime(0, now + delay);
                gain.gain.linearRampToValueAtTime(0.2, now + delay + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.8);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + delay);
                osc.stop(now + delay + 0.8);
            });
        } catch (e) { console.warn('Audio fx failed:', e); }
    }
};

function showError(msg) {
    const toast = document.getElementById('errorToast');
    const msgEl = document.getElementById('errorMsg');
    if (toast && msgEl) {
        msgEl.textContent = msg;
        toast.classList.remove('hidden');
        toast.style.animation = 'none';
        requestAnimationFrame(() => {
            toast.style.animation = '';
            toast.classList.add('show');
        });
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.classList.add('hidden'), 500);
        }, 5000);
    }
}

// === Device Allowance Badge ===
function checkDeviceAllowance() {
    fetch(`${API_URL}/device-status?device_id=${deviceId}`)
        .then(res => res.json())
        .then(data => {
            const badge = document.getElementById('allowanceBadgeText');
            if (badge) {
                const remaining = data.free_downloads_remaining ?? 1;
                badge.textContent = `Slots: ${remaining}/1`;
            }
        })
        .catch(() => {});
}

document.addEventListener('DOMContentLoaded', () => {
    // Theme
    const themeToggle = document.getElementById('themeToggle');
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        if (sunIcon) sunIcon.classList.remove('hidden');
        if (moonIcon) moonIcon.classList.add('hidden');
    }
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            const isLight = document.body.classList.contains('light-theme');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
            if (sunIcon) sunIcon.classList.toggle('hidden', !isLight);
            if (moonIcon) moonIcon.classList.toggle('hidden', isLight);
        });
    }

    checkDeviceAllowance();

    // === Elements ===
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

    // === Drag & Drop ===
    if (dragZone && videoFileInput) {
        dragZone.addEventListener('click', () => videoFileInput.click());
        dragZone.addEventListener('dragover', (e) => { e.preventDefault(); dragZone.classList.add('dragover'); });
        dragZone.addEventListener('dragleave', () => dragZone.classList.remove('dragover'));
        dragZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dragZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('video/')) {
                videoFileInput.files = e.dataTransfer.files;
                handleSelectedFile(file);
            } else {
                showError('Please drop a valid video file (MP4, MKV, AVI, MOV, etc.)');
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
            if (convertBtn) convertBtn.disabled = false;
        }
    }

    // === Ad Gating ===
    function runWithAdGating(onAuthorizedCallback) {
        fetch(`${API_URL}/device-status?device_id=${deviceId}`)
            .then(res => res.json())
            .then(data => {
                const remaining = data.free_downloads_remaining;
                if (remaining > 0 || adToken) {
                    onAuthorizedCallback(adToken);
                    adToken = null;
                } else {
                    showAdModalFlow(onAuthorizedCallback);
                }
            })
            .catch(() => onAuthorizedCallback(null));
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
                if (adTimerVal) adTimerVal.textContent = 'Ready!';
                if (closeAdModalBtn) {
                    closeAdModalBtn.disabled = false;
                    closeAdModalBtn.style.opacity = '1';
                    closeAdModalBtn.style.cursor = 'pointer';
                    closeAdModalBtn.innerHTML = '&times; Close & Continue';
                }
            }
        }, 1000);

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
                    showError('Ad Watched! Extraction slot unlocked.');
                    onAuthorizedCallback(adToken);
                    adToken = null;
                    checkDeviceAllowance();
                } else {
                    showError('Ad verification failed. Please try again.');
                }
            } catch (err) {
                showError('Ad verification failed. Please try again.');
            }
        };
    }

    if (adUpgradeBtn) {
        adUpgradeBtn.addEventListener('click', () => {
            showError('Ad support helps keep Downloadyfy.AI free for everyone!');
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === adModal) {
            const timerVal = adTimerVal ? adTimerVal.textContent : '';
            if (timerVal === 'Ready!') adModal.classList.add('hidden');
        }
    });

    // === Form Submit ===
    if (convertForm) {
        convertForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const file = videoFileInput.files[0];
            if (!file) return;
            runWithAdGating((token) => startVideoToAudioConversion(file, token));
        });
    }

    // === Conversion Logic ===
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
                    const mapped = Math.round(percent * 0.7);
                    if (convertProgressFill) convertProgressFill.style.width = `${mapped}%`;
                    if (convertStatusText) convertStatusText.textContent = `Uploading video file... ${percent}%`;
                }
            });

            xhr.onload = function () {
                if (xhr.status === 200) {
                    if (convertProgressFill) convertProgressFill.style.width = '95%';
                    if (convertStatusText) convertStatusText.textContent = 'AI Engine extracting audio track... Please wait.';
                    setTimeout(() => {
                        const blob = new Blob([xhr.response], { type: 'application/octet-stream' });
                        const nameParts = file.name.split('.');
                        nameParts.pop();
                        const outName = `${nameParts.join('.')}.${format}`;
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
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
                    try { errMsg = JSON.parse(xhr.responseText).error || errMsg; } catch (e) {}
                    handleConversionFailure(errMsg);
                    reject(new Error(errMsg));
                }
            };

            xhr.onerror = function () {
                handleConversionFailure('Network error communicating with extraction backend.');
                reject(new Error('Network error.'));
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
        setTimeout(() => { if (convertStatus) convertStatus.classList.add('hidden'); }, 8000);
    }
});
