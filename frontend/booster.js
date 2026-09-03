// AI Volume Booster & 3D 8D Spatial Audio Studio Engine
const API_URL = 'http://127.0.0.1:5000/api';

let audioCtx = null;
let currentBuffer = null;
let currentFile = null;
let sourceNode = null;
let isPlaying = false;
let startTime = 0;
let pauseOffset = 0;

// DSP Nodes
let bassNode = null;
let pannerNode = null;
let gainNode = null;
let compressorNode = null;
let analyserNode = null;
let convolverNode = null;

// 8D Orbit Animation & Angles
let orbitAngle = 0;
let isSpatial8D = false;
let orbitSpeedSec = 8;
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

    // Dropzone
    const dropzone = document.getElementById('boosterDropzone');
    const fileInput = document.getElementById('boosterFileInput');
    const selectBtn = document.getElementById('selectAudioBtn');

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
        if (e.dataTransfer.files.length > 0) handleUploadedFile(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleUploadedFile(e.target.files[0]);
    });

    // FX Sliders
    const volumeSlider = document.getElementById('volumeSlider');
    const volValBadge = document.getElementById('volValBadge');
    volumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        volValBadge.textContent = `${Math.round(val * 100)}%`;
        if (gainNode) gainNode.gain.setValueAtTime(val, audioCtx.currentTime);
    });

    const bassSlider = document.getElementById('bassSlider');
    const bassValBadge = document.getElementById('bassValBadge');
    bassSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        bassValBadge.textContent = `+${val} dB`;
        if (bassNode) bassNode.gain.setValueAtTime(val, audioCtx.currentTime);
    });

    const spatialToggle = document.getElementById('spatialToggle');
    spatialToggle.addEventListener('change', (e) => {
        isSpatial8D = e.target.checked;
        if (!isSpatial8D && pannerNode) {
            pannerNode.pan.setValueAtTime(0, audioCtx.currentTime);
        }
    });

    const orbitSpeedSlider = document.getElementById('orbitSpeedSlider');
    const orbitSpeedVal = document.getElementById('orbitSpeedVal');
    orbitSpeedSlider.addEventListener('input', (e) => {
        orbitSpeedSec = parseFloat(e.target.value);
        orbitSpeedVal.textContent = `${orbitSpeedSec}s / rev`;
    });

    const reverbToggle = document.getElementById('reverbToggle');
    reverbToggle.addEventListener('change', () => {
        if (isPlaying) restartCurrentPlayback();
    });

    const speedSlider = document.getElementById('speedSlider');
    const speedValBadge = document.getElementById('speedValBadge');
    speedSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        speedValBadge.textContent = `${val.toFixed(2)}x ${val < 1 ? 'Slowed' : (val > 1 ? 'Nightcore' : 'Normal')}`;
        if (sourceNode) sourceNode.playbackRate.setValueAtTime(val, audioCtx.currentTime);
    });

    // Preset Buttons
    document.getElementById('presetDefault').addEventListener('click', () => {
        applyPreset({ volume: 1.0, bass: 0, spatial: false, reverb: false, speed: 1.0, id: 'presetDefault' });
    });
    document.getElementById('presetBass').addEventListener('click', () => {
        applyPreset({ volume: 1.3, bass: 14, spatial: false, reverb: false, speed: 1.0, id: 'presetBass' });
    });
    document.getElementById('preset8D').addEventListener('click', () => {
        applyPreset({ volume: 1.2, bass: 8, spatial: true, reverb: true, speed: 1.0, id: 'preset8D' });
    });
    document.getElementById('presetSlowed').addEventListener('click', () => {
        applyPreset({ volume: 1.2, bass: 10, spatial: false, reverb: true, speed: 0.85, id: 'presetSlowed' });
    });
    document.getElementById('presetNightcore').addEventListener('click', () => {
        applyPreset({ volume: 1.1, bass: 6, spatial: false, reverb: false, speed: 1.25, id: 'presetNightcore' });
    });
    document.getElementById('presetLoud').addEventListener('click', () => {
        applyPreset({ volume: 3.0, bass: 4, spatial: false, reverb: false, speed: 1.0, id: 'presetLoud' });
    });

    // Play & Export
    document.getElementById('boosterPlayBtn').addEventListener('click', togglePlay);
    document.getElementById('downloadBoostedBtn').addEventListener('click', exportBoostedAudio);
});

function applyPreset(p) {
    document.querySelectorAll('.preset-pill').forEach(btn => btn.classList.remove('active'));
    if (p.id) {
        const el = document.getElementById(p.id);
        if (el) el.classList.add('active');
    }

    const volumeSlider = document.getElementById('volumeSlider');
    const bassSlider = document.getElementById('bassSlider');
    const spatialToggle = document.getElementById('spatialToggle');
    const reverbToggle = document.getElementById('reverbToggle');
    const speedSlider = document.getElementById('speedSlider');

    volumeSlider.value = p.volume;
    volumeSlider.dispatchEvent(new Event('input'));

    bassSlider.value = p.bass;
    bassSlider.dispatchEvent(new Event('input'));

    spatialToggle.checked = p.spatial;
    spatialToggle.dispatchEvent(new Event('change'));

    reverbToggle.checked = p.reverb;
    reverbToggle.dispatchEvent(new Event('change'));

    speedSlider.value = p.speed;
    speedSlider.dispatchEvent(new Event('input'));
}

