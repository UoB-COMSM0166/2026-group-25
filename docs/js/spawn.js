// ============================================================
// SPAWN FUNCTIONS (extracted from game.js)
// ============================================================

// ============================================================
// LEVEL 2 SPAWN HELPERS
// ============================================================

function spawnMiniEnemies(parent, count) {
    const g = game;
    for (let i = 0; i < count; i++) {
        const hp = Math.max(1, Math.ceil(parent.maxHp * 0.15));
        g.enemies.push({
            x: parent.x + (Math.random() - 0.5) * 30,
            z: parent.z + (Math.random() - 0.5) * 20,
            hp, maxHp: hp, alive: true,
            damage: Math.max(1, Math.ceil(parent.damage * 0.5)),
            isHeavy: false,
            animFrame: 0, animTimer: Math.random() * 500, hitFlash: 0,
            type: L2_TYPE_MINI,
            isMini: true,
        });
    }
}

function spawnEnemyWaveL2() {
    const g = game;
    const af = getAdaptiveFactor();
    const count = Math.min(3 + Math.ceil(g.wave * 1.2), 20);
    const rows = Math.ceil(count / 5);
    const baseZ = g.cameraZ + CONFIG.SPAWN_DISTANCE;
    const earlyDmgMult = g.wave <= 2 ? 0.5 : 1.0;
    // L2 base damage: significantly higher than L1 (×3)
    const rawDmg = (1 + Math.floor(g.wave / 5)) * Math.sqrt(af) * earlyDmgMult * 3;
    const baseDmg = rawDmg <= 3 ? Math.ceil(rawDmg) : Math.ceil(3 + Math.log2(rawDmg - 2));

    for (let r = 0; r < rows; r++) {
        const cols = Math.min(count - r * 5, 5);
        for (let c = 0; c < cols; c++) {
            const spread = CONFIG.ROAD_HALF_WIDTH * 0.7;
            const x = cols === 1 ? 0 : -spread + (spread * 2) * c / (cols - 1);
            const earlyMult = g.wave <= 2 ? 0.5 : 1.0;
            // L2 base HP: significantly higher than L1 (×4)
            const rawHp = (CONFIG.ENEMY_HP + g.wave + Math.floor(g.wave * g.wave / 40)) * 4;
            const baseHp = Math.ceil(rawHp * af * earlyMult);

            // L2 type weights: capybara-split 50%, engineer-shield 30%, cow-gun 20%
            // Elephant is boss-only
            const rng = Math.random();
            const type = rng < 0.5 ? L2_TYPE_PIG_HERO
                       : rng < 0.8 ? L2_TYPE_PIG_ENGINEER
                       : L2_TYPE_COW_GUN;

            const hpTypeMult = type === L2_TYPE_PIG_ENGINEER ? 1.8
                             : type === L2_TYPE_COW_GUN ? 1.4 : 1.3;
            const dmgTypeMult = type === L2_TYPE_PIG_ENGINEER ? 1.6
                              : type === L2_TYPE_COW_GUN ? 1.8 : 1.2;
            const hp = Math.ceil(baseHp * hpTypeMult);
            const damage = Math.ceil(baseDmg * dmgTypeMult);

            const enemy = {
                x: x + (Math.random() - 0.5) * 20,
                z: baseZ + r * 45 + Math.random() * 15,
                hp, maxHp: hp, alive: true,
                damage, isHeavy: false,
                animFrame: 0, animTimer: Math.random() * 500, hitFlash: 0,
                type,
            };

            // Engineer: shield cycle
            if (type === L2_TYPE_PIG_ENGINEER) {
                enemy.shieldCycle = Math.random() * 5000;
                enemy.shieldActive = false;
            }

            g.enemies.push(enemy);
        }
    }
    g.nextWaveZ = baseZ + rows * 35 + 200;
}

