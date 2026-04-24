// ============================================================
// TUTORIAL (Level 0) — First-Time User Experience
// A 10-step interactive tutorial. Each step locks progression
// until a concrete goal is completed (kill N, collect a gem,
// use a hotkey, etc.) so reading the hint always coincides with
// a real hands-on action.
// Level art is reused from Level 1 (Patrick sprite). No new
// assets are needed.
// ============================================================

const TUTORIAL_MAX_WAVE = 10;

// cam: camera-speed multiplier while this step is active
//  - 0   freeze camera (player stays put and engages what's in front)
//  - 0.4 slow crawl (used for gate walks so camera carries the player through)
// Tutorial uses normal camera speed (cam=1) so the spacing/pacing matches
// the real levels exactly. Goal-locking prevents the wave from auto-advancing
// on camera crossings, so the player has all the time they need.
const TUTORIAL_SCRIPT = [
    { titleKey: 'tutorial.w1.title', bodyKey: 'tutorial.w1.body',
      enemies: 2, setup: null, cam: 1.0,
      goal: { type: 'kills', count: 2 } },

    { titleKey: 'tutorial.w2.title', bodyKey: 'tutorial.w2.body',
      enemies: 3, setup: null, cam: 1.0,
      goal: { type: 'kills', count: 3 } },

    { titleKey: 'tutorial.w3.title', bodyKey: 'tutorial.w3.body',
      enemies: 3, setup: null, cam: 1.0,
      goal: { type: 'coins', count: 2 } },

    { titleKey: 'tutorial.w4.title', bodyKey: 'tutorial.w4.body',
      enemies: 0, setup: 'troopGate', cam: 1.0,
      goal: { type: 'troopUp' } },

    { titleKey: 'tutorial.w5.title', bodyKey: 'tutorial.w5.body',
      enemies: 0, setup: 'weaponGate', cam: 1.0,
      goal: { type: 'weaponChange' } },

    { titleKey: 'tutorial.w6.title', bodyKey: 'tutorial.w6.body',
      enemies: 0, setup: 'barrels', cam: 1.0,
      goal: { type: 'barrelExploded' } },

    // Mini boss fight — teaches the "bosses drop gems" lesson for real.
    { titleKey: 'tutorial.w7.title', bodyKey: 'tutorial.w7.body',
      enemies: 0, setup: 'miniBoss', cam: 1.0,
      goal: { type: 'miniBossAndGem' } },

    { titleKey: 'tutorial.w8.title', bodyKey: 'tutorial.w8.body',
      enemies: 3, setup: 'giftShield', cam: 1.0,
      goal: { type: 'shieldUsed' } },

    { titleKey: 'tutorial.w9.title', bodyKey: 'tutorial.w9.body',
      enemies: 3, setup: 'giftFrenzy', cam: 1.0,
      goal: { type: 'frenzyUsed' } },

    { titleKey: 'tutorial.w10.title', bodyKey: 'tutorial.w10.body',
      enemies: 3, setup: null, cam: 1.0,
      goal: { type: 'pausedOnce' } },
];

function setupTutorialRun(g) {
    g.isTutorial = true;
    g.tutorialHint = null;
    g.tutorialGoalMet = false;
    g.tutorialGoalTimer = 0;
    g.tutorialStepStart = {};
    g.tutorialCamMult = 0;
    g.squadCount = 12;
    g.peakSquad = 12;
    // Prevent the normal random gate spawner from firing during the tutorial.
    g.nextGateZ = 1e9;
    // Prevent the normal camera-crossing wave advance. Tutorial advances
    // purely by goal completion.
    g.nextWaveZ = 1e9;
}

