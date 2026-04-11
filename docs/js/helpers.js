// ============================================================
// SHARED HELPERS — eliminate duplicated logic across modules
// ============================================================

/**
 * Calculate kill score for an enemy.
 * @param {Object} enemy - enemy object with .isMegaBoss, .isBoss, .isHeavy, .type
 * @param {number} level - current game level (1 or 2)
 * @returns {number} final kill score
 */
function calcKillScore(enemy, level) {
    const base = enemy.isMegaBoss ? 300
               : enemy.isBoss    ? 100
               : (L2_KILL_SCORES[enemy.type] || (enemy.isHeavy ? 25 : 10));
    const multiplier = LEVEL_CONFIGS[level] ? LEVEL_CONFIGS[level].scoreMultiplier : 1;
    return Math.ceil(base * multiplier);
}

/**
 * Calculate and apply troop damage, factoring armor, squad armor, and stimulant.
 * @param {Object} g      - game state
 * @param {number} rawDmg - raw incoming damage
 * @returns {number} actual damage dealt
 */
function applyTroopDamage(g, rawDmg) {
    const squadArmor = Math.floor(g.squadCount / 15);
    const baseDmg = Math.max(1, rawDmg - (playerData.armor || 0) - squadArmor);
    const dmg = g.stimulantActive ? Math.ceil(baseDmg / 2) : baseDmg;
    g.squadCount = Math.max(0, g.squadCount - dmg);
    return dmg;
}

/**
 * Handle boss loot, exp, and state cleanup when a boss dies.
 * @param {Object} g     - game state
 * @param {Object} enemy - the boss enemy that died
 */
function handleBossDeath(g, enemy) {
    spawnBossCoins(enemy.x, enemy.z);
    if (enemy.isMegaBoss) spawnBossCoins(enemy.x, enemy.z); // mega boss double coins
    spawnBossGems(enemy.x, enemy.z);
    awardBossExp(enemy.isMegaBoss, enemy.x, enemy.z);
    const otherBossAlive = g.enemies.some(o => o !== enemy && o.alive && o.isBoss);
    if (!otherBossAlive) {
        g.enemyBullets = [];
        if (enemy.isMegaBoss) g.midShopTimer = 90;
        // Track boss wave with zero troop loss
        if (g.preBossSquad && g.squadCount >= g.preBossSquad) {
            addStat('bossZeroLossWaves', 1);
        }
    }
}

/**
 * Process an enemy kill: score, combo, explosion, death effects, boss cleanup.
 * @param {Object} g      - game state
 * @param {Object} enemy  - the enemy that died
 * @param {Object} [opts] - { skipSound: bool } for context-specific behavior
 */
function processEnemyKill(g, enemy, opts) {
    opts = opts || {};
    const killScore = calcKillScore(enemy, g.currentLevel);
    enemy.alive = false;
    g.score += killScore;
    g.killCount++;
    g.comboCount++;
    g.comboTimer = CONFIG.COMBO_TIMEOUT;
    if (g.comboCount > g.bestCombo) g.bestCombo = g.comboCount;
    // Achievement stat tracking
    addStat('totalKills', 1);
    setStat('bestComboEver', g.comboCount);
    addExplosion(enemy.x, enemy.z);
    g.deadBodies.push({ x: enemy.x, z: enemy.z, timer: 300 });

    if (!opts.skipSound) playSound('explosion');

    const ep = project(enemy.x, enemy.z - g.cameraZ);

    if (enemy.isMegaBoss) {
        // Mega boss death cascade
        for (let mi = 0; mi < 5; mi++) {
            addExplosion(enemy.x + (Math.random() - 0.5) * 60, enemy.z + (Math.random() - 0.5) * 60);
        }
        addParticles(enemy.x, enemy.z, 60, 0xff4400, 8, 45);
        addParticles(enemy.x, enemy.z, 30, 0xffaa00, 6, 35);
        addParticles(enemy.x, enemy.z, 20, 0xffffff, 5, 25);
        g.shakeTimer = 35; g.screenFlash = 0.9;
        g.slowMo = 400;
        const label = enemy.isElephantBoss ? '🐘 ELEPHANT KING' : '🔥 MEGA BOSS';
        addScorePopup(`${label} +${killScore}!`, ep.x, ep.y - 40, 0xff4400);
        addStat('totalBossKills', 1);
        addStat('totalMegaBossKills', 1);
        if (enemy.spawnTime && (Date.now() - enemy.spawnTime) < 5000) _achTempFlags.speedKill = true;
        handleBossDeath(g, enemy);
    } else if (enemy.isBoss) {
        addExplosion(enemy.x + 20, enemy.z + 15);
        addExplosion(enemy.x - 20, enemy.z - 15);
        addParticles(enemy.x, enemy.z, 40, 0xcc66ff, 6, 35);
        addParticles(enemy.x, enemy.z, 20, 0xffffff, 4, 25);
        g.shakeTimer = 25; g.screenFlash = 0.6;
        const label = enemy.isCowCryBoss ? '🎵 CRY COW' : 'BOSS DRAGON';
        const labelColor = enemy.isCowCryBoss ? 0xff9944 : 0xcc66ff;
        addScorePopup(`${label} +${killScore}!`, ep.x, ep.y - 30, labelColor);
        addStat('totalBossKills', 1);
        if (enemy.spawnTime && (Date.now() - enemy.spawnTime) < 5000) _achTempFlags.speedKill = true;
        handleBossDeath(g, enemy);
    } else {
        g.shakeTimer = 5;
        addScorePopup(`+${killScore}`, ep.x, ep.y - 20, enemy.isHeavy ? 0xff8800 : 0xffcc00);
        awardKillXP(g, enemy.isHeavy);
        // L2 Pig Hero: splits into 2 minis on death
        if (enemy.type === L2_TYPE_PIG_HERO && !enemy.isMini) {
            spawnMiniEnemies(enemy, 2);
        }
    }
}

