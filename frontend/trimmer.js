// ===== TRIMMER.JS — Universal Video & Audio Multi-Segment Trimmer =====
// Standalone script for trimmer.html

const API_URL = 'http://127.0.0.1:5000/api';

// Sound effects wrapper
const SoundFX = {
    audioCtx: null,
    init() { if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); },
    playPop() {
        try {
            this.init();
            const ctx = this.audioCtx;
            if (ctx.state === 'suspended') ctx.resume();
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(520, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(now); osc.stop(now + 0.08);
        } catch(e) {}
    },
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
                gain.gain.setValueAtTime(0.2, now + delay);
                gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.7);
                osc.connect(gain); gain.connect(ctx.destination);
                osc.start(now + delay); osc.stop(now + delay + 0.7);
            });
        } catch (e) {}
    }
};

function showError(msg) {
    const toast = document.getElementById('errorToast');
    const msgEl = document.getElementById('errorMsg');
    if (toast && msgEl) {
        msgEl.textContent = msg;
        toast.classList.remove('hidden');
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.classList.add('hidden'), 500);
        }, 5000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        if (sunIcon) sunIcon.classList.add('hidden');
        if (moonIcon) moonIcon.classList.remove('hidden');
    } else {
        document.body.classList.add('light-theme');
        document.body.classList.remove('dark-theme');
        if (sunIcon) sunIcon.classList.remove('hidden');
        if (moonIcon) moonIcon.classList.add('hidden');
    }
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            const isLight = document.body.classList.contains('light-theme');
            if (isLight) {
                document.body.classList.remove('dark-theme');
            } else {
                document.body.classList.add('dark-theme');
            }
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
            if (sunIcon) sunIcon.classList.toggle('hidden', !isLight);
            if (moonIcon) moonIcon.classList.toggle('hidden', isLight);
        });
    }

    // Elements
    const trimForm = document.getElementById('trimForm');
    const mediaDragZone = document.getElementById('mediaDragZone');
    const mediaFileInput = document.getElementById('mediaFileInput');
    const trimFileInfo = document.getElementById('trimFileInfo');
    const trimFileName = document.getElementById('trimFileName');
    const trimFileSize = document.getElementById('trimFileSize');
    const fileTypeIcon = document.getElementById('fileTypeIcon');
    const removeFileBtn = document.getElementById('removeFileBtn');
    const modeVideoBtn = document.getElementById('modeVideoBtn');
    const modeAudioBtn = document.getElementById('modeAudioBtn');
    const segmentsListContainer = document.getElementById('segmentsListContainer');
    const addSegmentBtn = document.getElementById('addSegmentBtn');
    const resetSegmentsBtn = document.getElementById('resetSegmentsBtn');
    const trimBtn = document.getElementById('trimBtn');
    const trimBtnText = document.getElementById('trimBtnText');
    const trimLoader = document.getElementById('trimLoader');
    const trimStatus = document.getElementById('trimStatus');
    const trimProgressFill = document.getElementById('trimProgressFill');
    const trimStatusText = document.getElementById('trimStatusText');

    let currentExportMode = 'video';
    let currentSegments = [
        { start: '0.0', end: '30.0' },
        { start: '60.0', end: '90.0' },
        { start: '120.0', end: '150.0' }
    ];

    // Helper: Parse MM:SS or float
    function parseToSec(val) {
        if (!val) return 0;
        const str = String(val).trim();
        if (str.includes(':')) {
            const parts = str.split(':').map(Number);
            if (parts.length === 2) return (parts[0] * 60) + parts[1];
            if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
        }
        return Math.max(0, parseFloat(str) || 0);
    }

    // Render Segment Cards
    function renderSegmentBoxes() {
        if (!segmentsListContainer) return;
        segmentsListContainer.innerHTML = '';

        currentSegments.forEach((seg, index) => {
            const sVal = parseToSec(seg.start);
            const eVal = parseToSec(seg.end);
            const dur = Math.max(0, eVal - sVal).toFixed(1);

            const card = document.createElement('div');
            card.className = 'segment-card-box';
            card.innerHTML = `
                <div class="segment-top-bar">
                    <span class="segment-tag-badge">SEGMENT #${index + 1}</span>
                    ${currentSegments.length > 1 ? `<button type="button" class="segment-delete-btn" data-index="${index}" title="Remove this segment">✕</button>` : ''}
                </div>
                <div class="segment-inputs-grid">
                    <div class="segment-input-field">
                        <label for="seg_start_${index}">START (SECONDS)</label>
                        <input type="number" step="0.1" min="0" id="seg_start_${index}" value="${seg.start}" data-index="${index}" data-type="start" placeholder="0.0">
                    </div>
                    <div class="segment-input-field">
                        <label for="seg_end_${index}">END (SECONDS)</label>
                        <input type="number" step="0.1" min="0" id="seg_end_${index}" value="${seg.end}" data-index="${index}" data-type="end" placeholder="30.0">
                    </div>
                </div>
                <div class="segment-duration-text">
                    Duration: <strong id="seg_dur_${index}">${dur}s</strong>
                </div>
            `;
            segmentsListContainer.appendChild(card);
        });

        // Add event listeners to input fields
        segmentsListContainer.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.index);
                const type = e.target.dataset.type;
                if (currentSegments[idx]) {
                    currentSegments[idx][type] = e.target.value;
                    const s = parseToSec(currentSegments[idx].start);
                    const eSec = parseToSec(currentSegments[idx].end);
                    const dur = Math.max(0, eSec - s).toFixed(1);
                    const durEl = document.getElementById(`seg_dur_${idx}`);
                    if (durEl) durEl.textContent = `${dur}s`;
                }
            });
        });

        // Add event listeners to delete buttons
        segmentsListContainer.querySelectorAll('.segment-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.dataset.index);
                if (currentSegments.length > 1) {
                    currentSegments.splice(idx, 1);
                    SoundFX.playPop();
                    renderSegmentBoxes();
                }
            });
        });
    }

    // Add Segment Button
    if (addSegmentBtn) {
        addSegmentBtn.addEventListener('click', () => {
            if (currentSegments.length >= 20) {
                showError("Maximum of 20 segments reached.");
                return;
            }
            const last = currentSegments[currentSegments.length - 1];
            const lastEnd = parseToSec(last ? last.end : 30);
            const nextStart = lastEnd + 10;
            const nextEnd = nextStart + 30;

            currentSegments.push({
                start: nextStart.toFixed(1),
                end: nextEnd.toFixed(1)
            });
            SoundFX.playPop();
            renderSegmentBoxes();
        });
    }

    // Reset Segments
    if (resetSegmentsBtn) {
        resetSegmentsBtn.addEventListener('click', () => {
            currentSegments = [
                { start: '0.0', end: '30.0' },
                { start: '60.0', end: '90.0' },
                { start: '120.0', end: '150.0' }
            ];
            SoundFX.playPop();
            renderSegmentBoxes();
        });
    }

    // Mode Buttons (Video vs Audio)
    function updateModeUI(mode) {
        currentExportMode = mode;
        if (mode === 'video') {
            if (modeVideoBtn) modeVideoBtn.classList.add('active');
            if (modeAudioBtn) modeAudioBtn.classList.remove('active');
            if (trimBtnText) trimBtnText.innerHTML = '✂️ Trim &amp; Download Merged Video';
        } else {
            if (modeAudioBtn) modeAudioBtn.classList.add('active');
            if (modeVideoBtn) modeVideoBtn.classList.remove('active');
            if (trimBtnText) trimBtnText.innerHTML = '✂️ Trim &amp; Download Merged Audio';
        }
    }

    if (modeVideoBtn) {
        modeVideoBtn.addEventListener('click', () => updateModeUI('video'));
    }
    if (modeAudioBtn) {
        modeAudioBtn.addEventListener('click', () => updateModeUI('audio'));
    }

    // Initial render
    renderSegmentBoxes();

    // Drag & Drop
    if (mediaDragZone && mediaFileInput) {
        mediaDragZone.addEventListener('click', () => mediaFileInput.click());
        mediaDragZone.addEventListener('dragover', (e) => { e.preventDefault(); mediaDragZone.classList.add('dragover'); });
        mediaDragZone.addEventListener('dragleave', () => mediaDragZone.classList.remove('dragover'));
        mediaDragZone.addEventListener('drop', (e) => {
            e.preventDefault();
            mediaDragZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) {
                mediaFileInput.files = e.dataTransfer.files;
                handleSelectedFile(file);
            }
        });
        mediaFileInput.addEventListener('change', () => {
            const file = mediaFileInput.files[0];
            if (file) handleSelectedFile(file);
        });
    }

    function handleSelectedFile(file) {
        if (!file) return;
        const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|mkv|webm|avi|m4v)$/i.test(file.name);
        if (trimFileName) trimFileName.textContent = file.name;
        if (trimFileSize) trimFileSize.textContent = (file.size / 1024 / 1024).toFixed(1) + ' MB';
        if (fileTypeIcon) fileTypeIcon.textContent = isVideo ? '🎬' : '🎵';
        if (trimFileInfo) trimFileInfo.classList.remove('hidden');
        if (mediaDragZone) mediaDragZone.classList.add('hidden');
        if (trimBtn) trimBtn.disabled = false;

        // Auto-select mode based on file type
        updateModeUI(isVideo ? 'video' : 'audio');
        SoundFX.playPop();
    }

    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', () => {
            if (mediaFileInput) mediaFileInput.value = '';
            if (trimFileInfo) trimFileInfo.classList.add('hidden');
            if (mediaDragZone) mediaDragZone.classList.remove('hidden');
            if (trimBtn) trimBtn.disabled = true;
        });
    }

    // Submit Trimming Job
    if (trimForm) {
        trimForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const file = mediaFileInput.files[0];
            if (!file) {
                showError("Please upload a video or audio file first.");
                return;
            }

            // Validate segments
            const validated = [];
            for (let i = 0; i < currentSegments.length; i++) {
                const s = parseToSec(currentSegments[i].start);
                const end = parseToSec(currentSegments[i].end);
                if (end <= s) {
                    showError(`Segment #${i + 1}: End time (${currentSegments[i].end}s) must be greater than Start time (${currentSegments[i].start}s).`);
                    return;
                }
                validated.push({ start: s, end: end });
            }

            if (validated.length === 0) {
                showError("Please specify at least 1 valid trim segment.");
                return;
            }

            startFileTrimming(file, validated, currentExportMode);
        });
    }

    function startFileTrimming(file, segments, exportType) {
        if (trimBtn) trimBtn.disabled = true;
        if (trimLoader) trimLoader.classList.remove('hidden');
        if (trimStatus) trimStatus.classList.remove('hidden');
        if (trimProgressFill) trimProgressFill.style.width = '0%';
        if (trimStatusText) trimStatusText.textContent = 'Uploading file to trimming engine... 0%';

        const formData = new FormData();
        formData.append('file', file);
        formData.append('export_type', exportType);
        formData.append('segments', JSON.stringify(segments));

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_URL}/trim-file`, true);

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                const mapped = Math.round(percent * 0.65);
                if (trimProgressFill) trimProgressFill.style.width = `${mapped}%`;
                if (trimStatusText) trimStatusText.textContent = `Uploading file... ${percent}%`;
            }
        });

        xhr.onload = function () {
            if (xhr.status === 200) {
                if (trimProgressFill) trimProgressFill.style.width = '95%';
                if (trimStatusText) trimStatusText.textContent = 'Merging & rendering trimmed segments... Almost done!';
                
                setTimeout(() => {
                    const ext = exportType === 'video' ? 'mp4' : 'mp3';
                    const mime = exportType === 'video' ? 'video/mp4' : 'audio/mpeg';
                    const blob = new Blob([xhr.response], { type: mime });
                    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                    const outName = `${baseName}_Trimmed.${ext}`;
                    
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = outName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    if (trimProgressFill) trimProgressFill.style.width = '100%';
                    if (trimStatusText) trimStatusText.textContent = `🎉 Trim complete! ${outName} saved to your device.`;
                    SoundFX.playSuccess();
                    
                    if (trimBtn) trimBtn.disabled = false;
                    if (trimLoader) trimLoader.classList.add('hidden');
                    setTimeout(() => { if (trimStatus) trimStatus.classList.add('hidden'); }, 6000);
                }, 1000);
            } else {
                let errMsg = 'Failed to trim media file.';
                try {
                    const reader = new FileReader();
                    reader.onload = function () {
                        try {
                            const errObj = JSON.parse(reader.result);
                            handleTrimError(errObj.error || errMsg);
                        } catch (e) {
                            handleTrimError(errMsg);
                        }
                    };
                    reader.readAsText(xhr.response);
                } catch (e) {
                    handleTrimError(errMsg);
                }
            }
        };

        xhr.onerror = function () {
            handleTrimError('Network error connecting to trimming server.');
        };

        xhr.responseType = 'blob';
        xhr.send(formData);
    }

    function handleTrimError(msg) {
        if (trimProgressFill) trimProgressFill.style.width = '100%';
        if (trimStatusText) trimStatusText.textContent = `❌ ${msg}`;
        showError(msg);
        if (trimBtn) trimBtn.disabled = false;
        if (trimLoader) trimLoader.classList.add('hidden');
        setTimeout(() => { if (trimStatus) trimStatus.classList.add('hidden'); }, 8000);
    }
});