function _snapshotStep() {
    const g = game;
    const charges = playerData.weaponCharges || {};
    g.tutorialStepStart = {
        kills:         g.killCount,
        coins:         g.coinsCollected,
        gems:          g.gemsCollected,
        squad:         g.squadCount,
        weapon:        g.weapon,
        barrelAlive:   g.barrels.filter(b => b.alive).length,
        shieldCharges: charges['invincibility'] || 0,
        frenzyCharges: charges['stimulant'] || 0,
        frames:        0,
    };
    // Per-step flags — only the current step's pause counts.
    g.tutorialPausedOnce = false;
}

function spawnTutorialWaveContent() {
    const g = game;
    const idx = Math.min(TUTORIAL_SCRIPT.length - 1, Math.max(0, g.wave - 1));
    const step = TUTORIAL_SCRIPT[idx];

    g.tutorialHint = { title: T(step.titleKey), body: T(step.bodyKey), timer: 0 };
    g.tutorialGoalMet = false;
    g.tutorialCamMult = step.cam;

    // Spawn content at the same distance as real levels so the pacing
    // (approach time, threat reading) matches what the player will see
    // during actual play.
    const baseZ = g.cameraZ + CONFIG.SPAWN_DISTANCE;
    const n = step.enemies;
    for (let i = 0; i < n; i++) {
        const spread = CONFIG.ROAD_HALF_WIDTH * 0.55;
        const x = n === 1 ? 0 : -spread + (spread * 2) * i / (n - 1);
        g.enemies.push({
            x: x + (Math.random() - 0.5) * 14,
            z: baseZ + Math.random() * 25,
            hp: 3, maxHp: 3, alive: true,
            damage: 1, isHeavy: false,
            animFrame: 0, animTimer: Math.random() * 500, hitFlash: 0,
            type: TUTORIAL_IMP_TYPE,
        });
    }

    if      (step.setup === 'troopGate')  _tutorialSpawnGate('troop');
    else if (step.setup === 'weaponGate') _tutorialSpawnGate('weapon');
    else if (step.setup === 'barrels')    _tutorialSpawnBarrelSet();
    else if (step.setup === 'miniBoss')   _tutorialSpawnMiniBoss();
    else if (step.setup === 'giftShield') _tutorialGrantCharge('invincibility');
    else if (step.setup === 'giftFrenzy') _tutorialGrantCharge('stimulant');

    // Snapshot AFTER setup so gifted charges/troops are counted as baseline.
    _snapshotStep();
}

function _tutorialSpawnMiniBoss() {
    const g = game;
    // Match the real level-1 boss parameters (same bossHoldZ, similar
    // shoot interval) so the player sees the fight at the real distance.
    // HP is scaled with current firepower: 15 full volleys on default squad.
    const bulletCount = Math.min(g.squadCount, 8);
    const bulletDmg   = 1 + Math.floor(g.squadCount / 6);
    const volleyDmg   = bulletCount * bulletDmg;
    const hp = Math.max(220, volleyDmg * 30);
    g.enemies.push({
        x: 0,
        z: g.cameraZ + CONFIG.BOSS_HOLD_Z,
        hp, maxHp: hp, alive: true,
        damage: 2,
        isBoss: true, isHeavy: false,
        bossShootTimer: 0,
        bossShootInterval: 135,
        bossHoldZ: CONFIG.BOSS_HOLD_Z,
        animFrame: 0, animTimer: Math.random() * 500, hitFlash: 0,
        type: 0,
        spawnTime: Date.now(),
        tutorialMiniBoss: true,
    });
}

function _tutorialSpawnGate(kind) {
    const g = game;
    const z = g.cameraZ + CONFIG.SPAWN_DISTANCE;
    const options = [];
    if (kind === 'troop') {
        // Wide +5 panel centred on the road — guaranteed pickup at x=0.
        options.push({ x: 0, width: 200, gateType: 'troop', op: '+', value: 5 });
    } else {
        options.push({ x: 0, width: 160, gateType: 'weapon', weapon: 'shotgun' });
    }
    g.gates.push({ z, options, triggered: false, fadeTimer: 0, chosenIdx: -1 });
}

