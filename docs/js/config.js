// ============================================================
// CONFIGURATION & CONSTANTS
// ============================================================
const CONFIG = {
    ROAD_HALF_WIDTH: 220,
    VIEW_DIST: 200,
    HORIZON_RATIO: 0.22,
    PLAYER_SPEED: 3,
    CAMERA_SPEED: 1.76,
    BULLET_SPEED: 10,
    ENEMY_SPEED: 0.24,              // base enemy advance speed
    ENEMY_LATERAL_SPEED: 0.26,      // base enemy lateral tracking speed
    ENEMY_SPEED_WAVE_SCALE: 0.012,  // enemy speed increment per wave
    ENEMY_LATERAL_WAVE_SCALE: 0.008,// lateral speed increment per wave

    // Boss bullet speed: min(MAX, BASE + bossLvl × SCALE)
    BOSS_BULLET_SPEED: 6.0,
    BOSS_BULLET_SPEED_SCALE: 1.2,
    BOSS_BULLET_SPEED_MAX: 12.0,

    // Mega boss flame speed: min(MAX, BASE + megaLevel × SCALE)
    MEGA_BULLET_SPEED: 5.1,
    MEGA_BULLET_SPEED_SCALE: 0.69,
    MEGA_BULLET_SPEED_MAX: 10.4,

    SHOOT_INTERVAL: 100,
    SPAWN_DISTANCE: 650,
    GATE_DISTANCE: 300,
    ENEMY_HP: 3,
    PIXEL_SIZE: 2,
    CLOUD_COUNT: 8,
    VIGNETTE_STRENGTH: 0.4,
    WAVE_BANNER_DURATION: 120,
    COMBO_TIMEOUT: 2000,
};

const WEAPON_DEFS = {
    pistol:        { fireRateMult: 1.0,  duration: Infinity },
    shotgun:       { fireRateMult: 2.0,  duration: 8  },
    laser:         { fireRateMult: 0.55, duration: 6  },
    rocket:        { fireRateMult: 1.7,  duration: 10 },
    invincibility: { fireRateMult: 1.0,  duration: 4  },
};

const WEAPON_COLORS = {
    pistol:  0xffff88,
    shotgun: 0xff9900,
    laser:   0x00ffff,
    rocket:  0xff4444,
};

// Boss dragon sprite sheet
const MONSTER_FRAME_COUNT = 4;
const MONSTER_FRAME_SIZE = 64;

// Fire dragon (elite type 3, wave 10+) sprite sheet
const FIRE_ENEMY_FRAME_COUNT = 8;
const FIRE_ENEMY_FRAME_SIZE = 256;

// Small dragon (normal enemy type 1) sprite sheet
const XIAO_NAI_LONG_FRAME_COUNT = 21;
const XIAO_NAI_LONG_FRAME_SIZE = 128;

// Capybara (enemy type 4/5/7) sprite sheet
const CAPYBARA_FRAME_COUNT = 16;
const CAPYBARA_FRAME_SIZE = 128;

// CowCry (L2 small boss) sprite sheet
const COW_CRY_FRAME_COUNT = 20;
const COW_CRY_FRAME_SIZE = 128;

// CowGun (L2 engineer/shield type) sprite sheet
const COW_GUN_FRAME_COUNT = 20;
const COW_GUN_FRAME_SIZE = 128;

// Elephant (L2 mega boss) sprite sheet
const ELEPHANT_FRAME_COUNT = 29;
const ELEPHANT_FRAME_SIZE = 128;

// Patrick sprite sheet layout
const PATRICK_COLS = 6;
const PATRICK_ROWS = 4;
const PATRICK_FRAME_W = 283;
const PATRICK_FRAME_H = 267;
const PATRICK_TOTAL_FRAMES = 23; // last row has 5

// Gate threshold: below this → multipliers, above → percentages
const PERCENT_GATE_THRESHOLD = 20;

// ============================================================
// LEVEL SYSTEM
// ============================================================
const MAX_WAVES_LEVEL1 = 66;
const MAX_WAVES_LEVEL2 = 88;

const LEVEL_CONFIGS = {
    1: { name: 'Bridge Assault', subtitle: 'Bridge Assault', scoreMultiplier: 1 },
    2: { name: 'Doomsday Factory', subtitle: 'Doomsday Factory', scoreMultiplier: 3 },
};

