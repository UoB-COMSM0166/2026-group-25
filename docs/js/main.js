// ============================================================
// INPUT
// ============================================================
function setupInput() {
    // p5.js: mouseMoved() / touchMoved() defined below as p5 global functions
    // Only need keyboard and DOM events here

    document.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
            if (game) {
                if (game.state === 'playing') { game.state = 'paused'; showPauseMenu(); }
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

    // Pause button
    const pauseBtn = document.getElementById('pauseBtn');
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        pauseBtn.style.display = 'block';
    }
    pauseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (game) {
            if (game.state === 'playing') { game.state = 'paused'; showPauseMenu(); }
            else if (game.state === 'paused') { resumeGame(); }
        }
    });

    const skillBtn = document.getElementById('skillBtn');
    if (skillBtn) {
        skillBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            activateSkillWeapon();
        });
    }
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
    return false; // prevent default
}

function touchStarted() {
    if (game && game.state === 'playing' && touches.length > 0) {
        game.inputX = _getWorldX(touches[0].x);
    }
    return false;
}

// ============================================================
// PAUSE MENU
// ============================================================
function showPauseMenu() {
    document.getElementById('pauseMenuOverlay').classList.remove('hidden');
}

function hidePauseMenu() {
    document.getElementById('pauseMenuOverlay').classList.add('hidden');
}

function resumeGame() {
    if (game && game.state === 'paused') {
        game.state = 'playing';
        hidePauseMenu();
    }
}

function restartFromPause() {
    hidePauseMenu();
    startGameWithLevel(game ? (game.currentLevel || 1) : 1);
}

function menuFromPause() {
    hidePauseMenu();
    if (game) {
        playerData.level = game.level;
        playerData.exp = game.exp;
        flushPlayerDataSave(true);
        savePlayerData(playerData);
        saveHighScore(game.score, game.wave);
        syncHighScore();
    }
    const slotsDiv = document.getElementById('weaponSlots');
    if (slotsDiv) slotsDiv.style.display = 'none';
    game = null;
    // Invalidate sky buffer so menu bg draws fresh
    _skyBgW = 0; _skyBgH = 0; _skyBgLevel = 0;
    overlay.classList.remove('hidden');
    restoreMainMenu();
}

// ============================================================
// LEVEL SELECT CANVAS ANIMATION
// ============================================================
let _lsAnimRaf = null;
let _lsAnimT = 0;

function _drawLsSprite(canvasId, img, fw, fh, frameIdx, cols, scale, flipX) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !img || !img.complete || img.naturalWidth === 0) return;
    const ctx = canvas.getContext('2d');
    const cw = canvas.width, ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);
    const col = frameIdx % cols;
    const row = Math.floor(frameIdx / cols);
    const sx = col * fw, sy = row * fh;
    // Auto-fit to canvas first, then apply scale as zoom multiplier
    const fitScale = Math.min(cw / fw, ch / fh) * scale;
    const dw = fw * fitScale, dh = fh * fitScale;
    const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
    if (flipX) {
        ctx.save(); ctx.scale(-1, 1);
        ctx.drawImage(img, sx, sy, fw, fh, -(dx + dw), dy, dw, dh);
        ctx.restore();
    } else {
        ctx.drawImage(img, sx, sy, fw, fh, dx, dy, dw, dh);
    }
}

function _runLevelSelectAnim() {
    _lsAnimT++;
    const lsOverlay = document.getElementById('levelSelectOverlay');
    if (!lsOverlay || lsOverlay.classList.contains('hidden')) {
        _lsAnimRaf = null;
        return;
    }
    if (rawPatrickImg) {
        const f = Math.floor(_lsAnimT * 0.15) % PATRICK_TOTAL_FRAMES;
        _drawLsSprite('lsCanvas1a', rawPatrickImg, PATRICK_FRAME_W, PATRICK_FRAME_H, f, PATRICK_COLS, 0.7, false);
    }
    if (rawBossImg) {
        const f = Math.floor(_lsAnimT * 0.12) % MONSTER_FRAME_COUNT;
        _drawLsSprite('lsCanvas1b', rawBossImg, MONSTER_FRAME_SIZE, MONSTER_FRAME_SIZE, f, 9999, 1.4, false);
    }
    if (rawXiaoNaiLongImg) {
        const f = Math.floor(_lsAnimT * 0.2) % XIAO_NAI_LONG_FRAME_COUNT;
        _drawLsSprite('lsCanvas1c', rawXiaoNaiLongImg, XIAO_NAI_LONG_FRAME_SIZE, XIAO_NAI_LONG_FRAME_SIZE, f, 9999, 0.9, true);
    }
    if (rawCapybaraImg) {
        const f = Math.floor(_lsAnimT * 0.15) % CAPYBARA_FRAME_COUNT;
        _drawLsSprite('lsCanvas2a', rawCapybaraImg, CAPYBARA_FRAME_SIZE, CAPYBARA_FRAME_SIZE, f, 9999, 0.9, false);
    }
    if (rawElephantImg) {
        const f = Math.floor(_lsAnimT * 0.12) % ELEPHANT_FRAME_COUNT;
        _drawLsSprite('lsCanvas2b', rawElephantImg, ELEPHANT_FRAME_SIZE, ELEPHANT_FRAME_SIZE, f, 9999, 1.2, false);
    }
    if (rawCowCryImg) {
        const f = Math.floor(_lsAnimT * 0.18) % COW_CRY_FRAME_COUNT;
        _drawLsSprite('lsCanvas2c', rawCowCryImg, COW_CRY_FRAME_SIZE, COW_CRY_FRAME_SIZE, f, 9999, 0.9, true);
    }
    _lsAnimRaf = requestAnimationFrame(_runLevelSelectAnim);
}

