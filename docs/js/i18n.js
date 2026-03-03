// ============================================================
// INTERNATIONALIZATION (i18n)
// ============================================================
let LANG = localStorage.getItem('bridgeAssault_lang') || 'zh';

// T(key, ...args) — look up translation, replace {0} {1} placeholders
function T(key) {
    const args = Array.prototype.slice.call(arguments, 1);
    const t = TRANSLATIONS[LANG] || TRANSLATIONS.zh;
    let s = (t[key] !== undefined) ? t[key] : ((TRANSLATIONS.zh[key] !== undefined) ? TRANSLATIONS.zh[key] : key);
    args.forEach(function(a, i) { s = s.replace('{' + i + '}', a); });
    return s;
}

function setLang(lang) {
    LANG = lang;
    localStorage.setItem('bridgeAssault_lang', lang);
    // Update html lang attribute
    document.documentElement.lang = lang;
    applyLang();
}

function toggleLang() {
    setLang(LANG === 'zh' ? 'en' : 'zh');
}

function applyLang() {
    // Toggle button label
    const btn = document.getElementById('langToggleBtn');
    if (btn) btn.textContent = LANG === 'zh' ? 'EN' : '中';

    // Elements with data-i18n attribute (text only)
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
        el.textContent = T(el.dataset.i18n);
    });

    // Shop tabs: text is in a <span data-i18n> inside the button, handled above

    // Update talent hint (has SVG + text, handled via data-i18n on a child span)

    // If shop is open, re-render current panel
    const shopEl = document.getElementById('shopOverlay');
    if (shopEl && !shopEl.classList.contains('hidden')) {
        if (typeof renderShop === 'function') renderShop();
    }

    // Mid-shop: title/subtitle/button are data-i18n handled above

    // If leaderboard is open, re-render it
    const lbEl = document.getElementById('leaderboardOverlay');
    if (lbEl && !lbEl.classList.contains('hidden')) {
        if (typeof showLeaderboard === 'function') {
            const player = typeof getLbPlayer === 'function' ? getLbPlayer() : null;
            if (player) {
                if (typeof _renderList === 'function') _renderList(player.name);
            } else {
                if (typeof _renderJoinForm === 'function') _renderJoinForm();
            }
        }
    }

    // If main menu overlay is visible (contains startBtn), rebuild it
    const overlayEl = document.getElementById('overlay');
    if (overlayEl && !overlayEl.classList.contains('hidden')) {
        // Only rebuild if we're on the main menu (not game-over or revive)
        const h1 = overlayEl.querySelector('h1');
        if (h1 && h1.textContent === 'BRIDGE ASSAULT') {
            const h2 = overlayEl.querySelector('h2');
            if (h2) h2.textContent = T('menu.subtitle');
            // Leaderboard button may be dynamically generated (no data-i18n)
            const lbBtn = overlayEl.querySelector('.btn-leaderboard');
            if (lbBtn) lbBtn.textContent = T('lb.leaderboard.btn');
        }
    }
}

// ── Talent effect text (bilingual) ──
function talentEffectText(id, lv) {
    if (lv === 0) return T('shop.unlocked');
    switch (id) {
        case 'damage':   return '+' + (lv * 15) + '% ' + T('talent.effect.damage');
        case 'squad':    return '+' + lv + ' ' + T('talent.effect.squad');
        case 'fireRate': return '-' + (lv * 8) + '% ' + T('talent.effect.fireRate');
        case 'armor':    return '\u2212' + lv + ' ' + T('talent.effect.armor');
        case 'luck':     return '+' + (lv * 12) + '% ' + T('talent.effect.luck');
        default: {
            const def = (typeof TALENT_DEFS !== 'undefined') ? TALENT_DEFS.find(function(d){ return d.id === id; }) : null;
            return def ? def.effectDesc(lv) : '';
        }
    }
}