// L2 small boss: CowCry — skills: cry shockwave + self-heal
function spawnCowCryBoss(z) {
    const g = game;
    const af = getAdaptiveFactor();
    const bossLevel = Math.floor(g.wave / 5);

    const bulletCount = Math.min(g.squadCount, 8);
    const bulletDmg = 1 + Math.floor(g.squadCount / 6);
    const volleyDmg = bulletCount * bulletDmg;

    // L2 boss: multiplier 2.5 + reduced linear coefficient to slow HP growth curve
    const cowHp = Math.max(60, Math.ceil(volleyDmg * (12 + bossLevel * 5) * 2.5 * Math.pow(1.06, bossLevel - 1)));
    const expDmg = Math.floor(Math.pow(1.20, bossLevel - 1));
    const waveDmg = 1 + Math.floor(g.wave / 5) + Math.floor(bossLevel * 1.0) + expDmg;
    const cowDmg = Math.max(3, Math.ceil((waveDmg + Math.min(6, Math.ceil(g.squadCount * 0.03))) * Math.pow(af, 0.25)));
    const shootInterval = Math.max(50, 155 - bossLevel * 12);

    g.enemies.push({
        x: 0, z: z,
        hp: cowHp, maxHp: cowHp, alive: true,
        damage: cowDmg,
        isBoss: true, isCowCryBoss: true, isMegaBoss: false, isHeavy: false,
        bossShootTimer: Math.floor(Math.random() * shootInterval),
        bossShootInterval: shootInterval,
        bossHoldZ: CONFIG.SPAWN_DISTANCE,
        animFrame: 0, animTimer: Math.random() * 500, hitFlash: 0,
        type: 8, // cow cry boss type
        // CowCry skill system
        cowSkillTimer: 0,
        cowSkillCooldown: Math.max(200, 420 - bossLevel * 20),
        cowNextSkill: 0, // 0=cry shockwave, 1=self-heal
        bossLevel: bossLevel,
    });
}

// L2 mega boss: Elephant — uses existing mega skill system (flame/summon/slam)
function spawnElephantBoss(z, xPos) {
    const g = game;
    const af = getAdaptiveFactor();
    const megaLevel = Math.floor(g.wave / 10);

    const bulletCount = Math.min(g.squadCount, 8);
    const bulletDmg = 1 + Math.floor(g.squadCount / 6);
    const volleyDmg = bulletCount * bulletDmg;

    const elHp = Math.max(60, Math.ceil(volleyDmg * (28 + megaLevel * 14) * Math.pow(1.12, megaLevel - 1)));
    const expDmg = Math.floor(Math.pow(1.32, megaLevel - 1));
    const waveDmg = 2 + Math.floor(g.wave / 4) + Math.floor(megaLevel * 1.5) + expDmg;
    const elDmg = Math.max(5, Math.ceil((waveDmg + Math.min(9, Math.ceil(g.squadCount * 0.04))) * Math.pow(af, 0.3) * Math.pow(1.07, megaLevel - 1)));
    const shootInterval = Math.max(45, 180 - megaLevel * 18);

    g.enemies.push({
        x: xPos !== undefined ? xPos : 0, z: z,
        hp: elHp, maxHp: elHp, alive: true,
        damage: elDmg,
        isBoss: true, isElephantBoss: true, isMegaBoss: true, isHeavy: false,
        bossShootTimer: 0,
        bossShootInterval: shootInterval,
        bossHoldZ: CONFIG.SPAWN_DISTANCE,
        animFrame: 0, animTimer: Math.random() * 500, hitFlash: 0,
        type: L2_TYPE_ELEPHANT,
        // Mega skill system (reuse dragon skills)
        megaSkillTimer: 0,
        megaSkillCooldown: Math.max(180, 350 - megaLevel * 25),
        megaNextSkill: 0,
        megaLevel: megaLevel,
        megaSummonCount: 0,
    });
}

