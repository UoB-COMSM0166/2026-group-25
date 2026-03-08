// ============================================================
// SHOP SYSTEM
// ============================================================

// ── Reusable SVG icon strings (no emoji) ─────────────────────────────────
const SVG_COIN = `<svg viewBox="0 0 14 14" width="13" height="13" style="vertical-align:-2px;display:inline-block"><circle cx="7" cy="7" r="6.5" fill="#b8820a"/><circle cx="7" cy="7" r="5.5" fill="#f0b828"/><ellipse cx="5.5" cy="5" rx="2" ry="1" fill="#f8d860" opacity="0.65"/></svg>`;
const SVG_GEM  = `<svg viewBox="0 0 14 14" width="13" height="13" style="vertical-align:-2px;display:inline-block"><polygon points="7,1 13,6 7,13 1,6" fill="#8822bb"/><polygon points="7,1 13,6 7,7 1,6" fill="#cc44ff"/><polygon points="5,3 9,3 7,1" fill="#ee88ff"/></svg>`;
const SVG_LOCK = `<svg viewBox="0 0 12 12" width="11" height="11" style="vertical-align:-1px;display:inline-block"><rect x="2" y="5.5" width="8" height="6" rx="1.5" fill="#556677"/><path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" stroke="#3a4f5f" stroke-width="1.5" fill="none"/><circle cx="6" cy="9" r="1.2" fill="#8899aa"/></svg>`;
const SVG_SCORE = `<svg viewBox="0 0 12 12" width="11" height="11" style="vertical-align:-1px;display:inline-block"><polygon points="6,1 7.5,4.5 11.5,5 8.5,7.5 9.5,11 6,9.2 2.5,11 3.5,7.5 0.5,5 4.5,4.5" fill="#ffcc00"/></svg>`;

let _shopTab = 'weapon'; // 'weapon' | 'special' | 'talent' | 'defense'

function updateShopCurrencies() {
    const coinEl = document.getElementById('shopCoinCount');
    if (coinEl) coinEl.textContent = playerData.coins;
    const gemEl = document.getElementById('shopGemCount');
    if (gemEl) gemEl.textContent = playerData.gems || 0;
    // Also update main menu display
    const mcEl = document.getElementById('coinCount');
    if (mcEl) mcEl.textContent = playerData.coins;
    const mgEl = document.getElementById('gemCount');
    if (mgEl) mgEl.textContent = playerData.gems || 0;
}

function openShop() {
    document.getElementById('shopOverlay').classList.remove('hidden');
    _shopTab = 'weapon';
    renderShop();
}

function closeShop() {
    document.getElementById('shopOverlay').classList.add('hidden');
    updateShopCurrencies();
}

function switchShopTab(tab) {
    _shopTab = tab;
    renderShop();
}

function renderShop() {
    updateShopCurrencies();
    // Update tab active state
    document.querySelectorAll('.shop-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === _shopTab);
    });
    // Show/hide panels
    document.getElementById('shopWeaponPanel').style.display  = _shopTab === 'weapon'  ? '' : 'none';
    document.getElementById('shopSpecialPanel').style.display = _shopTab === 'special' ? '' : 'none';
    document.getElementById('shopTalentPanel').style.display  = _shopTab === 'talent'  ? '' : 'none';
    document.getElementById('shopDefensePanel').style.display = _shopTab === 'defense' ? '' : 'none';

    if (_shopTab === 'weapon')  renderShopItems();
    else if (_shopTab === 'special') renderSpecialItems();
    else if (_shopTab === 'talent')  renderTalentItems();
    else if (_shopTab === 'defense') renderDefenseItems();
}