// ============================================================
// LEVEL SELECT
// ============================================================
let _selectedLevel = 1;

function showLevelSelect() {
    overlay.classList.add('hidden');
    const lsOverlay = document.getElementById('levelSelectOverlay');
    if (!lsOverlay) return;

    const unlocked = playerData.unlockedLevels || [1];
    const isL2Unlocked = unlocked.includes(2);

    const hs = getHighScore();
    const l1BestWave = document.getElementById('l1BestWave');
    const l1BestScore = document.getElementById('l1BestScore');
    if (l1BestWave) l1BestWave.textContent = hs.wave > 0 ? hs.wave : '—';
    if (l1BestScore) l1BestScore.textContent = hs.score > 0 ? hs.score : '—';

    const card2 = document.getElementById('levelCard2');
    const l2Info = document.getElementById('l2InfoText');
    const l2Btn = document.getElementById('l2StartBtn');
    if (card2) {
        if (isL2Unlocked) {
            card2.classList.remove('locked');
            const l2Hs = playerData.l2HighScore || { score: 0, wave: 0 };
            if (l2Info) l2Info.textContent = `BEST WAVE: ${l2Hs.wave > 0 ? l2Hs.wave : '—'} | BEST SCORE: ${l2Hs.score > 0 ? l2Hs.score : '—'}`;
            if (l2Btn) l2Btn.disabled = false;
        } else {
            card2.classList.add('locked');
            if (l2Info) l2Info.textContent = '🔒 Clear Level I (Wave 66) to unlock';
            if (l2Btn) l2Btn.disabled = true;
        }
    }

    _lsAnimT = 0;
    if (!_lsAnimRaf) _lsAnimRaf = requestAnimationFrame(_runLevelSelectAnim);
    lsOverlay.classList.remove('hidden');
}

function showMainMenu() {
    const lsOverlay = document.getElementById('levelSelectOverlay');
    if (lsOverlay) lsOverlay.classList.add('hidden');
    overlay.classList.remove('hidden');
    restoreMainMenu();
}

function startGameWithLevel(level) {
    _selectedLevel = level || 1;
    const lsOverlay = document.getElementById('levelSelectOverlay');
    if (lsOverlay) lsOverlay.classList.add('hidden');
    startGame(_selectedLevel);
}

function triggerLevelComplete() {
    const g = game;
    if (!playerData.unlockedLevels) playerData.unlockedLevels = [1];
    if (!playerData.unlockedLevels.includes(2)) {
        playerData.unlockedLevels.push(2);
        savePlayerData(playerData);
    }
    const isL2Clear = g.currentLevel === 2;
    const maxWaves = isL2Clear ? MAX_WAVES_LEVEL2 : MAX_WAVES_LEVEL1;
    const levelTag = isL2Clear ? 'LEVEL II' : 'LEVEL I';
    const unlockLine = isL2Clear ? '' : `<div style="color:#cc44ff;font-size:min(20px,4vw);margin-bottom:24px;text-shadow:0 0 15px rgba(200,68,255,0.6);">🔓 LEVEL II - DOOMSDAY FACTORY UNLOCKED!</div>`;
    const nextBtn = isL2Clear ? '' : `<button class="btn" style="background:linear-gradient(180deg,#f0b828,#c87800);border-color:#f0c840;" onclick="startGameWithLevel(2)">▶ NEXT LEVEL</button>`;
    overlay.classList.remove('hidden');
    overlay.innerHTML = `
        <h1 style="color:#44ff88;text-shadow:0 0 30px rgba(68,255,136,0.7);">🏆 LEVEL COMPLETE!</h1>
        <div style="color:#f0c040;font-size:min(32px,6vw);margin:16px 0;letter-spacing:3px;">${levelTag} CLEAR!</div>
        <div style="color:#aaa;font-size:min(20px,4vw);margin-bottom:12px;">WAVES: ${g.wave - 1} / ${maxWaves}</div>
        <div style="color:#88ccff;font-size:min(22px,4.5vw);margin-bottom:6px;">SCORE: ${g.score}</div>
        ${unlockLine}
        <div id="menuButtons">
            ${nextBtn}
            <button class="btn" style="background:linear-gradient(180deg,#44cc44,#228822);border-color:#55ee55;" onclick="showLevelSelect()">SELECT LEVEL</button>
            <button class="btn" onclick="restoreMainMenu()">MAIN MENU</button>
        </div>
    `;
    saveHighScore(g.score, g.wave - 1);
    syncHighScore();
    const slotsDiv = document.getElementById('weaponSlots');
    if (slotsDiv) slotsDiv.style.display = 'none';
    game = null;
}