function spawnEnemyWave() {
    const g = game;
    if (g.currentLevel === 2) { spawnEnemyWaveL2(); return; }
    const af = getAdaptiveFactor();
    const count = Math.min(3 + Math.ceil(g.wave * 1.5), 25);
    const rows = Math.ceil(count / 5);
    const baseZ = g.cameraZ + CONFIG.SPAWN_DISTANCE;
    // Damage scales with wave × adaptive factor; early waves deal less damage
    // Late-game damage grows more gently: logarithmic growth + soft cap
    const earlyDmgMult = g.wave <= 2 ? 0.5 : 1.0;
    const rawDmg = (1 + Math.floor(g.wave / 5)) * Math.sqrt(af) * earlyDmgMult;
    // Soft cap: growth slows after 3 (log decay), milder late-game damage
    const baseDmg = rawDmg <= 3 ? Math.ceil(rawDmg) : Math.ceil(3 + Math.log2(rawDmg - 2));
    for (let r = 0; r < rows; r++) {
        const cols = Math.min(count - r * 5, 5);
        for (let c = 0; c < cols; c++) {
            const spread = CONFIG.ROAD_HALF_WIDTH * 0.7;
            const x = cols === 1 ? 0 : -spread + (spread * 2) * c / (cols - 1);
            // HP scales with wave × adaptive factor; early waves get a soft start
            const earlyMult = g.wave <= 2 ? 0.5 : 1.0;
            const rawHp = CONFIG.ENEMY_HP + g.wave + Math.floor(g.wave * g.wave / 40);
            const baseHp = Math.ceil(rawHp * af * earlyMult);
            // Heavy enemies: chance also scaled by adaptive factor
            const heavyChance = g.wave >= 6 ? (0.12 + g.wave * 0.006) * Math.min(1.5, af) : 0;
            const isHeavy = Math.random() < heavyChance;
            // Type distribution by tier: common=high weight, elite=low; shifts with wave
            // type0/2: Patrick (common), type1: small dragon (mid), type3: fire dragon (elite)
            const w = g.wave;
            const wt0 = Math.max(2, 10 - w * 0.3);       // common: early majority, gradually less
            const wt2 = Math.max(2, 10 - w * 0.3);       // Patrick variant: same
            const wt1 = w >= 3 ? Math.min(6, 1 + w * 0.3) : 0;  // small dragon: appears wave3+, grows
            const wt3 = w > 10 ? Math.min(4, (w - 10) * 0.25) : 0; // fire dragon: appears wave10+, slow growth
            const wtTotal = wt0 + wt1 + wt2 + wt3;
            const roll = Math.random() * wtTotal;
            let type;
            if (roll < wt0) type = 0;
            else if (roll < wt0 + wt2) type = 2;
            else if (roll < wt0 + wt2 + wt1) type = 1;
            else type = 3;
            const hpTypeMult = type === 1 ? 2.0 : type === 3 ? 3.5 : 1.0;
            const dmgTypeMult = type === 1 ? 1.4 : type === 3 ? 2.5 : 1.0;
            const hp = Math.ceil((isHeavy ? baseHp * 2 : baseHp) * 1.38 * hpTypeMult);
            const damage = Math.ceil((isHeavy ? baseDmg * 1.5 : baseDmg) * 1.0 * dmgTypeMult);
            g.enemies.push({
                x: x + (Math.random() - 0.5) * 20,
                z: baseZ + r * 45 + Math.random() * 15,
                hp, maxHp: hp, alive: true,
                damage, isHeavy,
                animFrame: 0, animTimer: Math.random() * 500, hitFlash: 0,
                type,
            });
        }
    }
    g.nextWaveZ = baseZ + rows * 35 + 200;
}