function renderShopItems() {
    const container = document.getElementById('shopItems');
    const equippedEl = document.getElementById('equippedInfo');
    container.innerHTML = '';

    const owned = playerData.ownedPistolTiers || [0];
    const equipped = playerData.equippedPistolTier || 0;
    const playerLevel = playerData.level || 1;

    PISTOL_TIERS.forEach((tier, idx) => {
        const isOwned    = owned.includes(idx);
        const isEquipped = equipped === idx;
        const isLocked   = playerLevel < tier.requireLevel;
        const canAfford  = playerData.coins >= tier.price;

        const item = document.createElement('div');
        item.className = 'shop-item' + (isEquipped ? ' owned' : '');
        item.style.opacity = isLocked ? '0.55' : '1';
        item.innerHTML = `
            <div class="shop-item-icon" style="background:${tier.colorStr}22;border:2px solid ${tier.colorStr}">${tier.icon}</div>
            <div class="shop-item-info">
                <div class="shop-item-name" style="color:${tier.colorStr}">
                    ${T('pistol.'+idx+'.name')}
                    <span style="font-size:10px;color:#667788;margin-left:6px">${T('pistol.unlock', tier.requireLevel)}</span>
                </div>
                <div class="shop-item-desc">${T('pistol.'+idx+'.desc')}</div>
                <div class="shop-item-duration" style="color:${isOwned ? tier.colorStr : 'rgba(255,255,255,0.3)'}">
                    ${tier.pierce ? T('shop.pierce') : T('shop.normal')}
                </div>
            </div>
            <div class="shop-item-action" style="display:flex;flex-direction:column;align-items:center;gap:6px">
                ${isEquipped
                    ? `<button class="btn-equipped">${T('shop.equipped')}</button>`
                    : isLocked
                        ? `<span style="color:#667788;font-size:11px;text-align:center">${SVG_LOCK} ${T('shop.locked', tier.requireLevel)}</span>`
                        : isOwned
                            ? `<button class="btn-buy pistol-equip" data-idx="${idx}" style="background:#1a3a1a;border-color:#44aa44;color:#88ff88">${T('shop.equip')}</button>`
                            : tier.price === 0
                                ? `<button class="btn-buy pistol-equip" data-idx="${idx}">${T('shop.equip')}</button>`
                                : `<button class="btn-buy pistol-buy" data-idx="${idx}" ${!canAfford ? 'disabled' : ''}>${SVG_COIN} ${tier.price}</button>`
                }
            </div>
        `;
        container.appendChild(item);
    });

    container.querySelectorAll('.pistol-buy').forEach(btn => {
        if (!btn.disabled) btn.addEventListener('click', () => buyPistolTier(+btn.dataset.idx));
    });
    container.querySelectorAll('.pistol-equip').forEach(btn => {
        btn.addEventListener('click', () => equipPistolTier(+btn.dataset.idx));
    });

    if (equippedEl) {
        const eq = PISTOL_TIERS[equipped];
        equippedEl.innerHTML = `${T('shop.equipped.label')}<span style="color:${eq.colorStr}">${T('pistol.'+equipped+'.name')}</span>`;
    }
}

function renderSpecialItems() {
    const container = document.getElementById('shopSpecialItems');
    container.innerHTML = '';

    for (const [key, weapon] of Object.entries(SHOP_WEAPONS)) {
        if (weapon.defenseOnly) continue;
        const level = (playerData.weaponLevels || {})[key] || 0;
        const maxLevel = 3;
        const canUpgrade = level < maxLevel;
        const nextCost = canUpgrade ? weapon.upgradePrices[level] : null;
        const canAfford = nextCost !== null && playerData.coins >= nextCost;
        const stars = level > 0 ? ('★'.repeat(level) + '☆'.repeat(maxLevel - level)) : '☆☆☆';

        const lvDesc = level > 0
            ? T('weapon.'+key+'.lv'+level)
            : T('weapon.'+key+'.desc');

        const item = document.createElement('div');
        item.className = 'shop-item' + (level > 0 ? ' owned' : '');
        item.innerHTML = `
            <div class="shop-item-icon" style="background:${weapon.color}22;border:2px solid ${weapon.color}">${weapon.icon}</div>
            <div class="shop-item-info">
                <div class="shop-item-name" style="color:${weapon.color}">${T('weapon.'+key+'.name')}</div>
                <div class="shop-item-desc">${lvDesc}</div>
                <div class="shop-item-duration" style="color:${level>0?weapon.color:'rgba(255,255,255,0.4)'}">${stars} ${T('shop.perm')}</div>
            </div>
            <div class="shop-item-action" style="display:flex;flex-direction:column;align-items:center;gap:6px">
                ${canUpgrade
                    ? `<button class="btn-buy spec-upgrade" ${!canAfford ? 'disabled' : ''} data-weapon="${key}">${SVG_COIN} ${nextCost} ${level === 0 ? T('shop.unlock') : 'Lv'+(level+1)}</button>`
                    : `<span style="color:#ffd700;font-size:11px">${T('shop.maxed')}</span>`
                }
            </div>
        `;
        container.appendChild(item);
    }
    container.querySelectorAll('.spec-upgrade').forEach(btn => {
        if (!btn.disabled) btn.addEventListener('click', () => upgradeWeapon(btn.dataset.weapon));
    });
}