// ============================================================
// TRANSLATIONS
// ============================================================
const TRANSLATIONS = {
    zh: {
        // Main menu
        'menu.subtitle':        '桥 梁 突 击',
        'menu.start':           'START GAME',
        'menu.shop':            'SHOP',

        // Shop tabs
        'tab.weapon':           '基础武器',
        'tab.special':          '特种武器',
        'tab.defense':          '特技',
        'tab.talent':           '天赋',

        // Shop general
        'shop.back':            'BACK',
        'shop.equipped':        '✓ 已装备',
        'shop.equip':           '装备',
        'shop.unlock':          '解锁',
        'shop.maxed':           '已满级',
        'shop.perm':            '永久强化',
        'shop.pierce':          '✦ 穿透弹道',
        'shop.normal':          '● 普通弹道',
        'shop.unlocked':        '未解锁',
        'shop.equipped.label':  '当前基础武器：',
        'shop.special.hint':    '按 [1] 激活无敌护盾 · 按 [2] 激活亢奋，各消耗1次充能',
        'shop.talent.hint':     '宝石由 Boss 随机掉落，用于永久提升角色属性',
        'shop.locked':          '🔒 需要 Lv.{0}',

        // Weapon names & descriptions
        'weapon.shotgun.name':        '霰弹枪',
        'weapon.shotgun.desc':        '扇形散射，近距离爆炸威力',
        'weapon.shotgun.lv1':         '近强远弱，颠覆近战',
        'weapon.shotgun.lv2':         '伤害×1.6，弹数+2',
        'weapon.shotgun.lv3':         '伤害×2.5，弹数+4',
        'weapon.laser.name':          '激光炮',
        'weapon.laser.desc':          '穿透射线，贯穿所有敌人',
        'weapon.laser.lv1':           '穿透射线，贯穿敌人',
        'weapon.laser.lv2':           '伤害×1.6，光束+1',
        'weapon.laser.lv3':           '伤害×2.5，光束+2',
        'weapon.rocket.name':         '火箭筒',
        'weapon.rocket.desc':         'AOE爆炸，范围毁灭',
        'weapon.rocket.lv1':          'AOE爆炸，范围毁灭',
        'weapon.rocket.lv2':          '伤害×1.6，火箭+1',
        'weapon.rocket.lv3':          '伤害×2.5，火箭+2',
        'weapon.invincibility.name':  '无敌护盾',
        'weapon.invincibility.desc':  '激活后护盾抵挡所有伤害',
        'weapon.stimulant.name':      '亢奋',
        'weapon.stimulant.desc':      '激活后10秒内兵力×2，所有伤害减半',
        'weapon.duration':            '持续{0}s · [{1}]键 · 消耗品',

        // Pistol tiers
        'pistol.0.name':  '手枪',
        'pistol.0.desc':  '基础单发，忠实伙伴',
        'pistol.1.name':  '马格南',
        'pistol.1.desc':  '强化弹头，弹道更粗更亮',
        'pistol.2.name':  '冲锋枪',
        'pistol.2.desc':  '双线弹幕，持续压制',
        'pistol.3.name':  '穿甲枪',
        'pistol.3.desc':  '穿透装甲，贯穿所有目标',
        'pistol.4.name':  '粒子炮',
        'pistol.4.desc':  '粒子束流，穿透+光晕',
        'pistol.5.name':  '等离子',
        'pistol.5.desc':  '等离子流，强力穿透光束',
        'pistol.6.name':  '量子炮',
        'pistol.6.desc':  '量子湮灭，终极基础武器',
        'pistol.unlock':  'Lv.{0} 解锁',

        // Talent names & descriptions
        'talent.damage.name':    '攻击强化',
        'talent.damage.desc':    '所有武器基础伤害提升',
        'talent.squad.name':     '精英征召',
        'talent.squad.desc':     '增加游戏开始时的初始兵力',
        'talent.fireRate.name':  '急速连发',
        'talent.fireRate.desc':  '提升所有武器射击频率',
        'talent.armor.name':     '护甲强化',
        'talent.armor.desc':     '每级永久减少1点受击兵力损失',
        'talent.luck.name':      '鸿运当头',
        'talent.luck.desc':      '增加高数值+门和武器门出现概率',

        // Talent effect units
        'talent.effect.damage':    '伤害',
        'talent.effect.squad':     '初始兵力',
        'talent.effect.fireRate':  '射击间隔',
        'talent.effect.armor':     '受击伤害',
        'talent.effect.luck':      '好运',

        // Mid-game shop
        'midshop.title':     '⚔️ 补给站',
        'midshop.subtitle':  '大龙王已击败！消耗得分补充兵力',
        'midshop.continue':  '继续战斗',
        'midshop.score':     '得分',
        'midshop.squad':     '兵力',
        'midshop.loss':      '损耗',
        'midshop.restored':  '已补',
        'midshop.full':      '已满',
        'midshop.troops':    '+{0} 兵力',
        'midshop.buy':       '{0} 分',
        'midshop.bought':    '✓ 已补充',
        'midshop.opt0':      '小队补充',
        'midshop.opt1':      '中队增援',
        'midshop.opt2':      '全额恢复',

        // Game over
        'gameover.title':      'GAME OVER',
        'gameover.score':      '最终得分',
        'gameover.stats':      '到达第 {0} 波 | 击杀 {1}',
        'gameover.combo':      '最高连击: {0}x',
        'gameover.coins':      '获得金币: +{0} (总计: {1})',
        'gameover.gems':       '💎 获得宝石: +{0} (总计: {1})',
        'gameover.gems.hint':  '击败 Boss 可获得宝石 💎',
        'gameover.record':     '历史最高: {0} (第{1}波)',
        'gameover.newrecord':  '★ NEW RECORD! ★',
        'gameover.mainmenu':   'MAIN MENU',
        'gameover.playagain':  'PLAY AGAIN',

        // Revive
        'revive.title':    '全军覆没!',
        'revive.prompt':   '💎 使用 {0} 颗宝石复活',
        'revive.restore':  '复活后恢复至最大兵力 ({0})',
        'revive.gems':     '当前宝石: {0} 💎',
        'revive.btn':      '💎 复活 ({0})',
        'revive.decline':  '放弃',

        // Pause
        'pause.sub':      '已暂停',
        'pause.hint':     'ESC · P 继续',
        'pause.resume':   '▶ 继续',
        'pause.restart':  '↺ 重新开始',
        'pause.menu':     '⌂ 主菜单',

        // Leaderboard
        'lb.title':            '🏆 天 梯 榜',
        'lb.join.desc':        '设置一个名字，之后每次打完游戏<br>你的最高分会自动同步到排行榜',
        'lb.join.placeholder': '输入你的名字（最多16字）',
        'lb.join.btn':         '加入排行榜',
        'lb.join.loading':     '加入中…',
        'lb.join.empty':       '请输入名字',
        'lb.join.fail':        '加入失败，请稍后重试',
        'lb.cancel':           '取消',
        'lb.col.player':       '玩家',
        'lb.col.level':        '等级',
        'lb.col.score':        '分数',
        'lb.col.wave':         '波次',
        'lb.loading':          '加载中…',
        'lb.empty':            '暂无记录，快来第一个上榜！',
        'lb.error':            '⚠ 加载失败，请稍后重试',
        'lb.me':               '你',
        'lb.processing':       '处理中…',
        'lb.toggle.hide':      '隐藏分数',
        'lb.toggle.show':      '显示分数',
        'lb.hidden.notice':    '你的分数当前已隐藏，不会出现在榜单中',
        'lb.close':            '关闭',
        'lb.leaderboard.btn':  '🏆 天梯榜',
    },

    en: {
        // Main menu
        'menu.subtitle':        'WAVE  DEFENSE',
        'menu.start':           'START GAME',
        'menu.shop':            'SHOP',

        // Shop tabs
        'tab.weapon':           'WEAPONS',
        'tab.special':          'SPECIALS',
        'tab.defense':          'SKILLS',
        'tab.talent':           'TALENTS',

        // Shop general
        'shop.back':            'BACK',
        'shop.equipped':        '✓ Equipped',
        'shop.equip':           'Equip',
        'shop.unlock':          'Unlock',
        'shop.maxed':           'MAX',
        'shop.perm':            'Permanent',
        'shop.pierce':          '✦ Piercing',
        'shop.normal':          '● Standard',
        'shop.unlocked':        'Not unlocked',
        'shop.equipped.label':  'Current weapon: ',
        'shop.special.hint':    '[1] Activate Shield · [2] Activate Frenzy, each uses 1 charge',
        'shop.talent.hint':     'Gems drop from bosses, used to permanently upgrade attributes',
        'shop.locked':          '🔒 Requires Lv.{0}',

        // Weapon names & descriptions
        'weapon.shotgun.name':        'Shotgun',
        'weapon.shotgun.desc':        'Spread fire, deadly at close range',
        'weapon.shotgun.lv1':         'Strong up close, weak at range',
        'weapon.shotgun.lv2':         'Dmg ×1.6, +2 pellets',
        'weapon.shotgun.lv3':         'Dmg ×2.5, +4 pellets',
        'weapon.laser.name':          'Laser Cannon',
        'weapon.laser.desc':          'Piercing beam through all enemies',
        'weapon.laser.lv1':           'Piercing beam through all enemies',
        'weapon.laser.lv2':           'Dmg ×1.6, +1 beam',
        'weapon.laser.lv3':           'Dmg ×2.5, +2 beams',
        'weapon.rocket.name':         'Rocket Launcher',
        'weapon.rocket.desc':         'AOE explosion, area devastation',
        'weapon.rocket.lv1':          'AOE explosion, area devastation',
        'weapon.rocket.lv2':          'Dmg ×1.6, +1 rocket',
        'weapon.rocket.lv3':          'Dmg ×2.5, +2 rockets',
        'weapon.invincibility.name':  'Shield',
        'weapon.invincibility.desc':  'Blocks all damage while active',
        'weapon.stimulant.name':      'Frenzy',
        'weapon.stimulant.desc':      'Squad ×2 for 10s, incoming damage halved',
        'weapon.duration':            '{0}s · [{1}] key · Consumable',

        // Pistol tiers
        'pistol.0.name':  'Pistol',
        'pistol.0.desc':  'Basic single shot, reliable sidearm',
        'pistol.1.name':  'Magnum',
        'pistol.1.desc':  'Reinforced rounds, thicker brighter shots',
        'pistol.2.name':  'SMG',
        'pistol.2.desc':  'Dual-line barrage, continuous suppression',
        'pistol.3.name':  'AP Rifle',
        'pistol.3.desc':  'Armor-piercing, penetrates all targets',
        'pistol.4.name':  'Particle Gun',
        'pistol.4.desc':  'Particle beam with pierce & glow',
        'pistol.5.name':  'Plasma Gun',
        'pistol.5.desc':  'Plasma stream, powerful piercing beam',
        'pistol.6.name':  'Quantum Cannon',
        'pistol.6.desc':  'Quantum annihilation, ultimate base weapon',
        'pistol.unlock':  'Lv.{0} required',

        // Talent names & descriptions
        'talent.damage.name':    'Attack Boost',
        'talent.damage.desc':    'Increase base damage of all weapons',
        'talent.squad.name':     'Elite Recruit',
        'talent.squad.desc':     'Increase starting squad size',
        'talent.fireRate.name':  'Rapid Fire',
        'talent.fireRate.desc':  'Increase fire rate of all weapons',
        'talent.armor.name':     'Armor',
        'talent.armor.desc':     'Permanently reduce troop loss per hit',
        'talent.luck.name':      'Fortune',
        'talent.luck.desc':      'Higher chance of bonus & weapon gates',

        // Talent effect units
        'talent.effect.damage':    'DMG',
        'talent.effect.squad':     'starting troops',
        'talent.effect.fireRate':  'fire interval',
        'talent.effect.armor':     'hit damage',
        'talent.effect.luck':      'luck',

        // Mid-game shop
        'midshop.title':     '⚔️ Supply Depot',
        'midshop.subtitle':  'Mega Boss defeated! Spend score for troops',
        'midshop.continue':  'Continue',
        'midshop.score':     'Score',
        'midshop.squad':     'Squad',
        'midshop.loss':      'Lost',
        'midshop.restored':  'Restored',
        'midshop.full':      'FULL',
        'midshop.troops':    '+{0} Troops',
        'midshop.buy':       '{0} pts',
        'midshop.bought':    '✓ Done',
        'midshop.opt0':      'Small Reinforce',
        'midshop.opt1':      'Medium Reinforce',
        'midshop.opt2':      'Full Restore',

        // Game over
        'gameover.title':      'GAME OVER',
        'gameover.score':      'Final Score',
        'gameover.stats':      'Wave {0} | Kills {1}',
        'gameover.combo':      'Best Combo: {0}x',
        'gameover.coins':      'Coins: +{0} (Total: {1})',
        'gameover.gems':       '💎 Gems: +{0} (Total: {1})',
        'gameover.gems.hint':  'Defeat bosses to earn gems 💎',
        'gameover.record':     'Record: {0} (Wave {1})',
        'gameover.newrecord':  '★ NEW RECORD! ★',
        'gameover.mainmenu':   'MAIN MENU',
        'gameover.playagain':  'PLAY AGAIN',

        // Revive
        'revive.title':    'WIPED OUT!',
        'revive.prompt':   '💎 Spend {0} gems to revive',
        'revive.restore':  'Revive restores squad to {0}',
        'revive.gems':     'Current gems: {0} 💎',
        'revive.btn':      '💎 Revive ({0})',
        'revive.decline':  'Give Up',

        // Pause
        'pause.sub':      'Game Paused',
        'pause.hint':     'ESC · P Resume',
        'pause.resume':   '▶ Resume',
        'pause.restart':  '↺ Restart',
        'pause.menu':     '⌂ Main Menu',

        // Leaderboard
        'lb.title':            '🏆 LEADERBOARD',
        'lb.join.desc':        'Set a name to join — your best score<br>will sync automatically after each game',
        'lb.join.placeholder': 'Enter your name (max 16 chars)',
        'lb.join.btn':         'Join Leaderboard',
        'lb.join.loading':     'Joining…',
        'lb.join.empty':       'Please enter a name',
        'lb.join.fail':        'Failed to join, please try again',
        'lb.cancel':           'Cancel',
        'lb.col.player':       'Player',
        'lb.col.level':        'Level',
        'lb.col.score':        'Score',
        'lb.col.wave':         'Wave',
        'lb.loading':          'Loading…',
        'lb.empty':            'No entries yet — be the first!',
        'lb.error':            '⚠ Failed to load, please retry',
        'lb.me':               'You',
        'lb.processing':       'Processing…',
        'lb.toggle.hide':      'Hide my score',
        'lb.toggle.show':      'Show my score',
        'lb.hidden.notice':    'Your score is hidden and won\'t appear in the rankings',
        'lb.close':            'Close',
        'lb.leaderboard.btn':  '🏆 Leaderboard',
    },
};

// Apply language on initial page load (after DOM is ready)
// This runs before PixiJS init, safe to update static DOM elements
(function() {
    document.documentElement.lang = LANG;
    const btn = document.getElementById('langToggleBtn');
    if (btn) btn.textContent = LANG === 'zh' ? 'EN' : '中';
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
        el.textContent = T(el.dataset.i18n);
    });
})();