function startGame(level) {
    initAudio();
    game = createGame();
    game.currentLevel = level || _selectedLevel || 1;
    game.squadCount = 5 + getTalentSquadBonus() + getLevelSquadBonus();
    game.peakSquad = game.squadCount;
    const invCharges = (playerData.weaponCharges || {})['invincibility'] || 0;
    game.skillReady = invCharges > 0;
    game.skillCooldown = 0;
    spawnEnemyWave();
    overlay.classList.add('hidden');
    const skillBtn = document.getElementById('skillBtn');
    if (skillBtn) skillBtn.style.display = 'none';
    const slotsDiv = document.getElementById('weaponSlots');
    if (slotsDiv) slotsDiv.style.display = 'none';
    // Invalidate sky buffer so it's rebuilt with correct level
    _skyBgW = 0; _skyBgH = 0; _skyBgLevel = 0;
}

function activateInvincibility() {
    const g = game;
    if (!g || g.state !== 'playing') return;
    if (g.skillCooldown > 0) return;
    const charges = (playerData.weaponCharges || {})['invincibility'] || 0;
    if (charges <= 0) return;
    const shopW = SHOP_WEAPONS['invincibility'];
    playerData.weaponCharges['invincibility'] = charges - 1;
    savePlayerData(playerData);
    g.shieldActive = true;
    g.shieldTimer = shopW.duration * 1000;
    g.skillCooldown = SKILL_SHARED_COOLDOWN * 1000;
    g.skillReady = false;
    playSound('weapon_pickup');
    g.screenFlash = 0.4;
    g.shakeTimer = Math.max(g.shakeTimer, 6);
    addParticles(g.player.x, g.cameraZ + 10, 15, shopW.colorHex, 4, 20);
}

function activateStimulant() {
    const g = game;
    if (!g || g.state !== 'playing') return;
    if (g.stimulantActive) return;
    if (g.stimulantCooldown > 0) return;
    const charges = (playerData.weaponCharges || {})['stimulant'] || 0;
    if (charges <= 0) return;
    const shopW = SHOP_WEAPONS['stimulant'];
    playerData.weaponCharges['stimulant'] = charges - 1;
    savePlayerData(playerData);
    g.stimulantActive = true;
    g.stimulantTimer = shopW.duration * 1000;
    g.stimulantCooldown = 0;
    playSound('weapon_pickup');
    g.screenFlash = 0.35;
    g.shakeTimer = Math.max(g.shakeTimer, 5);
    addParticles(g.player.x, g.cameraZ + 10, 18, shopW.colorHex, 4, 22);
    g.gateText = { text: '💚 STIMULANT! TROOPS x2, DMG HALVED', color: 0x44ff88, timer: 0, maxTimer: 80, scale: 0.1 };
}

function activateWeaponByKey(weaponKey) {
    if (weaponKey === 'invincibility') activateInvincibility();
    else if (weaponKey === 'stimulant') activateStimulant();
}

function activateSkillWeapon() {
    activateInvincibility();
}

