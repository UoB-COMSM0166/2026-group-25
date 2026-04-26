// ============================================================
// INPUT — keyboard, mouse, touch handling
// ============================================================

function isTextEntryTarget(target) {
    if (!target) return false;
    const tag = target.tagName;
    if (tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return true;
    if (tag !== 'INPUT') return false;

    const type = (target.type || 'text').toLowerCase();
    return !['button', 'checkbox', 'radio', 'range', 'reset', 'submit'].includes(type);
}

function setupInput() {
    const clearKeys = () => {
        Object.keys(keys).forEach(k => { keys[k] = false; });
    };

    document.addEventListener('keydown', (e) => {
        if (isTextEntryTarget(e.target)) return;

        keys[e.key] = true;
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
            if (game) {
                if (game.state === 'playing') {
                    game.state = 'paused';
                    if (game.isTutorial) game.tutorialPausedOnce = true;
                    showPauseMenu();
                }
                else if (game.state === 'paused') { resumeGame(); }
            }
        }
        if (e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            if (game && game.state === 'midShop') { closeMidShop(); }
            else { activateSkillWeapon(); }
        }
        if (e.key === '1') activateInvincibility();
        if (e.key === '2') activateStimulant();
        if (e.key === 'i' || e.key === 'I') {
            const now = Date.now();
            if (now - _debugILastTime > 700) _debugIPressCount = 0;
            _debugILastTime = now;
            _debugIPressCount++;
            if (_debugIPressCount >= 3) { _debugIPressCount = 0; toggleDebugOverlay(); }
        }
    });
    document.addEventListener('keyup', (e) => { keys[e.key] = false; });
    window.addEventListener('blur', clearKeys);
    // Flush any pending save when the page goes to the background or is
    // about to be unloaded — flushPlayerDataSave is throttled to ~3s
    // during the normal frame loop, which leaves a window where freshly
    // earned coins / gems can be lost if the tab is closed quickly.
    const _flushOnLeave = () => {
        try { if (typeof flushPlayerDataSave === 'function') flushPlayerDataSave(true); } catch (_) {}
    };
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            clearKeys();
            _flushOnLeave();
        }
    });
    window.addEventListener('pagehide', _flushOnLeave);

    // Pause button
    const pauseBtn = document.getElementById('pauseBtn');
    if (!pauseBtn) return;
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        pauseBtn.style.display = 'block';
    }
    pauseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (game) {
            if (game.state === 'playing') {
                game.state = 'paused';
                if (game.isTutorial) game.tutorialPausedOnce = true;
                showPauseMenu();
            }
            else if (game.state === 'paused') { resumeGame(); }
        }
    });
}

// ============================================================
// p5.js GLOBAL FUNCTIONS (input)
// ============================================================
function _getWorldX(canvasX) {
    const centerX = width / 2;
    return ((canvasX - centerX) / (width / 2)) * CONFIG.ROAD_HALF_WIDTH;
}

function mouseMoved() {
    if (game && game.state === 'playing') {
        game.inputX = Math.max(-CONFIG.ROAD_HALF_WIDTH, Math.min(CONFIG.ROAD_HALF_WIDTH, _getWorldX(mouseX)));
    }
}

function touchMoved() {
    if (game && game.state === 'playing' && touches.length > 0) {
        game.inputX = Math.max(-CONFIG.ROAD_HALF_WIDTH, Math.min(CONFIG.ROAD_HALF_WIDTH, _getWorldX(touches[0].x)));
        return false;
    }
    return true;
}

function touchStarted() {
    if (game && game.state === 'playing' && touches.length > 0) {
        game.inputX = Math.max(-CONFIG.ROAD_HALF_WIDTH, Math.min(CONFIG.ROAD_HALF_WIDTH, _getWorldX(touches[0].x)));
        return false;
    }
    return true;
}