async function handleUploadedFile(file) {
    if (!file) return;
    currentFile = file;

    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') await audioCtx.resume();

        const arrayBuffer = await file.arrayBuffer();
        currentBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        document.getElementById('boosterDropzone').classList.add('hidden');
        document.getElementById('boosterStudio').classList.remove('hidden');
        document.getElementById('boosterFileName').textContent = file.name.replace(/\.[^/.]+$/, "");

        startPlayback(0);
    } catch (err) {
        alert("Failed to decode audio. Please choose another audio or video file.");
        console.error(err);
    }
}

function createReverbBuffer(ctx, duration = 2.0, decay = 2.0) {
    const rate = ctx.sampleRate;
    const length = rate * duration;
    const impulse = ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
        const n = i;
        left[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
        right[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
    }
    return impulse;
}

function startPlayback(offset) {
    if (!currentBuffer) return;
    stopAudio();

    sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = currentBuffer;
    sourceNode.playbackRate.value = parseFloat(document.getElementById('speedSlider').value);

    // 1. Bass EQ Node (LowShelf at 80Hz)
    bassNode = audioCtx.createBiquadFilter();
    bassNode.type = 'lowshelf';
    bassNode.frequency.value = 80;
    bassNode.gain.value = parseFloat(document.getElementById('bassSlider').value);

    // 2. 8D Stereo Panner Node
    pannerNode = audioCtx.createStereoPanner();
    pannerNode.pan.value = 0;

    // 3. Soft-Knee Compressor (Limiter) to prevent clipping distortion
    compressorNode = audioCtx.createDynamicsCompressor();
    compressorNode.threshold.value = -1.0;
    compressorNode.knee.value = 12;
    compressorNode.ratio.value = 20;
    compressorNode.attack.value = 0.003;
    compressorNode.release.value = 0.25;

    // 4. Master Volume Booster Gain Node
    gainNode = audioCtx.createGain();
    gainNode.gain.value = parseFloat(document.getElementById('volumeSlider').value);

    // 5. Spectrum Analyser for 3D Visualizer
    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 128;

    // Connect standard chain
    sourceNode.connect(bassNode);
    bassNode.connect(pannerNode);

    // Check Reverb
    const isReverb = document.getElementById('reverbToggle').checked;
    if (isReverb) {
        convolverNode = audioCtx.createConvolver();
        convolverNode.buffer = createReverbBuffer(audioCtx, 1.8, 2.5);

        const wetGain = audioCtx.createGain();
        wetGain.gain.value = 0.35;
        const dryGain = audioCtx.createGain();
        dryGain.gain.value = 0.85;

        pannerNode.connect(dryGain);
        pannerNode.connect(convolverNode);
        convolverNode.connect(wetGain);

        dryGain.connect(compressorNode);
        wetGain.connect(compressorNode);
    } else {
        pannerNode.connect(compressorNode);
    }

    compressorNode.connect(gainNode);
    gainNode.connect(analyserNode);
    analyserNode.connect(audioCtx.destination);

    sourceNode.start(0, offset);
    startTime = audioCtx.currentTime - offset;
    pauseOffset = offset;
    isPlaying = true;

    document.getElementById('boosterPlayBtn').textContent = '⏸';
    startVisualizerLoop();

    sourceNode.onended = () => {
        if (isPlaying && (audioCtx.currentTime - startTime >= currentBuffer.duration - 0.1)) {
            stopAudio();
            pauseOffset = 0;
            document.getElementById('boosterTimeDisplay').textContent = `0:00 / ${formatSecs(currentBuffer.duration)}`;
        }
    };
}

function restartCurrentPlayback() {
    if (isPlaying) {
        const offset = audioCtx.currentTime - startTime;
        startPlayback(offset);
    }
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
    document.getElementById('boosterPlayBtn').textContent = '▶';
    if (animFrameId) cancelAnimationFrame(animFrameId);
}

function formatSecs(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// 3D Orbital Canvas Visualizer
function startVisualizerLoop() {
    const canvas = document.getElementById('orbitCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const freqData = new Uint8Array(analyserNode.frequencyBinCount);

    function loop() {
        if (isPlaying && currentBuffer) {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = canvas.clientWidth * dpr;
            canvas.height = canvas.clientHeight * dpr;
            ctx.scale(dpr, dpr);

            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            const centerX = width / 2;
            const centerY = height / 2;

            ctx.clearRect(0, 0, width, height);
            analyserNode.getByteFrequencyData(freqData);

            // Calculate average energy
            let sum = 0;
            for (let i = 0; i < freqData.length; i++) sum += freqData[i];
            const avg = sum / freqData.length;
            const radius = 50 + (avg / 255) * 25;

            // 8D Orbit update
            if (isSpatial8D && pannerNode) {
                orbitAngle += (Math.PI * 2) / (orbitSpeedSec * 60);
                // Pan from -1 (left) to 1 (right) smoothly
                const panVal = Math.sin(orbitAngle);
                pannerNode.pan.setValueAtTime(panVal, audioCtx.currentTime);
            }

            // Draw orbit circle ring
            ctx.beginPath();
            ctx.arc(centerX, centerY, 80, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(244, 63, 94, 0.2)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw sound particle wave around center
            const bars = freqData.length;
            for (let i = 0; i < bars; i++) {
                const angle = (i / bars) * Math.PI * 2 + (isSpatial8D ? orbitAngle : 0);
                const barLen = (freqData[i] / 255) * 45;
                const x1 = centerX + Math.cos(angle) * (radius - 5);
                const y1 = centerY + Math.sin(angle) * (radius - 5);
                const x2 = centerX + Math.cos(angle) * (radius + barLen);
                const y2 = centerY + Math.sin(angle) * (radius + barLen);

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.strokeStyle = `hsl(${345 + (i * 2)}, 90%, 65%)`;
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.stroke();
            }

            // Draw rotating 8D Satellite Speaker
            if (isSpatial8D) {
                const satX = centerX + Math.cos(orbitAngle) * 80;
                const satY = centerY + Math.sin(orbitAngle) * 80;

                ctx.beginPath();
                ctx.arc(satX, satY, 9, 0, Math.PI * 2);
                ctx.fillStyle = '#f43f5e';
                ctx.shadowColor = '#f43f5e';
                ctx.shadowBlur = 15;
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            // Update Time display
            const current = audioCtx.currentTime - startTime;
            document.getElementById('boosterTimeDisplay').textContent = `${formatSecs(current)} / ${formatSecs(currentBuffer.duration)}`;

            animFrameId = requestAnimationFrame(loop);
        }
    }
    loop();
}

async function exportBoostedAudio() {
    if (!currentFile) return;

    const btn = document.getElementById('downloadBoostedBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Enhancing Master Audio...';
    btn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('volume', document.getElementById('volumeSlider').value);
        formData.append('bass', document.getElementById('bassSlider').value);
        formData.append('spatial_3d', document.getElementById('spatialToggle').checked ? 'true' : 'false');
        formData.append('reverb', document.getElementById('reverbToggle').checked ? 'true' : 'false');
        formData.append('speed', document.getElementById('speedSlider').value);

        const res = await fetch(`${API_URL}/audio-boost`, {
            method: 'POST',
            body: formData
        });

        if (!res.ok) throw new Error("Server processing error");

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentFile.name.replace(/\.[^/.]+$/, "")}_Enhanced_320k.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        btn.innerHTML = '✅ Enhanced MP3 Downloaded!';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 3000);
    } catch (e) {
        console.warn("Server boost failed, using client-side offline rendering:", e);
        await exportClientSideBoost(btn, originalText);
    }
}

async function exportClientSideBoost(btn, originalText) {
    if (!currentBuffer) return;
    try {
        btn.innerHTML = '⚡ Rendering Audio in Browser...';
        const offlineCtx = new OfflineAudioContext(2, currentBuffer.length, currentBuffer.sampleRate);
        const offlineSource = offlineCtx.createBufferSource();
        offlineSource.buffer = currentBuffer;
        offlineSource.playbackRate.value = parseFloat(document.getElementById('speedSlider').value);

        const bass = offlineCtx.createBiquadFilter();
        bass.type = 'lowshelf';
        bass.frequency.value = 80;
        bass.gain.value = parseFloat(document.getElementById('bassSlider').value);

        const comp = offlineCtx.createDynamicsCompressor();
        comp.threshold.value = -1.0;
        comp.knee.value = 12;
        comp.ratio.value = 20;

        const gain = offlineCtx.createGain();
        gain.gain.value = parseFloat(document.getElementById('volumeSlider').value);

        offlineSource.connect(bass);
        bass.connect(comp);
        comp.connect(gain);
        gain.connect(offlineCtx.destination);

        offlineSource.start();
        const rendered = await offlineCtx.startRendering();

        // Convert to WAV
        const wavBlob = audioBufferToWav(rendered);
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentFile.name.replace(/\.[^/.]+$/, "")}_Enhanced.wav`;
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

function audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const dataLength = buffer.length * blockAlign;
    const bufferLength = 44 + dataLength;

    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    function writeString(offset, string) {
        for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
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
    for (let i = 0; i < numChannels; i++) channelData.push(buffer.getChannelData(i));

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
            let sample = Math.max(-1, Math.min(1, channelData[channel][i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
        }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
}
