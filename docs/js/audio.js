// ============================================================
// AUDIO SYSTEM — real sound effects with synthesized fallback
// ============================================================

// Audio buffer cache: type → AudioBuffer
const _audioBuffers = {};
let _audioLoaded = false;
let _audioVolume = 0.5;

// BGM state
let _bgmSource = null;
let _bgmGain = null;
let _bgmBuffers = {};  // level → AudioBuffer
let _bgmPlaying = false;
let _pendingBgmLevel = null;
let _bgmPreloadDone = false;
const BGM_FILES = {
    1: 'assets/audio/bgm.mp3',
    2: 'assets/audio/bgm_l2.mp3',
};
const BGM_VOLUME = 0.2;

// Sound definitions: file path + per-sound volume adjustment
const SOUND_DEFS = {
    shoot:          { file: 'assets/audio/shoot.mp3',          vol: 0.3  },
    shoot_shotgun:  { file: 'assets/audio/shoot_shotgun.mp3',  vol: 0.35 },
    shoot_laser:    { file: 'assets/audio/shoot_laser.mp3',    vol: 0.3  },
    shoot_rocket:   { file: 'assets/audio/shoot_rocket.mp3',   vol: 0.3  },
    explosion:      { file: 'assets/audio/explosion.mp3',      vol: 0.4  },
    gate_good:      { file: 'assets/audio/gate_good.mp3',      vol: 0.5  },
    gate_bad:       { file: 'assets/audio/gate_bad.mp3',       vol: 0.5  },
    weapon_pickup:  { file: 'assets/audio/weapon_pickup.mp3',  vol: 0.5  },
    hit:            { file: 'assets/audio/hit.mp3',            vol: 0.25 },
    wave_start:     { file: 'assets/audio/wave_start.mp3',     vol: 0.5  },
};

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume suspended context (browser requires user gesture)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    if (!_audioLoaded) {
        _audioLoaded = true;
        _preloadAudioBuffers();
    }
}

const _AUDIO_VERSION = 4;  // bump to bust browser cache

async function _preloadAudioBuffers() {
    const entries = Object.entries(SOUND_DEFS);
    const results = await Promise.allSettled(
        entries.map(async ([type, def]) => {
            const resp = await fetch(def.file + '?v=' + _AUDIO_VERSION);
            if (!resp.ok) throw new Error(`${resp.status} ${def.file}`);
            const buf = await resp.arrayBuffer();
            _audioBuffers[type] = await audioCtx.decodeAudioData(buf);
        })
    );
    const loaded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected');
    console.log(`Audio: ${loaded}/${entries.length} sounds loaded`);
    if (failed.length > 0) {
        console.warn('Audio: failed to load:', failed.map(r => r.reason.message));
    }

    // Preload BGM for all levels
    for (const [lvl, file] of Object.entries(BGM_FILES)) {
        try {
            const bgmResp = await fetch(file + '?v=' + _AUDIO_VERSION);
            if (bgmResp.ok) {
                _bgmBuffers[lvl] = await audioCtx.decodeAudioData(await bgmResp.arrayBuffer());
            }
        } catch (_) {}
    }
    console.log(`Audio: BGM loaded for ${Object.keys(_bgmBuffers).length} level(s)`);
    _bgmPreloadDone = true;
    if (_pendingBgmLevel !== null && !_bgmPlaying) {
        const pendingLevel = _pendingBgmLevel;
        _pendingBgmLevel = null;
        playBGM(pendingLevel);
    }
}

// ============================================================
// BGM CONTROL
// ============================================================
function playBGM(level) {
    stopBGM();
    const bgmLevel = level || 1;
    let buf = _bgmBuffers[bgmLevel];
    if (!buf && _bgmPreloadDone && bgmLevel !== 1) {
        buf = _bgmBuffers[1];
    }
    if (!audioCtx || !buf) {
        if (!_bgmPreloadDone) _pendingBgmLevel = bgmLevel;
        return;
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    _bgmGain = audioCtx.createGain();
    _bgmGain.gain.value = BGM_VOLUME;
    _bgmGain.connect(audioCtx.destination);

    _bgmSource = audioCtx.createBufferSource();
    _bgmSource.buffer = buf;
    _bgmSource.loop = true;
    _bgmSource.connect(_bgmGain);
    _bgmSource.start(0);
    _bgmPlaying = true;
}

function stopBGM() {
    _pendingBgmLevel = null;
    if (_bgmSource && _bgmPlaying) {
        try { _bgmSource.stop(); } catch (_) {}
        _bgmSource = null;
        _bgmPlaying = false;
    }
    // Disconnect the gain node so the previous BGM track's audio graph
    // can be garbage-collected. Without this, every level transition
    // orphans a GainNode that stays connected to audioCtx.destination.
    if (_bgmGain) {
        try { _bgmGain.disconnect(); } catch (_) {}
        _bgmGain = null;
    }
}

function setBGMVolume(vol) {
    if (_bgmGain) _bgmGain.gain.value = vol;
}

function playSound(type) {
    if (!audioCtx) return;
    // Ensure context is running (user gesture may have happened since init)
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // Try real audio buffer first
    const buffer = _audioBuffers[type];
    if (buffer) {
        try {
            const source = audioCtx.createBufferSource();
            const gain = audioCtx.createGain();
            source.buffer = buffer;
            const def = SOUND_DEFS[type] || {};
            gain.gain.value = (def.vol || 0.5) * _audioVolume;
            source.connect(gain);
            gain.connect(audioCtx.destination);
            source.onended = () => {
                try { source.disconnect(); } catch (_) {}
                try { gain.disconnect(); } catch (_) {}
            };
            source.start(0);
            return;
        } catch (_) { /* fall through to synth */ }
    }

    // Fallback: synthesized sound
    _playSynthSound(type);
}

// ============================================================
// SYNTHESIZED FALLBACK (original oscillator-based sounds)
// ============================================================
function _playSynthSound(type) {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    if (type === 'shoot') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.start(now); osc.stop(now + 0.06);
    } else if (type === 'shoot_shotgun') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now); osc.stop(now + 0.12);
    } else if (type === 'shoot_laser') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now); osc.stop(now + 0.12);
    } else if (type === 'shoot_rocket') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(400, now + 0.05);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now); osc.stop(now + 0.25);
    } else if (type === 'explosion') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.2);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now); osc.stop(now + 0.25);
    } else if (type === 'gate_good') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
    } else if (type === 'gate_bad') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.2);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now); osc.stop(now + 0.25);
    } else if (type === 'weapon_pickup') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.linearRampToValueAtTime(1000, now + 0.1);
        osc.frequency.linearRampToValueAtTime(1500, now + 0.2);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now); osc.stop(now + 0.25);
    } else if (type === 'hit') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'wave_start') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.setValueAtTime(400, now + 0.08);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
    }
}