function spawnBoss(z) {
    const g = game;
    const bossLevel = Math.floor(g.wave / 5); // 1, 2, 3...

    // Boss count grows every 2 levels: 1,1,2,2,3,3,4,4...  (cap at 4)
    const bossCount = Math.min(1 + Math.floor((bossLevel - 1) / 2), 4);

    // Per-boss stat reduction: more bosses = individually weaker
    // 1→100%  2→72%  3→58%  4→50%
    const statMult = bossCount === 1 ? 1.0 : Math.max(0.45, 1.0 / Math.sqrt(bossCount * 0.85));

    const bulletCount = Math.min(g.squadCount, 8);
    const bulletDmg = 1 + Math.floor(g.squadCount / 6);
    const volleyDmg = bulletCount * bulletDmg;
    const af = getAdaptiveFactor();
    // Boss damage: wave-scaling + exponential late-game component + squad
    // expDmg adds a 1.35^(bossLevel-1) curve so multi-boss waves feel progressively harder
    const expDmg = Math.floor(Math.pow(1.35, bossLevel - 1));
    const waveDmg = 1 + Math.floor(g.wave / 5) + Math.floor(bossLevel * 0.8) + expDmg;
    const squadPctDmg = Math.min(7, Math.ceil(g.squadCount * 0.03)); // cap at 7
    const baseDmg = waveDmg + squadPctDmg;

    // Shoot interval: floor lowered so late-game bosses fire faster
    const baseInterval = Math.max(40, 150 - bossLevel * 15);
    const shootInterval = Math.round(baseInterval * (1 + (bossCount - 1) * 0.2));

    // Spread bosses evenly across road (wider spread with more bosses)
    const xSpread = CONFIG.ROAD_HALF_WIDTH * (bossCount > 1 ? 0.85 : 0.6);

    for (let i = 0; i < bossCount; i++) {
        let bx;
        if (bossCount === 1) {
            bx = (Math.random() - 0.5) * xSpread;
        } else {
            const t = i / (bossCount - 1); // 0..1 evenly spaced
            bx = -xSpread / 2 + t * xSpread + (Math.random() - 0.5) * 18;
        }
        const bossHp = Math.max(20, Math.ceil(volleyDmg * (12 + bossLevel * 6) * Math.pow(1.10, bossLevel - 1) * statMult));
        // Multi-boss damage reduction (1=100%, 2=88%, 3=76%, 4=65%) — keeps late multi-boss waves threatening
        const dmgMult = bossCount === 1 ? 1.0 : Math.max(0.65, 1.0 - (bossCount - 1) * 0.12);
        const bossDmg = Math.max(2, Math.ceil(baseDmg * Math.pow(af, 0.3) * dmgMult));
        const zOffset = bossCount > 1 ? (Math.random() - 0.5) * 55 : 0;

        g.enemies.push({
            x: bx,
            z: z + zOffset,
            hp: bossHp, maxHp: bossHp, alive: true,
            damage: bossDmg,
            isBoss: true, isHeavy: false,
            bossShootTimer: Math.floor(Math.random() * shootInterval), // stagger initial shots
            bossShootInterval: shootInterval,
            bossHoldZ: CONFIG.SPAWN_DISTANCE,
            animFrame: 0, animTimer: Math.random() * 500, hitFlash: 0,
            type: 0,
        });
    }
}

function spawnMegaBoss(z, xPos) {
    const g = game;
    const megaLevel = Math.floor(g.wave / 10); // 1, 2, 3...
    const af = getAdaptiveFactor();

    // Mega boss is a single, very powerful boss
    const bulletCount = Math.min(g.squadCount, 8);
    const bulletDmg = 1 + Math.floor(g.squadCount / 6);
    const volleyDmg = bulletCount * bulletDmg;
    // Mega boss damage: steeper wave-scaling + exponential late-game component
    const waveDmg = 2 + Math.floor(g.wave / 4) + Math.floor(megaLevel * 1.5);
    const squadPctDmg = Math.min(9, Math.ceil(g.squadCount * 0.04)); // cap at 9
    const baseDmg = waveDmg + squadPctDmg;

    // HP — exponential multiplier kicks in hard after mega level 3
    const megaHp = Math.max(60, Math.ceil(volleyDmg * (25 + megaLevel * 12) * Math.pow(1.12, megaLevel - 1)));

    // Damage per shot — exponential scaling so late mega bosses stay threatening
    // pow(1.07, megaLevel-1): x1 at Lv1, x1.14 at Lv3, x1.31 at Lv5, x1.40 at Lv6
    const megaDmg = Math.max(5, Math.ceil(baseDmg * Math.pow(af, 0.3) * Math.pow(1.07, megaLevel - 1)));

    // Shoot interval: moderately faster in late game
    const shootInterval = Math.max(55, 175 - megaLevel * 15);

    g.enemies.push({
        x: (xPos !== undefined) ? xPos : 0,
        z: z,
        hp: megaHp, maxHp: megaHp, alive: true,
        damage: megaDmg,
        isBoss: true, isMegaBoss: true, isHeavy: false,
        bossShootTimer: 0,
        bossShootInterval: shootInterval,
        bossHoldZ: CONFIG.SPAWN_DISTANCE,
        animFrame: 0, animTimer: Math.random() * 500, hitFlash: 0,
        type: 0,
        // Mega boss skill system
        megaSkillTimer: 0,
        megaSkillCooldown: Math.max(180, 350 - megaLevel * 25), // ticks between skills
        megaNextSkill: 0, // 0=flame breath, 1=summon, 2=ground slam
        megaLevel: megaLevel,
        megaSummonCount: 0, // track summons to limit
    });
}

