// ============================================================
// ACHIEVEMENT SYSTEM
// ============================================================

// --- Lifetime stats (persisted in playerData.stats) ---
function _defaultStats() {
    return {
        totalKills: 0, totalBossKills: 0, totalMegaBossKills: 0,
        totalCoinsEarned: 0, totalGemsEarned: 0,
        bestComboEver: 0, highestSquad: 0,
        bestWaveL1: 0, bestWaveL2: 0, bestScoreL1: 0, bestScoreL2: 0,
        totalGamesPlayed: 0, totalRevives: 0,
        chainExplosions: 0,
        weaponUpgradesBought: 0, talentLevelsBought: 0,
        bossZeroLossWaves: 0,
    };
}

function ensureStats() {
    if (!playerData.stats) playerData.stats = _defaultStats();
    const def = _defaultStats();
    for (const k of Object.keys(def)) {
        if (playerData.stats[k] === undefined) playerData.stats[k] = def[k];
    }
    if (!playerData.achievements) playerData.achievements = {};
}

function addStat(key, delta) {
    ensureStats();
    playerData.stats[key] = (playerData.stats[key] || 0) + (delta || 1);
    markPlayerDataDirty();
}

function setStat(key, val) {
    ensureStats();
    if (val > (playerData.stats[key] || 0)) {
        playerData.stats[key] = val;
        markPlayerDataDirty();
    }
}