function initWeaponSlots() {
    const slotsDiv = document.getElementById('weaponSlots');
    if (!slotsDiv) return;
    slotsDiv.innerHTML = '';
    for (const [key, w] of Object.entries(SHOP_WEAPONS)) {
        if (w.defenseOnly) continue;
        const slot = document.createElement('div');
        slot.className = 'wslot';
        slot.dataset.weapon = key;
        slot.style.setProperty('--wcolor', w.color);
        slot.innerHTML = `
            <div class="wslot-icon">${w.icon}</div>
            <div class="wslot-level" style="font-size:10px;color:rgba(255,255,255,0.4)">LOCKED</div>
            <div class="wslot-equipped" style="font-size:9px;color:#ffd700;min-height:12px"></div>
        `;
        slotsDiv.appendChild(slot);
    }
    for (const key of ['invincibility', 'stimulant']) {
        const sw = SHOP_WEAPONS[key];
        const slot = document.createElement('div');
        slot.className = 'wslot';
        slot.dataset.weapon = key;
        slot.style.setProperty('--wcolor', sw.color);
        slot.innerHTML = `
            <div class="wslot-key">[${sw.hotkey}]</div>
            <div class="wslot-icon">${sw.icon}</div>
            <div class="wslot-count">×0</div>
            <div class="wslot-bar"><div class="wslot-bar-fill"></div></div>
            <div class="wslot-cd"></div>
        `;
        slot.addEventListener('click', () => activateWeaponByKey(key));
        slotsDiv.appendChild(slot);
    }
    slotsDiv.style.display = 'flex';
}

function updateWeaponSlots() {
    if (!game) return;
    const g = game;
    const slotsDiv = document.getElementById('weaponSlots');
    if (!slotsDiv || slotsDiv.style.display === 'none') return;
    const levels = playerData.weaponLevels || {};
    const charges = playerData.weaponCharges || {};
    slotsDiv.querySelectorAll('.wslot').forEach(slot => {
        const key = slot.dataset.weapon;
        const w = SHOP_WEAPONS[key];
        if (!w) return;
        if (key === 'invincibility' || key === 'stimulant') {
            const count = charges[key] || 0;
            const isActive = key === 'invincibility' ? g.shieldActive : g.stimulantActive;
            const isOnCooldown = key === 'invincibility' ? (g.skillCooldown > 0) : (g.stimulantCooldown > 0);
            const activeTimer = key === 'invincibility' ? g.shieldTimer : g.stimulantTimer;
            const activeDuration = (key === 'invincibility' ? WEAPON_DEFS['invincibility'].duration : SHOP_WEAPONS['stimulant'].duration) * 1000;
            const cdSec = Math.ceil((key === 'invincibility' ? g.skillCooldown : g.stimulantCooldown) / 1000);
            const countEl = slot.querySelector('.wslot-count');
            if (countEl) {
                countEl.textContent = `×${count}`;
                countEl.style.color = isActive ? '#ffd700' : (!isOnCooldown && count > 0) ? w.color : 'rgba(255,255,255,0.5)';
            }
            const cdEl = slot.querySelector('.wslot-cd');
            if (cdEl) {
                if (isActive) { cdEl.textContent = Math.ceil(activeTimer / 1000) + 's'; cdEl.style.color = '#ffd700'; cdEl.style.display = 'flex'; }
                else if (isOnCooldown) { cdEl.textContent = cdSec + 's'; cdEl.style.color = '#999'; cdEl.style.display = 'flex'; }
                else { cdEl.style.display = 'none'; }
            }
            const barFill = slot.querySelector('.wslot-bar-fill');
            if (barFill) {
                if (isActive) {
                    barFill.style.width = Math.max(0, activeTimer / activeDuration) * 100 + '%';
                    barFill.style.background = w.color;
                    slot.querySelector('.wslot-bar').style.display = 'block';
                } else { slot.querySelector('.wslot-bar').style.display = 'none'; }
            }
            slot.className = 'wslot';
            if (isActive) { slot.classList.add('wslot-active'); slot.style.borderColor = '#ffd700'; }
            else if (count <= 0) { slot.classList.add('wslot-empty'); slot.style.borderColor = 'rgba(255,255,255,0.08)'; }
            else if (isOnCooldown) { slot.classList.add('wslot-dim'); slot.style.borderColor = 'rgba(255,255,255,0.12)'; }
            else { slot.classList.add('wslot-ready'); slot.style.borderColor = w.color; }
        } else {
            const level = levels[key] || 0;
            const isGateActive = g.weapon === key && g.weaponTimer > 0;
            const levelEl = slot.querySelector('.wslot-level');
            if (levelEl) {
                levelEl.textContent = level > 0 ? ('★'.repeat(level) + '☆'.repeat(3 - level)) : 'LOCKED';
                levelEl.style.color = level > 0 ? w.color : 'rgba(255,255,255,0.3)';
            }
            const equippedEl = slot.querySelector('.wslot-equipped');
            if (equippedEl) equippedEl.textContent = isGateActive ? 'TEMP' : '';
            slot.className = 'wslot';
            if (isGateActive) { slot.classList.add('wslot-active'); slot.style.borderColor = '#ffd700'; }
            else if (level <= 0) { slot.classList.add('wslot-empty'); slot.style.borderColor = 'rgba(255,255,255,0.08)'; }
            else { slot.classList.add('wslot-ready'); slot.style.borderColor = w.color; }
        }
    });
}