function _tutorialSpawnBarrelSet() {
    const g = game;
    const baseZ = g.cameraZ + CONFIG.SPAWN_DISTANCE;
    [-90, 0, 90].forEach((dx, i) => {
        g.barrels.push({
            x: dx, z: baseZ + (i % 2) * 20,
            hp: 2, maxHp: 2, aoeDamage: 20, alive: true,
            pulsePhase: Math.random() * Math.PI * 2,
            smokeTimer: 0, chainTimer: -1,
        });
    });
    // Line a few Patricks among the barrels so the AOE is visible.
    for (let i = 0; i < 4; i++) {
        g.enemies.push({
            x: -70 + i * 45, z: baseZ + 25,
            hp: 3, maxHp: 3, alive: true,
            damage: 1, isHeavy: false,
            animFrame: 0, animTimer: Math.random() * 500, hitFlash: 0,
            type: TUTORIAL_IMP_TYPE,
        });
    }
}

function _tutorialGrantCharge(key) {
    if (!playerData.weaponCharges) playerData.weaponCharges = {};
    playerData.weaponCharges[key] = (playerData.weaponCharges[key] || 0) + 1;
    if (key === 'invincibility') game.skillReady = true;
    savePlayerData(playerData);
    // Don't touch #weaponSlots (the DOM inventory panel) — the canvas
    // drawSkillHud() already reflects charge changes automatically, and
    // opening both stacks two HUDs on the top-left corner.
}

function _checkStepGoal(step) {
    const g = game;
    const s = g.tutorialStepStart;
    s.frames++;
    const goal = step.goal;
    switch (goal.type) {
        case 'kills':           return (g.killCount       - s.kills) >= goal.count;
        case 'coins':           return (g.coinsCollected  - s.coins) >= goal.count;
        case 'troopUp':         return g.squadCount > s.squad;
        case 'weaponChange':    return g.weapon !== 'pistol';
        case 'barrelExploded':  return g.barrels.filter(b => b.alive).length < s.barrelAlive;
        case 'miniBossAndGem': {
            const bossAlive = g.enemies.some(e => e.alive && e.tutorialMiniBoss);
            return !bossAlive && g.gemsCollected > s.gems;
        }
        case 'pausedOnce':      return !!g.tutorialPausedOnce;
        case 'shieldUsed': {
            const cur = (playerData.weaponCharges || {})['invincibility'] || 0;
            return cur < s.shieldCharges || g.shieldActive;
        }
        case 'frenzyUsed': {
            const cur = (playerData.weaponCharges || {})['stimulant'] || 0;
            return cur < s.frenzyCharges || g.stimulantActive;
        }
        case 'survive':         return s.frames >= goal.frames;
    }
    return false;
}

function _stepProgressText(step) {
    const g = game;
    const s = g.tutorialStepStart;
    const goal = step.goal;
    switch (goal.type) {
        case 'kills': {
            const c = Math.min(goal.count, Math.max(0, g.killCount - s.kills));
            return T('tutorial.progress.kills', c, goal.count);
        }
        case 'coins': {
            const c = Math.min(goal.count, Math.max(0, g.coinsCollected - s.coins));
            return T('tutorial.progress.coins', c, goal.count);
        }
        case 'survive': {
            const sec = Math.min(Math.ceil(goal.frames / 60), Math.ceil(s.frames / 60));
            return T('tutorial.progress.survive', sec, Math.ceil(goal.frames / 60));
        }
        case 'miniBossAndGem': {
            const bossAlive = g.enemies.some(e => e.alive && e.tutorialMiniBoss);
            return T(bossAlive ? 'tutorial.progress.miniboss' : 'tutorial.progress.gempickup');
        }
        case 'pausedOnce': return T('tutorial.progress.pause');
    }
    return T('tutorial.progress.action');
}

