// ============================================================
// TALENT HELPERS — read live from playerData
// ============================================================
function getTalentDamageMult() { return 1 + (playerData.talents.damage || 0) * 0.15; }
function getTalentFireRateMult() { return 1 - (playerData.talents.fireRate || 0) * 0.08; }
function getTalentAoeMult()      { return 1 + (playerData.talents.aoe     || 0) * 0.25; }
function getTalentSquadBonus()   { return playerData.talents.squad || 0; }
function getTalentLuckMult()     { return 1 + (playerData.talents.luck    || 0) * 0.12; }

// ============================================================
// WEAPON FIRING
// ============================================================
function fireWeapon() {
    const g = game;
    const effectiveWeapon = g.weapon;
    switch (effectiveWeapon) {
        case 'pistol': {
            const squad = g.squadCount;
            // More squad = more bullets (up to 8) + higher damage per bullet
            const bulletCount = Math.min(squad, 8);
            const pistolDmg = Math.max(1, Math.round((1 + Math.floor(squad / 10)) * getTalentDamageMult() * getLevelDamageMult()));
            const tierIdx = playerData.equippedPistolTier || 0;
            const tier = PISTOL_TIERS[tierIdx];
            for (let i = 0; i < bulletCount; i++) {
                let bx, bz;
                if (i === 0) { bx = g.player.x; bz = g.cameraZ + 10; }
                else {
                    const row = Math.ceil(i / 3), col = ((i - 1) % 3) - 1;
                    bx = g.player.x + col * 25; bz = g.cameraZ + 10 + row * 20;
                }
                const angle = (bx - g.player.x) * 0.0004;
                const bullet = {
                    x: bx, z: bz,
                    vx: Math.sin(angle) * CONFIG.BULLET_SPEED,
                    vz: Math.cos(angle) * CONFIG.BULLET_SPEED,
                    weapon: 'pistol', damage: pistolDmg,
                    tier: tierIdx, color: tier.color,
                };
                if (tier.pierce) { bullet.pierce = true; bullet.hitEnemies = new Set(); }
                g.bullets.push(bullet);
            }
            playSound('shoot'); break;
        }
        case 'shotgun': {
            const squad = g.squadCount;
            const wLv = (playerData.weaponLevels || {})['shotgun'] || 0;
            const lvMult = wLv >= 3 ? 2.5 : wLv >= 2 ? 1.6 : 1.0;
            const extraPellets = wLv >= 3 ? 4 : wLv >= 2 ? 2 : 0;
            const pellets = Math.min(5 + Math.floor(squad / 4) + extraPellets, 16);
            const sgDmg = Math.max(1, Math.round((2 + Math.floor(squad / 6)) * lvMult * getTalentDamageMult() * getLevelDamageMult()));
            const spread = 0.25 + Math.min(squad * 0.015, 0.15);
            for (let i = 0; i < pellets; i++) {
                const angle = -spread + 2 * spread * i / (pellets - 1) + (Math.random() - 0.5) * 0.06;
                const speed = CONFIG.BULLET_SPEED * (0.8 + Math.random() * 0.15);
                g.bullets.push({ x: g.player.x, z: g.cameraZ + 10, vx: Math.sin(angle) * speed, vz: Math.cos(angle) * speed, weapon: 'shotgun', level: wLv, damage: sgDmg, maxRange: 700, startZ: g.cameraZ + 10, falloff: true });
            }
            playSound('shoot_shotgun'); break;
        }
        case 'laser': {
            const lSquad = g.squadCount;
            const wLv = (playerData.weaponLevels || {})['laser'] || 0;
            const lvMult = wLv >= 3 ? 2.5 : wLv >= 2 ? 1.6 : 1.0;
            const extraBeams = wLv >= 3 ? 2 : wLv >= 2 ? 1 : 0;
            const beamCount = Math.min(1 + Math.floor(lSquad / 8) + extraBeams, 5);
            const lDmg = Math.max(1, Math.round((1 + Math.floor(lSquad / 6)) * lvMult * getTalentDamageMult() * getLevelDamageMult()));
            for (let b = 0; b < beamCount; b++) {
                const offsetX = beamCount === 1 ? 0 : (b - (beamCount - 1) / 2) * 30;
                g.bullets.push({ x: g.player.x + offsetX, z: g.cameraZ + 10, vx: 0, vz: CONFIG.BULLET_SPEED * 2.5, weapon: 'laser', level: wLv, damage: lDmg, pierce: true, hitEnemies: new Set() });
            }
            playSound('shoot_laser'); break;
        }
        case 'rocket': {
            const rSquad = g.squadCount;
            const wLv = (playerData.weaponLevels || {})['rocket'] || 0;
            const lvMult = wLv >= 3 ? 2.5 : wLv >= 2 ? 1.6 : 1.0;
            const extraRockets = wLv >= 3 ? 2 : wLv >= 2 ? 1 : 0;
            const rocketCount = Math.min((rSquad >= 25 ? 3 : rSquad >= 10 ? 2 : 1) + extraRockets, 5);
            const rDmg = Math.max(1, Math.round((3 + Math.floor(rSquad / 4)) * lvMult * getTalentDamageMult() * getLevelDamageMult()));
            const rAoe = Math.min(150, Math.round((50 + rSquad * 3) * getTalentAoeMult()));
            for (let r = 0; r < rocketCount; r++) {
                const offsetX = rocketCount === 1 ? 0 : (r - (rocketCount - 1) / 2) * 30;
                g.bullets.push({ x: g.player.x + offsetX, z: g.cameraZ + 10, vx: 0, vz: CONFIG.BULLET_SPEED * 0.8, weapon: 'rocket', level: wLv, damage: rDmg, aoeRadius: rAoe });
            }
            playSound('shoot_rocket'); break;
        }
    }
    g.player.muzzleFlash = 4;
}

