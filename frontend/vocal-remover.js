// AI Vocal Remover & Karaoke Studio Engine
const API_URL = 'http://127.0.0.1:5000/api';

let audioCtx = null;
let currentBuffer = null;
let currentFile = null;
let sourceNode = null;
let isPlaying = false;
let startTime = 0;
let pauseOffset = 0;

// Audio Nodes for Realtime Separation
let vocalGainNode = null;
let musicGainNode = null;
let masterGainNode = null;

// Waveform cache
let vocalWaveformData = [];
let musicWaveformData = [];
let animFrameId = null;

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

    // Dropzone setup
    const dropzone = document.getElementById('vocalDropzone');
    const fileInput = document.getElementById('vocalFileInput');
    const selectBtn = document.getElementById('selectFileBtn');

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
        if (e.dataTransfer.files.length > 0) {
            handleUploadedFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleUploadedFile(e.target.files[0]);
        }
    });

    // Mixer sliders
    const vocalGain = document.getElementById('vocalGain');
    const musicGain = document.getElementById('musicGain');
    const vocalGainVal = document.getElementById('vocalGainVal');
    const musicGainVal = document.getElementById('musicGainVal');

    vocalGain.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        vocalGainVal.textContent = `${Math.round(val * 100)}%`;
        if (vocalGainNode) vocalGainNode.gain.setValueAtTime(val, audioCtx.currentTime);
        updatePresetButtons();
    });

    musicGain.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        musicGainVal.textContent = `${Math.round(val * 100)}%`;
        if (musicGainNode) musicGainNode.gain.setValueAtTime(val, audioCtx.currentTime);
        updatePresetButtons();
    });

    // Mute / Solo buttons
    document.getElementById('muteVocalsBtn').addEventListener('click', () => {
        vocalGain.value = 0;
        vocalGain.dispatchEvent(new Event('input'));
    });
    document.getElementById('soloVocalsBtn').addEventListener('click', () => {
        vocalGain.value = 1;
        musicGain.value = 0;
        vocalGain.dispatchEvent(new Event('input'));
        musicGain.dispatchEvent(new Event('input'));
    });

    document.getElementById('muteMusicBtn').addEventListener('click', () => {
        musicGain.value = 0;
        musicGain.dispatchEvent(new Event('input'));
    });
    document.getElementById('soloMusicBtn').addEventListener('click', () => {
        musicGain.value = 1;
        vocalGain.value = 0;
        musicGain.dispatchEvent(new Event('input'));
        vocalGain.dispatchEvent(new Event('input'));
    });

    // Presets
    document.getElementById('presetOriginal').addEventListener('click', () => {
        vocalGain.value = 1;
        musicGain.value = 1;
        vocalGain.dispatchEvent(new Event('input'));
        musicGain.dispatchEvent(new Event('input'));
        setActivePreset('presetOriginal');
    });

    document.getElementById('presetKaraoke').addEventListener('click', () => {
        vocalGain.value = 0;
        musicGain.value = 1.3;
        vocalGain.dispatchEvent(new Event('input'));
        musicGain.dispatchEvent(new Event('input'));
        setActivePreset('presetKaraoke');
    });

    document.getElementById('presetAcapella').addEventListener('click', () => {
        vocalGain.value = 1.4;
        musicGain.value = 0;
        vocalGain.dispatchEvent(new Event('input'));
        musicGain.dispatchEvent(new Event('input'));
        setActivePreset('presetAcapella');
    });

    // Master Play
    document.getElementById('masterPlayBtn').addEventListener('click', togglePlay);

    // Change File
    document.getElementById('changeFileBtn').addEventListener('click', () => {
        stopAudio();
        document.getElementById('vocalStudio').classList.add('hidden');
        document.getElementById('vocalDropzone').classList.remove('hidden');
    });

    // Export Buttons
    document.getElementById('downloadKaraokeBtn').addEventListener('click', () => exportStem('instrumental'));
    document.getElementById('downloadVocalsBtn').addEventListener('click', () => exportStem('vocals'));
});

function setActivePreset(id) {
    document.querySelectorAll('.quick-btn').forEach(b => {
        if (b.id.startsWith('preset')) b.classList.remove('active');
    });
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
}

function updatePresetButtons() {
    const v = parseFloat(document.getElementById('vocalGain').value);
    const m = parseFloat(document.getElementById('musicGain').value);
    if (v === 0 && m > 0) setActivePreset('presetKaraoke');
    else if (v > 0 && m === 0) setActivePreset('presetAcapella');
    else if (v === 1 && m === 1) setActivePreset('presetOriginal');
    else setActivePreset('');
}