/**
 * Emit radial speed lines from a center point.
 * @param {Object} g     - game state
 * @param {number} cx    - center X screen coordinate
 * @param {number} cy    - center Y screen coordinate
 * @param {number} count - number of lines
 * @param {number} color - hex color
 * @param {Object} [opts] - { spdBase, spdVar, lifeBase, lifeVar, lenBase, lenVar }
 */
function emitSpeedLines(g, cx, cy, count, color, opts) {
    const o = opts || {};
    const spdBase = o.spdBase || 5, spdVar = o.spdVar || 5;
    const lifeBase = o.lifeBase || 8, lifeVar = o.lifeVar || 6;
    const lenBase = o.lenBase || 15, lenVar = o.lenVar || 20;
    for (let s = 0; s < count; s++) {
        const a = (s / count) * Math.PI * 2;
        g.speedLines.push({
            x: cx, y: cy,
            vx: Math.cos(a) * (spdBase + Math.random() * spdVar),
            vy: Math.sin(a) * (spdBase + Math.random() * spdVar),
            life: lifeBase + Math.random() * lifeVar,
            maxLife: lifeBase + lifeVar,
            length: lenBase + Math.random() * lenVar,
            color: color,
        });
    }
}

/**
 * Emit shatter pieces flying outward from a center point.
 * @param {Object} g      - game state
 * @param {number} cx     - center X screen coordinate
 * @param {number} cy     - center Y screen coordinate
 * @param {number} count  - number of pieces
 * @param {number} color  - hex color
 * @param {Object} [opts] - { radius, spdBase, spdVar, sizeBase, sizeVar, lifeBase, lifeVar }
 */
function emitShatterPieces(g, cx, cy, count, color, opts) {
    const o = opts || {};
    const radius = o.radius || 200;
    const spdBase = o.spdBase || 3, spdVar = o.spdVar || 5;
    const sizeBase = o.sizeBase || 2, sizeVar = o.sizeVar || 4;
    const lifeBase = o.lifeBase || 20, lifeVar = o.lifeVar || 15;
    const maxLife = o.maxLife || 35;
    const spreadX = o.spreadX || 40, spreadY = o.spreadY || 30;
    for (let f = 0; f < count; f++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = spdBase + Math.random() * spdVar;
        g.gateShatterPieces.push({
            x: cx + (Math.random() - 0.5) * spreadX,
            y: cy + (Math.random() - 0.5) * spreadY,
            targetX: cx + Math.cos(angle) * radius,
            targetY: cy + Math.sin(angle) * radius,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            size: sizeBase + Math.random() * sizeVar,
            color: color,
            life: lifeBase + Math.random() * lifeVar,
            maxLife: maxLife,
        });
    }
}

/**
 * Create troop loss visual effects (floating text, shatter, speed lines, screen effects).
 * @param {Object} g     - game state
 * @param {number} dmg   - damage dealt
 * @param {number} color - hex color for effects
 * @param {Object} [opts] - { text, shatterCount, lineCount, shakeMax, vignetteBase, flashTimer }
 */
function emitTroopLossEffects(g, dmg, color, opts) {
    const o = opts || {};
    const pp = project(g.player.x, 0);
    const text = o.text || `\u2212${dmg} TROOPS`;

    // Floating text
    g.gateText = { text: text, color: color, timer: 0, maxTimer: o.textMaxTimer || 70, scale: 0.1 };
    g.gateFlash = { color: color, timer: o.flashTimer || 15, maxTimer: o.flashTimer || 15 };

    // Shatter pieces
    const shatterCount = (o.shatterCount || 15) + dmg * (o.shatterPerDmg || 5);
    emitShatterPieces(g, pp.x, pp.y, shatterCount, color);

    // Speed lines
    emitSpeedLines(g, pp.x, pp.y, o.lineCount || 16, color, {
        spdBase: 6, spdVar: 6, lifeBase: 10, lifeVar: 8, lenBase: 20, lenVar: 25,
    });

    // Screen effects
    addParticles(g.player.x, g.cameraZ + 10, 8 + dmg * 2, 0xff0000, 2.5, 18);
    g.shakeTimer = Math.min(o.shakeMax || 20, (o.shakeBase || 8) + dmg * 3);
    g.vignetteFlash = Math.min(1.5, (o.vignetteBase || 0.8) + dmg * 0.15);
    g.slowMo = o.slowMo || 150;
    playSound('explosion');
}