// Called every frame while tutorial is active.
function updateTutorial() {
    const g = game;
    if (!g || !g.isTutorial || g.state !== 'playing') return;
    const idx = Math.min(TUTORIAL_SCRIPT.length - 1, Math.max(0, g.wave - 1));
    const step = TUTORIAL_SCRIPT[idx];
    if (!step) return;
    if (!g.tutorialGoalMet) {
        if (_checkStepGoal(step)) {
            g.tutorialGoalMet = true;
            g.tutorialGoalTimer = 35;
            // Brief celebration — reuse existing floating text channel.
            g.gateText = { text: T('tutorial.goal.done'), color: 0x44ff88,
                           timer: 0, maxTimer: 70, scale: 0.1 };
            g.screenFlash = Math.max(g.screenFlash, 0.18);
            playSound('gate_good');
        }
    } else {
        g.tutorialGoalTimer--;
        if (g.tutorialGoalTimer <= 0) {
            g.wave++;
            if (g.wave > TUTORIAL_MAX_WAVE) { completeTutorial(); return; }
            spawnTutorialWaveContent();
        }
    }
}

function completeTutorial() {
    const g = game;
    if (!g) return;
    g.state = 'gameover';
    stopBGM();
    playerData.hasSeenTutorial = true;
    markPlayerDataDirty();
    flushPlayerDataSave(true);
    savePlayerData(playerData);
    const slotsDiv = document.getElementById('weaponSlots');
    if (slotsDiv) slotsDiv.style.display = 'none';
    const skillBtn = document.getElementById('skillBtn');
    if (skillBtn) skillBtn.style.display = 'none';
    overlay.classList.remove('hidden');
    renderTutorialCompleteOverlay();
    game = null;
}

function getTutorialRewardOptions() {
    return [
        {
            id: 'shotgun_unlock',
            icon: WEAPON_ICONS.shotgun,
            color: '#ff9900',
            title: T('tutorial.reward.shotgun.title'),
            body: T('tutorial.reward.shotgun.body'),
            apply: function() {
                if (!playerData.weaponLevels) playerData.weaponLevels = {};
                playerData.weaponLevels.shotgun = Math.max(playerData.weaponLevels.shotgun || 0, 1);
            },
        },
        {
            id: 'laser_unlock',
            icon: WEAPON_ICONS.laser,
            color: '#00e6ff',
            title: T('tutorial.reward.laser.title'),
            body: T('tutorial.reward.laser.body'),
            apply: function() {
                if (!playerData.weaponLevels) playerData.weaponLevels = {};
                playerData.weaponLevels.laser = Math.max(playerData.weaponLevels.laser || 0, 1);
            },
        },
        {
            id: 'magnum_unlock',
            icon: PISTOL_TIERS[1].icon,
            color: '#ff7733',
            title: T('tutorial.reward.magnum.title'),
            body: T('tutorial.reward.magnum.body'),
            apply: function() {
                if (!playerData.ownedPistolTiers) playerData.ownedPistolTiers = [0];
                if (!playerData.ownedPistolTiers.includes(1)) playerData.ownedPistolTiers.push(1);
                playerData.equippedPistolTier = Math.max(playerData.equippedPistolTier || 0, 1);
            },
        },
    ];
}

function getTutorialRewardOption(id) {
    return getTutorialRewardOptions().find(function(opt) { return opt.id === id; }) || null;
}

function claimTutorialReward(id) {
    if (playerData.tutorialRewardClaimed) {
        renderTutorialCompleteOverlay();
        return false;
    }
    const reward = getTutorialRewardOption(id);
    if (!reward) return false;
    reward.apply();
    playerData.tutorialRewardClaimed = true;
    playerData.tutorialRewardChoice = id;
    markPlayerDataDirty();
    flushPlayerDataSave(true);
    savePlayerData(playerData);
    renderTutorialCompleteOverlay(id);
    return true;
}