async function handleUploadedFile(file) {
    if (!file) return;
    currentFile = file;

    document.getElementById('vocalDropzone').classList.add('hidden');
    const loader = document.getElementById('vocalLoader');
    loader.classList.remove('hidden');
    document.getElementById('loaderStatusText').textContent = 'Decoding audio data & generating high-res stems...';

    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') await audioCtx.resume();

        const arrayBuffer = await file.arrayBuffer();
        currentBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        // Update Metadata info
        document.getElementById('songTitleDisplay').textContent = file.name.replace(/\.[^/.]+$/, "");
        const mins = Math.floor(currentBuffer.duration / 60);
        const secs = Math.floor(currentBuffer.duration % 60);
        document.getElementById('songMetaDisplay').textContent = `${mins}:${secs.toString().padStart(2, '0')} • ${(file.size / 1024 / 1024).toFixed(1)} MB • ${currentBuffer.sampleRate}Hz Stereo`;
        document.getElementById('totalTimeDisplay').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

        // Compute Waveforms
        generateStemWaveforms(currentBuffer);

        loader.classList.add('hidden');
        document.getElementById('vocalStudio').classList.remove('hidden');

        // Draw initial waveforms
        drawWaveform('vocalsWaveform', vocalWaveformData, '#ec4899', 0);
        drawWaveform('musicWaveform', musicWaveformData, '#10b981', 0);

        // Auto start playback
        startPlayback(0);
    } catch (err) {
        alert("Failed to read audio file. Please try another audio/video format.");
        console.error(err);
        loader.classList.add('hidden');
        document.getElementById('vocalDropzone').classList.remove('hidden');
    }
}

function generateStemWaveforms(buffer) {
    const left = buffer.getChannelData(0);
    const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;
    const samples = 200;
    const blockSize = Math.floor(buffer.length / samples);

    vocalWaveformData = [];
    musicWaveformData = [];

    for (let i = 0; i < samples; i++) {
        let centerSum = 0;
        let sideSum = 0;
        const start = i * blockSize;
        for (let j = 0; j < blockSize; j += 10) {
            const l = left[start + j] || 0;
            const r = right[start + j] || 0;
            // Center channel = L + R (Vocals dominant)
            centerSum += Math.abs(l + r);
            // Side channel = L - R (Instruments / Stereo ambient dominant)
            sideSum += Math.abs(l - r);
        }
        vocalWaveformData.push(Math.min(1, (centerSum / (blockSize / 10)) * 1.8));
        musicWaveformData.push(Math.min(1, (sideSum / (blockSize / 10)) * 2.2));
    }
}

function drawWaveform(canvasId, data, color, progressRatio) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    ctx.clearRect(0, 0, width, height);

    const barWidth = width / data.length;
    const currentBar = Math.floor(progressRatio * data.length);

    for (let i = 0; i < data.length; i++) {
        const val = data[i];
        const barHeight = Math.max(4, val * (height - 12));
        const x = i * barWidth;
        const y = (height - barHeight) / 2;

        if (i <= currentBar) {
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 6;
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.roundRect(x + 1, y, Math.max(2, barWidth - 2), barHeight, 3);
        ctx.fill();
    }
}

function startPlayback(offset) {
    if (!currentBuffer) return;
    stopAudio();

    sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = currentBuffer;

    // Build Separation Audio Graph:
    // Split stereo channels
    const splitter = audioCtx.createChannelSplitter(2);
    sourceNode.connect(splitter);

    // 1. Music (Karaoke) Channel: (L - R) stereo phase cancellation
    const leftGain = audioCtx.createGain();
    const rightInvertGain = audioCtx.createGain();
    rightInvertGain.gain.value = -1; // Phase inversion

    splitter.connect(leftGain, 0);
    splitter.connect(rightInvertGain, 1);

    const musicMerger = audioCtx.createChannelMerger(2);
    leftGain.connect(musicMerger, 0, 0);
    leftGain.connect(musicMerger, 0, 1);
    rightInvertGain.connect(musicMerger, 0, 0);
    rightInvertGain.connect(musicMerger, 0, 1);

    musicGainNode = audioCtx.createGain();
    musicGainNode.gain.value = parseFloat(document.getElementById('musicGain').value);
    musicMerger.connect(musicGainNode);

    // 2. Vocal Channel: Center mono bandpass filter
    const centerFilter = audioCtx.createBiquadFilter();
    centerFilter.type = 'bandpass';
    centerFilter.frequency.value = 1500;
    centerFilter.Q.value = 1.0;

    const vocalSum = audioCtx.createGain();
    vocalSum.gain.value = 0.8;
    splitter.connect(vocalSum, 0);
    splitter.connect(vocalSum, 1);
    vocalSum.connect(centerFilter);

    vocalGainNode = audioCtx.createGain();
    vocalGainNode.gain.value = parseFloat(document.getElementById('vocalGain').value);
    centerFilter.connect(vocalGainNode);

    // Master Output
    masterGainNode = audioCtx.createGain();
    vocalGainNode.connect(masterGainNode);
    musicGainNode.connect(masterGainNode);
    masterGainNode.connect(audioCtx.destination);

    sourceNode.start(0, offset);
    startTime = audioCtx.currentTime - offset;
    pauseOffset = offset;
    isPlaying = true;

    document.getElementById('masterPlayBtn').textContent = '⏸';
    startAnimationLoop();

    sourceNode.onended = () => {
        if (isPlaying && (audioCtx.currentTime - startTime >= currentBuffer.duration - 0.1)) {
            stopAudio();
            pauseOffset = 0;
            document.getElementById('currentTimeDisplay').textContent = '0:00';
            drawWaveform('vocalsWaveform', vocalWaveformData, '#ec4899', 0);
            drawWaveform('musicWaveform', musicWaveformData, '#10b981', 0);
        }
    };
}

