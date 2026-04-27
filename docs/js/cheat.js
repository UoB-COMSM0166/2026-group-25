// ============================================================
// CHEAT PANEL — hidden modifier interface
// Open via:
//   1. Tap the bottom-right corner hotspot 5 times within 1.5s
//   2. Press Ctrl+Shift+M
// ============================================================

(function () {
    'use strict';

    const TAP_WINDOW_MS = 1500;
    const TAP_COUNT = 5;
    let _taps = [];
    let _activeTab = 'player';
    let _liveTickHandle = null;
    let _configDefaults = null;

    // Mark this save as 'cheat tainted' on first modification so the
    // leaderboard sync logic can refuse to publish modder runs. Idempotent —
    // safe to call from every write/toggle path.
    function _markCheatUsed() {
        if (typeof playerData === 'undefined' || !playerData) return;
        if (playerData.cheatTainted) return;
        playerData.cheatTainted = true;
        try {
            if (typeof savePlayerData === 'function') savePlayerData(playerData);
        } catch (_) {}
        try {
            if (typeof flushPlayerDataSave === 'function') flushPlayerDataSave(true);
        } catch (_) {}
    }

    // Persistent live-cheat flags (kept in memory, not saved)
    const live = {
        godMode: false,
        infiniteCharges: false,
        autoCoins: false,
        autoGems: false,
        oneShotKill: false,
        freezeWave: false,
        timeScale: 1.0,
        damageMult: 1.0,
        fireRateMult: 1.0,
    };

    // ============================================================
    // BOOTSTRAP
    // ============================================================
    function _init() {
        _injectStyles();
        _injectDom();
        _captureConfigDefaults();
        _bindHotspot();
        _bindKeyboard();
        _startLiveTick();
    }

    function _captureConfigDefaults() {
        if (typeof CONFIG === 'undefined') return;
        _configDefaults = JSON.parse(JSON.stringify(CONFIG));
    }

    // ============================================================
    // TRIGGERS
    // ============================================================
    function _bindHotspot() {
        const hot = document.getElementById('cheatHotspot');
        if (!hot) return;
        const handler = (e) => {
            e.stopPropagation();
            const now = Date.now();
            _taps = _taps.filter(t => now - t < TAP_WINDOW_MS);
            _taps.push(now);
            if (_taps.length >= TAP_COUNT) {
                _taps = [];
                toggleCheatPanel();
            }
        };
        hot.addEventListener('click', handler);
        hot.addEventListener('touchstart', (e) => { e.preventDefault(); handler(e); }, { passive: false });
    }

    function _bindKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && (e.key === 'M' || e.key === 'm')) {
                e.preventDefault();
                toggleCheatPanel();
            }
        });
    }

    // ============================================================
    // PANEL OPEN/CLOSE
    // ============================================================
    function toggleCheatPanel() {
        const overlay = document.getElementById('cheatPanelOverlay');
        if (!overlay) return;
        if (overlay.classList.contains('hidden')) {
            overlay.classList.remove('hidden');
            _render();
        } else {
            overlay.classList.add('hidden');
        }
    }
    window.toggleCheatPanel = toggleCheatPanel;

    function _setTab(tab) {
        _activeTab = tab;
        _render();
    }
    window._cheatSetTab = _setTab;

    // ============================================================
    // RENDER
    // ============================================================
    function _render() {
        const overlay = document.getElementById('cheatPanelOverlay');
        const tabs = [
            { id: 'player',  label: '玩家' },
            { id: 'gear',    label: '装备' },
            { id: 'talents', label: '天赋' },
            { id: 'live',    label: '当前局' },
            { id: 'world',   label: '世界' },
            { id: 'data',    label: '数据' },
        ];
        const tabBtns = tabs.map(t =>
            `<button class="cheat-tab ${_activeTab === t.id ? 'active' : ''}" onclick="_cheatSetTab('${t.id}')">${t.label}</button>`
        ).join('');

        let body = '';
        try {
            if      (_activeTab === 'player')  body = _renderPlayerTab();
            else if (_activeTab === 'gear')    body = _renderGearTab();
            else if (_activeTab === 'talents') body = _renderTalentsTab();
            else if (_activeTab === 'live')    body = _renderLiveTab();
            else if (_activeTab === 'world')   body = _renderWorldTab();
            else if (_activeTab === 'data')    body = _renderDataTab();
        } catch (err) {
            body = `<div class="cheat-err">渲染异常: ${err && err.message}</div>`;
        }

        overlay.innerHTML = `
            <div class="cheat-panel">
                <div class="cheat-header">
                    <span class="cheat-title">⚙️ 修改器 <span class="cheat-sub">Bridge Assault Modifier</span></span>
                    <button class="cheat-close" onclick="toggleCheatPanel()">✕</button>
                </div>
                <div class="cheat-tabs">${tabBtns}</div>
                <div class="cheat-body" id="cheatBody">${body}</div>
                <div class="cheat-footer">
                    <button class="cheat-btn cheat-btn-primary" onclick="_cheatSaveNow()">立即保存</button>
                    <span class="cheat-hint">改完即刻生效；持久数据 3 秒内自动写入 localStorage</span>
                </div>
            </div>
        `;
    }

    // ============================================================
    // TAB: PLAYER (currency, level, unlocks)
    // ============================================================
    function _renderPlayerTab() {
        const pd = playerData;
        return `
            ${_section('资源', `
                ${_numRow('金币 coins', 'coins', pd.coins, [
                    ['+100', () => _addPd('coins', 100)],
                    ['+1000', () => _addPd('coins', 1000)],
                    ['+10000', () => _addPd('coins', 10000)],
                    ['清零', () => _setPd('coins', 0)],
                ])}
                ${_numRow('宝石 gems', 'gems', pd.gems || 0, [
                    ['+10', () => _addPd('gems', 10)],
                    ['+100', () => _addPd('gems', 100)],
                    ['+1000', () => _addPd('gems', 1000)],
                    ['清零', () => _setPd('gems', 0)],
                ])}
            `)}
            ${_section('等级与经验', `
                ${_sliderRow('等级 level', 'level', pd.level || 1, 1, 30)}
                ${_numRow('经验 exp', 'exp', pd.exp || 0, [
                    ['+1000', () => _addPd('exp', 1000)],
                    ['清零', () => _setPd('exp', 0)],
                ])}
                <div class="cheat-row">
                    <button class="cheat-btn" onclick="_cheatLevelUp()">手动升级 (+1)</button>
                </div>
            `)}
            ${_section('解锁状态', `
                ${_chkRow('Level 1 已解锁', _hasUnlocked(1), v => _setUnlocked(1, v))}
                ${_chkRow('Level 2 已解锁', _hasUnlocked(2), v => _setUnlocked(2, v))}
                ${_chkRow('教程已通关 hasSeenTutorial', !!pd.hasSeenTutorial, v => _setPd('hasSeenTutorial', v))}
                ${_chkRow('教程奖励已领取 tutorialRewardClaimed', !!pd.tutorialRewardClaimed, v => _setPd('tutorialRewardClaimed', v))}
            `)}
        `;
    }

    function _hasUnlocked(lvl) {
        return (playerData.unlockedLevels || []).includes(lvl);
    }
    function _setUnlocked(lvl, on) {
        if (!playerData.unlockedLevels) playerData.unlockedLevels = [1];
        const set = new Set(playerData.unlockedLevels);
        if (on) set.add(lvl); else set.delete(lvl);
        if (!set.has(1)) set.add(1); // L1 stays unlocked
        playerData.unlockedLevels = Array.from(set).sort();
        _markDirty();
    }

    window._cheatLevelUp = function () {
        playerData.level = Math.min(30, (playerData.level || 1) + 1);
        if (game) game.level = playerData.level;
        _markDirty();
        _render();
    };

    // ============================================================
    // TAB: GEAR (weapon tiers, special weapons, armor, charges)
    // ============================================================
    function _renderGearTab() {
        const pd = playerData;
        const owned = new Set(pd.ownedPistolTiers || [0]);
        const equipped = pd.equippedPistolTier || 0;

        const pistolRows = (typeof PISTOL_TIERS !== 'undefined' ? PISTOL_TIERS : []).map((tier, idx) => {
            const isOwned = owned.has(idx);
            const isEquipped = equipped === idx;
            return `
                <div class="cheat-row cheat-pistol-row">
                    <span class="cheat-pistol-name" style="color:${tier.colorStr}">${idx}. ${tier.name}</span>
                    <label class="cheat-inline-chk">
                        <input type="checkbox" ${isOwned ? 'checked' : ''} onchange="_cheatTogglePistolOwned(${idx}, this.checked)"> 已拥有
                    </label>
                    <button class="cheat-btn ${isEquipped ? 'cheat-btn-active' : ''}" onclick="_cheatEquipPistol(${idx})">
                        ${isEquipped ? '✓ 已装备' : '装备'}
                    </button>
                </div>
            `;
        }).join('');

        const weaponLevels = pd.weaponLevels || {};
        const specialRows = ['shotgun', 'laser', 'rocket'].map(k => {
            const lv = weaponLevels[k] || 0;
            return `
                <div class="cheat-row">
                    <label class="cheat-label">${k}</label>
                    <input type="range" min="0" max="3" value="${lv}" oninput="_cheatSetWeaponLevel('${k}', this.value); this.nextElementSibling.textContent=this.value">
                    <span class="cheat-val">${lv}</span> / 3
                </div>
            `;
        }).join('');

        const charges = pd.weaponCharges || {};
        return `
            ${_section('基础武器（手枪层级）', `
                <div class="cheat-helper-row">
                    <button class="cheat-btn" onclick="_cheatUnlockAllPistols()">解锁全部</button>
                    <button class="cheat-btn cheat-btn-warn" onclick="_cheatLockPistols()">锁回 PISTOL</button>
                </div>
                ${pistolRows}
            `)}
            ${_section('特种武器升级 (0-3)', specialRows)}
            ${_section('护甲', `
                <div class="cheat-row">
                    <label class="cheat-label">armor</label>
                    <input type="range" min="0" max="3" value="${pd.armor || 0}" oninput="_cheatSetPd('armor', this.value); this.nextElementSibling.textContent=this.value">
                    <span class="cheat-val">${pd.armor || 0}</span> / 3
                </div>
            `)}
            ${_section('技能充能', `
                ${_numRow('🛡️ 无敌护盾 invincibility', 'charges_invincibility', charges.invincibility || 0, [
                    ['+1', () => _addCharge('invincibility', 1)],
                    ['+10', () => _addCharge('invincibility', 10)],
                    ['+99', () => _addCharge('invincibility', 99)],
                ])}
                ${_numRow('💚 兴奋剂 stimulant', 'charges_stimulant', charges.stimulant || 0, [
                    ['+1', () => _addCharge('stimulant', 1)],
                    ['+10', () => _addCharge('stimulant', 10)],
                    ['+99', () => _addCharge('stimulant', 99)],
                ])}
            `)}
        `;
    }

    window._cheatTogglePistolOwned = (idx, on) => {
        const set = new Set(playerData.ownedPistolTiers || [0]);
        if (on) set.add(idx); else set.delete(idx);
        if (set.size === 0) set.add(0);
        playerData.ownedPistolTiers = Array.from(set).sort((a, b) => a - b);
        if (!set.has(playerData.equippedPistolTier || 0)) {
            playerData.equippedPistolTier = playerData.ownedPistolTiers[0];
        }
        _markDirty();
    };
    window._cheatEquipPistol = (idx) => {
        const set = new Set(playerData.ownedPistolTiers || [0]);
        if (!set.has(idx)) { set.add(idx); playerData.ownedPistolTiers = Array.from(set).sort((a, b) => a - b); }
        playerData.equippedPistolTier = idx;
        _markDirty();
        _render();
    };
    window._cheatUnlockAllPistols = () => {
        const n = (typeof PISTOL_TIERS !== 'undefined') ? PISTOL_TIERS.length : 0;
        playerData.ownedPistolTiers = Array.from({ length: n }, (_, i) => i);
        _markDirty();
        _render();
    };
    window._cheatLockPistols = () => {
        playerData.ownedPistolTiers = [0];
        playerData.equippedPistolTier = 0;
        _markDirty();
        _render();
    };
    window._cheatSetWeaponLevel = (k, v) => {
        if (!playerData.weaponLevels) playerData.weaponLevels = {};
        playerData.weaponLevels[k] = parseInt(v, 10) || 0;
        _markDirty();
    };
    function _addCharge(key, n) {
        if (!playerData.weaponCharges) playerData.weaponCharges = {};
        playerData.weaponCharges[key] = Math.max(0, (playerData.weaponCharges[key] || 0) + n);
        _markDirty();
        _render();
    }

    // ============================================================
    // TAB: TALENTS
    // ============================================================
    function _renderTalentsTab() {
        if (typeof TALENT_DEFS === 'undefined') return '<div class="cheat-empty">TALENT_DEFS 未加载</div>';
        const rows = TALENT_DEFS.map(def => {
            const cur = def.isArmor
                ? (playerData.armor || 0)
                : ((playerData.talents && playerData.talents[def.id]) || 0);
            return `
                <div class="cheat-row">
                    <label class="cheat-label" style="color:${def.color}">${def.icon} ${def.id}</label>
                    <input type="range" min="0" max="${def.maxLevel}" value="${cur}"
                        oninput="_cheatSetTalent('${def.id}', this.value, ${!!def.isArmor}); this.nextElementSibling.textContent=this.value">
                    <span class="cheat-val">${cur}</span> / ${def.maxLevel}
                </div>
            `;
        }).join('');
        return `
            ${_section('天赋等级', `
                <div class="cheat-helper-row">
                    <button class="cheat-btn" onclick="_cheatMaxAllTalents()">全部满级</button>
                    <button class="cheat-btn cheat-btn-warn" onclick="_cheatResetTalents()">重置归零</button>
                </div>
                ${rows}
            `)}
        `;
    }

    window._cheatSetTalent = (id, v, isArmor) => {
        const lv = parseInt(v, 10) || 0;
        if (isArmor) playerData.armor = lv;
        else {
            if (!playerData.talents) playerData.talents = {};
            playerData.talents[id] = lv;
        }
        _markDirty();
    };
    window._cheatMaxAllTalents = () => {
        if (typeof TALENT_DEFS === 'undefined') return;
        if (!playerData.talents) playerData.talents = {};
        TALENT_DEFS.forEach(def => {
            if (def.isArmor) playerData.armor = def.maxLevel;
            else playerData.talents[def.id] = def.maxLevel;
        });
        _markDirty();
        _render();
    };
    window._cheatResetTalents = () => {
        if (typeof TALENT_DEFS === 'undefined') return;
        if (!playerData.talents) playerData.talents = {};
        TALENT_DEFS.forEach(def => {
            if (def.isArmor) playerData.armor = 0;
            else playerData.talents[def.id] = 0;
        });
        _markDirty();
        _render();
    };

    // ============================================================
    // TAB: LIVE (current run state)
    // ============================================================
    function _renderLiveTab() {
        if (!game) return '<div class="cheat-empty">未在游戏中。回到主菜单后开始游戏，再来这里调整运行时状态。</div>';

        return `
            ${_section('运行状态', `
                ${_numRow('得分 score', 'g_score', game.score || 0, [
                    ['+1000', () => { game.score = (game.score || 0) + 1000; _render(); }],
                    ['+10000', () => { game.score = (game.score || 0) + 10000; _render(); }],
                    ['清零', () => { game.score = 0; _render(); }],
                ])}
                ${_numRow('波次 wave', 'g_wave', game.wave || 1, [
                    ['-1', () => { game.wave = Math.max(1, (game.wave || 1) - 1); _render(); }],
                    ['+1', () => { game.wave = (game.wave || 1) + 1; _render(); }],
                    ['+5', () => { game.wave = (game.wave || 1) + 5; _render(); }],
                ])}
                ${_numRow('当前兵力 squadCount', 'g_squad', game.squadCount || 0, [
                    ['+10', () => { game.squadCount += 10; game.peakSquad = Math.max(game.peakSquad || 0, game.squadCount); _render(); }],
                    ['满 100', () => { game.squadCount = 100; game.peakSquad = 100; _render(); }],
                ])}
            `)}
            ${_section('无敌 / 自动补给', `
                ${_chkRow('🛡️ 无敌模式（持续护盾）', live.godMode, v => { live.godMode = v; _applyGodMode(v); if (v) _markCheatUsed(); })}
                ${_chkRow('♾️ 技能充能不消耗', live.infiniteCharges, v => { live.infiniteCharges = v; if (v) _markCheatUsed(); })}
                ${_chkRow('💰 自动补金币 (每秒+50)', live.autoCoins, v => { live.autoCoins = v; if (v) _markCheatUsed(); })}
                ${_chkRow('💎 自动补宝石 (每秒+5)', live.autoGems, v => { live.autoGems = v; if (v) _markCheatUsed(); })}
                ${_chkRow('💀 一击必杀（敌人 hp 持续清零）', live.oneShotKill, v => { live.oneShotKill = v; if (v) _markCheatUsed(); })}
                ${_chkRow('⏸ 冻结波次推进', live.freezeWave, v => { live.freezeWave = v; if (v) _markCheatUsed(); })}
            `)}
            ${_section('伤害与射速倍率', `
                <div class="cheat-row">
                    <label class="cheat-label">伤害倍率 (作用于发射时)</label>
                    <input type="range" min="0.5" max="20" step="0.5" value="${live.damageMult}"
                        oninput="_cheatLive('damageMult', parseFloat(this.value)); this.nextElementSibling.textContent=this.value+'×'">
                    <span class="cheat-val">${live.damageMult}×</span>
                </div>
                <div class="cheat-row">
                    <label class="cheat-label">射速倍率 (越高越快)</label>
                    <input type="range" min="0.5" max="10" step="0.25" value="${live.fireRateMult}"
                        oninput="_cheatLive('fireRateMult', parseFloat(this.value)); this.nextElementSibling.textContent=this.value+'×'">
                    <span class="cheat-val">${live.fireRateMult}×</span>
                </div>
                <div class="cheat-hint-inline">注：伤害倍率作用于子弹生成时；射速通过缩短 SHOOT_INTERVAL 实现。</div>
            `)}
            ${_section('一键操作', `
                <div class="cheat-grid-3">
                    <button class="cheat-btn" onclick="_cheatKillAllEnemies()">💀 灭霸响指</button>
                    <button class="cheat-btn" onclick="_cheatRefillSkills()">⚡ 全技能满充能</button>
                    <button class="cheat-btn" onclick="_cheatSpawnBoss()">👹 强制刷 Boss</button>
                    <button class="cheat-btn" onclick="_cheatNextWave()">⏭ 跳到下一波</button>
                    <button class="cheat-btn" onclick="_cheatJumpWave(5)">⏭ 跳 5 波</button>
                    <button class="cheat-btn" onclick="_cheatActivateShield()">🛡 立即开盾 30s</button>
                    <button class="cheat-btn" onclick="_cheatActivateFrenzy()">💚 立即兴奋 30s</button>
                    <button class="cheat-btn cheat-btn-warn" onclick="_cheatHealAll()">❤️ 兵力回满</button>
                </div>
            `)}
        `;
    }

    function _applyGodMode(on) {
        if (!game) return;
        if (on) {
            game.shieldActive = true;
            game.shieldTimer = 9999999;
        }
    }

    // For sliders: only mark tainted when the value diverges from the
    // neutral 1.0× default, so just opening the panel and dragging back
    // to default doesnt permanently taint the save.
    window._cheatLive = (k, v) => { live[k] = v; if (v !== 1.0) _markCheatUsed(); };

    window._cheatKillAllEnemies = () => {
        if (!game || !game.enemies) return;
        _markCheatUsed();
        game.enemies.forEach(e => { e.hp = 0; e.alive = false; });
        _render();
    };
    window._cheatRefillSkills = () => {
        if (!playerData.weaponCharges) playerData.weaponCharges = {};
        playerData.weaponCharges.invincibility = 99;
        playerData.weaponCharges.stimulant = 99;
        _markDirty();
        _render();
    };
    window._cheatSpawnBoss = () => {
        if (!game) return;
        _markCheatUsed();
        // Trigger the existing boss spawn helper if it exists
        if (typeof spawnBoss === 'function') { spawnBoss(); return; }
        // Fallback: nudge wave to a boss-trigger wave
        if (typeof game.wave === 'number') {
            const next = Math.ceil(game.wave / 5) * 5;
            game.wave = Math.max(game.wave, next === game.wave ? next + 5 : next);
        }
    };
    window._cheatNextWave = () => {
        if (!game) return;
        _markCheatUsed();
        game.wave = (game.wave || 1) + 1;
        _render();
    };
    window._cheatJumpWave = (n) => {
        if (!game) return;
        _markCheatUsed();
        game.wave = (game.wave || 1) + n;
        _render();
    };
    window._cheatActivateShield = () => {
        if (!game) return;
        _markCheatUsed();
        game.shieldActive = true;
        game.shieldTimer = 30000;
    };
    window._cheatActivateFrenzy = () => {
        if (!game) return;
        _markCheatUsed();
        game.stimulantActive = true;
        game.stimulantTimer = 30000;
    };
    window._cheatHealAll = () => {
        if (!game) return;
        _markCheatUsed();
        game.squadCount = Math.max(game.squadCount || 0, game.peakSquad || 50);
        if (game.squadCount < 50) game.squadCount = 50;
        game.peakSquad = Math.max(game.peakSquad || 0, game.squadCount);
        _render();
    };

    // ============================================================
    // TAB: WORLD (CONFIG sliders)
    // ============================================================
    function _renderWorldTab() {
        if (typeof CONFIG === 'undefined') return '<div class="cheat-empty">CONFIG 未加载</div>';
        const sliders = [
            ['PLAYER_SPEED',       0.5, 15,  0.1],
            ['CAMERA_SPEED',       0,   8,   0.05],
            ['ENEMY_SPEED',        0,   3,   0.02],
            ['BULLET_SPEED',       2,   40,  0.5],
            ['SHOOT_INTERVAL',     20,  500, 5],
            ['ENEMY_HP',           1,   50,  1],
            ['ROAD_HALF_WIDTH',    100, 500, 5],
            ['VIEW_DIST',          80,  500, 5],
            ['SPAWN_DISTANCE',     200, 1500, 10],
            ['BOSS_HOLD_Z',        300, 1500, 10],
            ['COIN_MAGNET_RANGE',  10,  500, 5],
        ];
        const rows = sliders
            .filter(([k]) => CONFIG[k] !== undefined)
            .map(([k, mn, mx, step]) => {
                const v = CONFIG[k];
                return `
                    <div class="cheat-row">
                        <label class="cheat-label">${k}</label>
                        <input type="range" min="${mn}" max="${mx}" step="${step}" value="${v}"
                            oninput="_cheatSetCfg('${k}', this.value); this.nextElementSibling.textContent=this.value">
                        <span class="cheat-val">${v}</span>
                    </div>
                `;
            }).join('');

        return `
            ${_section('CONFIG 实时调节', `
                <div class="cheat-helper-row">
                    <button class="cheat-btn cheat-btn-warn" onclick="_cheatResetConfig()">恢复默认</button>
                </div>
                ${rows}
            `)}
            ${_section('时间缩放', `
                <div class="cheat-row">
                    <label class="cheat-label">timeScale (慢动作 / 加速)</label>
                    <input type="range" min="0.1" max="3" step="0.1" value="${live.timeScale}"
                        oninput="_cheatSetTimeScale(parseFloat(this.value)); this.nextElementSibling.textContent=this.value+'×'">
                    <span class="cheat-val">${live.timeScale}×</span>
                </div>
                <div class="cheat-hint-inline">通过 game.slowMoFactor 实现，设 1.0 恢复正常。</div>
            `)}
        `;
    }

    window._cheatSetCfg = (k, v) => {
        const num = parseFloat(v);
        if (!Number.isFinite(num)) return;
        CONFIG[k] = num;
    };
    window._cheatResetConfig = () => {
        if (!_configDefaults) return;
        Object.keys(_configDefaults).forEach(k => { CONFIG[k] = _configDefaults[k]; });
        _render();
    };
    window._cheatSetTimeScale = (v) => {
        live.timeScale = v;
    };

    // ============================================================
    // TAB: DATA (high score, save IO, reset)
    // ============================================================
    function _renderDataTab() {
        const hs1 = (function () { try { return _signedLoad('bridgeAssault_highScore') || { score: 0, wave: 0 }; } catch { return { score: 0, wave: 0 }; } })();
        const hs2 = playerData.l2HighScore || { score: 0, wave: 0 };
        return `
            ${_section('Level 1 高分', `
                <div class="cheat-row">
                    <label class="cheat-label">score</label>
                    <input type="number" id="cheat_l1_score" value="${hs1.score}">
                </div>
                <div class="cheat-row">
                    <label class="cheat-label">wave</label>
                    <input type="number" id="cheat_l1_wave" value="${hs1.wave}">
                </div>
                <div class="cheat-row">
                    <button class="cheat-btn cheat-btn-primary" onclick="_cheatSaveL1Hs()">写入 L1 高分</button>
                </div>
            `)}
            ${_section('Level 2 高分', `
                <div class="cheat-row">
                    <label class="cheat-label">score</label>
                    <input type="number" id="cheat_l2_score" value="${hs2.score}">
                </div>
                <div class="cheat-row">
                    <label class="cheat-label">wave</label>
                    <input type="number" id="cheat_l2_wave" value="${hs2.wave}">
                </div>
                <div class="cheat-row">
                    <button class="cheat-btn cheat-btn-primary" onclick="_cheatSaveL2Hs()">写入 L2 高分</button>
                </div>
            `)}
            ${_section('成就', `
                <div class="cheat-helper-row">
                    <button class="cheat-btn" onclick="_cheatPumpStats()">把所有 stats 拉满 (1e6)</button>
                    <button class="cheat-btn cheat-btn-warn" onclick="_cheatResetAchievements()">重置成就</button>
                </div>
            `)}
            ${_section('存档导入 / 导出', `
                <div class="cheat-row">
                    <button class="cheat-btn" onclick="_cheatExport()">📥 导出 JSON</button>
                    <button class="cheat-btn" onclick="_cheatImport()">📤 从粘贴板导入</button>
                </div>
                <textarea id="cheatJson" class="cheat-textarea" placeholder="导出的 JSON 会显示在这里；也可以粘贴 JSON 后点 '从粘贴板导入'"></textarea>
            `)}
            ${_section('危险区', `
                <div class="cheat-row">
                    <button class="cheat-btn cheat-btn-danger" onclick="_cheatWipe()">🗑 清空所有存档（双重确认）</button>
                </div>
            `)}
        `;
    }

    window._cheatSaveL1Hs = () => {
        const score = parseInt(document.getElementById('cheat_l1_score').value, 10) || 0;
        const wave  = parseInt(document.getElementById('cheat_l1_wave').value, 10) || 0;
        _signedSave('bridgeAssault_highScore', { score, wave });
        if (typeof syncHighScore === 'function') syncHighScore();
        _toast('L1 高分已写入');
    };
    window._cheatSaveL2Hs = () => {
        const score = parseInt(document.getElementById('cheat_l2_score').value, 10) || 0;
        const wave  = parseInt(document.getElementById('cheat_l2_wave').value, 10) || 0;
        playerData.l2HighScore = { score, wave };
        _markDirty();
        flushPlayerDataSave(true);
        _toast('L2 高分已写入');
    };
    window._cheatPumpStats = () => {
        const keys = ['totalKills', 'totalCoinsEarned', 'totalGemsEarned', 'totalRevives', 'totalGames', 'maxCombo', 'maxWave', 'maxSquad', 'totalBosses', 'totalMegaBosses'];
        if (!playerData.stats) playerData.stats = {};
        keys.forEach(k => playerData.stats[k] = 1e6);
        _markDirty();
        flushPlayerDataSave(true);
        _toast('Stats 已拉满（用于触达成就）');
    };
    window._cheatResetAchievements = () => {
        if (!confirm('确定重置全部成就进度？')) return;
        playerData.achievements = {};
        playerData.achievementsClaimed = {};
        _markDirty();
        flushPlayerDataSave(true);
        _toast('成就已重置');
    };
    window._cheatExport = () => {
        const ta = document.getElementById('cheatJson');
        ta.value = JSON.stringify(playerData, null, 2);
        ta.select();
        try { navigator.clipboard && navigator.clipboard.writeText(ta.value); } catch {}
        _toast('已导出到文本框（也已尝试复制到剪贴板）');
    };
    window._cheatImport = () => {
        const ta = document.getElementById('cheatJson');
        try {
            const obj = JSON.parse(ta.value);
            if (typeof obj !== 'object' || !obj) throw new Error('not object');
            // Replace top-level fields onto playerData (preserve identity)
            Object.keys(playerData).forEach(k => delete playerData[k]);
            Object.assign(playerData, obj);
            _markDirty();
            flushPlayerDataSave(true);
            _toast('导入成功（建议刷新页面）');
            _render();
        } catch (e) {
            alert('JSON 解析失败：' + (e && e.message));
        }
    };
    window._cheatWipe = () => {
        if (!confirm('真的清空所有存档？此操作不可逆。')) return;
        if (!confirm('再次确认：金币/宝石/天赋/成就/高分全部归零，确定？')) return;
        try {
            localStorage.removeItem('bridgeAssault_playerData');
            localStorage.removeItem('bridgeAssault_highScore');
        } catch {}
        _toast('存档已清空，刷新页面后生效');
    };

    // ============================================================
    // FOOTER ACTIONS
    // ============================================================
    window._cheatSaveNow = () => {
        _markDirty();
        flushPlayerDataSave(true);
        _toast('已写入 localStorage');
    };

    // ============================================================
    // LIVE TICK — drives god mode, infinite charges, etc.
    // ============================================================
    function _startLiveTick() {
        if (_liveTickHandle) return;
        let lastWave = -1;
        _liveTickHandle = setInterval(() => {
            if (!game) return;

            if (live.godMode) {
                game.shieldActive = true;
                game.shieldTimer = 9999999;
            }
            if (live.infiniteCharges) {
                if (!playerData.weaponCharges) playerData.weaponCharges = {};
                playerData.weaponCharges.invincibility = Math.max(playerData.weaponCharges.invincibility || 0, 99);
                playerData.weaponCharges.stimulant     = Math.max(playerData.weaponCharges.stimulant     || 0, 99);
            }
            if (live.autoCoins) {
                playerData.coins = (playerData.coins || 0) + 50;
                _markDirty();
            }
            if (live.autoGems) {
                playerData.gems = (playerData.gems || 0) + 5;
                _markDirty();
            }
            if (live.oneShotKill && Array.isArray(game.enemies)) {
                game.enemies.forEach(e => { if (e.alive && !e.isBoss) { e.hp = 0; e.alive = false; } });
            }
            if (live.freezeWave && typeof game.nextWaveZ === 'number') {
                game.nextWaveZ = (game.cameraZ || 0) + 1e9;
            }
            if (live.timeScale !== 1.0) {
                game.slowMo = 9999999;
                game.slowMoFactor = live.timeScale;
            }
            if (live.fireRateMult !== 1.0 && _configDefaults && CONFIG.SHOOT_INTERVAL !== undefined) {
                CONFIG.SHOOT_INTERVAL = Math.max(5, _configDefaults.SHOOT_INTERVAL / live.fireRateMult);
            }

            // Auto-refresh live tab every wave change so values stay current
            if (_activeTab === 'live' && game.wave !== lastWave) {
                lastWave = game.wave;
            }
        }, 50);

        // Bullet damage multiplier: monkey-patch bullets array push as a low-effort hook.
        // We hook the spawnBullet via a wrapper if available; otherwise we inflate damage on each bullet in the array.
        setInterval(() => {
            if (!game || !Array.isArray(game.bullets)) return;
            if (live.damageMult !== 1.0) {
                game.bullets.forEach(b => {
                    if (b && !b._cheatDmgApplied) {
                        b.damage = (b.damage || 1) * live.damageMult;
                        b._cheatDmgApplied = true;
                    }
                });
            }
        }, 33);
    }

    // ============================================================
    // HELPER UI BUILDERS
    // ============================================================
    function _section(title, inner) {
        return `<div class="cheat-section"><div class="cheat-section-title">${title}</div>${inner}</div>`;
    }
    function _numRow(label, id, value, quickButtons) {
        const btns = (quickButtons || []).map((pair, i) =>
            `<button class="cheat-btn cheat-btn-mini" data-cheat-quick="${id}_${i}">${pair[0]}</button>`
        ).join('');
        // Defer click binding so we can keep closures (closures lost on innerHTML)
        setTimeout(() => {
            (quickButtons || []).forEach((pair, i) => {
                const el = document.querySelector(`[data-cheat-quick="${id}_${i}"]`);
                if (el) el.onclick = () => pair[1]();
            });
        }, 0);
        return `
            <div class="cheat-row">
                <label class="cheat-label">${label}</label>
                <input type="number" id="cheatI_${id}" value="${value}" oninput="_cheatNumInput('${id}', this.value)">
                <div class="cheat-quickbtns">${btns}</div>
            </div>
        `;
    }
    function _sliderRow(label, key, value, min, max) {
        return `
            <div class="cheat-row">
                <label class="cheat-label">${label}</label>
                <input type="range" min="${min}" max="${max}" value="${value}"
                    oninput="_cheatSetPd('${key}', parseInt(this.value,10)); this.nextElementSibling.textContent=this.value">
                <span class="cheat-val">${value}</span> / ${max}
            </div>
        `;
    }
    function _chkRow(label, value, onChange) {
        const id = 'chk_' + Math.random().toString(36).slice(2);
        setTimeout(() => {
            const el = document.getElementById(id);
            if (el) el.onchange = () => onChange(el.checked);
        }, 0);
        return `
            <div class="cheat-row cheat-row-chk">
                <label class="cheat-chk-label">
                    <input type="checkbox" id="${id}" ${value ? 'checked' : ''}>
                    <span>${label}</span>
                </label>
            </div>
        `;
    }

    window._cheatNumInput = (id, v) => {
        const n = parseInt(v, 10);
        if (!Number.isFinite(n)) return;
        if (id === 'coins')  _setPd('coins', n);
        else if (id === 'gems')  _setPd('gems', n);
        else if (id === 'level') { _setPd('level', n); if (game) game.level = n; }
        else if (id === 'exp')   { _setPd('exp', n);   if (game) game.exp   = n; }
        else if (id === 'g_score') { if (game) game.score = n; }
        else if (id === 'g_wave')  { if (game) game.wave  = n; }
        else if (id === 'g_squad') { if (game) { game.squadCount = n; game.peakSquad = Math.max(game.peakSquad || 0, n); } }
        else if (id.startsWith('charges_')) {
            const key = id.replace('charges_', '');
            if (!playerData.weaponCharges) playerData.weaponCharges = {};
            playerData.weaponCharges[key] = Math.max(0, n);
            _markDirty();
        }
    };

    window._cheatSetPd = (k, v) => _setPd(k, v);

    function _setPd(k, v) {
        playerData[k] = (typeof v === 'number') ? v : (typeof v === 'boolean') ? v : (parseFloat(v) || 0);
        _markDirty();
    }
    function _addPd(k, n) {
        playerData[k] = (playerData[k] || 0) + n;
        _markDirty();
        _render();
    }

    function _markDirty() {
        try { if (typeof markPlayerDataDirty === 'function') markPlayerDataDirty(); } catch {}
        // Every cheat write path goes through _markDirty, so this is the
        // single chokepoint that flips the cheat-tainted flag.
        _markCheatUsed();
    }

    function _toast(msg) {
        let t = document.getElementById('cheatToast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'cheatToast';
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(t._timer);
        t._timer = setTimeout(() => t.classList.remove('show'), 1800);
    }

    // ============================================================
    // DOM + STYLE INJECTION
    // ============================================================
    function _injectDom() {
        if (document.getElementById('cheatPanelOverlay')) return;
        const hot = document.createElement('div');
        hot.id = 'cheatHotspot';
        hot.title = '';
        document.body.appendChild(hot);

        const overlay = document.createElement('div');
        overlay.id = 'cheatPanelOverlay';
        overlay.className = 'hidden';
        document.body.appendChild(overlay);
    }

    function _injectStyles() {
        if (document.getElementById('cheatStyles')) return;
        const s = document.createElement('style');
        s.id = 'cheatStyles';
        s.textContent = `
        #cheatHotspot {
            position: fixed; right: 0; bottom: 0;
            width: 28px; height: 28px;
            z-index: 99998;
            background: transparent;
            cursor: default;
        }
        #cheatPanelOverlay {
            position: fixed; inset: 0;
            z-index: 99999;
            background: rgba(5, 8, 16, 0.78);
            backdrop-filter: blur(6px);
            display: flex; align-items: center; justify-content: center;
            padding: min(20px, 3vw);
        }
        #cheatPanelOverlay.hidden { display: none; }

        .cheat-panel {
            width: min(820px, 96vw);
            max-height: 90vh;
            display: flex; flex-direction: column;
            background: linear-gradient(180deg, #0d1322 0%, #0a0f1c 100%);
            border: 1px solid rgba(120, 180, 255, 0.25);
            border-radius: 14px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04);
            color: #d8e3f4;
            font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Segoe UI', sans-serif;
            font-size: 13px;
            overflow: hidden;
        }
        .cheat-header {
            display: flex; justify-content: space-between; align-items: center;
            padding: 14px 18px;
            background: linear-gradient(180deg, rgba(80,140,220,0.18), rgba(80,140,220,0.04));
            border-bottom: 1px solid rgba(120, 180, 255, 0.18);
        }
        .cheat-title {
            font-size: 16px; font-weight: 700; letter-spacing: 0.5px;
            color: #ffd36a;
        }
        .cheat-sub {
            font-size: 11px; font-weight: 400; color: #7a8aa3;
            margin-left: 8px; letter-spacing: 0.5px;
        }
        .cheat-close {
            background: rgba(255,80,80,0.16); color: #ffaaaa;
            border: 1px solid rgba(255,80,80,0.3);
            border-radius: 6px;
            width: 28px; height: 28px; line-height: 1; cursor: pointer;
            font-size: 14px;
        }
        .cheat-close:hover { background: rgba(255,80,80,0.3); }

        .cheat-tabs {
            display: flex; flex-wrap: wrap; gap: 4px;
            padding: 8px 14px;
            background: rgba(255,255,255,0.02);
            border-bottom: 1px solid rgba(120, 180, 255, 0.10);
        }
        .cheat-tab {
            background: rgba(255,255,255,0.05);
            color: #a8b8d0;
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 6px;
            padding: 6px 14px;
            font-size: 13px; font-weight: 600;
            cursor: pointer;
            transition: all 0.15s;
        }
        .cheat-tab:hover { background: rgba(120,180,255,0.15); color: #fff; }
        .cheat-tab.active {
            background: rgba(255, 211, 106, 0.18);
            color: #ffd36a;
            border-color: rgba(255, 211, 106, 0.35);
        }

        .cheat-body {
            flex: 1; overflow-y: auto;
            padding: 14px 18px 8px;
        }
        .cheat-body::-webkit-scrollbar { width: 8px; }
        .cheat-body::-webkit-scrollbar-thumb { background: rgba(120,180,255,0.2); border-radius: 4px; }

        .cheat-section {
            margin-bottom: 18px;
            background: rgba(255,255,255,0.025);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 8px;
            padding: 10px 14px 12px;
        }
        .cheat-section-title {
            font-size: 12px; font-weight: 700;
            color: #88aadd;
            letter-spacing: 1.2px; text-transform: uppercase;
            margin-bottom: 10px;
            padding-bottom: 6px;
            border-bottom: 1px dashed rgba(120,180,255,0.15);
        }

        .cheat-row {
            display: flex; align-items: center; gap: 10px;
            margin: 6px 0;
            min-height: 30px;
        }
        .cheat-row-chk { gap: 8px; }

        .cheat-label {
            min-width: 200px;
            color: #c5d2e6;
            font-size: 12.5px;
        }
        .cheat-row input[type="number"] {
            background: rgba(0,0,0,0.35);
            border: 1px solid rgba(120,180,255,0.25);
            color: #ffd36a;
            border-radius: 5px;
            padding: 4px 8px;
            font-size: 13px;
            font-family: 'SF Mono', Menlo, monospace;
            width: 110px;
        }
        .cheat-row input[type="range"] {
            flex: 1; max-width: 280px;
            accent-color: #ffd36a;
        }
        .cheat-val {
            min-width: 38px;
            color: #ffd36a;
            font-family: 'SF Mono', Menlo, monospace;
            font-size: 12.5px;
            text-align: right;
        }
        .cheat-quickbtns { display: flex; gap: 4px; flex-wrap: wrap; }
        .cheat-helper-row {
            display: flex; gap: 8px; flex-wrap: wrap;
            margin-bottom: 10px;
        }

        .cheat-btn {
            background: rgba(120,180,255,0.12);
            color: #d4e3fa;
            border: 1px solid rgba(120,180,255,0.28);
            border-radius: 6px;
            padding: 6px 12px;
            font-size: 12.5px; font-weight: 600;
            cursor: pointer;
            transition: all 0.12s;
        }
        .cheat-btn:hover { background: rgba(120,180,255,0.24); color: #fff; }
        .cheat-btn-mini { padding: 3px 8px; font-size: 11px; }
        .cheat-btn-primary {
            background: rgba(255, 211, 106, 0.2);
            color: #ffd36a;
            border-color: rgba(255, 211, 106, 0.4);
        }
        .cheat-btn-primary:hover { background: rgba(255, 211, 106, 0.32); }
        .cheat-btn-active {
            background: rgba(68, 255, 136, 0.2);
            color: #88ffaa;
            border-color: rgba(68, 255, 136, 0.4);
        }
        .cheat-btn-warn {
            background: rgba(255, 170, 60, 0.16);
            color: #ffcc88;
            border-color: rgba(255, 170, 60, 0.32);
        }
        .cheat-btn-danger {
            background: rgba(255, 80, 80, 0.16);
            color: #ff9999;
            border-color: rgba(255, 80, 80, 0.4);
        }
        .cheat-btn-danger:hover { background: rgba(255, 80, 80, 0.32); }

        .cheat-pistol-row { gap: 14px; }
        .cheat-pistol-name {
            min-width: 160px; font-weight: 700; font-size: 12.5px;
            font-family: 'SF Mono', Menlo, monospace;
        }
        .cheat-inline-chk {
            display: flex; align-items: center; gap: 5px;
            color: #a8b8d0; font-size: 12px;
            cursor: pointer;
        }

        .cheat-chk-label {
            display: flex; align-items: center; gap: 8px;
            cursor: pointer;
            color: #c5d2e6;
        }
        .cheat-chk-label input { accent-color: #ffd36a; transform: scale(1.1); }

        .cheat-grid-3 {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 6px;
        }

        .cheat-textarea {
            width: 100%; min-height: 110px;
            background: rgba(0,0,0,0.4);
            color: #c8e0ff;
            border: 1px solid rgba(120,180,255,0.22);
            border-radius: 6px;
            padding: 8px 10px;
            font-family: 'SF Mono', Menlo, monospace;
            font-size: 11.5px;
            resize: vertical;
            margin-top: 6px;
            box-sizing: border-box;
        }

        .cheat-empty, .cheat-err {
            padding: 30px 14px; text-align: center;
            color: #7a8aa3; font-size: 13px;
        }
        .cheat-err { color: #ff8888; }

        .cheat-footer {
            display: flex; align-items: center; gap: 14px;
            padding: 10px 18px;
            border-top: 1px solid rgba(120, 180, 255, 0.12);
            background: rgba(255,255,255,0.02);
        }
        .cheat-hint {
            color: #6a7a96; font-size: 11px;
            flex: 1;
        }
        .cheat-hint-inline {
            color: #6a7a96; font-size: 11px;
            margin-top: 4px; padding-left: 8px;
        }

        #cheatToast {
            position: fixed;
            bottom: 30px; left: 50%; transform: translateX(-50%) translateY(20px);
            background: rgba(20, 30, 50, 0.95);
            color: #ffd36a;
            padding: 10px 22px;
            border: 1px solid rgba(255, 211, 106, 0.4);
            border-radius: 22px;
            font-size: 13px;
            font-weight: 600;
            opacity: 0;
            transition: all 0.2s;
            z-index: 100000;
            pointer-events: none;
            box-shadow: 0 6px 20px rgba(0,0,0,0.5);
        }
        #cheatToast.show {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        `;
        document.head.appendChild(s);
    }

    // ============================================================
    // ENTRY
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