function renderTutorialCompleteOverlay(claimedId) {
    const chosenId = claimedId || playerData.tutorialRewardChoice || '';
    const chosen = chosenId ? getTutorialRewardOption(chosenId) : null;
    // Inline SVG grad-cap instead of an emoji so typography matches the rest
    // of the game chrome (retro monospace).
    const gradCapSvg = `
        <svg viewBox="0 0 72 56" width="56" height="44" style="vertical-align:-8px;margin-right:14px;filter:drop-shadow(0 0 12px rgba(68,255,136,0.55));">
            <polygon points="36,6 68,22 36,38 4,22" fill="#0e1a12" stroke="#44ff88" stroke-width="2.5"/>
            <polygon points="36,10 62,22 36,34 10,22" fill="#173322"/>
            <path d="M 14 26 L 14 38 Q 36 48 58 38 L 58 26" fill="none" stroke="#44ff88" stroke-width="2.5" stroke-linejoin="round"/>
            <line x1="56" y1="22" x2="56" y2="40" stroke="#ffd740" stroke-width="2"/>
            <circle cx="56" cy="43" r="3" fill="#ffd740"/>
        </svg>`;

    if (!playerData.tutorialRewardClaimed) {
        const rewardCards = getTutorialRewardOptions().map(function(reward) {
            return `
                <button class="btn" onclick="claimTutorialReward('${reward.id}')"
                    style="width:min(220px,30vw);min-height:228px;padding:18px 16px;background:linear-gradient(180deg,${reward.color}33,#101828);border-color:${reward.color};color:#eef6ff;border-radius:18px;display:flex;flex-direction:column;gap:14px;justify-content:flex-start;align-items:center;text-align:center;">
                    <div style="width:72px;height:72px;border-radius:18px;border:2px solid ${reward.color};background:${reward.color}22;display:flex;align-items:center;justify-content:center;">${reward.icon}</div>
                    <div style="font-size:min(18px,3.4vw);font-weight:bold;letter-spacing:1px;color:${reward.color};">${reward.title}</div>
                    <div style="font-size:min(13px,2.6vw);line-height:1.5;color:#c9daf8;">${reward.body}</div>
                    <div style="margin-top:auto;font-size:min(13px,2.6vw);font-weight:bold;color:#ffffff;">${T('tutorial.reward.pick')}</div>
                </button>
            `;
        }).join('');

        overlay.innerHTML = `
            <h1 style="color:#44ff88;text-shadow:0 0 30px rgba(68,255,136,0.7);display:inline-flex;align-items:center;justify-content:center;">${gradCapSvg}${T('tutorial.complete.title')}</h1>
            <div style="color:#cc88ff;font-size:min(24px,4.8vw);margin:14px 0 6px;letter-spacing:2px;">${T('tutorial.complete.subtitle')}</div>
            <div style="color:#88ccff;font-size:min(16px,3.4vw);max-width:720px;margin:4px auto 24px;line-height:1.6;">${T('tutorial.complete.body')}</div>
            <div style="color:#ffd36b;font-size:min(18px,3.4vw);margin-bottom:18px;letter-spacing:1px;">${T('tutorial.reward.choose')}</div>
            <div style="display:flex;flex-wrap:wrap;gap:18px;justify-content:center;align-items:stretch;max-width:780px;margin:0 auto 18px;">
                ${rewardCards}
            </div>
            <div style="color:#8ea8d4;font-size:min(13px,2.6vw);margin-top:6px;">${T('tutorial.reward.once')}</div>
        `;
        return;
    }

    overlay.innerHTML = `
        <h1 style="color:#44ff88;text-shadow:0 0 30px rgba(68,255,136,0.7);display:inline-flex;align-items:center;justify-content:center;">${gradCapSvg}${T('tutorial.complete.title')}</h1>
        <div style="color:#cc88ff;font-size:min(24px,4.8vw);margin:14px 0 6px;letter-spacing:2px;">${T('tutorial.complete.subtitle')}</div>
        <div style="color:#88ccff;font-size:min(16px,3.4vw);max-width:640px;margin:4px auto 18px;line-height:1.6;">${T('tutorial.complete.body')}</div>
        <div style="display:inline-flex;align-items:center;gap:12px;max-width:700px;margin:0 auto 24px;padding:16px 18px;border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02));border:1px solid rgba(255,255,255,0.12);">
            <div style="width:64px;height:64px;border-radius:16px;border:2px solid ${chosen ? chosen.color : '#44ff88'};background:${chosen ? chosen.color : '#44ff88'}22;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${chosen ? chosen.icon : ''}</div>
            <div style="text-align:left;">
                <div style="color:#ffd36b;font-size:min(16px,3vw);font-weight:bold;letter-spacing:1px;">${T('tutorial.reward.claimed')}</div>
                <div style="color:${chosen ? chosen.color : '#ffffff'};font-size:min(20px,3.8vw);font-weight:bold;margin-top:4px;">${chosen ? chosen.title : T('tutorial.reward.already')}</div>
                <div style="color:#c6d8f6;font-size:min(13px,2.5vw);line-height:1.5;margin-top:4px;">${chosen ? chosen.body : T('tutorial.reward.already')}</div>
            </div>
        </div>
        <div id="menuButtons">
            <button class="btn" style="background:linear-gradient(180deg,#44cc44,#228822);border-color:#55ee55;" onclick="showLevelSelect()">${T('tutorial.complete.continue')}</button>
            <button class="btn" onclick="restoreMainMenu()">${T('levelcomplete.mainmenu')}</button>
        </div>
    `;
}

