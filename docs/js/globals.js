// ============================================================
// GLOBAL VARIABLES (shared across all modules) — p5.js version
// ============================================================

// Screen dimensions (updated each frame from p5 width/height)
let screenW = 0, screenH = 0;

// Sky background cache (p5.Graphics object)
let skyBuffer = null;
let _skyBgW = 0, _skyBgH = 0, _skyBgLevel = 0;

// Sprite frames — p5.js format: { img, sx, sy, sw, sh }
let normalMonsterFrames = [];
let xiaoNaiLongFrames = [];
let bossFrames = [];
let fireEnemyFrames = [];
// L2 enemy sprites
let capybaraFrames = [];
let pigEngineerFrames = [];
let cowGunFrames = [];
let cowCryFrames = [];
let elephantFrames = [];
let monsterSpritesLoaded = false;

// Raw p5.Image objects (loaded via loadImage in preload)
let rawPatrickImg = null;
let rawXiaoNaiLongImg = null;
let rawBossImg = null;
let rawCapybaraImg = null;
let rawPigEngineerImg = null;
let rawCowGunImg = null;
let rawCowCryImg = null;
let rawElephantImg = null;

// Audio
let audioCtx;

// Game state
let game = null;

// Input
const keys = {};

// DOM references
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

// ============================================================
// PERSISTENT DATA (localStorage)
// ============================================================

const DATA_VERSION = 'v3';
(function checkDataVersion() {
    const stored = localStorage.getItem('bridgeAssault_dataVersion');
    if (stored !== DATA_VERSION) {
        // Preserve existing player progress across schema bumps. Field-level
        // migrations below fill missing values without deleting the whole save.
        localStorage.setItem('bridgeAssault_dataVersion', DATA_VERSION);
    }
})();

function resetBridgeAssaultSave() {
    Object.keys(localStorage)
        .filter(k => k.startsWith('bridgeAssault_'))
        .forEach(k => localStorage.removeItem(k));
    localStorage.setItem('bridgeAssault_dataVersion', DATA_VERSION);
}

window.resetBridgeAssaultSave = resetBridgeAssaultSave;

function loadPlayerData() {
    try {
        const data = _signedLoad('bridgeAssault_playerData');
        if (data) return data;
    } catch {}
    return { coins: 0, gems: 0, weaponCharges: {}, weaponLevels: {}, talents: { damage: 0, squad: 0, fireRate: 0, aoe: 0 }, armor: 0, level: 1, exp: 0 };
}

function savePlayerData(data) {
    _signedSave('bridgeAssault_playerData', data);
}

let _playerDataDirty = false;
let _playerDataSaveTimer = 0;
const PLAYER_DATA_SAVE_INTERVAL = 180;

function markPlayerDataDirty() {
    _playerDataDirty = true;
}

function flushPlayerDataSave(force) {
    if (!_playerDataDirty) return;
    _playerDataSaveTimer++;
    if (force || _playerDataSaveTimer >= PLAYER_DATA_SAVE_INTERVAL) {
        savePlayerData(playerData);
        _playerDataDirty = false;
        _playerDataSaveTimer = 0;
    }
}

let playerData = loadPlayerData();
// Migrate old saves
if (playerData.gems === undefined) playerData.gems = 0;
if (!playerData.talents) playerData.talents = { damage: 0, squad: 0, fireRate: 0, aoe: 0 };
if (playerData.armor === undefined) playerData.armor = 0;
if (!playerData.weaponCharges) {
    playerData.weaponCharges = {};
    if (playerData.ownedWeapons && playerData.ownedWeapons.length > 0) {
        for (const wk of playerData.ownedWeapons) { playerData.weaponCharges[wk] = 3; }
    }
    delete playerData.ownedWeapons;
}
if (!playerData.weaponLevels) {
    playerData.weaponLevels = {};
    const oldCharges = playerData.weaponCharges || {};
    for (const wk of ['shotgun', 'laser', 'rocket']) {
        if ((oldCharges[wk] || 0) > 0) playerData.weaponLevels[wk] = 1;
        delete playerData.weaponCharges[wk];
    }
}
if (playerData.level === undefined) playerData.level = 1;
if (playerData.exp === undefined) playerData.exp = 0;
if (playerData.equippedPistolTier === undefined) playerData.equippedPistolTier = 0;
if (!playerData.ownedPistolTiers) playerData.ownedPistolTiers = [0];
if (!playerData.unlockedLevels) playerData.unlockedLevels = [1];
if (playerData.l2HighScore === undefined) playerData.l2HighScore = { score: 0, wave: 0 };
if (!playerData.stats) playerData.stats = {};
if (!playerData.achievements) playerData.achievements = {};
if (!playerData.achievementsClaimed) playerData.achievementsClaimed = {};
savePlayerData(playerData);

const assetLoadErrors = [];

function recordAssetLoadError(label, path) {
    assetLoadErrors.push({ label, path });
    console.warn(`Asset failed to load: ${label} (${path})`);
}

function showAssetErrorOverlay() {
    if (!assetLoadErrors.length) return;
    const el = document.getElementById('assetError');
    const listEl = document.getElementById('assetErrorList');
    if (!el || !listEl) return;
    listEl.innerHTML = assetLoadErrors
        .map(err => `<li>${err.label}: <code>${err.path}</code></li>`)
        .join('');
    el.classList.remove('hidden');
}

function getMaxWavesForLevel(level) {
    return Number(level) === 2 ? MAX_WAVES_LEVEL2 : MAX_WAVES_LEVEL1;
}

function isFinalWave(g) {
    return !!g && g.wave >= getMaxWavesForLevel(g.currentLevel);
}

function hasAliveBoss(g) {
    return !!g && g.enemies.some(e => e.alive && e.isBoss);
}

function shouldCompleteLevel(g) {
    return !!g && !g.levelCompleted && g.finalWaveSpawned && isFinalWave(g) && !hasAliveBoss(g);
}

function collectRemainingRunCurrency(g) {
    if (!g) return;
    g.coins.forEach(coin => {
        if (coin.collected) return;
        coin.collected = true;
        g.coinsCollected += coin.value;
        playerData.coins += coin.value;
        addStat('totalCoinsEarned', coin.value);
    });
    g.gems.forEach(gem => {
        if (gem.collected) return;
        gem.collected = true;
        g.gemsCollected += gem.value;
        playerData.gems = (playerData.gems || 0) + gem.value;
        addStat('totalGemsEarned', gem.value);
    });
    markPlayerDataDirty();
    flushPlayerDataSave(true);
}

function completeLevelOnce(g) {
    if (!shouldCompleteLevel(g)) return false;
    g.levelCompleted = true;
    collectRemainingRunCurrency(g);
    triggerLevelComplete();
    return true;
}