// ============================================================
// PARTICLES / EXPLOSIONS
// ============================================================
function addParticles(x, z, count, color, speed, life) {
    for (let i = 0; i < count; i++) {
        game.particles.push({
            x, z, vx: (Math.random() - 0.5) * speed, vz: (Math.random() - 0.5) * speed,
            vy: -Math.random() * speed * 1.5, y: 0,
            life: life * (0.5 + Math.random() * 0.5), maxLife: life,
            color, size: 2 + Math.random() * 3,
        });
    }
}

function addExplosion(x, z) {
    game.explosions.push({ x, z, timer: 0, maxTimer: 20 });
    addParticles(x, z, 12, 0xf0a020, 3, 25);
    addParticles(x, z, 6, 0xff4020, 2, 18);
    addParticles(x, z, 4, 0x333333, 1.5, 30);
    addParticles(x, z, 3, 0xffffff, 4, 6); // brief white flash sparks
}

function explodeBarrel(br) {
    const g = game;
    if (!br.alive) return;
    br.alive = false;
    g.score += 25;

    // 5-burst explosion cascade
    addExplosion(br.x, br.z);
    addExplosion(br.x - 22, br.z + 16);
    addExplosion(br.x + 22, br.z - 16);
    addExplosion(br.x + 10, br.z + 22);
    addExplosion(br.x - 10, br.z - 22);

    // Heavy fire column + smoke cloud
    addParticles(br.x, br.z, 45, 0xff3300, 7, 45);  // deep red fire pillar
    addParticles(br.x, br.z, 30, 0xff8800, 6, 38);  // orange fire
    addParticles(br.x, br.z, 20, 0xffcc00, 5, 30);  // yellow embers
    addParticles(br.x, br.z, 18, 0x222222, 4, 60);  // black smoke
    addParticles(br.x, br.z, 10, 0xffffff, 9, 8);   // blinding flash sparks

    playSound('explosion');
    g.shakeTimer = Math.max(g.shakeTimer, 30);
    g.screenFlash = Math.max(g.screenFlash, 0.88);
    g.slowMo = Math.max(g.slowMo, 130);  // brief dramatic slow-mo

    // Giant "BOOM!" text
    const brP = project(br.x, br.z - g.cameraZ);
    g.barrelExplosionTexts.push({
        text: 'BOOM!', x: brP.x, y: brP.y - 12,
        color: 0xff4400, scale: 0.60,
        timer: 0, maxTimer: 75,
    });

    // Two expanding blast rings for impact
    g.explosions.push({ x: br.x, z: br.z, timer: 0, maxTimer: 30, isBlastRing: true });
    g.explosions.push({ x: br.x, z: br.z, timer: 0, maxTimer: 48, isBlastRing: true });

    // AOE damage
    const aoeRadius = 90;
    g.enemies.forEach(e => {
        if (!e.alive) return;
        if (Math.abs(e.x - br.x) < aoeRadius && Math.abs(e.z - br.z) < aoeRadius) {
            e.hp -= br.aoeDamage;
            e.hitFlash = 6;
            addDamageNumber(e.x, e.z, br.aoeDamage, 0xff8800);
            if (e.hp <= 0) {
                const killScoreBase = e.isMegaBoss ? 300 : e.isBoss ? 100 : (L2_KILL_SCORES[e.type] || (e.isHeavy ? 25 : 10));
                const killScore = Math.ceil(killScoreBase * (LEVEL_CONFIGS[g.currentLevel] ? LEVEL_CONFIGS[g.currentLevel].scoreMultiplier : 1));
                e.alive = false; g.score += killScore; g.killCount++;
                addExplosion(e.x, e.z);
                g.deadBodies.push({ x: e.x, z: e.z, timer: 300 });
                g.comboCount++; g.comboTimer = CONFIG.COMBO_TIMEOUT;
                g.bestCombo = Math.max(g.bestCombo, g.comboCount);
                if (e.isBoss) {
                    spawnBossCoins(e.x, e.z);
                    if (e.isMegaBoss) spawnBossCoins(e.x, e.z);
                    awardBossExp(e.isMegaBoss, e.x, e.z);
                    const stillBossAlive = g.enemies.some(o => o !== e && o.alive && o.isBoss);
                    if (!stillBossAlive) {
                        g.enemyBullets = [];
                        if (e.isMegaBoss) g.midShopTimer = 90;
                    }
                }
            }
        }
    });

    // Chain reaction to nearby barrels
    g.barrels.forEach(otherBr => {
        if (otherBr === br || !otherBr.alive || otherBr.chainTimer >= 0) return;
        if (Math.abs(otherBr.x - br.x) < aoeRadius && Math.abs(otherBr.z - br.z) < aoeRadius) {
            otherBr.chainTimer = 8;
        }
    });
}

