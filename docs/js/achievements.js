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
        name: 'Slayer', icon: 'sword', category: 'combat',
        desc: ['Kill 100 enemies', 'Kill 500 enemies', 'Kill 2000 enemies'],
        tiers: 3, goals: [100, 500, 2000],
        check: (s) => s.totalKills,
        rewards: [{ coins: 20 }, { coins: 60 }, { coins: 200 }],
    },
    combo_king: {
        name: 'Combo King', icon: 'flame', category: 'combat',
        desc: ['Reach 10x combo', 'Reach 30x combo', 'Reach 60x combo'],
        tiers: 3, goals: [10, 30, 60],
        check: (s) => s.bestComboEver,
        rewards: [{ coins: 15 }, { coins: 50 }, { gems: 3 }],
    },
    boss_hunter: {
        name: 'Boss Hunter', icon: 'sword', category: 'combat',
        desc: ['Defeat 5 bosses', 'Defeat 20 bosses', 'Defeat 50 bosses'],
        tiers: 3, goals: [5, 20, 50],
        check: (s) => s.totalBossKills,
        rewards: [{ coins: 30 }, { coins: 80 }, { gems: 5 }],
    },
    mega_slayer: {
        name: 'Mega Slayer', icon: 'flame', category: 'combat',
        desc: ['Defeat a Mega Boss'],
        tiers: 1, goals: [1],
        check: (s) => s.totalMegaBossKills,
        rewards: [{ gems: 3 }],
    },
    final_showdown: {
        name: 'Final Showdown', icon: 'trophy', category: 'combat',
        desc: ['Beat wave 66 dual boss'],
        tiers: 1, goals: [1],
        check: (s) => s.bestWaveL1 >= 66 ? 1 : 0,
        rewards: [{ gems: 10 }],
    },

    // === PROGRESSION ===
    wave_surfer: {
        name: 'Wave Surfer', icon: 'star', category: 'progression',
        desc: ['Reach wave 10', 'Reach wave 30', 'Reach wave 60'],
        tiers: 3, goals: [10, 30, 60],
        check: (s) => Math.max(s.bestWaveL1, s.bestWaveL2),
        rewards: [{ coins: 15 }, { coins: 50 }, { coins: 150 }],
    },
    veteran: {
        name: 'Veteran', icon: 'star', category: 'progression',
        desc: ['Reach level 10', 'Reach level 20', 'Reach level 30'],
        tiers: 3, goals: [10, 20, 30],
        check: () => playerData.level || 1,
        rewards: [{ coins: 30 }, { coins: 80 }, { gems: 5 }],
    },
    score_chaser: {
        name: 'Score Chaser', icon: 'target', category: 'progression',
        desc: ['Score 500 pts', 'Score 3000 pts', 'Score 10000 pts'],
        tiers: 3, goals: [500, 3000, 10000],
        check: (s) => Math.max(s.bestScoreL1, s.bestScoreL2),
        rewards: [{ coins: 25 }, { coins: 60 }, { coins: 150 }],
    },
    victory: {
        name: 'Victory', icon: 'trophy', category: 'progression',
        desc: ['Complete Level 1'],
        tiers: 1, goals: [1],
        check: (s) => s.bestWaveL1 >= 66 ? 1 : 0,
        rewards: [{ gems: 5 }],
    },
    hell_conqueror: {
        name: 'Hell Conqueror', icon: 'flame', category: 'progression',
        desc: ['L2 wave 20', 'L2 wave 50', 'L2 wave 88'],
        tiers: 3, goals: [20, 50, 88],
        check: (s) => s.bestWaveL2,
        rewards: [{ coins: 50 }, { gems: 3 }, { gems: 15 }],
    },

    // === COLLECTION ===
    gold_rush: {
        name: 'Gold Rush', icon: 'coin', category: 'collection',
        desc: ['Earn 200 coins', 'Earn 1000 coins', 'Earn 5000 coins'],
        tiers: 3, goals: [200, 1000, 5000],
        check: (s) => s.totalCoinsEarned,
        rewards: [{ coins: 30 }, { coins: 80 }, { gems: 3 }],
    },
    gem_collector: {
        name: 'Gem Collector', icon: 'gem', category: 'collection',
        desc: ['Earn 30 gems', 'Earn 150 gems', 'Earn 500 gems'],
        tiers: 3, goals: [30, 150, 500],
        check: (s) => s.totalGemsEarned,
        rewards: [{ coins: 30 }, { coins: 80 }, { coins: 200 }],
    },
    treasure_run: {
        name: 'Treasure Run', icon: 'chest', category: 'collection',
        desc: ['Collect 80+ coins in a single run'],
        tiers: 1, goals: [1],
        check: () => _achTempFlags.treasureRun ? 1 : 0,
        rewards: [{ gems: 2 }],
    },

    // === ARSENAL ===
    first_upgrade: {
        name: 'First Upgrade', icon: 'bolt', category: 'arsenal',
        desc: ['Buy first weapon upgrade'],
        tiers: 1, goals: [1],
        check: (s) => s.weaponUpgradesBought >= 1 ? 1 : 0,
        rewards: [{ coins: 20 }],
    },
    full_arsenal: {
        name: 'Full Arsenal', icon: 'shield', category: 'arsenal',
        desc: ['All 3 weapons to Lv3'],
        tiers: 1, goals: [1],
        check: () => {
            const wl = playerData.weaponLevels || {};
            return (wl.shotgun >= 3 && wl.laser >= 3 && wl.rocket >= 3) ? 1 : 0;
        },
        rewards: [{ gems: 8 }],
    },
    quantum_era: {
        name: 'Quantum Era', icon: 'bolt', category: 'arsenal',
        desc: ['Unlock Quantum Pistol'],
        tiers: 1, goals: [1],
        check: () => (playerData.ownedPistolTiers || []).includes(6) ? 1 : 0,
        rewards: [{ gems: 5 }],
    },
    talent_master: {
        name: 'Talent Master', icon: 'star', category: 'arsenal',
        desc: ['5 talent levels', '15 talent levels'],
        tiers: 2, goals: [5, 15],
        check: (s) => s.talentLevelsBought,
        rewards: [{ gems: 2 }, { gems: 5 }],
    },
    iron_fortress: {
        name: 'Iron Fortress', icon: 'shield', category: 'arsenal',
        desc: ['Max armor (Lv3)'],
        tiers: 1, goals: [1],
        check: () => (playerData.armor || 0) >= 3 ? 1 : 0,
        rewards: [{ gems: 2 }],
    },

    // === SURVIVAL ===
    army_builder: {
        name: 'Army Builder', icon: 'crown', category: 'survival',
        desc: ['Peak squad 30', 'Peak squad 50', 'Peak squad 80'],
        tiers: 3, goals: [30, 50, 80],
        check: (s) => s.highestSquad,
        rewards: [{ coins: 20 }, { coins: 50 }, { gems: 5 }],
    },
    no_casualties: {
        name: 'No Casualties', icon: 'shield', category: 'survival',
        desc: ['Boss wave with 0 troop loss'],
        tiers: 1, goals: [1],
        check: (s) => s.bossZeroLossWaves >= 1 ? 1 : 0,
        rewards: [{ gems: 3 }],
    },
    phoenix_rising: {
        name: 'Phoenix Rising', icon: 'flame', category: 'survival',
        desc: ['Revive then complete the level'],
        tiers: 1, goals: [1],
        check: () => _achTempFlags.phoenixRising ? 1 : 0,
        rewards: [{ gems: 5 }],
    },
    iron_will: {
        name: 'Iron Will', icon: 'shield', category: 'survival',
        desc: ['Wave 25+, 0 revives, ≤3 troops lost'],
        tiers: 1, goals: [1],
        check: () => _achTempFlags.ironWill ? 1 : 0,
        rewards: [{ gems: 8 }],
    },

    // === SPECIAL ===
    chain_reaction: {
        name: 'Chain Reaction', icon: 'flame', category: 'special',
        desc: ['3+ barrel chain explosion'],
        tiers: 1, goals: [1],
        check: (s) => s.chainExplosions >= 1 ? 1 : 0,
        rewards: [{ gems: 2 }],
    },
    speed_kill: {
        name: 'Speed Kill', icon: 'bolt', category: 'special',
        desc: ['Kill a boss within 5s of spawn'],
        tiers: 1, goals: [1],
        check: () => _achTempFlags.speedKill ? 1 : 0,
        rewards: [{ gems: 3 }],
    },
    marathon: {
        name: 'Marathon', icon: 'trophy', category: 'special',
        desc: ['Play 10 games', 'Play 30 games', 'Play 100 games'],
        tiers: 3, goals: [10, 30, 100],
        check: (s) => s.totalGamesPlayed,
        rewards: [{ coins: 20 }, { coins: 60 }, { gems: 3 }],
    },
    perfectionist: {
        name: 'Perfectionist', icon: 'gem', category: 'special',
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
    _achToastQueue.push({ id: achId, name: def.name, tier, desc: def.desc[tier - 1] });
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

    // Text
    textFont('Arial'); textAlign(CENTER, CENTER);
    drawingContext.shadowColor = `rgba(255,215,0,${0.4 * alpha})`; drawingContext.shadowBlur = 10;

    textSize(14); textStyle(BOLD);
    hexFill(0xffd700, Math.floor(alpha * 255)); noStroke();
    text(toast.name, cx, cy - 8);

    textSize(11); textStyle(NORMAL);
    hexFill(0xaaaacc, Math.floor(alpha * 0.9 * 255));
    text(toast.desc, cx, cy + 10);

    drawingContext.shadowBlur = 0; drawingContext.shadowColor = 'transparent';
    pop();
}