function buyPistolTier(idx) {
    const tier = PISTOL_TIERS[idx];
    if (!tier || tier.price === 0) return;
    if ((playerData.level || 1) < tier.requireLevel) return;
    if (playerData.coins < tier.price) return;
    if (!playerData.ownedPistolTiers) playerData.ownedPistolTiers = [0];
    if (playerData.ownedPistolTiers.includes(idx)) return;
    playerData.coins -= tier.price;
    playerData.ownedPistolTiers.push(idx);
    playerData.equippedPistolTier = idx; // auto-equip on purchase
    savePlayerData(playerData);
    renderShopItems();
    updateShopCurrencies();
}

function equipPistolTier(idx) {
    if (!playerData.ownedPistolTiers) playerData.ownedPistolTiers = [0];
    if (!playerData.ownedPistolTiers.includes(idx) && idx !== 0) return;
    playerData.equippedPistolTier = idx;
    savePlayerData(playerData);
    renderShopItems();
}

function renderTalentItems() {
    const container = document.getElementById('talentItems');
    container.innerHTML = '';

    for (const def of TALENT_DEFS) {
        const currentLevel = def.isArmor ? (playerData.armor || 0) : (playerData.talents[def.id] || 0);
        const maxed = currentLevel >= def.maxLevel;
        const nextCost = maxed ? null : def.gemCosts[currentLevel];
        const canAfford = !maxed && (playerData.gems || 0) >= nextCost;

        const item = document.createElement('div');
        item.className = 'shop-item' + (currentLevel > 0 ? ' owned' : '');

        // Level pips
        const pips = Array.from({ length: def.maxLevel }, (_, i) =>
            `<span class="talent-pip${i < currentLevel ? ' filled' : ''}" style="${i < currentLevel ? `background:${def.color};border-color:${def.color};box-shadow:0 0 5px ${def.color}66` : ''}"></span>`
        ).join('');

        const effectText = talentEffectText(def.id, currentLevel);

        item.innerHTML = `
            <div class="shop-item-icon" style="background:${def.color}22;border:2px solid ${def.color}">${def.icon}</div>
            <div class="shop-item-info">
                <div class="shop-item-name" style="color:${def.color}">${T('talent.'+def.id+'.name')}</div>
                <div class="shop-item-desc">${T('talent.'+def.id+'.desc')}</div>
                <div class="shop-item-duration">${pips} ${effectText}</div>
            </div>
            <div class="shop-item-action" style="display:flex;flex-direction:column;align-items:center;gap:6px">
                <span class="skill-charge-badge" style="color:${def.color}">Lv ${currentLevel}</span>
                ${maxed
                    ? `<button class="btn-equipped">${T('shop.maxed')}</button>`
                    : `<button class="btn-buy btn-talent-buy" ${!canAfford ? 'disabled' : ''} data-talent="${def.id}">${SVG_GEM} ${nextCost}</button>`
                }
            </div>
        `;
        container.appendChild(item);
    }

    container.querySelectorAll('.btn-talent-buy').forEach(btn => {
        btn.addEventListener('click', () => buyTalent(btn.dataset.talent));
    });
}

function upgradeWeapon(weaponKey) {
    const weapon = SHOP_WEAPONS[weaponKey];
    if (!weapon || !weapon.upgradePrices) return;
    if (!playerData.weaponLevels) playerData.weaponLevels = {};
    const level = playerData.weaponLevels[weaponKey] || 0;
    if (level >= 3) return;
    const cost = weapon.upgradePrices[level];
    if (playerData.coins < cost) return;
    playerData.coins -= cost;
    playerData.weaponLevels[weaponKey] = level + 1;
    savePlayerData(playerData);
    renderSpecialItems();
    updateShopCurrencies();
}

function buyTalent(talentId) {
    const def = TALENT_DEFS.find(d => d.id === talentId);
    if (!def) return;
    const currentLevel = def.isArmor ? (playerData.armor || 0) : (playerData.talents[talentId] || 0);
    if (currentLevel >= def.maxLevel) return;
    const cost = def.gemCosts[currentLevel];
    if ((playerData.gems || 0) < cost) return;
    playerData.gems -= cost;
    if (def.isArmor) {
        playerData.armor = currentLevel + 1;
    } else {
        playerData.talents[talentId] = currentLevel + 1;
    }
    savePlayerData(playerData);
    renderTalentItems();
    updateShopCurrencies();
}