// Level 2 enemy types
const L2_TYPE_PIG_HERO     = 4;  // capybara.png — splits into 2 mini enemies on death
const L2_TYPE_PIG_ENGINEER = 5;  // pig_engineer.png — periodic shield (3s immune / 2s vulnerable)
const L2_TYPE_ELEPHANT     = 6;  // elephant.png — charge + fire rate debuff
const L2_TYPE_MINI         = 7;  // split spawn (no special skills)
const L2_TYPE_COW_GUN      = 9;  // cow_gun.png — armed cow (high attack power)

const L2_KILL_SCORES = {
    [L2_TYPE_PIG_HERO]:     15,
    [L2_TYPE_PIG_ENGINEER]: 30,
    [L2_TYPE_ELEPHANT]:     40,
    [L2_TYPE_MINI]:          5,
    [L2_TYPE_COW_GUN]:      25,
};

// pig_engineer sprite sheet
const PIG_ENGINEER_FRAME_COUNT = 24;
const PIG_ENGINEER_FRAME_SIZE  = 128;

// ============================================================
// TALENT SYSTEM — purchased with gems (boss drops)
// ============================================================
const TALENT_DEFS = [
    {
        id: 'damage',
        name: 'ATTACK BOOST',
        desc: 'Increases base damage of all weapons',
        icon: '⚔️',
        color: '#ff7755',
        colorHex: 0xff7755,
        maxLevel: 8,
        gemCosts: [2, 4, 7, 12, 20, 30, 45, 65],
        effectDesc: (lv) => `+${lv * 15}% DMG`,
    },
    {
        id: 'squad',
        name: 'ELITE RECRUIT',
        desc: 'Increases starting squad size',
        icon: '🪖',
        color: '#44aaff',
        colorHex: 0x44aaff,
        maxLevel: 8,
        gemCosts: [2, 4, 7, 12, 20, 30, 45, 65],
        effectDesc: (lv) => `+${lv} TROOPS`,
    },
    {
        id: 'fireRate',
        name: 'RAPID FIRE',
        desc: 'Increases fire rate of all weapons',
        icon: '💨',
        color: '#44ffcc',
        colorHex: 0x44ffcc,
        maxLevel: 7,
        gemCosts: [4, 7, 12, 20, 30, 45, 65],
        effectDesc: (lv) => `-${lv * 8}% INTERVAL`,
    },
    {
        id: 'armor',
        name: 'ARMOR BOOST',
        desc: 'Permanently reduces troop loss per hit by 1',
        icon: '🛡️',
        color: '#44aaff',
        colorHex: 0x44aaff,
        maxLevel: 6,
        gemCosts: [3, 7, 14, 24, 38, 58],
        effectDesc: (lv) => `−${lv} HIT DMG`,
        isArmor: true, // special flag: reads/writes playerData.armor instead of playerData.talents
    },
    {
        id: 'luck',
        name: 'LUCKY BREAK',
        desc: 'Increases chance of high-value gates and weapon gates',
        icon: '🍀',
        color: '#ffcc00',
        colorHex: 0xffcc00,
        maxLevel: 6,
        gemCosts: [3, 6, 12, 20, 32, 48],
        effectDesc: (lv) => `+${lv * 12}% LUCK`,
    },
];

