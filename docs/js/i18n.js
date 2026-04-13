// ============================================================
// INTERNATIONALIZATION (i18n)
// ============================================================
let LANG = localStorage.getItem('bridgeAssault_lang') || 'en';

// T(key, ...args) — look up translation, replace {0} {1} placeholders
function T(key) {
    const args = Array.prototype.slice.call(arguments, 1);
    const t = TRANSLATIONS[LANG] || TRANSLATIONS.en;
    let s = (t[key] !== undefined) ? t[key] : ((TRANSLATIONS.en[key] !== undefined) ? TRANSLATIONS.en[key] : key);
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
    // Elements with data-i18n-html attribute (allows <br> etc)
    document.querySelectorAll('[data-i18n-html]').forEach(function(el) {
        el.innerHTML = T(el.dataset.i18nHtml);
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

    // data-i18n loop above already handles the main menu elements.
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
        'menu.start':           '开始游戏',
        'menu.tutorial':        '新手教程',
        'menu.shop':            '商店',
        'menu.achievements':    '成就',
        'menu.leaderboard':     '天梯榜',

        // Tutorial (Level 0)
        'tutorial.wavelabel':   '第 {0}/{1} 步',
        'tutorial.w1.title':    '移动鼠标来控制小队',
        'tutorial.w1.body':     '你的小队会自动开火，你只需要左右移动击杀小恶魔。',
        'tutorial.w2.title':    '小心敌人的冲撞',
        'tutorial.w2.body':     '被敌人触碰会损失兵力，及时用走位清理眼前的威胁。',
        'tutorial.w3.title':    '击杀敌人掉落金币 🪙',
        'tutorial.w3.body':     '金币会自动吸附到你身上，用于主菜单商店里的永久强化。',
        'tutorial.w4.title':    '穿越「加兵」门获得增援',
        'tutorial.w4.body':     '面板上的 + 代表增加兵力，走过去即可选择。兵力越多火力越猛。',
        'tutorial.w5.title':    '金色武器门 = 强力临时武器',
        'tutorial.w5.body':     '走过「SHOTGUN」面板试试散弹枪！武器门有时间限制，过期后回到手枪。',
        'tutorial.w6.title':    '红色油桶 💥 范围伤害',
        'tutorial.w6.body':     '击中油桶会在周围造成大范围爆炸，适合清理一堆敌人。',
        'tutorial.w7.title':    '击败 BOSS 获取宝石 💎',
        'tutorial.w7.body':     '这是一只迷你 Boss。击败它会掉落宝石，宝石可在商店里升级天赋、也可原地复活。',
        'tutorial.w8.title':    '按 [1] 激活无敌护盾',
        'tutorial.w8.body':     '已送你 1 次护盾充能，按键盘 1 键开启，4 秒内免疫所有伤害。',
        'tutorial.w9.title':    '按 [2] 激活亢奋',
        'tutorial.w9.body':     '已送你 1 次亢奋充能，按键盘 2 键开启，10 秒内兵力×2 且伤害减半。',
        'tutorial.w10.title':   '按 [ESC] 或 [P] 暂停游戏',
        'tutorial.w10.body':    '最后一步！按一次暂停键（ESC 或 P），了解暂停功能即可完成教程。',
        'tutorial.progress.kills':    '目标：击杀小恶魔 {0}/{1}',
        'tutorial.progress.coins':    '目标：拾取金币 {0}/{1}',
        'tutorial.progress.survive':  '目标：存活 {0}/{1} 秒',
        'tutorial.progress.miniboss': '目标：击败迷你 BOSS',
        'tutorial.progress.gempickup':'目标：拾取掉落的宝石 💎',
        'tutorial.progress.pause':    '目标：按 [ESC] 或 [P] 暂停一次',
        'tutorial.progress.action':   '完成上方操作即可继续',
        'tutorial.goal.done':         '✓ 完成！',
        'tutorial.complete.title':    '教程完成',
        'tutorial.complete.subtitle': '你已掌握核心机制',
        'tutorial.complete.body':     '移动 · 金币 · 宝石 · 武器门 · 油桶 · 特技 — 祝你好运！',
        'tutorial.complete.continue': '▶ 进入正式关卡',

        // Level select
        'levelselect.title':    '选择关卡',
        'levelselect.start':    '开 始',
        'levelselect.back':     '← 主菜单',
        'levelselect.bestinfo': '最高波次: {0} | 最高分: {1}',
        'levelselect.l0.tag':   'LEVEL 0 · 教程',
        'levelselect.l0.name':  '新手教程',
        'levelselect.l0.desc':  '10 步互动教学 · 掌握核心机制',
        'levelselect.l0.start': '▶ 开 始',
        'levelselect.l1.name':  '桥梁突击',
        'levelselect.l1.locked':'🔒 先完成新手教程（Level 0）',
        'levelselect.l2.name':  '末日工厂',
        'levelselect.l2.locked':'🔒 通关第一关（66波）解锁',

        // Enemy names
        'enemy.patrick':     '派大星',
        'enemy.bigdragon':   '大奶龙',
        'enemy.smalldragon': '小奶龙',
        'enemy.capybara':    '水豚兵',
        'enemy.elephant':    '大象王',
        'enemy.crycow':      '哭泣奶牛',

        // Boss labels (HUD & wave banner)
        'boss.dragon':          '龙王',
        'boss.mega':            '巨龙王',
        'boss.elephant':        '象王',
        'boss.crycow':          '哭泣奶牛',
        'wave.incoming':        '敌军来袭！',
        'wave.bossincoming':    'BOSS 来袭！',
        'wave.megaboss':        '巨龙王降临！',
        'wave.elephantking':    '象王降临！',
        'wave.crycowincoming':  '哭泣奶牛来袭！',
        'wave.finalbattle':     '最终决战！双巨龙王！',

        // Level complete
        'levelcomplete.title':       '🏆 关卡完成！',
        'levelcomplete.clear':       '通关！',
        'levelcomplete.waves':       '波次: {0} / {1}',
        'levelcomplete.score':       '得分: {0}',
        'levelcomplete.unlocked':    '🔓 关卡II - 末日工厂 已解锁！',
        'levelcomplete.next':        '下一关',
        'levelcomplete.selectlevel': '选择关卡',
        'levelcomplete.mainmenu':    '主菜单',

        // Mobile block
        'mobile.title':         '请在电脑上游玩',
        'mobile.msg':           '桥梁突击暂不支持移动端<br>请使用电脑浏览器打开游戏',

        // Weapon unlock toast
        'weapon.unlocked':      '{0} 已解锁！',
        'weapon.newweapon':     '新武器',

        // Achievements
        'ach.title':            '成就',
        'ach.back':             '返回',
        'ach.unlocked':         '已解锁',
        'ach.claim':            '领取',
        'ach.claimed':          '已领取',

        // Shop tabs
        'tab.weapon':           '基础武器',
        'tab.special':          '特种武器',
        'tab.defense':          '特技',
        'tab.talent':           '天赋',

        // Shop general
        'shop.title':           '商店',
        'shop.back':            '返回',
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
        'gameover.title':      '游戏结束',
        'gameover.score':      '最终得分',
        'gameover.stats':      '到达第 {0} 波 | 击杀 {1}',
        'gameover.combo':      '最高连击: {0}x',
        'gameover.coins':      '获得金币: +{0} (总计: {1})',
        'gameover.gems':       '💎 获得宝石: +{0} (总计: {1})',
        'gameover.gems.hint':  '击败 Boss 可获得宝石 💎',
        'gameover.record':     '历史最高: {0} (第{1}波)',
        'gameover.newrecord':  '★ 新纪录! ★',
        'gameover.mainmenu':   '主菜单',
        'gameover.playagain':  '再玩一次',

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
        'menu.tutorial':        'TUTORIAL',
        'menu.shop':            'SHOP',
        'menu.achievements':    'ACHIEVEMENTS',
        'menu.leaderboard':     'LEADERBOARD',

        // Tutorial (Level 0)
        'tutorial.wavelabel':   'STEP {0}/{1}',
        'tutorial.w1.title':    'Move the mouse to steer your squad',
        'tutorial.w1.body':     'Your troops auto-fire. All you do is move left and right to dodge.',
        'tutorial.w2.title':    'Avoid enemy contact',
        'tutorial.w2.body':     'Touching enemies costs troops. Keep them at a distance.',
        'tutorial.w3.title':    'Kills drop coins 🪙',
        'tutorial.w3.body':     'Coins magnetise to you and are spent in the main menu shop for permanent upgrades.',
        'tutorial.w4.title':    'Walk through the + gate for reinforcements',
        'tutorial.w4.body':     'The + panel adds troops to your squad. More troops means more firepower.',
        'tutorial.w5.title':    'Gold gates grant a temporary super-weapon',
        'tutorial.w5.body':     'Walk through the SHOTGUN panel to try it! Weapon gates are timed — you return to the pistol afterward.',
        'tutorial.w6.title':    'Red barrels 💥 explode in a big AOE',
        'tutorial.w6.body':     'Shoot a barrel and it detonates, clearing clusters of enemies around it.',
        'tutorial.w7.title':    'Defeat the BOSS for a gem 💎',
        'tutorial.w7.body':     'A mini boss! Bosses drop gems, used for talent upgrades and in-place revive.',
        'tutorial.w8.title':    'Press [1] to activate Shield',
        'tutorial.w8.body':     'You have been gifted 1 Shield charge. Press the 1 key — you are invincible for 4 seconds.',
        'tutorial.w9.title':    'Press [2] to activate Frenzy',
        'tutorial.w9.body':     'You have been gifted 1 Frenzy charge. Press the 2 key — troops ×2 and damage halved for 10 seconds.',
        'tutorial.w10.title':   'Press [ESC] or [P] to pause',
        'tutorial.w10.body':    'Last step! Press the pause key (ESC or P) once to finish the tutorial.',
        'tutorial.progress.kills':    'Goal: kill imps {0}/{1}',
        'tutorial.progress.coins':    'Goal: pick up coins {0}/{1}',
        'tutorial.progress.survive':  'Goal: survive {0}/{1} sec',
        'tutorial.progress.miniboss': 'Goal: defeat the mini boss',
        'tutorial.progress.gempickup':'Goal: pick up the dropped gem 💎',
        'tutorial.progress.pause':    'Goal: press [ESC] or [P] to pause once',
        'tutorial.progress.action':   'Complete the action above to continue',
        'tutorial.goal.done':         '✓ COMPLETED!',
        'tutorial.complete.title':    'TUTORIAL COMPLETE',
        'tutorial.complete.subtitle': 'You have learned the core mechanics',
        'tutorial.complete.body':     'Movement · coins · gems · gates · barrels · specials — good luck out there!',
        'tutorial.complete.continue': '▶ GO TO LEVEL SELECT',

        // Level select
        'levelselect.title':    'SELECT LEVEL',
        'levelselect.start':    'START',
        'levelselect.back':     '← MAIN MENU',
        'levelselect.bestinfo': 'BEST WAVE: {0} | BEST SCORE: {1}',
        'levelselect.l0.tag':   'LEVEL 0 · TUTORIAL',
        'levelselect.l0.name':  'BASIC TRAINING',
        'levelselect.l0.desc':  '10 interactive steps · learn the core mechanics',
        'levelselect.l0.start': '▶ START',
        'levelselect.l1.name':  'BRIDGE ASSAULT',
        'levelselect.l1.locked':'\uD83D\uDD12 Complete the tutorial (Level 0) first',
        'levelselect.l2.name':  'DOOMSDAY FACTORY',
        'levelselect.l2.locked':'\uD83D\uDD12 Clear Level I (Wave 66) to unlock',

        // Enemy names
        'enemy.patrick':     'Patrick',
        'enemy.bigdragon':   'Big Dragon',
        'enemy.smalldragon': 'Small Dragon',
        'enemy.capybara':    'Capybara',
        'enemy.elephant':    'Elephant King',
        'enemy.crycow':      'Crying Cow',

        // Boss labels (HUD & wave banner)
        'boss.dragon':          'BOSS DRAGON',
        'boss.mega':            'MEGA BOSS',
        'boss.elephant':        'ELEPHANT KING',
        'boss.crycow':          'CRY COW',
        'wave.incoming':        'INCOMING!',
        'wave.bossincoming':    'BOSS INCOMING!',
        'wave.megaboss':        'MEGA BOSS!',
        'wave.elephantking':    'ELEPHANT KING!',
        'wave.crycowincoming':  'CRY COW INCOMING!',
        'wave.finalbattle':     'FINAL BATTLE! DUAL MEGA BOSS!',

        // Level complete
        'levelcomplete.title':       '\uD83C\uDFC6 LEVEL COMPLETE!',
        'levelcomplete.clear':       'CLEAR!',
        'levelcomplete.waves':       'WAVES: {0} / {1}',
        'levelcomplete.score':       'SCORE: {0}',
        'levelcomplete.unlocked':    'LEVEL II - DOOMSDAY FACTORY UNLOCKED!',
        'levelcomplete.next':        'NEXT LEVEL',
        'levelcomplete.selectlevel': 'SELECT LEVEL',
        'levelcomplete.mainmenu':    'MAIN MENU',

        // Mobile block
        'mobile.title':         'Please play on desktop',
        'mobile.msg':           'Bridge Assault does not support mobile yet<br>Please open in a desktop browser',

        // Weapon unlock toast
        'weapon.unlocked':      '{0} UNLOCKED!',
        'weapon.newweapon':     'NEW WEAPON',

        // Achievements
        'ach.title':            'ACHIEVEMENTS',
        'ach.back':             'BACK',
        'ach.unlocked':         'unlocked',
        'ach.claim':            'CLAIM',
        'ach.claimed':          'Claimed',

        // Shop tabs
        'tab.weapon':           'WEAPONS',
        'tab.special':          'SPECIALS',
        'tab.defense':          'SKILLS',
        'tab.talent':           'TALENTS',

        // Shop general
        'shop.title':           'SHOP',
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
    document.querySelectorAll('[data-i18n-html]').forEach(function(el) {
        el.innerHTML = T(el.dataset.i18nHtml);
    });
})();