function getHighScore() {
    try {
        const data = _signedLoad('bridgeAssault_highScore');
        if (data) return data;
    } catch {}
    return { score: 0, wave: 0 };
}

(function migrateHighScore() {
    const raw = localStorage.getItem('bridgeAssault_highScore');
    if (!raw) return;
    try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.score !== undefined && parsed.d === undefined) {
            _signedSave('bridgeAssault_highScore', parsed);
        }
    } catch {}
})();

function saveHighScore(score, wave) {
    const prev = getHighScore();
    if (score > prev.score) {
        _signedSave('bridgeAssault_highScore', { score, wave });
        return true;
    }
    return false;
}

// ── Revive System ──
function handlePlayerDeath() {
    const g = game;
    const reviveCost = (g.reviveCount + 1) * 10;
    const canRevive = (playerData.gems || 0) >= reviveCost;
    if (canRevive) {
        g.state = 'revive';
        showRevivePrompt(reviveCost);
    } else {
        g.state = 'gameover';
        showGameOver();
    }
}

function showRevivePrompt(cost) {
    const g = game;
    overlay.classList.remove('hidden');
    overlay.innerHTML = `
        <h1 style="color:#ff4444;">${T('revive.title')}</h1>
        <div style="color:#cc44ff;font-size:min(26px,5vw);margin:16px 0;">
            ${T('revive.prompt', `<span style="font-size:min(32px,6vw);font-weight:bold;">${cost}</span>`)}
        </div>
        <div style="color:#aaa;font-size:min(18px,4vw);margin-bottom:8px;">
            ${T('revive.restore', g.peakSquad)}
        </div>
        <div style="color:#888;font-size:min(16px,3.5vw);margin-bottom:20px;">
            ${T('revive.gems', playerData.gems || 0)}
        </div>
        <div id="menuButtons">
            <button class="btn" style="background:#cc44ff;color:#fff;text-shadow:0 0 8px #aa22ff;" onclick="revivePlayer()">${T('revive.btn', cost)}</button>
            <button class="btn" style="background:#555;" onclick="declineRevive()">${T('revive.decline')}</button>
        </div>
    `;
}

function revivePlayer() {
    const g = game;
    const cost = (g.reviveCount + 1) * 10;
    if ((playerData.gems || 0) < cost) return;
    playerData.gems -= cost;
    savePlayerData(playerData);
    g.reviveCount++;
    g.squadCount = g.peakSquad;
    g.state = 'playing';
    g.shieldActive = true;
    g.shieldTimer = 3000;
    g.screenFlash = 0.6;
    g.shakeTimer = 10;
    addParticles(g.player.x, g.cameraZ + 10, 25, 0xcc44ff, 5, 25);
    addParticles(g.player.x, g.cameraZ + 10, 15, 0xffffff, 4, 15);
    g.gateText = { text: `💎 REVIVED! TROOPS ${g.squadCount}`, color: 0xcc44ff, timer: 0, maxTimer: 90, scale: 0.1 };
    g.enemyBullets = [];
    g.slamWarnings = [];
    playSound('weapon_pickup');
    overlay.classList.add('hidden');
    const slotsDiv = document.getElementById('weaponSlots');
    if (slotsDiv) slotsDiv.style.display = '';
}

function declineRevive() {
    game.state = 'gameover';
    showGameOver();
}