function togglePlay() {
    if (!currentBuffer) return;
    if (isPlaying) {
        pauseOffset = audioCtx.currentTime - startTime;
        stopAudio();
    } else {
        startPlayback(pauseOffset);
    }
}

function stopAudio() {
    if (sourceNode) {
        try { sourceNode.stop(); } catch (e) {}
        sourceNode.disconnect();
        sourceNode = null;
    }
    isPlaying = false;
    document.getElementById('masterPlayBtn').textContent = '▶';
    if (animFrameId) cancelAnimationFrame(animFrameId);
}

function startAnimationLoop() {
    function loop() {
        if (isPlaying && currentBuffer) {
            const current = audioCtx.currentTime - startTime;
            const progress = Math.min(1, current / currentBuffer.duration);

            const m = Math.floor(current / 60);
            const s = Math.floor(current % 60);
            document.getElementById('currentTimeDisplay').textContent = `${m}:${s.toString().padStart(2, '0')}`;

            drawWaveform('vocalsWaveform', vocalWaveformData, '#ec4899', progress);
            drawWaveform('musicWaveform', musicWaveformData, '#10b981', progress);

            animFrameId = requestAnimationFrame(loop);
        }
    }
    loop();
}

async function exportStem(mode) {
    if (!currentFile) return;

    const btn = mode === 'instrumental' ? document.getElementById('downloadKaraokeBtn') : document.getElementById('downloadVocalsBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Processing Stem...';
    btn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('mode', mode);

        const res = await fetch(`${API_URL}/vocal-remover`, {
            method: 'POST',
            body: formData
        });

        if (!res.ok) throw new Error("Server processing error");

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const stemLabel = mode === 'instrumental' ? 'Karaoke_Instrumental' : 'Isolated_Vocals';
        a.download = `${currentFile.name.replace(/\.[^/.]+$/, "")}_${stemLabel}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        btn.innerHTML = '✅ Download Ready!';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 3000);
    } catch (e) {
        console.warn("Backend export failed, falling back to client-side audio rendering:", e);
        await exportClientSideOffline(mode, btn, originalText);
    }
}

async function exportClientSideOffline(mode, btn, originalText) {
    if (!currentBuffer) return;
    try {
        btn.innerHTML = '⚡ Rendering Audio...';
        const offlineCtx = new OfflineAudioContext(2, currentBuffer.length, currentBuffer.sampleRate);
        const offlineSource = offlineCtx.createBufferSource();
        offlineSource.buffer = currentBuffer;

        const splitter = offlineCtx.createChannelSplitter(2);
        offlineSource.connect(splitter);

        if (mode === 'instrumental') {
            const leftGain = offlineCtx.createGain();
            const rightInvert = offlineCtx.createGain();
            rightInvert.gain.value = -1;

            splitter.connect(leftGain, 0);
            splitter.connect(rightInvert, 1);

            const merger = offlineCtx.createChannelMerger(2);
            leftGain.connect(merger, 0, 0);
            leftGain.connect(merger, 0, 1);
            rightInvert.connect(merger, 0, 0);
            rightInvert.connect(merger, 0, 1);

            const boost = offlineCtx.createGain();
            boost.gain.value = 1.5;
            merger.connect(boost);
            boost.connect(offlineCtx.destination);
        } else {
            const filter = offlineCtx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 1500;
            filter.Q.value = 1.0;

            const sum = offlineCtx.createGain();
            sum.gain.value = 1.5;
            splitter.connect(sum, 0);
            splitter.connect(sum, 1);
            sum.connect(filter);
            filter.connect(offlineCtx.destination);
        }

        offlineSource.start();
        const renderedBuffer = await offlineCtx.startRendering();

        // Convert rendered AudioBuffer to WAV blob
        const wavBlob = audioBufferToWav(renderedBuffer);
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.href = url;
        const label = mode === 'instrumental' ? 'Karaoke_Instrumental' : 'Isolated_Vocals';
        a.download = `${currentFile.name.replace(/\.[^/.]+$/, "")}_${label}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        btn.innerHTML = '✅ Downloaded WAV!';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 3000);
    } catch (err) {
        alert("Export failed: " + err.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Client-side WAV encoder utility
function audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const dataLength = buffer.length * blockAlign;
    const bufferLength = 44 + dataLength;

    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    function writeString(offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    const channelData = [];
    for (let i = 0; i < numChannels; i++) {
        channelData.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
            let sample = channelData[channel][i];
            sample = Math.max(-1, Math.min(1, sample));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
        }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
}