// --- Achievement definitions ---
// tier: number of tiers (1 or 3). goals/rewards arrays per tier.
// rewardType: 'coins' or 'gems'
const ACHIEVEMENTS = {
    // === COMBAT ===
    kill_count: {
        name: 'Slayer', icon: '\u2694\uFE0F', category: 'combat',
        desc: ['Kill 100 enemies', 'Kill 500 enemies', 'Kill 2000 enemies'],
        tiers: 3, goals: [100, 500, 2000],
        check: (s) => s.totalKills,
        rewards: [{ coins: 20 }, { coins: 60 }, { coins: 200 }],
    },
    combo_king: {
        name: 'Combo King', icon: '\uD83D\uDD25', category: 'combat',
        desc: ['Reach 10x combo', 'Reach 30x combo', 'Reach 60x combo'],
        tiers: 3, goals: [10, 30, 60],
        check: (s) => s.bestComboEver,
        rewards: [{ coins: 15 }, { coins: 50 }, { gems: 3 }],
    },
    boss_hunter: {
        name: 'Boss Hunter', icon: '\uD83D\uDC32', category: 'combat',
        desc: ['Defeat 5 bosses', 'Defeat 20 bosses', 'Defeat 50 bosses'],
        tiers: 3, goals: [5, 20, 50],
        check: (s) => s.totalBossKills,
        rewards: [{ coins: 30 }, { coins: 80 }, { gems: 5 }],
    },
    mega_slayer: {
        name: 'Mega Slayer', icon: '\uD83D\uDCA5', category: 'combat',
        desc: ['Defeat a Mega Boss'],
        tiers: 1, goals: [1],
        check: (s) => s.totalMegaBossKills,
        rewards: [{ gems: 3 }],
    },
    final_showdown: {
        name: 'Final Showdown', icon: '\uD83C\uDFC6', category: 'combat',
        desc: ['Beat wave 66 dual boss'],
        tiers: 1, goals: [1],
        check: (s) => s.bestWaveL1 >= 66 ? 1 : 0,
        rewards: [{ gems: 10 }],
    },

    // === PROGRESSION ===
    wave_surfer: {
        name: 'Wave Surfer', icon: '\uD83C\uDF0A', category: 'progression',
        desc: ['Reach wave 10', 'Reach wave 30', 'Reach wave 60'],
        tiers: 3, goals: [10, 30, 60],
        check: (s) => Math.max(s.bestWaveL1, s.bestWaveL2),
        rewards: [{ coins: 15 }, { coins: 50 }, { coins: 150 }],
    },
    veteran: {
        name: 'Veteran', icon: '\u2B50', category: 'progression',
        desc: ['Reach level 10', 'Reach level 20', 'Reach level 30'],
        tiers: 3, goals: [10, 20, 30],
        check: () => playerData.level || 1,
        rewards: [{ coins: 30 }, { coins: 80 }, { gems: 5 }],
    },
    score_chaser: {
        name: 'Score Chaser', icon: '\uD83C\uDFAF', category: 'progression',
        desc: ['Score 500 pts', 'Score 3000 pts', 'Score 10000 pts'],
        tiers: 3, goals: [500, 3000, 10000],
        check: (s) => Math.max(s.bestScoreL1, s.bestScoreL2),
        rewards: [{ coins: 25 }, { coins: 60 }, { coins: 150 }],
    },
    victory: {
        name: 'Victory', icon: '\uD83D\uDE80', category: 'progression',
        desc: ['Complete Level 1'],
        tiers: 1, goals: [1],
        check: (s) => s.bestWaveL1 >= 66 ? 1 : 0,
        rewards: [{ gems: 5 }],
    },
    hell_conqueror: {
        name: 'Hell Conqueror', icon: '\uD83D\uDD25', category: 'progression',
        desc: ['L2 wave 20', 'L2 wave 50', 'L2 wave 88'],
        tiers: 3, goals: [20, 50, 88],
        check: (s) => s.bestWaveL2,
        rewards: [{ coins: 50 }, { gems: 3 }, { gems: 15 }],
    },

    // === COLLECTION ===
    gold_rush: {
        name: 'Gold Rush', icon: '\uD83E\uDE99', category: 'collection',
        desc: ['Earn 200 coins', 'Earn 1000 coins', 'Earn 5000 coins'],
        tiers: 3, goals: [200, 1000, 5000],
        check: (s) => s.totalCoinsEarned,
        rewards: [{ coins: 30 }, { coins: 80 }, { gems: 3 }],
    },
    gem_collector: {
        name: 'Gem Collector', icon: '\uD83D\uDC8E', category: 'collection',
        desc: ['Earn 30 gems', 'Earn 150 gems', 'Earn 500 gems'],
        tiers: 3, goals: [30, 150, 500],
        check: (s) => s.totalGemsEarned,
        rewards: [{ coins: 30 }, { coins: 80 }, { coins: 200 }],
    },
    treasure_run: {
        name: 'Treasure Run', icon: '\uD83D\uDCB0', category: 'collection',
        desc: ['Collect 80+ coins in a single run'],
        tiers: 1, goals: [1],
        check: () => _achTempFlags.treasureRun ? 1 : 0,
        rewards: [{ gems: 2 }],
    },

    // === ARSENAL ===
    first_upgrade: {
        name: 'First Upgrade', icon: '\uD83D\uDD27', category: 'arsenal',
        desc: ['Buy first weapon upgrade'],
        tiers: 1, goals: [1],
        check: (s) => s.weaponUpgradesBought >= 1 ? 1 : 0,
        rewards: [{ coins: 20 }],
    },
    full_arsenal: {
        name: 'Full Arsenal', icon: '\uD83D\uDEE1\uFE0F', category: 'arsenal',
        desc: ['All 3 weapons to Lv3'],
        tiers: 1, goals: [1],
        check: () => {
            const wl = playerData.weaponLevels || {};
            return (wl.shotgun >= 3 && wl.laser >= 3 && wl.rocket >= 3) ? 1 : 0;
        },
        rewards: [{ gems: 8 }],
    },
    quantum_era: {
        name: 'Quantum Era', icon: '\u26A1', category: 'arsenal',
        desc: ['Unlock Quantum Pistol'],
        tiers: 1, goals: [1],
        check: () => (playerData.ownedPistolTiers || []).includes(6) ? 1 : 0,
        rewards: [{ gems: 5 }],
    },
    talent_master: {
        name: 'Talent Master', icon: '\uD83C\uDF1F', category: 'arsenal',
        desc: ['5 talent levels', '15 talent levels'],
        tiers: 2, goals: [5, 15],
        check: (s) => s.talentLevelsBought,
        rewards: [{ gems: 2 }, { gems: 5 }],
    },
    iron_fortress: {
        name: 'Iron Fortress', icon: '\uD83D\uDEE1\uFE0F', category: 'arsenal',
        desc: ['Max armor (Lv3)'],
        tiers: 1, goals: [1],
        check: () => (playerData.armor || 0) >= 3 ? 1 : 0,
        rewards: [{ gems: 2 }],
    },

    // === SURVIVAL ===
    army_builder: {
        name: 'Army Builder', icon: '\uD83D\uDC51', category: 'survival',
        desc: ['Peak squad 30', 'Peak squad 50', 'Peak squad 80'],
        tiers: 3, goals: [30, 50, 80],
        check: (s) => s.highestSquad,
        rewards: [{ coins: 20 }, { coins: 50 }, { gems: 5 }],
    },
    no_casualties: {
        name: 'No Casualties', icon: '\uD83D\uDEE1\uFE0F', category: 'survival',
        desc: ['Boss wave with 0 troop loss'],
        tiers: 1, goals: [1],
        check: (s) => s.bossZeroLossWaves >= 1 ? 1 : 0,
        rewards: [{ gems: 3 }],
    },
    phoenix_rising: {
        name: 'Phoenix Rising', icon: '\uD83D\uDD25', category: 'survival',
        desc: ['Revive then complete the level'],
        tiers: 1, goals: [1],
        check: () => _achTempFlags.phoenixRising ? 1 : 0,
        rewards: [{ gems: 5 }],
    },
    iron_will: {
        name: 'Iron Will', icon: '\uD83D\uDCAA', category: 'survival',
        desc: ['Wave 25+, 0 revives, ≤3 troops lost'],
        tiers: 1, goals: [1],
        check: () => _achTempFlags.ironWill ? 1 : 0,
        rewards: [{ gems: 8 }],
    },

    // === SPECIAL ===
    chain_reaction: {
        name: 'Chain Reaction', icon: '\uD83D\uDCA3', category: 'special',
        desc: ['3+ barrel chain explosion'],
        tiers: 1, goals: [1],
        check: (s) => s.chainExplosions >= 1 ? 1 : 0,
        rewards: [{ gems: 2 }],
    },
    speed_kill: {
        name: 'Speed Kill', icon: '\u26A1', category: 'special',
        desc: ['Kill a boss within 5s of spawn'],
        tiers: 1, goals: [1],
        check: () => _achTempFlags.speedKill ? 1 : 0,
        rewards: [{ gems: 3 }],
    },
    marathon: {
        name: 'Marathon', icon: '\uD83C\uDFC3', category: 'special',
        desc: ['Play 10 games', 'Play 30 games', 'Play 100 games'],
        tiers: 3, goals: [10, 30, 100],
        check: (s) => s.totalGamesPlayed,
        rewards: [{ coins: 20 }, { coins: 60 }, { gems: 3 }],
    },
    perfectionist: {
        name: 'Perfectionist', icon: '\uD83D\uDC8E', category: 'special',
        desc: ['Unlock all other achievements (max tier)'],
        tiers: 1, goals: [1],
        check: () => {
            const achs = playerData.achievements || {};
            for (const [id, def] of Object.entries(ACHIEVEMENTS)) {
                if (id === 'perfectionist') continue;
                const cur = achs[id] || 0;
                if (cur < def.tiers) return 0;
            }
            return 1;
        },
        rewards: [{ gems: 20 }],
    },
};