function showGameOver() {
    playerData.level = game.level;
    playerData.exp = game.exp;
    savePlayerData(playerData);
    const currentLvl = game.currentLevel || 1;
    let isNewRecord;
    if (currentLvl === 2) {
        const prev = playerData.l2HighScore || { score: 0, wave: 0 };
        if (game.score > prev.score) {
            playerData.l2HighScore = { score: game.score, wave: game.wave };
            savePlayerData(playerData);
            isNewRecord = true;
        } else { isNewRecord = false; }
    } else {
        isNewRecord = saveHighScore(game.score, game.wave);
    }
    syncHighScore();
    const hs = getHighScore();
    overlay.classList.remove('hidden');
    document.getElementById('midShopOverlay').classList.add('hidden');
    const slotsDiv = document.getElementById('weaponSlots');
    if (slotsDiv) slotsDiv.style.display = 'none';
    const skillBtn = document.getElementById('skillBtn');
    if (skillBtn) skillBtn.style.display = 'none';
    overlay.innerHTML = `
        <h1>${T('gameover.title')}</h1>
        <div id="scoreDisplay">${T('gameover.score')}</div>
        <div id="finalScore">${game.score}</div>
        ${isNewRecord ? `<div style="color:#f0c040;font-size:min(28px,5vw);margin-bottom:12px;text-shadow:0 0 15px #f0c040;letter-spacing:3px;">${T('gameover.newrecord')}</div>` : ''}
        <div style="color:#aaa;font-size:min(20px,4vw);margin-bottom:12px;">${T('gameover.stats', game.wave, game.killCount)}</div>
        <div style="color:#f90;font-size:min(22px,4.5vw);margin-bottom:10px;">${T('gameover.combo', game.bestCombo)}</div>
        <div style="color:#ffd700;font-size:min(22px,4.5vw);margin-bottom:6px;">${T('gameover.coins', game.coinsCollected, playerData.coins)}</div>
        ${game.gemsCollected > 0 ? `<div style="color:#cc44ff;font-size:min(22px,4.5vw);margin-bottom:10px;text-shadow:0 0 10px #aa22ff;">${T('gameover.gems', game.gemsCollected, playerData.gems)}</div>` : `<div style="color:#666;font-size:min(16px,3.5vw);margin-bottom:10px;">${T('gameover.gems.hint')}</div>`}
        <div style="color:#88bbff;font-size:min(22px,4.5vw);margin-bottom:28px;">${T('gameover.record', hs.score, hs.wave)}</div>
        <div id="menuButtons">
            <button class="btn" onclick="restoreMainMenu()">${T('gameover.mainmenu')}</button>
            <button class="btn" onclick="startGameWithLevel(${currentLvl})">${T('gameover.playagain')}</button>
        </div>
    `;
}

function restoreMainMenu() {
    overlay.innerHTML = `
        <h1>BRIDGE ASSAULT</h1>
        <h2>${T('menu.subtitle')}</h2>
        <div id="coinDisplay">
            <span class="coin-icon"><svg viewBox="0 0 18 18" width="18" height="18" style="vertical-align:-3px"><circle cx="9" cy="9" r="8.5" fill="#b8820a"/><circle cx="9" cy="9" r="7" fill="#f0b828"/><ellipse cx="7" cy="6.5" rx="3" ry="1.5" fill="#f8d860" opacity="0.6"/></svg></span>
            <span id="coinCount">${playerData.coins}</span>
            <span style="margin-left:14px"><svg viewBox="0 0 16 16" width="16" height="16" style="vertical-align:-3px"><polygon points="8,1 14,6 8,15 2,6" fill="#8822bb"/><polygon points="8,1 14,6 8,8 2,6" fill="#cc44ff"/><polygon points="5.5,3.5 10.5,3.5 8,1" fill="#ee88ff"/></svg></span>
            <span id="gemCount" style="color:#cc44ff;">${playerData.gems || 0}</span>
        </div>
        <div id="menuButtons">
            <button class="btn" id="startBtn" onclick="showLevelSelect()">${T('menu.start')}</button>
            <button class="btn btn-shop" id="shopBtn" onclick="openShop()">${T('menu.shop')}</button>
            <button class="btn btn-leaderboard" onclick="showLeaderboard()">${T('lb.leaderboard.btn')}</button>
        </div>
    `;
}

// ============================================================
// DEBUG OVERLAY
// ============================================================
let _debugVisible = false;
let _debugInterval = null;
let _debugIPressCount = 0;
let _debugILastTime = 0;

function toggleDebugOverlay() {
    const el = document.getElementById('debugOverlay');
    if (!el) return;
    _debugVisible = !_debugVisible;
    if (_debugVisible) {
        el.style.display = 'block';
        if (!_debugInterval) _debugInterval = setInterval(updateDebugOverlay, 200);
        updateDebugOverlay();
    } else {
        el.style.display = 'none';
        if (_debugInterval) { clearInterval(_debugInterval); _debugInterval = null; }
    }
}

function _dbgRow(label, val) {
    return `<div class="debug-row"><span class="debug-label">${label}</span><span class="debug-val">${val}</span></div>`;
}