// ============================================================
// PISTOL TIER DEFINITIONS — shop-purchasable base weapons
// Equipped tier persists in playerData.equippedPistolTier
// ============================================================
const PISTOL_TIERS = [
    {
        name: 'PISTOL', colorStr: '#ffff88', colorHex: 0xffff88, pierce: false, price: 0, requireLevel: 1, desc: 'Basic single-shot, faithful sidearm',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
            <rect x="4" y="13" width="17" height="6" rx="2" fill="#ffff88"/>
            <rect x="19" y="14" width="9" height="4" rx="1" fill="#aaaa44"/>
            <rect x="27" y="15" width="4" height="2" fill="#ffff88"/>
            <rect x="7" y="18" width="5" height="6" rx="1" fill="#aaaa44"/>
        </svg>`,
    },
    {
        name: 'MAGNUM', colorStr: '#ff7733', colorHex: 0xff7733, pierce: false, price: 40, requireLevel: 5, desc: 'Heavy slug, wider and brighter shot',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
            <rect x="4" y="14" width="10" height="4" rx="1" fill="#ff7733"/>
            <circle cx="14" cy="16" r="5" fill="#aa4411"/>
            <circle cx="14" cy="16" r="2" fill="#ff7733"/>
            <rect x="18" y="14" width="10" height="4" rx="1" fill="#ff7733"/>
            <rect x="8" y="19" width="5" height="7" rx="1" fill="#aa4411"/>
        </svg>`,
    },
    {
        name: 'SMG', colorStr: '#88ff44', colorHex: 0x88ff44, pierce: false, price: 100, requireLevel: 10, desc: 'Dual-stream barrage, sustained suppression',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
            <rect x="3" y="13" width="22" height="7" rx="2" fill="#88ff44"/>
            <rect x="24" y="14" width="5" height="5" rx="1" fill="#44aa22"/>
            <rect x="10" y="19" width="9" height="6" rx="1" fill="#44aa22"/>
            <rect x="5" y="20" width="4" height="5" rx="1" fill="#44aa22"/>
        </svg>`,
    },
    {
        name: 'AP RIFLE', colorStr: '#44ddff', colorHex: 0x44ddff, pierce: true, price: 200, requireLevel: 15, desc: 'Armor-piercing, penetrates all targets',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
            <rect x="2" y="14" width="26" height="5" rx="1" fill="#44ddff"/>
            <rect x="4" y="18" width="14" height="7" rx="2" fill="#2288aa"/>
            <rect x="8" y="20" width="4" height="5" fill="#2288aa"/>
            <polygon points="28,14 32,16.5 28,19" fill="#44ddff"/>
        </svg>`,
    },
    {
        name: 'PARTICLE GUN', colorStr: '#cc44ff', colorHex: 0xcc44ff, pierce: true, price: 350, requireLevel: 20, desc: 'Particle beam, pierce + halo effect',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
            <rect x="4" y="12" width="18" height="9" rx="3" fill="#882299"/>
            <rect x="20" y="11" width="8" height="11" rx="2" fill="#cc44ff"/>
            <circle cx="28" cy="16" r="3" fill="#882299" opacity="0.9"/>
            <circle cx="28" cy="16" r="1.5" fill="#ffffff" opacity="0.7"/>
            <rect x="7" y="20" width="5" height="6" rx="1" fill="#882299"/>
        </svg>`,
    },
    {
        name: 'PLASMA', colorStr: '#00ffee', colorHex: 0x00ffee, pierce: true, price: 550, requireLevel: 25, desc: 'Plasma stream, powerful penetrating beam',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
            <rect x="3" y="12" width="20" height="9" rx="4" fill="#009988"/>
            <circle cx="13" cy="16" r="3.5" fill="#00ffee" opacity="0.5"/>
            <rect x="21" y="12" width="7" height="9" rx="2" fill="#00ffee"/>
            <rect x="27" y="14" width="5" height="5" rx="1" fill="#00ffee" opacity="0.7"/>
            <rect x="5" y="20" width="6" height="6" rx="1" fill="#009988"/>
        </svg>`,
    },
    {
        name: 'QUANTUM', colorStr: '#ffdd00', colorHex: 0xffdd00, pierce: true, price: 800, requireLevel: 30, desc: 'Quantum annihilation, ultimate sidearm',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
            <rect x="3" y="11" width="20" height="11" rx="4" fill="#aa8800"/>
            <circle cx="13" cy="16" r="4" fill="#ffdd00" opacity="0.4"/>
            <circle cx="13" cy="16" r="2" fill="#ffffff" opacity="0.6"/>
            <rect x="21" y="10" width="7" height="13" rx="3" fill="#ffdd00"/>
            <rect x="27" y="13" width="5" height="7" rx="1" fill="#ffdd00"/>
            <circle cx="30" cy="16" r="2" fill="#ffffff" opacity="0.8"/>
            <rect x="5" y="21" width="8" height="6" rx="2" fill="#aa8800"/>
        </svg>`,
    },
];

// ============================================================
// SHOP & COIN SYSTEM
// ============================================================
const COIN_DROP_BASE = 5;       // Base coins dropped by boss
const COIN_DROP_PER_LEVEL = 3;  // Extra coins per boss level
const COIN_MAGNET_RANGE = 80;   // Auto-pickup range for coins

// Cooldown (seconds) after using invincibility shield
const SKILL_SHARED_COOLDOWN = 5;

// Shop weapon definitions: consumable charges purchased with coins
// Each purchase = 1 charge. All weapons share ONE cooldown after any activation expires.
// SVG weapon icons (inline data URIs for consistent cross-platform rendering)
const WEAPON_ICONS = {
    shotgun: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
        <rect x="4" y="13" width="22" height="4" rx="1" fill="#ff9900"/>
        <rect x="6" y="17" width="4" height="6" rx="1" fill="#cc7700"/>
        <rect x="24" y="11" width="4" height="3" fill="#ff9900"/>
        <rect x="24" y="15" width="4" height="3" fill="#ff9900"/>
        <rect x="24" y="13" width="4" height="3" fill="#ffbb44"/>
        <circle cx="27" cy="12" r="1.5" fill="#ffdd88"/>
        <circle cx="27" cy="16" r="1.5" fill="#ffdd88"/>
    </svg>`,
    laser: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
        <rect x="3" y="13" width="18" height="6" rx="2" fill="#008899"/>
        <rect x="19" y="11" width="8" height="10" rx="1" fill="#00aacc"/>
        <rect x="27" y="14" width="3" height="4" fill="#00ffff"/>
        <rect x="7" y="15" width="10" height="2" fill="#00ffff" opacity="0.6"/>
        <circle cx="28.5" cy="16" r="2" fill="#00ffff" opacity="0.8"/>
        <rect x="5" y="19" width="3" height="5" rx="1" fill="#006677"/>
    </svg>`,
    rocket: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
        <rect x="6" y="12" width="16" height="8" rx="2" fill="#556655"/>
        <rect x="20" y="10" width="6" height="12" rx="1" fill="#ff4444"/>
        <polygon points="26,10 30,16 26,22" fill="#ff6644"/>
        <rect x="3" y="14" width="5" height="4" rx="1" fill="#445544"/>
        <rect x="8" y="19" width="3" height="4" fill="#ff8844" opacity="0.8"/>
        <circle cx="28" cy="16" r="2" fill="#ffaa44"/>
    </svg>`,
    invincibility: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
        <path d="M16 3 L27 8 L27 16 C27 23 16 29 16 29 C16 29 5 23 5 16 L5 8 Z" fill="#ccaa00" stroke="#ffdd44" stroke-width="1.5"/>
        <path d="M16 7 L24 10.5 L24 16 C24 21 16 26 16 26 C16 26 8 21 8 16 L8 10.5 Z" fill="#ffdd44"/>
        <path d="M14 14 L16 18 L20 12" stroke="#886600" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    stimulant: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
        <rect x="13" y="3" width="6" height="10" rx="2" fill="#44ff88"/>
        <rect x="11" y="11" width="10" height="14" rx="3" fill="#22cc66"/>
        <rect x="13" y="25" width="6" height="4" rx="1" fill="#44ff88"/>
        <line x1="16" y1="14" x2="16" y2="22" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
        <line x1="12" y1="18" x2="20" y2="18" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
        <circle cx="23" cy="8" r="3" fill="#aaff44" opacity="0.9"/>
        <circle cx="9" cy="10" r="2" fill="#aaff44" opacity="0.7"/>
    </svg>`,
};

const SHOP_WEAPONS = {
    // Passive upgrade weapons: buy levels 1→2→3 with coins, always active when equipped
    shotgun: {
        name: 'SHOTGUN',
        desc: 'Fan spread, devastating at close range',
        icon: WEAPON_ICONS.shotgun,
        upgradePrices: [55, 200, 400], // Lv1, Lv2, Lv3
        color: '#ff9900',
        colorHex: 0xff9900,
    },
    laser: {
        name: 'LASER CANNON',
        desc: 'Piercing beam, passes through all enemies',
        icon: WEAPON_ICONS.laser,
        upgradePrices: [85, 280, 560],
        color: '#00ffff',
        colorHex: 0x00ffff,
    },
    rocket: {
        name: 'ROCKET LAUNCHER',
        desc: 'AOE explosion, area destruction',
        icon: WEAPON_ICONS.rocket,
        upgradePrices: [130, 400, 800],
        color: '#ff4444',
        colorHex: 0xff4444,
    },
    // Consumable special-effect items (special tab only)
    invincibility: {
        name: 'INVINCIBILITY SHIELD',
        desc: 'Immune to all damage for 4 seconds after activation',
        icon: WEAPON_ICONS.invincibility,
        price: 55,
        color: '#ffdd44',
        colorHex: 0xffdd44,
        duration: 4,
        hotkey: '1',
        defenseOnly: true, // shown in special tab only
    },
    stimulant: {
        name: 'STIMULANT',
        desc: 'Troops x2 and all damage halved for 10 seconds',
        icon: WEAPON_ICONS.stimulant,
        price: 80,
        color: '#44ff88',
        colorHex: 0x44ff88,
        duration: 10,
        hotkey: '2',
        defenseOnly: true, // shown in special tab only
    },
};

// ============================================================
// ARMOR SYSTEM — purchased with coins, permanent passive
// ============================================================
const SHOP_ARMOR = [
    { level: 1, name: 'LIGHT ARMOR',  icon: '🔰', desc: 'Reduce troop loss per hit by 1',            price: 25,  color: '#44aaff', colorHex: 0x44aaff },
    { level: 2, name: 'HEAVY ARMOR',  icon: '⚙️',  desc: 'Further reduce damage by 1 (total −2)',   price: 60, color: '#2266ee', colorHex: 0x2266ee },
    { level: 3, name: 'IRON WILL',    icon: '🏰', desc: 'Further reduce damage by 1 (total −3)',    price: 120, color: '#9944ff', colorHex: 0x9944ff },
];

// ============================================================
// LEVEL SYSTEM — per-run XP from boss kills (normal dist), attribute scaling
// Max level: 30 | Lv30 reachable around wave 60 in a skilled run
// ============================================================
const LEVEL_CONFIG = {
    maxLevel: 30,

    // Cumulative XP thresholds (29 entries; index i = total XP to reach level i+2)
    // Incremental per level = floor(100 * 1.50^i): Lv1→2=100, Lv2→3=150, Lv3→4=225, ...
    // Expected milestones: Lv2@wave5, Lv4@wave10, Lv8@wave20, Lv13@wave30
    xpThresholds: (function() {
        const t = [];
        let cum = 0;
        for (let i = 0; i < 29; i++) {
            cum += Math.floor(100 * Math.pow(1.50, i));
            t.push(cum);
        }
        return t; // [100, 250, 475, 812, 1318, 2077, ...]
    })(),

    // Per-level bonuses (index = level-1), formula-generated for smooth curves:
    //   damageMult  : 1.00 (Lv1) → 3.20 (Lv30)  — mix of linear + quadratic
    //   fireRateMult: 1.00 (Lv1) → 0.70 (Lv30)  — sqrt curve (diminishing returns)
    //   squadBonus  : 0    (Lv1) → 10   (Lv30)  — +1 every 3 levels
    bonuses: (function() {
        const arr = [];
        for (let lv = 1; lv <= 30; lv++) {
            const t = (lv - 1) / 29; // 0 at Lv1, 1 at Lv30
            arr.push({
                damageMult:   Math.round((1 + 2.2 * (t * t * 0.3 + t * 0.7)) * 100) / 100,
                fireRateMult: Math.round((1 - 0.30 * (Math.sqrt(t) * 0.6 + t * 0.4)) * 100) / 100,
                squadBonus:   Math.floor(lv / 3),
            });
        }
        return arr;
    })(),

    // Boss XP drop — normally distributed, exponential scaling with boss progression
    // mean = normalBase × growthBase^(bossLvl−1), bossLvl = floor(wave/5)
    // Wave5=200, Wave10=616(mega), Wave20=1208(mega), Wave30=2367(mega), Wave50=9090(mega)
    bossXp: {
        normalBase:   200,  // base mean XP for bossLvl=1 normal boss
        growthBase:   1.40, // exponential multiplier per boss level (steeper late-game)
        megaMult:     2.2,  // mega boss XP multiplier vs normal
        sigmaFrac:    0.20, // σ = mean × sigmaFrac  (20% spread)
        minFrac:      0.50, // hard clamp floor = mean × minFrac
        maxFrac:      1.80, // hard clamp ceiling = mean × maxFrac
    },

    // Normal enemy XP — power-curve scaling with wave
    // xp = base + floor(step ^ exp), step = floor(wave / wavePerStep)
    // Wave5=2, Wave10=3, Wave20=9, Wave30=15, Wave40=23, Wave50=32
    killXp: {
        base:        1,    // XP at wave 1
        wavePerStep: 5,    // step size in waves
        exp:         1.5,  // power exponent — controls steepness
        heavyMult:   2,    // heavy enemy multiplier
    },
};