function renderDefenseItems() {
    const container = document.getElementById('defenseItems');
    container.innerHTML = '';

    // Helper: render one consumable special-effect item
    function addSpecialItem(key) {
        const w = SHOP_WEAPONS[key];
        const charges = (playerData.weaponCharges || {})[key] || 0;
        const canAfford = playerData.coins >= w.price;

        const item = document.createElement('div');
        item.className = 'shop-item' + (charges > 0 ? ' owned' : '');
        item.innerHTML = `
            <div class="shop-item-icon" style="background:${w.color}22;border:2px solid ${w.color}">${w.icon}</div>
            <div class="shop-item-info">
                <div class="shop-item-name" style="color:${w.color}">${T('weapon.'+key+'.name')}</div>
                <div class="shop-item-desc">${T('weapon.'+key+'.desc')}</div>
                <div class="shop-item-duration">${T('weapon.duration', w.duration, w.hotkey)}</div>
            </div>
            <div class="shop-item-action" style="display:flex;flex-direction:column;align-items:center;gap:6px">
                <span class="skill-charge-badge" style="color:${w.color}">× ${charges}</span>
                <button class="btn-buy special-buy" data-key="${key}" ${!canAfford ? 'disabled' : ''}>${SVG_COIN} ${w.price}</button>
            </div>
        `;
        container.appendChild(item);
    }

    addSpecialItem('invincibility');
    addSpecialItem('stimulant');

    container.querySelectorAll('.special-buy').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.key;
            const w = SHOP_WEAPONS[key];
            if (playerData.coins >= w.price) {
                playerData.coins -= w.price;
                if (!playerData.weaponCharges) playerData.weaponCharges = {};
                playerData.weaponCharges[key] = (playerData.weaponCharges[key] || 0) + 1;
                savePlayerData(playerData);
                renderDefenseItems();
                updateShopCurrencies();
            }
        });
    });

    const defenseInfo = document.getElementById('defenseInfo');
    if (defenseInfo) defenseInfo.textContent = T('shop.special.hint');
}

function buyArmor(level) {
    const def = SHOP_ARMOR[level - 1];
    if (!def) return;
    if ((playerData.armor || 0) !== level - 1) return;
    if (playerData.coins < def.price) return;
    playerData.coins -= def.price;
    playerData.armor = level;
    savePlayerData(playerData);
    renderDefenseItems();
    updateShopCurrencies();
}

// ============================================================
// MID-GAME SHOP (after mega boss kill)
// ============================================================
// Base options; troops = percentage of boss-fight losses, cost = per-troop score
const MID_SHOP_BASE = [
    { lossPct: 0.30, desc: 'Squad Refill' },        // recover 30% of loss
    { lossPct: 0.60, desc: 'Platoon Reinforcement' }, // recover 60% of loss
    { lossPct: 1.00, desc: 'Full Recovery' },        // recover 100% of loss
];

function getMidShopOption(idx) {
    const base = MID_SHOP_BASE[idx];
    const g = game;

    // Use snapshot of loss at shop open (doesn't change as troops are bought)
    const bossLoss = g.midShopBossLoss || Math.max(0, g.preBossSquad - g.squadCount);
    // Already bought troops count toward the cap
    const alreadyRecovered = (g.midShopRecovered || 0);
    const remaining = Math.max(0, bossLoss - alreadyRecovered);

    // Troops: percentage of original loss, capped by remaining recoverable
    const rawTroops = Math.max(1, Math.round(bossLoss * base.lossPct));
    const troops = Math.min(rawTroops, remaining);

    // Cost per troop: decreases with wave (troops worth less late-game),
    // but slower decay than before so late-game total cost stays meaningful.
    // W10: ~68/troop, W20: ~52/troop, W30: ~44/troop, W40: ~39/troop
    // L2 scores are ×3, so cost is also ×3
    const levelCostMult = (g.currentLevel === 2) ? 3 : 1;
    const unitPrice = Math.max(25 * levelCostMult, Math.round(90 * levelCostMult / Math.pow(g.wave / 5, 0.4)));
    const cost = troops > 0 ? troops * unitPrice : 0;

    return { troops, cost, label: troops > 0 ? T('midshop.troops', troops) : T('midshop.full'), desc: T('midshop.opt'+idx) };
}