function updateDebugOverlay() {
    const el = document.getElementById('debugOverlay');
    if (!el || !_debugVisible) return;
    const g = game;
    if (!g) { el.innerHTML = '<h3>DEBUG</h3><div style="color:#aaa">GAME NOT RUNNING</div>'; return; }
    const pd = playerData;
    const shieldSt = g.shieldActive ? `✓ ${Math.ceil(g.shieldTimer/1000)}s` : (g.skillCooldown > 0 ? `CD ${Math.ceil(g.skillCooldown/1000)}s` : 'READY');
    const stimSt = g.stimulantActive ? `✓ ${Math.ceil(g.stimulantTimer/1000)}s` : (g.stimulantCooldown > 0 ? `CD ${Math.ceil(g.stimulantCooldown/1000)}s` : 'READY');
    const typeMap = { 0: 'PATRICK', 1: 'MINI DRAGON', 2: 'PATRICK', 3: 'FIRE DRAGON' };
    let html = `<h3>📊 DEBUG PANEL</h3>`;
    html += `<div class="debug-section"><h3>👤 PLAYER</h3>`;
    html += _dbgRow('TROOPS', `${g.squadCount}${g.stimulantActive ? ' (x2 active)' : ''}`);
    html += _dbgRow('LVL / EXP', `Lv.${g.level} | ${g.exp}`);
    html += _dbgRow('SCORE / WAVE', `${g.score} / Wave ${g.wave}`);
    html += _dbgRow('WEAPON', g.weapon || 'pistol');
    html += _dbgRow('SHIELD', shieldSt);
    html += _dbgRow('STIMULANT', stimSt);
    html += _dbgRow('COINS / GEMS', `${pd.coins} / ${pd.gems || 0}`);
    html += _dbgRow('COMBO', `${g.comboCount}x (best ${g.bestCombo}x)`);
    html += `</div>`;
    const enemies = (g.enemies || []).filter(e => e.alive);
    const bosses = enemies.filter(e => e.isBoss);
    const normals = enemies.filter(e => !e.isBoss);
    if (bosses.length > 0) {
        html += `<div class="debug-section"><h3>💀 BOSS (${bosses.length})</h3>`;
        bosses.forEach(b => {
            const btype = b.isMegaBoss ? 'MEGA BOSS' : 'BOSS DRAGON';
            html += `<div class="debug-enemy">${btype} | HP: ${Math.ceil(b.hp)}/${Math.ceil(b.maxHp)} | DMG: ${b.damage}</div>`;
        });
        html += `</div>`;
    }
    html += `<div class="debug-section"><h3>👾 ENEMIES (${normals.length})</h3>`;
    const sorted = [...normals].sort((a, b) => a.z - b.z);
    sorted.slice(0, 8).forEach(e => {
        const dist = Math.round(e.z - g.cameraZ);
        html += `<div class="debug-enemy">${typeMap[e.type] || 'UNKNOWN'} | HP ${Math.ceil(e.hp)}/${Math.ceil(e.maxHp)} | DMG ${e.damage} | DIST ${dist}</div>`;
    });
    if (normals.length > 8) html += `<div style="color:#555">... ${normals.length - 8} more</div>`;
    html += `</div>`;
    el.innerHTML = html;
}

// ============================================================
// p5.js LIFECYCLE
// ============================================================

// Images loaded in preload (p5.Image objects; .canvas gives the backing HTMLCanvasElement)
let _p5PatrickImg, _p5XiaoNaiLongImg, _p5BossImg, _p5FireEnemyImg;
let _p5CapybaraImg, _p5PigEngineerImg, _p5CowGunImg, _p5CowCryImg, _p5ElephantImg;

function preload() {
    _p5PatrickImg      = loadImage('assets/patrick.png');
    _p5XiaoNaiLongImg  = loadImage('assets/small_dragon.png');
    _p5BossImg         = loadImage('assets/boss_dragon.png');
    _p5FireEnemyImg    = loadImage('assets/fire_enemy.png');
    _p5CapybaraImg     = loadImage('assets/capybara.png');
    _p5PigEngineerImg  = loadImage('assets/pig_engineer.png');
    _p5CowGunImg       = loadImage('assets/cow_gun.png');
    _p5CowCryImg       = loadImage('assets/cow_cry.png');
    _p5ElephantImg     = loadImage('assets/elephant.png');
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    noSmooth();
    frameRate(60);

    screenW = width;
    screenH = height;

    // Use DOM img elements declared in index.html (#spritePreloads).
    // These are plain HTMLImageElements, guaranteed compatible with ctx.drawImage().
    rawPatrickImg      = document.getElementById('spritePatrick');
    rawXiaoNaiLongImg  = document.getElementById('spriteSmallDragon');
    rawBossImg         = document.getElementById('spriteBoss');
    rawCapybaraImg     = document.getElementById('spriteCapybara');
    rawPigEngineerImg  = document.getElementById('spritePigEngineer');
    rawCowGunImg       = document.getElementById('spriteCowGun');
    rawCowCryImg       = document.getElementById('spriteCowCry');
    rawElephantImg     = document.getElementById('spriteElephant');

    // Build sprite frame arrays — p5.js format: { img, sx, sy, sw, sh }
    _buildSpriteFrames();

    // Init audio
    initAudio();

    // Setup input
    setupInput();

    // Setup shop buttons
    document.getElementById('shopBtn') && document.getElementById('shopBtn').addEventListener('click', openShop);
    document.getElementById('shopBackBtn') && document.getElementById('shopBackBtn').addEventListener('click', closeShop);

    // Start button
    const startBtnEl = document.getElementById('startBtn');
    if (startBtnEl) startBtnEl.addEventListener('click', showLevelSelect);

    // Update coin/gem display on menu
    const coinCountEl = document.getElementById('coinCount');
    if (coinCountEl) coinCountEl.textContent = playerData.coins;
    const gemCountEl = document.getElementById('gemCount');
    if (gemCountEl) gemCountEl.textContent = playerData.gems || 0;
}

