// =======================================================
// Universal Sound Effects System (Web Audio API)
// High-tech tactile sound feedback for buttons, tools & downloads
// =======================================================

const UniversalSoundFX = {
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
            osc.frequency.setValueAtTime(1400, now);
            osc.frequency.exponentialRampToValueAtTime(350, now + 0.035);
            gain.gain.setValueAtTime(0.09, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.035);
        } catch (e) {}
    },

    // 2. Soft Pop / Drawer Open / Item Add
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
            osc.frequency.setValueAtTime(280, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.08);
        } catch (e) {}
    },

    // 3. Delete / Remove / Close Swoosh
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
            osc.frequency.setValueAtTime(420, now);
            osc.frequency.exponentialRampToValueAtTime(110, now + 0.1);
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
            
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const t = now + idx * 0.07;
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0.12, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.22);
            });
        } catch (e) {}
    },

    // 6. Crystal Success Harmony (Grand Completion Chime)
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

    // 7. Error / Alert Buzzer
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
            osc.frequency.setValueAtTime(240, now);
            osc.frequency.setValueAtTime(160, now + 0.12);
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
            osc.frequency.setValueAtTime(420, now);
            osc.frequency.exponentialRampToValueAtTime(640, now + 0.07);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.07);
        } catch (e) {}
    }
};

// Aliases for compatibility
window.SoundFX = UniversalSoundFX;

// Attach global sound interactions to all interactive elements
document.addEventListener('DOMContentLoaded', () => {
    // Unlock Web Audio on first user click or tap anywhere
    const unlockAudio = () => {
        UniversalSoundFX.init();
        UniversalSoundFX.resume();
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);

    // Micro-click on buttons, tool cards, nav items, format items
    document.addEventListener('click', (e) => {
        const target = e.target.closest('button, .nav-link-item, .demo-card, .tool-card, .plan-card, .tab-btn, .action-btn');
        if (target) {
            // Check specific classes for tailored sounds
            if (target.classList.contains('close-ad-btn') || target.classList.contains('close-btn')) {
                UniversalSoundFX.playDelete();
            } else if (target.classList.contains('btn-direct-download') || target.classList.contains('download-single-btn')) {
                UniversalSoundFX.playStartDownload();
            } else if (target.id === 'themeToggle') {
                UniversalSoundFX.playToggle();
            } else {
                UniversalSoundFX.playClick();
            }
        }
    });
});
