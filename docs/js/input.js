// ============================================================
// INPUT — keyboard, mouse, touch handling
// ============================================================

function setupInput() {
    const clearKeys = () => {
        Object.keys(keys).forEach(k => { keys[k] = false; });
    };

    // While the player is typing in a text field (e.g. the leaderboard
    // join name input), we must NOT intercept space / Esc / 1 / 2 / etc.
    // — preventDefault on space would otherwise stop the space character
    // from reaching the input.
    const _isTypingTarget = (el) => {
        if (!el) return false;
        const tag = el.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
        if (el.isContentEditable) return true;
        return false;
    };

    document.addEventListener('keydown', (e) => {
        if (_isTypingTarget(e.target)) return;
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
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) clearKeys();
    });

    // Pause button
    const pauseBtn = document.getElementById('pauseBtn');
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
    }
    return false;
}

function touchStarted() {
    if (game && game.state === 'playing' && touches.length > 0) {
        game.inputX = Math.max(-CONFIG.ROAD_HALF_WIDTH, Math.min(CONFIG.ROAD_HALF_WIDTH, _getWorldX(touches[0].x)));
    }
    return false;
}