// ============================================================
// ACHIEVEMENT PANEL UI — matches shop overlay style
// ============================================================
const _ACH_SVG = {
    coin: '<svg viewBox="0 0 18 18" width="16" height="16" style="vertical-align:-2px"><circle cx="9" cy="9" r="8.5" fill="#b8820a"/><circle cx="9" cy="9" r="7" fill="#f0b828"/><ellipse cx="7" cy="6.5" rx="3" ry="1.5" fill="#f8d860" opacity="0.6"/></svg>',
    gem:  '<svg viewBox="0 0 16 16" width="14" height="14" style="vertical-align:-2px"><polygon points="8,1 14,6 8,15 2,6" fill="#8822bb"/><polygon points="8,1 14,6 8,8 2,6" fill="#cc44ff"/><polygon points="5.5,3.5 10.5,3.5 8,1" fill="#ee88ff"/></svg>',
    sword: '<svg viewBox="0 0 20 20" width="20" height="20"><path d="M3 17L8 12M6 14L17 3L19 1L17 3L19 5L8 16Z" stroke="#ff6644" stroke-width="1.8" fill="none"/><circle cx="4" cy="16" r="1.5" fill="#ff6644"/></svg>',
    star:  '<svg viewBox="0 0 20 20" width="20" height="20"><polygon points="10,2 12.5,7.5 18,8 14,12 15,18 10,15 5,18 6,12 2,8 7.5,7.5" fill="#ffd700"/></svg>',
    trophy:'<svg viewBox="0 0 20 20" width="20" height="20"><path d="M5 3H15V8C15 11.3 12.8 13 10 13C7.2 13 5 11.3 5 8V3Z" fill="#f0c040"/><rect x="8" y="13" width="4" height="3" fill="#c89020"/><rect x="6" y="16" width="8" height="2" rx="1" fill="#a07018"/><path d="M5 4H3C2 4 1 5 1 6.5C1 8 2 9 3.5 9L5 8" fill="none" stroke="#f0c040" stroke-width="1.5"/><path d="M15 4H17C18 4 19 5 19 6.5C19 8 18 9 16.5 9L15 8" fill="none" stroke="#f0c040" stroke-width="1.5"/></svg>',
    shield:'<svg viewBox="0 0 20 20" width="20" height="20"><path d="M10 2L3 5V10C3 14.4 6 17.5 10 19C14 17.5 17 14.4 17 10V5L10 2Z" fill="#44cc88" stroke="#2a8855" stroke-width="1"/><path d="M10 6L7 7.5V10.5C7 13 8.3 14.8 10 15.5C11.7 14.8 13 13 13 10.5V7.5L10 6Z" fill="#2a8855"/></svg>',
    bolt:  '<svg viewBox="0 0 20 20" width="20" height="20"><polygon points="11,1 5,11 9,11 7,19 15,9 11,9 13,1" fill="#ffcc00"/></svg>',
    flame: '<svg viewBox="0 0 20 20" width="20" height="20"><path d="M10 2C10 2 6 7 6 11C6 14.3 7.8 16 10 17C12.2 16 14 14.3 14 11C14 7 10 2 10 2Z" fill="#ff6600"/><path d="M10 8C10 8 8 11 8 13C8 14.7 8.9 15.5 10 16C11.1 15.5 12 14.7 12 13C12 11 10 8 10 8Z" fill="#ffcc00"/></svg>',
    crown: '<svg viewBox="0 0 20 20" width="20" height="20"><path d="M2 14L4 6L7 10L10 4L13 10L16 6L18 14Z" fill="#ffd700" stroke="#c8a020" stroke-width="0.8"/><rect x="2" y="14" width="16" height="3" rx="1" fill="#c8a020"/></svg>',
    chest: '<svg viewBox="0 0 20 20" width="20" height="20"><rect x="2" y="8" width="16" height="10" rx="2" fill="#8B4513"/><rect x="2" y="8" width="16" height="4" rx="1" fill="#A0522D"/><rect x="8" y="10" width="4" height="4" rx="1" fill="#ffd700"/><path d="M2 8C2 5 5 3 10 3C15 3 18 5 18 8" fill="none" stroke="#A0522D" stroke-width="2"/></svg>',
    target:'<svg viewBox="0 0 20 20" width="20" height="20"><circle cx="10" cy="10" r="8" fill="none" stroke="#ff4444" stroke-width="1.5"/><circle cx="10" cy="10" r="5" fill="none" stroke="#ff4444" stroke-width="1.5"/><circle cx="10" cy="10" r="2" fill="#ff4444"/></svg>',
};

