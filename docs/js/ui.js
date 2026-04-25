// ============================================================
// UI — pause, level select, game lifecycle, skills, weapon slots,
//       high score, revive, game over, debug overlay
// ============================================================

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
    if (game && game.isTutorial) {
        restoreTutorialWeaponCharges();
        startGame(0);
        return;
    }
    startGameWithLevel(game ? (game.currentLevel || 1) : 1);
}

function menuFromPause() {
    hidePauseMenu();
    stopBGM();
    if (game) {
        if (game.isTutorial) restoreTutorialWeaponCharges();
        playerData.level = game.level;
        playerData.exp = game.exp;
        flushPlayerDataSave(true);
        savePlayerData(playerData);
        if (!game.isTutorial) {
            saveHighScore(game.score, game.wave);
            syncHighScore();
        }
    }
    const slotsDiv = document.getElementById('weaponSlots');
    if (slotsDiv) slotsDiv.style.display = 'none';
    game = null;
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
    if (rawTutorialImpImg) {
        const f = Math.floor(_lsAnimT * 0.1) % TUTORIAL_IMP_FRAME_COUNT;
        _drawLsSprite('lsCanvas0', rawTutorialImpImg,
            TUTORIAL_IMP_FRAME_SIZE, TUTORIAL_IMP_FRAME_SIZE,
            f, TUTORIAL_IMP_FRAME_COUNT, 0.9, false);
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
    const l1Info = document.getElementById('l1InfoText');
    const card1  = document.getElementById('levelCard1');
    const l1Btn  = document.querySelector('#levelCard1 .level-start-btn');
    const tutorialDone = !!playerData.hasSeenTutorial;
    if (card1) {
        if (tutorialDone) card1.classList.remove('locked');
        else              card1.classList.add('locked');
    }
    if (l1Btn) l1Btn.disabled = !tutorialDone;
    if (l1Info) {
        if (!tutorialDone) {
            l1Info.textContent = T('levelselect.l1.locked');
        } else {
            const waveStr  = hs.wave  > 0 ? hs.wave  : '\u2014';
            const scoreStr = hs.score > 0 ? hs.score : '\u2014';
            l1Info.textContent = T('levelselect.bestinfo', waveStr, scoreStr);
        }
    }

    const card2 = document.getElementById('levelCard2');
    const l2Info = document.getElementById('l2InfoText');
    const l2Btn = document.getElementById('l2StartBtn');
    if (card2) {
        if (isL2Unlocked) {
            card2.classList.remove('locked');
            const l2Hs = playerData.l2HighScore || { score: 0, wave: 0 };
            if (l2Info) {
                const waveStr  = l2Hs.wave  > 0 ? l2Hs.wave  : '\u2014';
                const scoreStr = l2Hs.score > 0 ? l2Hs.score : '\u2014';
                l2Info.textContent = T('levelselect.bestinfo', waveStr, scoreStr);
            }
            if (l2Btn) l2Btn.disabled = false;
        } else {
            card2.classList.add('locked');
            if (l2Info) l2Info.textContent = T('levelselect.l2.locked');
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
    stopBGM();
    const g = game;
    g.levelCompleted = true;
    updateEndOfGameStats();
    if (!playerData.unlockedLevels) playerData.unlockedLevels = [1];
    if (!playerData.unlockedLevels.includes(2)) {
        playerData.unlockedLevels.push(2);
        savePlayerData(playerData);
    }
    const isL2Clear = g.currentLevel === 2;
    const maxWaves = isL2Clear ? MAX_WAVES_LEVEL2 : MAX_WAVES_LEVEL1;
    const levelTag = isL2Clear ? 'LEVEL II' : 'LEVEL I';
    const unlockLine = isL2Clear ? '' : `<div style="color:#cc44ff;font-size:min(20px,4vw);margin-bottom:24px;text-shadow:0 0 15px rgba(200,68,255,0.6);">\uD83D\uDD13 ${T('levelcomplete.unlocked')}</div>`;
    const nextBtn = isL2Clear ? '' : `<button class="btn" style="background:linear-gradient(180deg,#f0b828,#c87800);border-color:#f0c840;" onclick="startGameWithLevel(2)">\u25B6 ${T('levelcomplete.next')}</button>`;
    overlay.classList.remove('hidden');
    overlay.innerHTML = `
        <h1 style="color:#44ff88;text-shadow:0 0 30px rgba(68,255,136,0.7);">\uD83C\uDFC6 ${T('levelcomplete.title')}</h1>
        <div style="color:#f0c040;font-size:min(32px,6vw);margin:16px 0;letter-spacing:3px;">${levelTag} ${T('levelcomplete.clear')}</div>
        <div style="color:#aaa;font-size:min(20px,4vw);margin-bottom:12px;">${T('levelcomplete.waves', g.wave - 1, maxWaves)}</div>
        <div style="color:#88ccff;font-size:min(22px,4.5vw);margin-bottom:6px;">${T('levelcomplete.score', g.score)}</div>
        ${unlockLine}
        <div id="menuButtons">
            ${nextBtn}
            <button class="btn" style="background:linear-gradient(180deg,#44cc44,#228822);border-color:#55ee55;" onclick="showLevelSelect()">${T('levelcomplete.selectlevel')}</button>
            <button class="btn" onclick="restoreMainMenu()">${T('levelcomplete.mainmenu')}</button>
        </div>
    `;
    saveHighScore(g.score, g.wave - 1);
    syncHighScore();
    const slotsDiv = document.getElementById('weaponSlots');
    if (slotsDiv) slotsDiv.style.display = 'none';
    game = null;
}

// ============================================================
// GAME START
// ============================================================
function startGame(level) {
    initAudio();
    game = createGame();
    const isTutorial = (level === 0);
    // Tutorial reuses L1 visuals (Patrick, bridge). currentLevel=1 keeps
    // sprites/BGM aligned with existing assets — no new art required.
    game.currentLevel = isTutorial ? 1 : (level || _selectedLevel || 1);
    if (isTutorial) {
        setupTutorialRun(game);
    } else {
        game.squadCount = 5 + getTalentSquadBonus() + getLevelSquadBonus();
        game.peakSquad = game.squadCount;
    }
    const invCharges = (playerData.weaponCharges || {})['invincibility'] || 0;
    game.skillReady = invCharges > 0;
    game.skillCooldown = 0;
    spawnEnemyWave();
    overlay.classList.add('hidden');
    const skillBtn = document.getElementById('skillBtn');
    if (skillBtn) skillBtn.style.display = 'none';
    const slotsDiv = document.getElementById('weaponSlots');
    if (slotsDiv) slotsDiv.style.display = 'none';
    _skyBgW = 0; _skyBgH = 0; _skyBgLevel = 0;
    resetAchTempFlags();
    // Start BGM matching current level (tutorial uses L1 track)
    playBGM(game.currentLevel);
}

function startTutorial() {
    const lsOverlay = document.getElementById('levelSelectOverlay');
    if (lsOverlay) lsOverlay.classList.add('hidden');
    startGame(0);
}

// ============================================================
// SKILLS
// ============================================================
function activateInvincibility() {
    const g = game;
    if (!g || g.state !== 'playing') return;
    if (g.skillCooldown > 0) return;
    const charges = (playerData.weaponCharges || {})['invincibility'] || 0;
    if (charges <= 0) return;
    const shopW = SHOP_WEAPONS['invincibility'];
    playerData.weaponCharges['invincibility'] = charges - 1;
    if (!g.isTutorial) savePlayerData(playerData);
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
    if (!g.isTutorial) savePlayerData(playerData);
    g.stimulantActive = true;
    g.stimulantTimer = shopW.duration * 1000;
    g.stimulantCooldown = 0;
    playSound('weapon_pickup');
    g.screenFlash = 0.35;
    g.shakeTimer = Math.max(g.shakeTimer, 5);
    addParticles(g.player.x, g.cameraZ + 10, 18, shopW.colorHex, 4, 22);
    g.gateText = { text: '\uD83D\uDC9A STIMULANT! TROOPS x2, DMG HALVED', color: 0x44ff88, timer: 0, maxTimer: 80, scale: 0.1 };
}

function activateWeaponByKey(weaponKey) {
    if (weaponKey === 'invincibility') activateInvincibility();
    else if (weaponKey === 'stimulant') activateStimulant();
}

function activateSkillWeapon() {
    activateInvincibility();
}

// ============================================================
// WEAPON SLOTS
// ============================================================
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
            <div class="wslot-count">\u00D70</div>
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
                countEl.textContent = `\u00D7${count}`;
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
                levelEl.textContent = level > 0 ? ('\u2605'.repeat(level) + '\u2606'.repeat(3 - level)) : 'LOCKED';
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

// ============================================================
// HIGH SCORE
// ============================================================
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

// ============================================================
// REVIVE SYSTEM
// ============================================================
function handlePlayerDeath() {
    const g = game;
    // Tutorial: skip the revive prompt and just restart from step 1.
    if (g.isTutorial) {
        g.state = 'gameover';
        showGameOver();
        return;
    }
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
    addStat('totalRevives', 1);
    g.squadCount = g.peakSquad;
    g.state = 'playing';
    g.shieldActive = true;
    g.shieldTimer = 3000;
    g.screenFlash = 0.6;
    g.shakeTimer = 10;
    addParticles(g.player.x, g.cameraZ + 10, 25, 0xcc44ff, 5, 25);
    addParticles(g.player.x, g.cameraZ + 10, 15, 0xffffff, 4, 15);
    g.gateText = { text: `\uD83D\uDC8E REVIVED! TROOPS ${g.squadCount}`, color: 0xcc44ff, timer: 0, maxTimer: 90, scale: 0.1 };
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

// ============================================================
// GAME OVER
// ============================================================
function showGameOver() {
    // Tutorial: don't treat death as a "game over" — quietly restart the
    // tutorial from wave 1 so the player can keep learning.
    if (game && game.isTutorial) {
        restoreTutorialWeaponCharges();
        const slotsDiv = document.getElementById('weaponSlots');
        if (slotsDiv) slotsDiv.style.display = 'none';
        startGame(0);
        return;
    }
    stopBGM();
    playerData.level = game.level;
    playerData.exp = game.exp;
    savePlayerData(playerData);
    updateEndOfGameStats();
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
    // Restore the pristine menu markup captured at page load in globals.js.
    // This keeps the layout in sync with index.html automatically — no need
    // to maintain a second copy of the menu HTML here that silently drifts
    // out of date whenever the menu is redesigned.
    if (MAIN_MENU_TEMPLATE) {
        overlay.innerHTML = MAIN_MENU_TEMPLATE;
    }

    // Re-apply dynamic state that isn't part of the template:
    //   - current coin/gem counts (template shipped with placeholder 0/0)
    //   - unclaimed-achievement pulse class
    //   - i18n text for current language (template has zh text by default)
    const coinEl = document.getElementById('coinCount');
    if (coinEl) coinEl.textContent = playerData.coins;
    const gemEl = document.getElementById('gemCount');
    if (gemEl) gemEl.textContent = playerData.gems || 0;

    const achBtn = overlay.querySelector('.btn-achievements');
    if (achBtn) achBtn.classList.toggle('has-unclaimed', _hasUnclaimedAch());

    if (typeof applyLang === 'function') applyLang();
}

// ============================================================
// WEAPON UNLOCK TOAST
// ============================================================
function showWeaponUnlockToast(tier) {
    const toast = document.getElementById('weaponUnlockToast');
    if (!toast) return;
    const iconEl = document.getElementById('weaponUnlockIcon');
    const textEl = document.getElementById('weaponUnlockText');
    if (iconEl) iconEl.innerHTML = tier.icon || '';
    if (textEl) textEl.textContent = T('weapon.unlocked', tier.name || T('weapon.newweapon'));
    toast.classList.remove('hidden');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
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
    const shieldSt = g.shieldActive ? `\u2713 ${Math.ceil(g.shieldTimer/1000)}s` : (g.skillCooldown > 0 ? `CD ${Math.ceil(g.skillCooldown/1000)}s` : 'READY');
    const stimSt = g.stimulantActive ? `\u2713 ${Math.ceil(g.stimulantTimer/1000)}s` : (g.stimulantCooldown > 0 ? `CD ${Math.ceil(g.stimulantCooldown/1000)}s` : 'READY');
    const typeMap = { 0: 'PATRICK', 1: 'MINI DRAGON', 2: 'PATRICK', 3: 'FIRE DRAGON' };
    let html = `<h3>\uD83D\uDCCA DEBUG PANEL</h3>`;
    html += `<div class="debug-section"><h3>\uD83D\uDC64 PLAYER</h3>`;
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
        html += `<div class="debug-section"><h3>\uD83D\uDC80 BOSS (${bosses.length})</h3>`;
        bosses.forEach(b => {
            const btype = b.isMegaBoss ? 'MEGA BOSS' : 'BOSS DRAGON';
            html += `<div class="debug-enemy">${btype} | HP: ${Math.ceil(b.hp)}/${Math.ceil(b.maxHp)} | DMG: ${b.damage}</div>`;
        });
        html += `</div>`;
    }
    html += `<div class="debug-section"><h3>\uD83D\uDC7E ENEMIES (${normals.length})</h3>`;
    const sorted = [...normals].sort((a, b) => a.z - b.z);
    sorted.slice(0, 8).forEach(e => {
        const dist = Math.round(e.z - g.cameraZ);
        html += `<div class="debug-enemy">${typeMap[e.type] || 'UNKNOWN'} | HP ${Math.ceil(e.hp)}/${Math.ceil(e.maxHp)} | DMG ${e.damage} | DIST ${dist}</div>`;
    });
    if (normals.length > 8) html += `<div style="color:#555">... ${normals.length - 8} more</div>`;
    html += `</div>`;
    el.innerHTML = html;
}