function _buildSpriteFrames() {
    // Patrick: 6 cols × 4 rows grid, last row has 5 frames
    for (let r = 0; r < PATRICK_ROWS; r++) {
        const colsInRow = r === PATRICK_ROWS - 1 ? 5 : PATRICK_COLS;
        for (let c = 0; c < colsInRow; c++) {
            normalMonsterFrames.push({
                img: _p5PatrickImg,
                sx: c * PATRICK_FRAME_W, sy: r * PATRICK_FRAME_H,
                sw: PATRICK_FRAME_W, sh: PATRICK_FRAME_H,
            });
        }
    }
    // Small dragon: horizontal strip
    for (let i = 0; i < XIAO_NAI_LONG_FRAME_COUNT; i++) {
        xiaoNaiLongFrames.push({ img: _p5XiaoNaiLongImg, sx: i * XIAO_NAI_LONG_FRAME_SIZE, sy: 0, sw: XIAO_NAI_LONG_FRAME_SIZE, sh: XIAO_NAI_LONG_FRAME_SIZE });
    }
    // Boss dragon
    for (let i = 0; i < MONSTER_FRAME_COUNT; i++) {
        bossFrames.push({ img: _p5BossImg, sx: i * MONSTER_FRAME_SIZE, sy: 0, sw: MONSTER_FRAME_SIZE, sh: MONSTER_FRAME_SIZE });
    }
    // Fire dragon
    for (let i = 0; i < FIRE_ENEMY_FRAME_COUNT; i++) {
        fireEnemyFrames.push({ img: _p5FireEnemyImg, sx: i * FIRE_ENEMY_FRAME_SIZE, sy: 0, sw: FIRE_ENEMY_FRAME_SIZE, sh: FIRE_ENEMY_FRAME_SIZE });
    }
    // L2 Capybara
    for (let i = 0; i < CAPYBARA_FRAME_COUNT; i++) {
        capybaraFrames.push({ img: _p5CapybaraImg, sx: i * CAPYBARA_FRAME_SIZE, sy: 0, sw: CAPYBARA_FRAME_SIZE, sh: CAPYBARA_FRAME_SIZE });
    }
    // L2 pig_engineer
    for (let i = 0; i < PIG_ENGINEER_FRAME_COUNT; i++) {
        pigEngineerFrames.push({ img: _p5PigEngineerImg, sx: i * PIG_ENGINEER_FRAME_SIZE, sy: 0, sw: PIG_ENGINEER_FRAME_SIZE, sh: PIG_ENGINEER_FRAME_SIZE });
    }
    // L2 cow_gun
    for (let i = 0; i < COW_GUN_FRAME_COUNT; i++) {
        cowGunFrames.push({ img: _p5CowGunImg, sx: i * COW_GUN_FRAME_SIZE, sy: 0, sw: COW_GUN_FRAME_SIZE, sh: COW_GUN_FRAME_SIZE });
    }
    // L2 cow_cry
    for (let i = 0; i < COW_CRY_FRAME_COUNT; i++) {
        cowCryFrames.push({ img: _p5CowCryImg, sx: i * COW_CRY_FRAME_SIZE, sy: 0, sw: COW_CRY_FRAME_SIZE, sh: COW_CRY_FRAME_SIZE });
    }
    // L2 elephant
    for (let i = 0; i < ELEPHANT_FRAME_COUNT; i++) {
        elephantFrames.push({ img: _p5ElephantImg, sx: i * ELEPHANT_FRAME_SIZE, sy: 0, sw: ELEPHANT_FRAME_SIZE, sh: ELEPHANT_FRAME_SIZE });
    }
    monsterSpritesLoaded = true;
    console.log('Sprites loaded: Patrick', normalMonsterFrames.length, 'XiaoNaiLong', xiaoNaiLongFrames.length, 'Boss', bossFrames.length);
}

function draw() {
    screenW = width;
    screenH = height;

    if (game && (game.state === 'playing' || game.state === 'paused' || game.state === 'revive')) {
        update(deltaTime);
    }
    render();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    screenW = width;
    screenH = height;
    // Invalidate sky buffer
    _skyBgW = 0; _skyBgH = 0; _skyBgLevel = 0;
}