const ACH_CATEGORIES = [
    { key: 'combat',      name: 'Combat',      color: '#ff4444' },
    { key: 'progression',  name: 'Progression', color: '#44aaff' },
    { key: 'collection',   name: 'Collection',  color: '#ffd700' },
    { key: 'arsenal',      name: 'Arsenal',     color: '#ff8800' },
    { key: 'survival',     name: 'Survival',    color: '#44ff88' },
    { key: 'special',      name: 'Special',     color: '#cc44ff' },
];

// Temporary per-run flags (reset at game start)
let _achTempFlags = {};

function resetAchTempFlags() {
    _achTempFlags = {
        treasureRun: false,
        phoenixRising: false,
        ironWill: false,
        speedKill: false,
    };
}

// --- Toast queue for in-game notifications ---
let _achToastQueue = [];
let _achCurrentToast = null;

function _queueAchToast(achId, tier) {
    const def = ACHIEVEMENTS[achId];
    if (!def) return;
    _achToastQueue.push({ id: achId, name: def.name, icon: def.icon, tier, desc: def.desc[tier - 1] });
}

// --- Core: check & unlock ---
// Returns array of newly unlocked { id, tier } objects
function checkAchievements() {
    ensureStats();
    const stats = playerData.stats;
    const achs = playerData.achievements;
    const unlocked = [];

    for (const [id, def] of Object.entries(ACHIEVEMENTS)) {
        const currentTier = achs[id] || 0;
        if (currentTier >= def.tiers) continue; // fully unlocked

        const value = def.check(stats);
        // Check all tiers above current
        for (let t = currentTier; t < def.tiers; t++) {
            if (value >= def.goals[t]) {
                achs[id] = t + 1;
                unlocked.push({ id, tier: t + 1 });
                _queueAchToast(id, t + 1);
            } else {
                break; // can't skip tiers
            }
        }
    }

    if (unlocked.length > 0) {
        savePlayerData(playerData);
    }
    return unlocked;
}

