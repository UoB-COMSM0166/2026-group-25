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

    // Mid-shop dynamic stats/options are rendered strings, so refresh them too.
    const midShopEl = document.getElementById('midShopOverlay');
    if (midShopEl && !midShopEl.classList.contains('hidden')) {
        if (typeof renderMidShop === 'function') renderMidShop();
    }

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
        'tutorial.complete.body':     '祝你在正式战场上好运，士兵！',
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

        // Achievement Categories
        'ach.cat.combat': '战斗',
        'ach.cat.progression': '历程',
        'ach.cat.collection': '收集',
        'ach.cat.arsenal': '军械',
        'ach.cat.survival': '生存',
        'ach.cat.special': '特殊',

        // Achievement Items
        'ach.kill_count.name': '杀戮者',
        'ach.kill_count.desc.0': '击杀 100 个敌人',
        'ach.kill_count.desc.1': '击杀 500 个敌人',
        'ach.kill_count.desc.2': '击杀 2000 个敌人',
        'ach.combo_king.name': '连击之王',
        'ach.combo_king.desc.0': '达到 10 连击',
        'ach.combo_king.desc.1': '达到 30 连击',
        'ach.combo_king.desc.2': '达到 60 连击',
        'ach.boss_hunter.name': 'Boss 猎人',
        'ach.boss_hunter.desc.0': '击败 5 个 Boss',
        'ach.boss_hunter.desc.1': '击败 20 个 Boss',
        'ach.boss_hunter.desc.2': '击败 50 个 Boss',
        'ach.mega_slayer.name': '巨龙杀手',
        'ach.mega_slayer.desc.0': '击败巨龙王',
        'ach.final_showdown.name': '最终对决',
        'ach.final_showdown.desc.0': '击败第 66 波双龙王',
        'ach.wave_surfer.name': '破浪者',
        'ach.wave_surfer.desc.0': '达到第 10 波',
        'ach.wave_surfer.desc.1': '达到第 30 波',
        'ach.wave_surfer.desc.2': '达到第 60 波',
        'ach.veteran.name': '老兵',
        'ach.veteran.desc.0': '达到 10 级',
        'ach.veteran.desc.1': '达到 20 级',
        'ach.veteran.desc.2': '达到 30 级',
        'ach.score_chaser.name': '得分猎手',
        'ach.score_chaser.desc.0': '得分达到 500',
        'ach.score_chaser.desc.1': '得分达到 3000',
        'ach.score_chaser.desc.2': '得分达到 10000',
        'ach.victory.name': '胜利',
        'ach.victory.desc.0': '完成第一关',
        'ach.hell_conqueror.name': '地狱征服者',
        'ach.hell_conqueror.desc.0': '第二关达到 20 波',
        'ach.hell_conqueror.desc.1': '第二关达到 50 波',
        'ach.hell_conqueror.desc.2': '第二关达到 88 波',
        'ach.gold_rush.name': '淘金热',
        'ach.gold_rush.desc.0': '赚取 200 金币',
        'ach.gold_rush.desc.1': '赚取 1000 金币',
        'ach.gold_rush.desc.2': '赚取 5000 金币',
        'ach.gem_collector.name': '宝石收藏家',
        'ach.gem_collector.desc.0': '赚取 30 宝石',
        'ach.gem_collector.desc.1': '赚取 150 宝石',
        'ach.gem_collector.desc.2': '赚取 500 宝石',
        'ach.treasure_run.name': '寻宝之旅',
        'ach.treasure_run.desc.0': '单局收集 80+ 金币',
        'ach.first_upgrade.name': '初次升级',
        'ach.first_upgrade.desc.0': '购买第一个武器升级',
        'ach.full_arsenal.name': '全副武装',
        'ach.full_arsenal.desc.0': '3 种武器均达到 3 级',
        'ach.quantum_era.name': '量子时代',
        'ach.quantum_era.desc.0': '解锁量子炮',
        'ach.talent_master.name': '天赋大师',
        'ach.talent_master.desc.0': '购买 5 级天赋',
        'ach.talent_master.desc.1': '购买 15 级天赋',
        'ach.iron_fortress.name': '钢铁堡垒',
        'ach.iron_fortress.desc.0': '满级护甲',
        'ach.army_builder.name': '建军大业',
        'ach.army_builder.desc.0': '单局兵力达到 30',
        'ach.army_builder.desc.1': '单局兵力达到 50',
        'ach.army_builder.desc.2': '单局兵力达到 80',
        'ach.no_casualties.name': '零伤亡',
        'ach.no_casualties.desc.0': 'Boss 波无兵力损失',
        'ach.phoenix_rising.name': '浴火重生',
        'ach.phoenix_rising.desc.0': '复活并通关',
        'ach.iron_will.name': '钢铁意志',
        'ach.iron_will.desc.0': '25波以上，0复活，损失≤3兵力',
        'ach.chain_reaction.name': '连锁反应',
        'ach.chain_reaction.desc.0': '触发 3 次以上油桶连爆',
        'ach.speed_kill.name': '极速击杀',
        'ach.speed_kill.desc.0': 'Boss 出现 5 秒内击杀',
        'ach.marathon.name': '马拉松',
        'ach.marathon.desc.0': '游玩 10 局游戏',
        'ach.marathon.desc.1': '游玩 30 局游戏',
        'ach.marathon.desc.2': '游玩 100 局游戏',
        'ach.perfectionist.name': '完美主义者',
        'ach.perfectionist.desc.0': '解锁所有其他成就（最高级）',


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
        'hud.current.weapon':   '当前武器',
        'hud.current.weapon.temp': '临时',
        'hud.panel.show':       '显示武器面板',
        'hud.panel.hide':       '收起武器面板',

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
        'lb.join.desc':        '设置一个名字（可用昵称）<br>你的分数默认私密保存，手动开启后才会上榜',
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
        'lb.hidden.notice':    '你的分数当前是私密状态，不会出现在公开榜单中',
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
        'tutorial.complete.body':     'Good luck out there, soldier!',
        'tutorial.complete.continue': '▶ GO TO LEVEL SELECT',
        'tutorial.reward.choose':     'Choose 1 permanent reward',
        'tutorial.reward.pick':       'PICK THIS REWARD',
        'tutorial.reward.once':       'Tutorial rewards can only be claimed once, so pick the bonus that fits your playstyle.',
        'tutorial.reward.claimed':    'TUTORIAL REWARD CLAIMED',
        'tutorial.reward.already':    'You have already claimed your tutorial reward.',
        'tutorial.reward.shotgun.title': 'Permanent SHOTGUN Lv.1',
        'tutorial.reward.shotgun.body':  'Unlock Shotgun level 1 for free and bring reliable close-range burst into future runs.',
        'tutorial.reward.laser.title':   'Permanent LASER Lv.1',
        'tutorial.reward.laser.body':    'Unlock Laser level 1 for free and start future runs with piercing wave-clear ready to build on.',
        'tutorial.reward.magnum.title':  'Early MAGNUM unlock',
        'tutorial.reward.magnum.body':   'Claim the Magnum pistol tier immediately and auto-equip it for your later runs.',

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

        // Achievement Categories
        'ach.cat.combat': 'Combat',
        'ach.cat.progression': 'Progression',
        'ach.cat.collection': 'Collection',
        'ach.cat.arsenal': 'Arsenal',
        'ach.cat.survival': 'Survival',
        'ach.cat.special': 'Special',

        // Achievement Items
        'ach.kill_count.name': 'Slayer',
        'ach.kill_count.desc.0': 'Kill 100 enemies',
        'ach.kill_count.desc.1': 'Kill 500 enemies',
        'ach.kill_count.desc.2': 'Kill 2000 enemies',
        'ach.combo_king.name': 'Combo King',
        'ach.combo_king.desc.0': 'Reach 10x combo',
        'ach.combo_king.desc.1': 'Reach 30x combo',
        'ach.combo_king.desc.2': 'Reach 60x combo',
        'ach.boss_hunter.name': 'Boss Hunter',
        'ach.boss_hunter.desc.0': 'Defeat 5 bosses',
        'ach.boss_hunter.desc.1': 'Defeat 20 bosses',
        'ach.boss_hunter.desc.2': 'Defeat 50 bosses',
        'ach.mega_slayer.name': 'Mega Slayer',
        'ach.mega_slayer.desc.0': 'Defeat a Mega Boss',
        'ach.final_showdown.name': 'Final Showdown',
        'ach.final_showdown.desc.0': 'Beat wave 66 dual boss',
        'ach.wave_surfer.name': 'Wave Surfer',
        'ach.wave_surfer.desc.0': 'Reach wave 10',
        'ach.wave_surfer.desc.1': 'Reach wave 30',
        'ach.wave_surfer.desc.2': 'Reach wave 60',
        'ach.veteran.name': 'Veteran',
        'ach.veteran.desc.0': 'Reach level 10',
        'ach.veteran.desc.1': 'Reach level 20',
        'ach.veteran.desc.2': 'Reach level 30',
        'ach.score_chaser.name': 'Score Chaser',
        'ach.score_chaser.desc.0': 'Score 500 pts',
        'ach.score_chaser.desc.1': 'Score 3000 pts',
        'ach.score_chaser.desc.2': 'Score 10000 pts',
        'ach.victory.name': 'Victory',
        'ach.victory.desc.0': 'Complete Level 1',
        'ach.hell_conqueror.name': 'Hell Conqueror',
        'ach.hell_conqueror.desc.0': 'L2 wave 20',
        'ach.hell_conqueror.desc.1': 'L2 wave 50',
        'ach.hell_conqueror.desc.2': 'L2 wave 88',
        'ach.gold_rush.name': 'Gold Rush',
        'ach.gold_rush.desc.0': 'Earn 200 coins',
        'ach.gold_rush.desc.1': 'Earn 1000 coins',
        'ach.gold_rush.desc.2': 'Earn 5000 coins',
        'ach.gem_collector.name': 'Gem Collector',
        'ach.gem_collector.desc.0': 'Earn 30 gems',
        'ach.gem_collector.desc.1': 'Earn 150 gems',
        'ach.gem_collector.desc.2': 'Earn 500 gems',
        'ach.treasure_run.name': 'Treasure Run',
        'ach.treasure_run.desc.0': 'Collect 80+ coins in a single run',
        'ach.first_upgrade.name': 'First Upgrade',
        'ach.first_upgrade.desc.0': 'Buy first weapon upgrade',
        'ach.full_arsenal.name': 'Full Arsenal',
        'ach.full_arsenal.desc.0': 'All 3 weapons to Lv3',
        'ach.quantum_era.name': 'Quantum Era',
        'ach.quantum_era.desc.0': 'Unlock Quantum Pistol',
        'ach.talent_master.name': 'Talent Master',
        'ach.talent_master.desc.0': '5 talent levels',
        'ach.talent_master.desc.1': '15 talent levels',
        'ach.iron_fortress.name': 'Iron Fortress',
        'ach.iron_fortress.desc.0': 'Max armor',
        'ach.army_builder.name': 'Army Builder',
        'ach.army_builder.desc.0': 'Peak squad 30',
        'ach.army_builder.desc.1': 'Peak squad 50',
        'ach.army_builder.desc.2': 'Peak squad 80',
        'ach.no_casualties.name': 'No Casualties',
        'ach.no_casualties.desc.0': 'Boss wave with 0 troop loss',
        'ach.phoenix_rising.name': 'Phoenix Rising',
        'ach.phoenix_rising.desc.0': 'Revive then complete the level',
        'ach.iron_will.name': 'Iron Will',
        'ach.iron_will.desc.0': 'Wave 25+, 0 revives, ≤3 troops lost',
        'ach.chain_reaction.name': 'Chain Reaction',
        'ach.chain_reaction.desc.0': '3+ barrel chain explosion',
        'ach.speed_kill.name': 'Speed Kill',
        'ach.speed_kill.desc.0': 'Kill a boss within 5s of spawn',
        'ach.marathon.name': 'Marathon',
        'ach.marathon.desc.0': 'Play 10 games',
        'ach.marathon.desc.1': 'Play 30 games',
        'ach.marathon.desc.2': 'Play 100 games',
        'ach.perfectionist.name': 'Perfectionist',
        'ach.perfectionist.desc.0': 'Unlock all other achievements (max tier)',


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
        'hud.current.weapon':   'Current Weapon',
        'hud.current.weapon.temp': 'TEMP',
        'hud.panel.show':       'Show weapon panel',
        'hud.panel.hide':       'Hide weapon panel',

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
        'lb.join.desc':        'Set a display name (nickname is fine)<br>Your score is private by default and only appears after you choose to show it',
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
        'lb.hidden.notice':    'Your score is currently private and will not appear on the public leaderboard',
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