function spawnBossCoins(x, z) {
    const g = game;
    const bossLvl = Math.floor(g.wave / 5);
    const isL2 = g.currentLevel === 2;
    // Lower chance early, higher late: wave5=50%, wave10=70%, wave15=85%, wave20+=90% (L2 +15%)
    const coinDropChance = Math.min(0.97, 0.3 + bossLvl * 0.2 + (isL2 ? 0.15 : 0));
    if (Math.random() > coinDropChance) return;
    // Multiple bosses: each drops less so total stays reasonable
    const bossCount = Math.min(1 + Math.floor((bossLvl - 1) / 2), 4);
    const perBossMult = bossCount === 1 ? 1.0 : Math.max(0.3, 0.7 / bossCount);
    // Few coins early, more late; L2 doubles drop
    const baseCoinCount = COIN_DROP_BASE + Math.min(bossLvl * COIN_DROP_PER_LEVEL, 15);
    const l2CoinMult = isL2 ? 2.5 : 1;
    const coinCount = Math.max(1, Math.round(baseCoinCount * perBossMult * l2CoinMult));
    // Land near player (player is at cameraZ+10 when boss dies), scatter toward player
    const playerZ = g.cameraZ + 10;
    for (let ci = 0; ci < coinCount; ci++) {
        // Scatter toward player, not from boss position
        const targetX = g.player.x + (Math.random() - 0.5) * 80;
        const targetZ = playerZ + 20 + Math.random() * 60;
        g.coins.push({
            x: x + (Math.random() - 0.5) * 30,
            z: z,
            vx: (targetX - x) * 0.03 + (Math.random() - 0.5) * 1,
            vz: (targetZ - z) * 0.04,
            vy: -3 - Math.random() * 3,
            y: 0,
            value: 1,
            life: 600,
            bobPhase: Math.random() * Math.PI * 2,
            sparkle: Math.random(),
        });
    }
}

function spawnBossGems(x, z) {
    const g = game;
    const bossLvl = Math.floor(g.wave / 5);
    const isL2 = g.currentLevel === 2;
    // Multi-boss: only the last boss drops gems (max 1 gem drop per wave)
    const bossCount = Math.min(1 + Math.floor((bossLvl - 1) / 2), 4);
    const aliveBosses = g.enemies.filter(e => e.alive && e.isBoss).length;
    // Only drop gems when the last boss dies
    if (aliveBosses > 1) return;
    // Drop chance: L1: wave5=20%...wave25+=75%; L2 +25%
    const gemDropChance = Math.min(0.97, 0.0 + bossLvl * 0.2 + (isL2 ? 0.25 : 0));
    if (Math.random() > gemDropChance) return;
    // L2 drops more gems
    const count = isL2
        ? (bossLvl <= 2 ? 2 : (Math.random() < 0.5 ? 3 : 4))
        : (bossLvl <= 2 ? 1 : (Math.random() < 0.65 ? 1 : 2));
    // Toss toward player to ensure pickup
    const playerZ = g.cameraZ + 10;
    for (let i = 0; i < count; i++) {
        const targetX = g.player.x + (Math.random() - 0.5) * 50;
        const targetZ = playerZ + 10 + Math.random() * 40;
        g.gems.push({
            x: x + (Math.random() - 0.5) * 20,
            z: z,
            vx: (targetX - x) * 0.03 + (Math.random() - 0.5) * 0.5,
            vz: (targetZ - z) * 0.04,
            vy: -6 - Math.random() * 3,
            y: 0,
            value: 1,
            life: 800,
            bobPhase: Math.random() * Math.PI * 2,
        });
    }
}