// --- Claim reward ---
function claimAchievementReward(achId, tier) {
    ensureStats();
    const def = ACHIEVEMENTS[achId];
    if (!def) return false;
    const currentTier = playerData.achievements[achId] || 0;
    if (tier > currentTier) return false; // not unlocked yet

    // Track claimed rewards
    if (!playerData.achievementsClaimed) playerData.achievementsClaimed = {};
    const claimedTier = playerData.achievementsClaimed[achId] || 0;
    if (tier <= claimedTier) return false; // already claimed

    // Award all unclaimed tiers up to the requested tier
    for (let t = claimedTier; t < tier; t++) {
        const reward = def.rewards[t];
        if (reward.coins) playerData.coins += reward.coins;
        if (reward.gems)  playerData.gems  += reward.gems;
    }
    playerData.achievementsClaimed[achId] = tier;
    savePlayerData(playerData);
    return true;
}

// --- Game-end stats update ---
function updateEndOfGameStats() {
    if (!game) return;
    const g = game;
    ensureStats();

    addStat('totalGamesPlayed', 1);
    setStat('bestComboEver', g.bestCombo);
    setStat('highestSquad', g.peakSquad);

    if (g.currentLevel === 1) {
        setStat('bestWaveL1', g.wave);
        setStat('bestScoreL1', g.score);
    } else {
        setStat('bestWaveL2', g.wave);
        setStat('bestScoreL2', g.score);
    }

    // Treasure run check
    if (g.coinsCollected >= 80) _achTempFlags.treasureRun = true;

    // Iron will check: wave 25+, 0 revives, lost ≤3 troops
    if (g.wave >= 25 && g.reviveCount === 0 && (g.peakSquad - g.squadCount) <= 3) {
        _achTempFlags.ironWill = true;
    }

    // Phoenix rising: used revive AND completed level
    if (g.reviveCount > 0 && g.levelCompleted) {
        _achTempFlags.phoenixRising = true;
    }

    savePlayerData(playerData);
    checkAchievements();
}

// --- HUD: draw toast ---
function drawAchievementToast() {
    // Manage current toast lifecycle
    if (!_achCurrentToast && _achToastQueue.length > 0) {
        _achCurrentToast = _achToastQueue.shift();
        _achCurrentToast.timer = 0;
        _achCurrentToast.maxTimer = 180; // ~3 seconds
    }
    if (!_achCurrentToast) return;

    const toast = _achCurrentToast;
    toast.timer++;
    if (toast.timer >= toast.maxTimer) {
        _achCurrentToast = null;
        return;
    }

    const t = toast.timer / toast.maxTimer;
    let alpha;
    if (t < 0.1) alpha = t / 0.1;
    else if (t < 0.75) alpha = 1;
    else alpha = 1 - (t - 0.75) / 0.25;
    if (alpha <= 0) return;

    const cx = screenW / 2;
    const cy = screenH - 60;
    const tw = Math.min(320, screenW * 0.7);
    const th = 48;

    push();
    // Background pill
    hexFill(0x1a1a2e, Math.floor(0.85 * alpha * 255)); noStroke();
    rect(cx - tw / 2, cy - th / 2, tw, th, th / 2);
    hexStroke(0xffd700, Math.floor(0.6 * alpha * 255)); strokeWeight(1.5); noFill();
    rect(cx - tw / 2, cy - th / 2, tw, th, th / 2);

    // Icon + text
    textFont('Arial'); textAlign(CENTER, CENTER);
    drawingContext.shadowColor = `rgba(255,215,0,${0.4 * alpha})`; drawingContext.shadowBlur = 10;

    textSize(20);
    hexFill(0xffffff, Math.floor(alpha * 255)); noStroke();
    text(toast.icon, cx - tw / 2 + 28, cy);

    textSize(14); textStyle(BOLD);
    hexFill(0xffd700, Math.floor(alpha * 255));
    text(toast.name, cx, cy - 8);

    textSize(11); textStyle(NORMAL);
    hexFill(0xaaaacc, Math.floor(alpha * 0.9 * 255));
    text(toast.desc, cx, cy + 10);

    drawingContext.shadowBlur = 0; drawingContext.shadowColor = 'transparent';
    pop();
}

