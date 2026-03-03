// ============================================================
// CORE FUNCTIONS — game creation, projection, helpers
// ============================================================

function createGame() {
    return {
        state: 'playing',
        cameraZ: 0,
        score: 0,
        wave: 1,
        squadCount: 3,
        weapon: 'pistol',
        weaponTimer: 0,
        player: { x: 0, animFrame: 0, animTimer: 0, muzzleFlash: 0 },
        enemies: [],
        bullets: [],
        gates: [],
        barrels: [],
        particles: [],
        explosions: [],
        deadBodies: [],
        shootTimer: 0,
        nextWaveZ: CONFIG.SPAWN_DISTANCE,
        nextGateZ: CONFIG.SPAWN_DISTANCE + 150,
        shakeX: 0, shakeY: 0, shakeTimer: 0,
        inputX: null,
        roadSegments: generateRoadDecor(),
        clouds: generateClouds(),
        damageNumbers: [],
        scorePopups: [],
        comboCount: 0,
        comboTimer: 0,
        bestCombo: 0,
        killCount: 0,
        waveBanner: null,
        vignetteFlash: 0,
        screenFlash: 0,
        gateFlash: null,
        gateText: null,
        gateShatterPieces: [],
        gateCollapsePanels: [],
        speedLines: [],
        slowMo: 0,
        slowMoFactor: 1,
        barrelExplosionTexts: [],
        enemyBullets: [],
        peakSquad: 3,
        coins: [],
        coinsCollected: 0,
        gems: [],
        gemsCollected: 0,
        megaBossWarningShown: false,
        preBossSquad: 0,
        midShopOpen: false,
        midShopTimer: 0,
        midShopBought: [],
        midShopCount: 0,
        midShopRecovered: 0,
        midShopBossLoss: 0,
        skillWeapon: null,
        skillCooldown: 0,
        skillReady: true,
        slamWarnings: [],
        reviveCount: 0,
        shieldActive: false,
        shieldTimer: 0,
        stimulantActive: false,
        stimulantTimer: 0,
        stimulantCooldown: 0,
        level: playerData.level || 1,
        exp: playerData.exp || 0,
        currentLevel: 1,
        levelCompleted: false,
        fireRateDebuff: 0,
    };
}

// ============================================================
// LEVEL HELPERS
// ============================================================
function getLevelDamageMult() {
    if (!game) return 1;
    const lvl = Math.min(game.level, LEVEL_CONFIG.maxLevel);
    return LEVEL_CONFIG.bonuses[lvl - 1].damageMult;
}

function getLevelFireRateMult() {
    if (!game) return 1;
    const lvl = Math.min(game.level, LEVEL_CONFIG.maxLevel);
    return LEVEL_CONFIG.bonuses[lvl - 1].fireRateMult;
}

function getLevelSquadBonus() {
    const lvl = Math.min(playerData.level || 1, LEVEL_CONFIG.maxLevel);
    return LEVEL_CONFIG.bonuses[lvl - 1].squadBonus;
}

function generateRoadDecor() {
    const decor = [];
    for (let i = 0; i < 200; i++) {
        decor.push({
            z: i * 40, type: Math.random() > 0.7 ? 'crack' : 'stain',
            x: (Math.random() - 0.5) * CONFIG.ROAD_HALF_WIDTH * 1.5,
            size: 4 + Math.random() * 8,
        });
    }
    return decor;
}

function generateClouds() {
    const clouds = [];
    for (let i = 0; i < CONFIG.CLOUD_COUNT; i++) {
        clouds.push({
            x: Math.random(), y: 0.02 + Math.random() * 0.12,
            speed: 0.03 + Math.random() * 0.08,
            width: 60 + Math.random() * 120, height: 15 + Math.random() * 25,
            opacity: 0.12 + Math.random() * 0.2,
            blocks: Array.from({length: 3 + Math.floor(Math.random() * 4)}, () => ({
                dx: (Math.random() - 0.5) * 0.6, dy: (Math.random() - 0.5) * 0.4,
                w: 0.5 + Math.random() * 0.8, h: 0.6 + Math.random() * 0.5,
            })),
        });
    }
    return clouds;
}

// ============================================================
// 3D PROJECTION
// ============================================================

const _proj = { viewDist: 200, horizonY: 0, groundY: 0, xScale: 1, sizeRef: 1, halfW: 0, isMobile: false };

function updateProjectionCache() {
    const aspect = screenW / screenH;
    _proj.isMobile = aspect < 1;
    _proj.viewDist = CONFIG.VIEW_DIST;
    _proj.horizonY = screenH * CONFIG.HORIZON_RATIO;
    _proj.groundY = screenH * 0.97;
    _proj.xScale = screenW / (CONFIG.ROAD_HALF_WIDTH * 2.5);
    _proj.sizeRef = 1.0;
    _proj.halfW = screenW / 2;
}

function getHorizonRatio() {
    const aspect = screenW / screenH;
    return aspect < 1 ? CONFIG.HORIZON_RATIO + 0.06 : CONFIG.HORIZON_RATIO;
}

function project(worldX, relZ) {
    const c = _proj;
    const scale = c.viewDist / (c.viewDist + Math.max(relZ, 0.1));
    return {
        x: c.halfW + worldX * scale * c.xScale,
        y: c.horizonY + (c.groundY - c.horizonY) * scale,
        scale: scale * c.sizeRef,
    };
}

// ============================================================
// ADAPTIVE DIFFICULTY
// ============================================================

function getAdaptiveFactor() {
    const g = game;
    const expected = 5 + g.wave * 1.8;
    const effective = Math.max(g.squadCount, g.peakSquad * 0.6);
    const ratio = effective / Math.max(1, expected);
    const factor = Math.pow(Math.max(0.25, ratio), 0.55);
    return Math.max(0.5, Math.min(2.5, factor));
}

// ============================================================
// COLOR HELPERS
// ============================================================

function lerpColor(c1, c2, t) {
    const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
    const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return (r << 16) | (g << 8) | b;
}