const _ACH_ICON_MAP = {
    combat: 'sword', progression: 'star', collection: 'chest',
    arsenal: 'bolt', survival: 'shield', special: 'trophy',
};

function _achRewardHtml(reward) {
    if (reward.coins) return `${_ACH_SVG.coin} <span style="color:#ffd700">${reward.coins}</span>`;
    return `${_ACH_SVG.gem} <span style="color:#cc44ff">${reward.gems}</span>`;
}

function showAchievementPanel() {
    ensureStats();
    const stats = playerData.stats;
    const achs = playerData.achievements || {};
    const claimed = playerData.achievementsClaimed || {};

    let html = `
    <div id="achOverlay">
        <div id="achPanel">
            <div id="achHeader">
                <h2>${_ACH_SVG.trophy} ACHIEVEMENTS</h2>
                <div class="ach-header-right">
                    <span class="ach-count">${_countUnlockedAchs()} / ${_countTotalAchs()}</span>
                    <button class="btn-back" onclick="closeAchievementPanel()">BACK</button>
                </div>
            </div>
            <div id="achTabs">`;

    for (const cat of ACH_CATEGORIES) {
        html += `<button class="ach-tab" data-cat="${cat.key}" onclick="_achSwitchTab('${cat.key}')">${cat.name}</button>`;
    }

    html += `</div><div id="achScrollArea">`;

    for (const cat of ACH_CATEGORIES) {
        const catAchs = Object.entries(ACHIEVEMENTS).filter(([, d]) => d.category === cat.key);
        if (catAchs.length === 0) continue;

        html += `<div class="ach-cat-section" data-cat="${cat.key}">`;
        for (const [id, def] of catAchs) {
            const curTier = achs[id] || 0;
            const claimedTier = claimed[id] || 0;
            const maxTier = def.tiers;
            const value = def.check(stats);

            for (let t = 0; t < maxTier; t++) {
                const tierNum = t + 1;
                if (t > 0 && curTier < t) continue;
                const unlocked = curTier >= tierNum;
                const isClaimed = claimedTier >= tierNum;
                const goal = def.goals[t];
                const progress = Math.min(value, goal);
                const pct = Math.min(100, Math.floor(progress / goal * 100));
                const reward = def.rewards[t];
                const tierLabel = maxTier > 1 ? ' ' + 'I'.repeat(tierNum) : '';

                const cls = unlocked ? (isClaimed ? 'ach-item claimed' : 'ach-item unlocked') : 'ach-item';

                html += `<div class="${cls}">
                    <div class="ach-item-icon" style="background:${cat.color}22;border:2px solid ${cat.color}">${_ACH_SVG[_ACH_ICON_MAP[cat.key]] || _ACH_SVG.star}</div>
                    <div class="ach-item-info">
                        <div class="ach-item-name">${def.name}${tierLabel}</div>
                        <div class="ach-item-desc">${def.desc[t]}</div>
                        <div class="ach-item-bar-row">
                            <div class="ach-item-bar"><div class="ach-item-bar-fill" style="width:${pct}%;background:${unlocked ? '#ffd700' : cat.color}"></div></div>
                            <span class="ach-item-progress">${progress} / ${goal}</span>
                        </div>
                    </div>
                    <div class="ach-item-right">
                        <div class="ach-item-reward">${_achRewardHtml(reward)}</div>
                        ${unlocked && !isClaimed ? `<button class="btn-buy" onclick="claimAndRefresh('${id}',${tierNum})">CLAIM</button>` : ''}
                        ${isClaimed ? '<span class="ach-claimed-label">Claimed</span>' : ''}
                    </div>
                </div>`;
            }
        }
        html += `</div>`;
    }

    html += `</div></div></div>`;

    closeAchievementPanel();
    const div = document.createElement('div');
    div.id = 'achPanelWrap';
    div.innerHTML = html;
    document.body.appendChild(div);

    // Activate first tab
    _achSwitchTab(ACH_CATEGORIES[0].key);
}

function _achSwitchTab(catKey) {
    document.querySelectorAll('.ach-tab').forEach(t => t.classList.toggle('active', t.dataset.cat === catKey));
    document.querySelectorAll('.ach-cat-section').forEach(s => s.style.display = s.dataset.cat === catKey ? '' : 'none');
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