// ============================================================
// ACHIEVEMENT PANEL UI (HTML overlay)
// ============================================================
function showAchievementPanel() {
    ensureStats();
    const stats = playerData.stats;
    const achs = playerData.achievements || {};
    const claimed = playerData.achievementsClaimed || {};

    let html = `
    <div id="achPanel" style="position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.92);overflow-y:auto;padding:20px;font-family:Arial,sans-serif;">
        <div style="max-width:520px;margin:0 auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
                <h2 style="color:#ffd700;margin:0;font-size:24px;">ACHIEVEMENTS</h2>
                <button onclick="closeAchievementPanel()" style="background:none;border:1px solid #666;color:#ccc;padding:6px 16px;border-radius:6px;cursor:pointer;font-size:14px;">CLOSE</button>
            </div>
            <div style="color:#888;font-size:13px;margin-bottom:16px;">
                ${_countUnlockedAchs()} / ${_countTotalAchs()} unlocked
            </div>`;

    for (const cat of ACH_CATEGORIES) {
        const catAchs = Object.entries(ACHIEVEMENTS).filter(([, d]) => d.category === cat.key);
        if (catAchs.length === 0) continue;

        html += `<div style="margin-bottom:20px;">
            <div style="color:${cat.color};font-size:15px;font-weight:bold;margin-bottom:10px;border-bottom:1px solid ${cat.color}33;padding-bottom:4px;">${cat.name}</div>`;

        for (const [id, def] of catAchs) {
            const curTier = achs[id] || 0;
            const claimedTier = claimed[id] || 0;
            const maxTier = def.tiers;
            const value = def.check(stats);

            for (let t = 0; t < maxTier; t++) {
                const tierNum = t + 1;
                const unlocked = curTier >= tierNum;
                const isClaimed = claimedTier >= tierNum;
                const goal = def.goals[t];
                const progress = Math.min(value, goal);
                const pct = Math.min(100, Math.floor(progress / goal * 100));
                const reward = def.rewards[t];
                const rewardStr = reward.coins ? `${reward.coins} coins` : `${reward.gems} gems`;
                const rewardColor = reward.coins ? '#ffd700' : '#cc44ff';
                const tierLabel = maxTier > 1 ? ` ${'I'.repeat(tierNum)}` : '';

                // Skip if previous tier in same achievement is not yet shown
                if (t > 0 && curTier < t) continue;

                const borderColor = unlocked ? (isClaimed ? '#333' : '#ffd700') : '#222';
                const bgColor = unlocked ? (isClaimed ? '#0a0a14' : '#1a1a0a') : '#0a0a14';
                const opacity = isClaimed ? '0.5' : '1';

                html += `<div style="background:${bgColor};border:1px solid ${borderColor};border-radius:8px;padding:10px 12px;margin-bottom:8px;opacity:${opacity};">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <span style="font-size:18px;margin-right:6px;">${def.icon}</span>
                            <span style="color:#eee;font-size:14px;font-weight:bold;">${def.name}${tierLabel}</span>
                        </div>
                        <div style="color:${rewardColor};font-size:12px;">${rewardStr}</div>
                    </div>
                    <div style="color:#999;font-size:12px;margin:4px 0 6px 0;">${def.desc[t]}</div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div style="flex:1;height:6px;background:#222;border-radius:3px;overflow:hidden;">
                            <div style="width:${pct}%;height:100%;background:${unlocked ? '#ffd700' : cat.color};border-radius:3px;transition:width 0.3s;"></div>
                        </div>
                        <span style="color:#888;font-size:11px;min-width:60px;text-align:right;">${progress} / ${goal}</span>
                        ${unlocked && !isClaimed ? `<button onclick="claimAndRefresh('${id}',${tierNum})" style="background:linear-gradient(180deg,#f0c040,#c87800);border:none;color:#000;padding:3px 10px;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;">CLAIM</button>` : ''}
                        ${isClaimed ? '<span style="color:#555;font-size:11px;">Claimed</span>' : ''}
                    </div>
                </div>`;
            }
        }
        html += `</div>`;
    }

    html += `</div></div>`;

    // Remove existing panel if any
    closeAchievementPanel();
    const div = document.createElement('div');
    div.id = 'achPanelWrap';
    div.innerHTML = html;
    document.body.appendChild(div);
}

function closeAchievementPanel() {
    const el = document.getElementById('achPanelWrap');
    if (el) el.remove();
}

function claimAndRefresh(achId, tier) {
    if (claimAchievementReward(achId, tier)) {
        playSound('gate_good');
        showAchievementPanel(); // re-render
    }
}

function _countUnlockedAchs() {
    const achs = playerData.achievements || {};
    let count = 0;
    for (const [id, def] of Object.entries(ACHIEVEMENTS)) {
        count += Math.min(achs[id] || 0, def.tiers);
    }
    return count;
}

function _countTotalAchs() {
    let count = 0;
    for (const def of Object.values(ACHIEVEMENTS)) count += def.tiers;
    return count;
}

function _hasUnclaimedAch() {
    const achs = playerData.achievements || {};
    const claimed = playerData.achievementsClaimed || {};
    for (const id of Object.keys(ACHIEVEMENTS)) {
        if ((achs[id] || 0) > (claimed[id] || 0)) return true;
    }
    return false;
}