function openMidShop() {
    const g = game;
    if (!g) return;
    // Clean up residual effects before freezing update loop —
    // prevents particles/bullets from accumulating while state is 'midShop'
    g.enemyBullets = [];
    g.particles = [];
    g.slamWarnings = [];
    g.explosions = [];
    g.speedLines = [];
    g.gateShatterPieces = [];
    g.screenFlash = 0;
    g.vignetteFlash = 0;
    g.gateFlash = null;
    g.slowMo = 0;
    g.slowMoFactor = 1;
    g.shakeTimer = 0;
    g.shakeX = 0;
    g.shakeY = 0;
    g.state = 'midShop';
    g.midShopOpen = true;
    g.midShopBought = []; // reset per opening
    g.midShopRecovered = 0; // reset recovered count for this shop session
    g.midShopBossLoss = g.squadLostDuringBoss || 0; // actual cumulative loss during boss fight
    g.midShopCount++;
    document.getElementById('midShopOverlay').classList.remove('hidden');
    renderMidShop();
}

function renderMidShop() {
    const g = game;
    if (!g) return;

    // Stats — show boss fight losses and recovery cap (use snapshot)
    const bossLoss = g.midShopBossLoss || Math.max(0, g.preBossSquad - g.squadCount);
    const recovered = g.midShopRecovered || 0;
    const statsEl = document.getElementById('midShopStats');
    statsEl.innerHTML = `
        <span style="color:#ffcc00">${T('midshop.score')}: ${g.score}</span>
        <span style="color:#44aaff">${T('midshop.squad')}: ${g.squadCount}</span>
        <span style="color:#ff4444">${bossLoss > 0 ? `${T('midshop.loss')}: -${bossLoss}` : ''}</span>
        <span style="color:#44ff44">${recovered > 0 ? `${T('midshop.restored')}: +${recovered}/${bossLoss + recovered}` : ''}</span>
    `;

    // Items
    const container = document.getElementById('midShopItems');
    container.innerHTML = '';
    MID_SHOP_BASE.forEach((_, idx) => {
        const opt = getMidShopOption(idx);
        const bought = g.midShopBought.includes(idx);
        const soldOut = opt.troops <= 0;
        const canAfford = !bought && !soldOut && g.score >= opt.cost;
        const item = document.createElement('div');
        item.className = 'midshop-item' + (bought ? ' midshop-bought' : '');
        item.innerHTML = `
            <div class="midshop-item-info">
                <div class="midshop-item-name">${opt.label}</div>
                <div class="midshop-item-desc">${opt.desc}</div>
            </div>
            ${bought || soldOut
                ? `<span class="midshop-sold">${soldOut ? T('midshop.full') : T('midshop.bought')}</span>`
                : `<button class="btn-midshop-buy" ${!canAfford ? 'disabled' : ''} data-idx="${idx}" data-cost="${opt.cost}">
                    ${SVG_SCORE} ${T('midshop.buy', opt.cost)}
                </button>`
            }
        `;
        container.appendChild(item);
    });

    // Buy button events
    container.querySelectorAll('.btn-midshop-buy').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx);
            const cost = parseInt(btn.dataset.cost);
            const opt = getMidShopOption(idx);
            if (g.midShopBought.includes(idx)) return;
            if (opt.troops <= 0) return; // already at cap
            if (g.score >= cost) {
                g.score -= cost;
                g.squadCount += opt.troops;
                g.midShopRecovered = (g.midShopRecovered || 0) + opt.troops;
                if (g.squadCount > g.peakSquad) g.peakSquad = g.squadCount;
                g.midShopBought.push(idx);
                playSound('gate_good');
                renderMidShop(); // refresh display
            }
        });
    });
}

function closeMidShop() {
    const g = game;
    if (!g) return;
    g.state = 'playing';
    g.midShopOpen = false;
    document.getElementById('midShopOverlay').classList.add('hidden');
}

// Initialize shop events
updateShopCurrencies();
document.getElementById('shopBtn').addEventListener('click', openShop);
document.getElementById('shopBackBtn').addEventListener('click', closeShop);
document.getElementById('midShopGoBtn').addEventListener('click', closeMidShop);
document.querySelectorAll('.shop-tab').forEach(btn => {
    btn.addEventListener('click', () => switchShopTab(btn.dataset.tab));
});