// PERCENT_GATE_THRESHOLD is defined in config.js

function generateTroopGateOption(wave, squad, idx, total) {
    const pool = [];
    const luck = getTalentLuckMult(); // luck talent: boosts good gate weights

    // === Additive bonuses: small values early, larger late (waveBonus accelerates) ===
    // waveBonus: wave5=1, wave10=2, wave20=5, wave30=7
    const waveBonus = Math.floor(wave / 4);
    // lateBonus: fast ramp from wave15, wave20=6, wave30=12
    const lateBonus = wave >= 15 ? Math.floor((wave - 15) / 5) * 4 : 0;
    // Small add: base 1~2 early, relies on waveBonus later
    pool.push({ op: '+', value: 1 + Math.floor(Math.random() * 2) + waveBonus + lateBonus, w: 5 });
    // Medium add: wave3+, base 3~5, meaningful late
    if (wave >= 3) {
        pool.push({ op: '+', value: 3 + Math.floor(Math.random() * 3) + waveBonus + lateBonus, w: 2.5 * luck });
    }
    // Large add: wave8+, base 6~11, ×2 wave bonus
    if (wave >= 8) {
        pool.push({ op: '+', value: 6 + Math.floor(Math.random() * 6) + waveBonus * 2 + lateBonus * 2, w: 0.8 * luck });
    }
    // Mega add: wave20+, ×3 wave bonus
    if (wave >= 20) {
        const megaAdd = 12 + Math.floor(Math.random() * 8) + waveBonus * 3 + lateBonus * 2;
        pool.push({ op: '+', value: megaAdd, w: 0.4 * luck });
    }

    // === Subtractive penalties: small loss = common, large loss = rare (luck lowers penalty weight) ===
    pool.push({ op: '-', value: 1 + Math.floor(Math.random() * 2), w: 5 / luck });   // -1~2 common
    if (wave >= 4) {
        pool.push({ op: '-', value: 3 + Math.floor(Math.random() * 3), w: 1.0 / luck }); // -3~5 rare
    }

    if (squad < PERCENT_GATE_THRESHOLD) {
        // Small squad: multipliers as comeback mechanic
        if (wave >= 3) {
            pool.push({ op: '×', value: 2, w: 1.0 * luck });    // ×2 occasional
            if (wave >= 10) pool.push({ op: '×', value: 3, w: 0.2 * luck }); // ×3 very rare
        }
        if (wave >= 4) {
            pool.push({ op: '÷', value: 2, w: 1.2 / luck });
            if (wave >= 10) pool.push({ op: '÷', value: 3, w: 0.3 / luck });
        }
    } else {
        // Large squad: percentage gates
        // pctDecay: big-bonus weight decays with wave; lenient early, strict late
        // wave8=1.0, wave15=0.79, wave22=0.58, wave30=0.34, wave40=0.25(floor)
        const pctDecay = Math.max(0.25, 1 - Math.max(0, wave - 8) * 0.03);

        // Small pct bonus: +10~20%, stable weight (small late-game gains are fine)
        pool.push({ op: '+%', value: 10 + Math.floor(Math.random() * 11), w: 1.8 });
        // Large pct bonus: +25~40%, wave8+, good weight early, decays late
        if (wave >= 8) {
            pool.push({ op: '+%', value: 25 + Math.floor(Math.random() * 16), w: 0.6 * luck * pctDecay });
        }
        // Mega pct bonus: +40~60%, wave18+, decays sharply late
        if (wave >= 18) {
            pool.push({ op: '+%', value: 40 + Math.floor(Math.random() * 21), w: 0.3 * luck * pctDecay * pctDecay });
        }
        // Pct penalties (slightly elevated weight to balance bonus-heavy pool)
        pool.push({ op: '-%', value: 10 + Math.floor(Math.random() * 6), w: 1.8 / luck });
        if (wave >= 10) {
            pool.push({ op: '-%', value: 20 + Math.floor(Math.random() * 6), w: 0.7 / luck });
        }
    }

    // Weighted random pick
    const totalW = pool.reduce((s, p) => s + p.w, 0);
    let r = Math.random() * totalW;
    for (const p of pool) {
        r -= p.w;
        if (r <= 0) return { op: p.op, value: p.value };
    }
    return pool[0];
}