function drawTutorialHint() {
    const g = game;
    if (!g || !g.isTutorial || !g.tutorialHint) return;
    // Hide hint whenever the run isn't actively playing (gameover, menu
    // transitions, level select) so it never bleeds into other screens.
    if (g.state !== 'playing' && g.state !== 'paused') return;
    const h = g.tutorialHint;
    h.timer++;

    const idx = Math.min(TUTORIAL_SCRIPT.length - 1, Math.max(0, g.wave - 1));
    const step = TUTORIAL_SCRIPT[idx];
    const progressStr = step ? _stepProgressText(step) : '';
    const done = !!g.tutorialGoalMet;

    const boxW = Math.min(620, screenW * 0.78);
    const boxH = 100;
    const boxX = screenW / 2 - boxW / 2;
    // If a boss is alive, drawBossHud occupies y≈92…180. Push the tutorial
    // banner below that band so the two HUDs never overlap.
    const bossAlive = g.enemies.some(e => e.alive && e.isBoss);
    const boxY = bossAlive ? 190 : 92;

    const borderAlpha = done ? 0.85 : (0.40 + 0.18 * Math.sin(h.timer * 0.07));
    const borderCol   = done ? 0x44ff88 : 0x44ccff;

    hexFill(0x08081a, Math.floor(0.82 * 255)); noStroke();
    rect(boxX, boxY, boxW, boxH, 12);
    hexStroke(borderCol, Math.floor(borderAlpha * 255)); strokeWeight(2); noFill();
    rect(boxX, boxY, boxW, boxH, 12);

    // STEP N/10 pill
    hexFill(borderCol, Math.floor(0.15 * 255)); noStroke();
    rect(boxX + 12, boxY + 8, 94, 20, 5);
    _hudText(T('tutorial.wavelabel', g.wave, TUTORIAL_MAX_WAVE),
        boxX + 59, boxY + 18, 12, done ? 0x99ffcc : 0x99ddff, CENTER, true);

    // Title + body
    _hudText(h.title, screenW / 2, boxY + 34, 19, 0xffffff, CENTER, true);
    _hudText(h.body, screenW / 2, boxY + 60, 13, 0xcce0ff, CENTER, false);

    // Progress line
    const progText = done ? T('tutorial.goal.done') : progressStr;
    const progCol  = done ? 0x44ff88 : 0xffd740;
    _hudText(progText, screenW / 2, boxY + 84, 14, progCol, CENTER, true);
}