function addDamageNumber(x, z, value, color) {
    game.damageNumbers.push({
        x, z, value, color: color || 0xffffff,
        life: 50, maxLife: 50, offsetY: 0,
    });
}

function addScorePopup(text, sx, sy, color) {
    game.scorePopups.push({
        text, x: sx, y: sy, color: color || 0xffcc00,
        life: 45, maxLife: 45,
    });
}

// ============================================================
// LEVEL SYSTEM — award XP and handle level ups
// ============================================================

// Internal: process level-up loop after g.exp has been incremented
function checkLevelUp(g, bigEffect) {
    while (g.level < LEVEL_CONFIG.maxLevel) {
        const threshold = LEVEL_CONFIG.xpThresholds[g.level - 1];
        if (g.exp < threshold) break;

        const prevLevel = g.level;
        g.level++;
        // Persist level immediately
        playerData.level = g.level;
        playerData.exp = g.exp;
        savePlayerData(playerData);

        const prevBonus = LEVEL_CONFIG.bonuses[prevLevel - 1];
        const newBonus  = LEVEL_CONFIG.bonuses[g.level - 1];
        const squadDelta = newBonus.squadBonus - prevBonus.squadBonus;
        if (squadDelta > 0) {
            g.squadCount += squadDelta;
            g.peakSquad = Math.max(g.peakSquad, g.squadCount);
        }

        if (bigEffect) {
            g.screenFlash = Math.max(g.screenFlash, 0.5);
            g.shakeTimer  = Math.max(g.shakeTimer, 10);
            addParticles(g.player.x, g.cameraZ + 10, 28, 0x88ffcc, 5, 32);
            addParticles(g.player.x, g.cameraZ + 10, 14, 0xffffff, 4, 20);
        }

        // Level-up banner — show key stat changes
        const dmgPct = Math.round((newBonus.damageMult - 1) * 100);
        const frPct  = Math.round((1 - newBonus.fireRateMult) * 100);
        let bonusDesc = `ATK +${dmgPct}%`;
        if (frPct > 0) bonusDesc += ` SPD +${frPct}%`;
        if (squadDelta > 0) bonusDesc += ` TROOPS +${squadDelta}`;
        // Notify when a new pistol tier is unlocked at this level (DOM toast with SVG icon)
        const unlockedTier = PISTOL_TIERS.find(t => t.requireLevel === g.level && t.price > 0);
        if (unlockedTier) showWeaponUnlockToast(unlockedTier);
        g.levelUpAnim = { level: g.level, bonusDesc, timer: 0, maxTimer: 185 };
        playSound('weapon_pickup');
    }
}

// Award XP for regular enemy kills — scales with wave
function awardKillXP(g, isHeavy) {
    if (!g || g.level >= LEVEL_CONFIG.maxLevel) return;
    const kc = LEVEL_CONFIG.killXp;
    const step = Math.floor(g.wave / kc.wavePerStep);
    const baseXp = kc.base + Math.floor(Math.pow(step, kc.exp));
    const levelMult = (g.currentLevel === 2) ? 10 : 1;
    const xp = (isHeavy ? baseXp * kc.heavyMult : baseXp) * levelMult;
    g.exp += xp;
    playerData.exp = g.exp;
    checkLevelUp(g, true);
}

function awardBossExp(isMegaBoss, x, z) {
    const g = game;
    if (!g || g.level >= LEVEL_CONFIG.maxLevel) return;

    // ── Normal-distribution XP roll (exponential scaling) ──
    const cfg = LEVEL_CONFIG.bossXp;
    const bossLvl = Math.floor(g.wave / 5);
    const normalMean = Math.round(cfg.normalBase * Math.pow(cfg.growthBase, bossLvl - 1));
    const mean  = isMegaBoss ? Math.round(normalMean * cfg.megaMult) : normalMean;
    const sigma = mean * cfg.sigmaFrac;

    // Box-Muller transform → standard normal → scale to desired distribution
    const u1 = Math.max(1e-10, Math.random());
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * Math.random());
    const expGain = Math.round(
        Math.max(mean * cfg.minFrac, Math.min(mean * cfg.maxFrac, mean + z0 * sigma))
    );

    g.exp += expGain;
    playerData.exp = g.exp; // sync in-memory

    // Floating EXP text at boss position
    const p = project(x, Math.max(0, z - g.cameraZ));
    const expColor = isMegaBoss ? 0xaaffdd : 0x88ffcc;
    addScorePopup(`+${expGain} EXP`, p.x, p.y - 55, expColor);

    checkLevelUp(g, true);
}