function isGoodOption(opt, squad) {
    switch (opt.op) {
        case '+': case '×': case '+%': return true;
        case '-': case '÷': case '-%': return false;
    }
    return false;
}

function generateBadOption(wave, squad) {
    if (squad >= PERCENT_GATE_THRESHOLD) {
        // small pct penalties are more common
        const roll = Math.random();
        if (wave >= 10 && roll < 0.2) return { op: '-%', value: 20 + Math.floor(Math.random() * 6) };
        return { op: '-%', value: 10 + Math.floor(Math.random() * 6) };
    }
    // small subtractions are common; large subtractions and divisions are rare
    const roll = Math.random();
    if (wave >= 8 && roll < 0.1) return { op: '÷', value: 3 };
    if (wave >= 4 && roll < 0.3) return { op: '÷', value: 2 };
    return { op: '-', value: 1 + Math.floor(Math.random() * Math.min(3, Math.ceil(wave / 5))) };
}

function applyTroopGateOp(squad, op, value) {
    switch (op) {
        case '+': return squad + value;
        case '-': return Math.max(1, squad - value);
        case '×': return squad * value; // only appears when squad < 20
        case '÷': return Math.max(1, Math.ceil(squad / value));
        case '+%': return squad + Math.max(1, Math.round(squad * value / 100));
        case '-%': return Math.max(1, squad - Math.round(squad * value / 100));
    }
    return squad;
}

function spawnGate() {
    const g = game;
    const z = g.nextGateZ;
    // Mobile: always 2 panels to avoid cramping; desktop: 2 or 3
    const isMobile = _proj.isMobile;
    const numOptions = isMobile ? 2 : (Math.random() < 0.3 ? 2 : 3);
    const weaponChance = Math.min(0.95, 0.7 * getTalentLuckMult()); // luck boosts weapon gate chance
    const bossAlive = g.enemies.some(e => e.alive && e.isBoss);
    // During boss fight: only weapon gates allowed (no troop +/- gates)
    const isWeaponGate = bossAlive || (g.wave % 2 === 0 && g.wave >= 2 && Math.random() < weaponChance);
    const options = [];

    // Generate random panel widths and positions
    // Random layout: ~40% chance passable gaps, ~60% packed across road
    const roadW = CONFIG.ROAD_HALF_WIDTH * 2;
    const hasPassableGaps = Math.random() < 0.4;
    const minGap = hasPassableGaps ? 30 : 0; // at least 30 units passable when gaps exist
    const widthFactors = [];
    for (let i = 0; i < numOptions; i++) {
        widthFactors.push(0.7 + Math.random() * 0.6); // 0.7 ~ 1.3x variation
    }
    const factorSum = widthFactors.reduce((s, f) => s + f, 0);
    // panels take 55-65% of road when gaps exist, 80-85% when packed
    const usableRatio = hasPassableGaps ? (0.55 + Math.random() * 0.1) : (0.80 + Math.random() * 0.05);
    const usableWidth = roadW * usableRatio;
    const panelWidths = widthFactors.map(f => (f / factorSum) * usableWidth);

    const totalPanelW = panelWidths.reduce((s, w) => s + w, 0);
    const totalGapSpace = roadW - totalPanelW;
    const innerGapCount = Math.max(0, numOptions - 1);
    const reservedGap = innerGapCount * minGap;
    const freeGap = Math.max(0, totalGapSpace - reservedGap);
    const gaps = [];
    let gapSum = 0;
    for (let i = 0; i <= numOptions; i++) {
        const gv = Math.random() + 0.2;
        gaps.push(gv);
        gapSum += gv;
    }

    const positions = [];
    let curX = -CONFIG.ROAD_HALF_WIDTH;
    for (let i = 0; i < numOptions; i++) {
        curX += (gaps[i] / gapSum) * freeGap + (i > 0 ? minGap : 0);
        positions.push({ cx: curX + panelWidths[i] / 2, w: panelWidths[i] });
        curX += panelWidths[i];
    }

    if (isWeaponGate) {
        // Weapon gates: 1-2 randomly placed panels (not filling the row)
        // Weighted pool: shotgun=5, laser=3, rocket=1
        const weaponPool = ['shotgun','shotgun','shotgun','shotgun','shotgun','laser','laser','laser','rocket'];
        function pickWeapon(exclude) {
            const pool = exclude ? weaponPool.filter(w => w !== exclude) : weaponPool;
            return pool[Math.floor(Math.random() * pool.length)];
        }
        const weaponCount = Math.random() < 0.4 ? 1 : 2;
        const picked = [];
        for (let i = 0; i < weaponCount; i++) {
            picked.push(pickWeapon(picked[0])); // second panel avoids duplicate
        }
        const hw = CONFIG.ROAD_HALF_WIDTH;
        const placed = [];
        for (let i = 0; i < weaponCount; i++) {
            const panelW = 55 + Math.random() * 35; // 55-90 width
            const margin = panelW / 2 + 15;
            let px, attempts = 0;
            do {
                px = -hw + margin + Math.random() * (hw * 2 - margin * 2);
                attempts++;
            } while (attempts < 20 && placed.some(prev => Math.abs(prev - px) < 80));
            placed.push(px);
            options.push({
                x: px, width: panelW,
                gateType: 'weapon', weapon: picked[i],
            });
        }
    } else {
        const troopOps = [];
        for (let i = 0; i < numOptions; i++) {
            troopOps.push(generateTroopGateOption(g.wave, g.squadCount, i, numOptions));
        }
        // ensure at least one good gate; allow multiple bad gates in same row
        const hasGood = troopOps.some(o => isGoodOption(o, g.squadCount));
        if (!hasGood) troopOps[0] = { op: '+', value: 2 + Math.floor(g.wave / 3) + (g.wave >= 15 ? Math.floor((g.wave - 15) / 5) * 2 : 0) };
        for (let i = troopOps.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [troopOps[i], troopOps[j]] = [troopOps[j], troopOps[i]];
        }
        for (let i = 0; i < numOptions; i++) {
            options.push({
                x: positions[i].cx, width: positions[i].w * 0.9,
                gateType: 'troop', op: troopOps[i].op, value: troopOps[i].value,
            });
        }
    }
    g.gates.push({ z, options, triggered: false, fadeTimer: 0, chosenIdx: -1 });
    g.nextGateZ = z + 350;
}

function spawnBarrels() {
    const g = game;
    const baseZ = g.nextWaveZ - 100;
    // Random count: 1-3 barrels, more likely at higher waves
    const count = 1 + Math.floor(Math.random() * Math.min(3, 1 + Math.floor(g.wave / 3)));
    const hw = CONFIG.ROAD_HALF_WIDTH * 0.85;
    for (let i = 0; i < count; i++) {
        // Random x across road width, z slightly staggered
        const x = -hw + Math.random() * hw * 2;
        const z = baseZ + (Math.random() - 0.5) * 80;
        // Ensure not too close to existing barrels
        const tooClose = g.barrels.some(b => b.alive && Math.abs(b.x - x) < 30 && Math.abs(b.z - z) < 40);
        if (tooClose) continue;
        g.barrels.push({
            x, z,
            hp: 2, maxHp: 2, aoeDamage: Math.max(20, 10 + Math.floor(g.wave * 2)), alive: true,
            pulsePhase: Math.random() * Math.PI * 2,
            smokeTimer: 0, chainTimer: -1,
        });
    }
}
