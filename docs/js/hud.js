// ============================================================
// HUD DRAWING (p5.js version — all drawn directly each frame)
// ============================================================

// Internal helper: draw text with optional drop shadow
function _hudText(str, x, y, sz, colorHex, alignH, bold, shadow) {
    if (!str) return;
    push();
    textFont('Arial');
    textSize(sz);
    textStyle(bold !== false ? BOLD : NORMAL);
    textAlign(alignH !== undefined ? alignH : CENTER, CENTER);
    if (shadow !== false) {
        drawingContext.shadowColor = 'rgba(0,0,0,0.85)';
        drawingContext.shadowBlur = 3;
    }
    hexFill(colorHex); noStroke();
    text(str, x, y);
    drawingContext.shadowBlur = 0;
    drawingContext.shadowColor = 'transparent';
    pop();
}

// ============================================================
// MAIN HUD (top center panel: score / squad / wave / XP)
// ============================================================
function updateHUD() {
    const g = game;
    if (!g) return;

    const hs = Math.min(200, screenW * 0.22);
    const panelW = hs * 2 + 160;
    const panelH = 60;
    const panelX = screenW / 2 - panelW / 2;

    // Dark panel body
    hexFill(0x0a0a1a, Math.floor(0.55 * 255)); noStroke();
    rect(panelX, -2, panelW, panelH + 4, 10);
    hexStroke(0xffffff, Math.floor(0.08 * 255)); strokeWeight(1); noFill();
    rect(panelX, -2, panelW, panelH + 4, 10);

    // Gold accent top bar
    hexFill(0xf0c040, Math.floor(0.5 * 255)); noStroke();
    rect(panelX + 20, -2, panelW - 40, 2);

    // Vertical separators
    hexFill(0xffffff, Math.floor(0.1 * 255));
    rect(screenW / 2 - hs / 2, 8, 1, 32);
    rect(screenW / 2 + hs / 2, 8, 1, 32);

    // Coin pill (right)
    const pillW = 70, pillH = 18, pillR = 9;
    hexFill(0xffd700, Math.floor(0.1 * 255)); noStroke();
    rect(screenW / 2 + hs - pillW / 2, 30, pillW, pillH, pillR);
    hexStroke(0xffd700, Math.floor(0.2 * 255)); strokeWeight(1); noFill();
    rect(screenW / 2 + hs - pillW / 2, 30, pillW, pillH, pillR);

    // Gem pill (left)
    hexFill(0xcc44ff, Math.floor(0.1 * 255)); noStroke();
    rect(screenW / 2 - hs - pillW / 2, 30, pillW, pillH, pillR);
    hexStroke(0xcc44ff, Math.floor(0.2 * 255)); strokeWeight(1); noFill();
    rect(screenW / 2 - hs - pillW / 2, 30, pillW, pillH, pillR);

    // XP bar
    const lvl = Math.min(g.level, LEVEL_CONFIG.maxLevel);
    const isMaxLvl = lvl >= LEVEL_CONFIG.maxLevel;
    const xpBarPad = 18, xpBarW = panelW - xpBarPad * 2, xpBarH = 5, xpBarY = panelH - 8;
    let xpFill = 1;
    if (!isMaxLvl) {
        const xpPrev = lvl <= 1 ? 0 : LEVEL_CONFIG.xpThresholds[lvl - 2];
        const xpNext = LEVEL_CONFIG.xpThresholds[lvl - 1];
        xpFill = Math.min(1, (g.exp - xpPrev) / Math.max(1, xpNext - xpPrev));
    }
    const xpColor = isMaxLvl ? 0xffd700 : 0x88ffcc;
    hexFill(0x111122, Math.floor(0.8 * 255)); noStroke();
    rect(panelX + xpBarPad, xpBarY, xpBarW, xpBarH, 2);
    if (xpFill > 0) {
        hexFill(xpColor); noStroke();
        rect(panelX + xpBarPad, xpBarY, Math.max(4, xpBarW * xpFill), xpBarH, 2);
    }
    hexStroke(xpColor, Math.floor(0.22 * 255)); strokeWeight(1); noFill();
    rect(panelX + xpBarPad, xpBarY, xpBarW, xpBarH, 2);

    // Text: score (center), squad (left), wave (right)
    _hudText('SCORE: ' + g.score, screenW / 2, 14, 16, 0xffffff);
    const squadStr = g.stimulantActive ? `SQUAD: ${g.squadCount * 2} x2` : `SQUAD: ${g.squadCount}`;
    _hudText(squadStr, screenW / 2 - hs, 14, 15, g.stimulantActive ? 0x44ff88 : 0xffffff);
    const maxWaves = g.currentLevel === 2 ? MAX_WAVES_LEVEL2 : MAX_WAVES_LEVEL1;
    _hudText(`WAVE: ${g.wave} / ${maxWaves}`, screenW / 2 + hs, 14, 15, 0xffffff);

    // Coins
    _hudText(`\u{1FA99} ${playerData.coins}`, screenW / 2 + hs, 38, 12, 0xffd700, CENTER, false);
    // Gems
    _hudText(`\u{1F48E} ${playerData.gems || 0}`, screenW / 2 - hs, 38, 12, 0xcc44ff, CENTER, false);
    // Level
    const isMax = g.level >= LEVEL_CONFIG.maxLevel;
    _hudText(isMax ? '\u2B50 MAX' : `\u2B50 Lv.${g.level}`, screenW / 2, 38, 11, isMax ? 0xffd700 : 0x88ffcc, CENTER, false);

    // Weapon timer bar
    const hasGateWeapon = g.weapon !== 'pistol' && g.weaponTimer > 0;
    if (hasGateWeapon && !_proj.isMobile) {
        _drawWeaponHUD();
    }

    drawSkillHud();
}

function _drawWeaponHUD() {
    const g = game;
    const wKey = g.weapon;
    const wColor = WEAPON_COLORS[wKey] || 0xffffff;
    const level = (playerData.weaponLevels || {})[wKey] || 0;
    const stars = level > 0 ? ('\u2605'.repeat(level) + '\u2606'.repeat(3 - level)) : '';
    const boxW = 200, boxH = 50;
    const x = screenW / 2 - boxW / 2, y = screenH - 80;
    hexFill(0x000000, Math.floor(0.55 * 255)); noStroke(); rect(x, y, boxW, boxH, 8);
    hexStroke(wColor, Math.floor(0.3 * 255)); strokeWeight(1); noFill(); rect(x, y, boxW, boxH, 8);

    const def = WEAPON_DEFS[wKey];
    const remaining = g.weaponTimer / (def ? def.duration * 1000 : 8000);
    const barW = 180, barH = 10, barX = screenW / 2 - barW / 2, barY = y + 30;
    hexFill(0xffffff, 38); noStroke(); rect(barX, barY, barW, barH, 3);
    hexFill(wColor); rect(barX, barY, Math.max(0, barW * remaining), barH, 3);

    const wLabel = stars ? `${wKey.toUpperCase()}  ${stars}` : wKey.toUpperCase();
    _hudText(wLabel, screenW / 2, y + 16, 16, wColor);
    _hudText(Math.ceil(g.weaponTimer / 1000) + 's', screenW / 2, barY + barH / 2, 10, 0xffffff, CENTER, false);
}

// ============================================================
// SKILL HUD (top-left corner)
// ============================================================
function drawSkillHud() {
    const g = game;
    const skills = [];
    const charges = playerData.weaponCharges || {};

    const invN = charges['invincibility'] || 0;
    if (invN > 0 || g.shieldActive || g.skillCooldown > 0) {
        const inv = SHOP_WEAPONS['invincibility'];
        skills.push({
            icon: '\u{1F6E1}\uFE0F', hotkey: inv ? inv.hotkey : '1',
            charges: invN, active: g.shieldActive,
            activeTimer: g.shieldTimer, activeDuration: (inv ? inv.duration : 4) * 1000,
            cooldown: g.skillCooldown, cooldownMax: SKILL_SHARED_COOLDOWN * 1000,
            color: 0xffdd44, colorStr: '#ffdd44',
        });
    }
    const stimN = charges['stimulant'] || 0;
    if (stimN > 0 || g.stimulantActive || g.stimulantCooldown > 0) {
        const stim = SHOP_WEAPONS['stimulant'];
        skills.push({
            icon: '\u{1F49A}', hotkey: stim ? stim.hotkey : '2',
            charges: stimN, active: g.stimulantActive,
            activeTimer: g.stimulantTimer, activeDuration: (stim ? stim.duration : 10) * 1000,
            cooldown: g.stimulantCooldown, cooldownMax: SKILL_SHARED_COOLDOWN * 1000,
            color: 0x44ff88, colorStr: '#44ff88',
        });
    }
    if (skills.length === 0) return;

    const slotW = 100, slotH = 50, slotGap = 6, marginX = 8, marginY = 8;
    const now = Date.now();

    skills.forEach((sk, i) => {
        const sx = marginX + i * (slotW + slotGap);
        const sy = marginY;
        const isActive = sk.active;
        const isOnCD = !isActive && sk.cooldown > 0;
        const isReady = !isActive && !isOnCD && sk.charges > 0;

        // Outer glow
        if (isActive || isReady) {
            const pulse = isActive ? 0.20 + Math.sin(now * 0.006) * 0.08 : 0.12 + Math.sin(now * 0.004) * 0.05;
            hexFill(sk.color, Math.floor(pulse * 255)); noStroke();
            rect(sx - 4, sy - 4, slotW + 8, slotH + 8, 9);
        }
        // Dark base
        hexFill(0x050a14, Math.floor(0.88 * 255)); noStroke(); rect(sx, sy, slotW, slotH, 6);
        hexFill(sk.color, Math.floor((isActive ? 0.28 : isReady ? 0.22 : 0.04) * 255));
        rect(sx, sy, slotW, slotH, 6);
        hexStroke(isActive || isReady ? sk.color : 0x2a3a4a,
            Math.floor((isActive ? 1.0 : isReady ? 0.95 : 0.25) * 255));
        strokeWeight(2); noFill(); rect(sx, sy, slotW, slotH, 6);

        // Bottom bar
        const barX = sx + 5, barY = sy + slotH - 7, barW = slotW - 10, barH = 4;
        hexFill(0x0a1020, 230); noStroke(); rect(barX, barY, barW, barH, 2);
        if (isActive) {
            hexFill(sk.color, 255);
            rect(barX, barY, Math.max(3, barW * Math.max(0, sk.activeTimer / sk.activeDuration)), barH, 2);
        } else if (isOnCD) {
            hexFill(0x556677, 204);
            rect(barX, barY, Math.max(3, barW * Math.max(0, 1 - sk.cooldown / sk.cooldownMax)), barH, 2);
        } else if (isReady) {
            hexFill(sk.color, 204); rect(barX, barY, barW, barH, 2);
        }

        // Icon (emoji)
        push();
        textFont('Arial'); textSize(20); textStyle(NORMAL); textAlign(CENTER, CENTER);
        hexFill(0xffffff, Math.floor((isReady || isActive ? 1 : 0.3) * 255)); noStroke();
        text(sk.icon, sx + 19, sy + 20);
        pop();

        // Value / timer text
        let valStr, valColor;
        if (isActive) { valStr = `${Math.ceil(sk.activeTimer / 1000)}s`; valColor = sk.color; }
        else if (isOnCD) { valStr = `${Math.ceil(sk.cooldown / 1000)}s`; valColor = 0x667788; }
        else { valStr = `x${sk.charges}`; valColor = isReady ? 0xffffff : 0x445566; }
        const valAlpha = Math.floor((isReady || isActive ? 1 : 0.4) * 255);
        _hudText(valStr, sx + 35 + slotW * 0.2, sy + 19, 16, valColor, LEFT, true, true);

        // Hotkey top-right
        _hudText(`[${sk.hotkey}]`, sx + slotW - 3, sy + 8, 12, isReady || isActive ? sk.color : 0x445566, RIGHT, true, false);

        // State label bottom-left
        if (!isReady) {
            const stateStr = isActive ? 'ACTIVE' : isOnCD ? 'COOLDOWN' : 'NO CHARGE';
            const stateColor = isActive ? sk.color : isOnCD ? 0x667788 : 0x334455;
            _hudText(stateStr, sx + 5, sy + 37, 9, stateColor, LEFT, false, false);
        }
    });
}

// ============================================================
// BOSS HP BAR (below score HUD)
// ============================================================
function drawBossHud() {
    const g = game;
    const bosses = g.enemies.filter(e => e.alive && e.isBoss);
    if (bosses.length === 0) return;

    const bossLevel = Math.floor(g.wave / 5);
    const bossCount = bosses.length;
    const totalHp = bosses.reduce((s, b) => s + b.hp, 0);
    const totalMaxHp = bosses.reduce((s, b) => s + b.maxHp, 0);
    const hpRatio = Math.max(0, totalHp / totalMaxHp);
    const now = Date.now();

    const barW = Math.min(400, screenW * 0.5);
    const mainBarH = 14;
    const miniBarH = bossCount > 1 ? 7 : 0;
    const miniBarGap = bossCount > 1 ? 5 : 0;
    const barX = screenW / 2 - barW / 2;
    const topY = 78, barY = topY + 20;
    const boxPad = 10;
    const boxX = barX - boxPad, boxY = topY - 4;
    const boxW = barW + boxPad * 2;
    const boxH = mainBarH + 38 + (bossCount > 1 ? miniBarH + miniBarGap + 4 : 0);
    const hasMega = bosses.some(b => b.isMegaBoss);

    // Outer glow
    const glowPulse = Math.sin(now * 0.004) * 0.5 + 0.5;
    const glowAlpha = hpRatio < 0.3 ? 0.2 + glowPulse * 0.15 : hasMega ? 0.15 + glowPulse * 0.1 : 0.08 + glowPulse * 0.06;
    const glowColor = hpRatio < 0.3 ? 0xff2222 : hasMega ? 0xff4400 : 0xcc44ff;
    hexFill(glowColor, Math.floor(glowAlpha * 255)); noStroke();
    rect(boxX - 4, boxY - 4, boxW + 8, boxH + 8, 12);

    // Background panel
    hexFill(hasMega ? 0x180808 : 0x0a0a18, Math.floor(0.8 * 255)); noStroke();
    rect(boxX, boxY, boxW, boxH, 8);
    hexStroke(hasMega ? 0xff4400 : 0xcc66ff, Math.floor(0.5 * 255));
    strokeWeight(hasMega ? 3 : 2); noFill(); rect(boxX, boxY, boxW, boxH, 8);
    hexStroke(0xffffff, Math.floor(0.08 * 255)); strokeWeight(1);
    rect(boxX + 2, boxY + 2, boxW - 4, boxH - 4, 6);

    // Corner diamonds
    const dSize = 4;
    const diamondColor = hasMega ? 0xff4400 : 0xcc66ff;
    [boxX + 8, boxX + boxW - 8].forEach(dx => {
        hexFill(diamondColor, Math.floor(0.7 * 255)); noStroke();
        beginShape();
        vertex(dx, boxY - 1); vertex(dx + dSize, boxY + dSize);
        vertex(dx, boxY + dSize * 2); vertex(dx - dSize, boxY + dSize);
        endShape(CLOSE);
    });

    // Main HP bar background
    hexFill(0x1a1a2e, 230); noStroke(); rect(barX, barY, barW, mainBarH, 4);
    hexStroke(0x333355, 153); strokeWeight(1); noFill(); rect(barX, barY, barW, mainBarH, 4);

    if (hpRatio > 0) {
        const fillW = Math.max(6, barW * hpRatio);
        const fillColor = hasMega ? (hpRatio > 0.5 ? 0xff4400 : hpRatio > 0.25 ? 0xff6644 : 0xff2222)
            : (hpRatio > 0.5 ? 0xcc44ff : hpRatio > 0.25 ? 0xff6644 : 0xff2222);
        hexFill(fillColor); noStroke(); rect(barX, barY, fillW, mainBarH, 4);
        hexFill(0xffffff, Math.floor(0.28 * 255));
        rect(barX + 2, barY + 2, fillW - 4, mainBarH * 0.35, 2);
        const shimmerPhase = (now % 2000) / 2000;
        const shimmerX = barX + shimmerPhase * barW;
        if (shimmerX < barX + fillW) {
            const clippedW = Math.min(30, barX + fillW - shimmerX);
            hexFill(0xffffff, Math.floor(0.14 * (1 - Math.abs(shimmerPhase - 0.5) * 2) * 255));
            rect(shimmerX, barY + 2, clippedW, mainBarH - 4, 2);
        }
    }
    for (let i = 1; i < 4; i++) {
        const tx = barX + barW * i / 4;
        hexFill(0x000000, 89); noStroke(); rect(tx - 0.5, barY, 1, mainBarH);
    }

    // Individual mini-bars
    if (bossCount > 1) {
        const miniY = barY + mainBarH + miniBarGap;
        const gap = 4;
        const miniW = (barW - gap * (bossCount - 1)) / bossCount;
        bosses.forEach((b, i) => {
            const mx = barX + i * (miniW + gap);
            const mr = Math.max(0, b.hp / b.maxHp);
            hexFill(0x111122, 230); noStroke(); rect(mx, miniY, miniW, miniBarH, 2);
            if (mr > 0) {
                const mc = mr > 0.5 ? 0xaa33dd : mr > 0.25 ? 0xff6644 : 0xff2222;
                hexFill(mc); rect(mx, miniY, Math.max(3, miniW * mr), miniBarH, 2);
            }
            hexStroke(0x553388, 128); strokeWeight(1); noFill(); rect(mx, miniY, miniW, miniBarH, 2);
        });
    }

    // Boss name
    let bossName = 'BOSS DRAGON', bossNameColor = 0xcc66ff;
    const countTag = bossCount > 1 ? ` x${bossCount}` : '';
    if (hasMega) {
        const megaLevel = Math.floor(g.wave / 10);
        const megaBoss = bosses.find(b => b.isMegaBoss);
        if (megaBoss && megaBoss.isElephantBoss) {
            bossName = `\u{1F418} ELEPHANT KING Lv.${megaLevel}${countTag}`;
            bossNameColor = 0xff6600;
        } else {
            bossName = `\u{1F525} MEGA BOSS Lv.${megaLevel}${countTag}`;
            bossNameColor = 0xff4400;
        }
    } else {
        const firstBoss = bosses[0];
        if (firstBoss && firstBoss.isCowCryBoss) {
            bossName = `\u{1F3B5} CRY COW${countTag}`;
            bossNameColor = 0xff9944;
        } else {
            bossName = `BOSS DRAGON${countTag}${bossLevel >= 3 ? ` Lv.${bossLevel}` : ''}`;
            bossNameColor = 0xcc66ff;
        }
    }
    _hudText(bossName, screenW / 2, barY - 2, 14, bossNameColor);

    // HP percentage text
    const pct = Math.round(hpRatio * 100);
    const hpStr = bossCount > 1
        ? `${totalHp} / ${totalMaxHp}  (${pct}%)`
        : `${bosses[0].hp} / ${bosses[0].maxHp}  (${pct}%)`;
    const hpTextY = barY + mainBarH + (bossCount > 1 ? miniBarH + miniBarGap : 0) + 12;
    _hudText(hpStr, screenW / 2, hpTextY, 12, hpRatio < 0.25 ? 0xff6666 : 0xcccccc, CENTER, false);
}

// ============================================================
// WAVE BANNER
// ============================================================
function drawWaveBanner() {
    const g = game;
    if (!g.waveBanner) return;
    const wb = g.waveBanner;
    const t = wb.timer / wb.maxTimer;

    let alpha = 1, offsetY = 0;
    if (t < 0.15) {
        const p = t / 0.15;
        offsetY = (1 - p) * -80; alpha = p;
    } else if (t > 0.7) {
        const p = (t - 0.7) / 0.3;
        offsetY = p * 80; alpha = 1 - p;
    }
    if (alpha <= 0) return;

    const cy = screenH * 0.3 + offsetY;
    const af = getAdaptiveFactor();
    const afLabel = af >= 1.15 ? ` | POWER x${af.toFixed(1)}`
        : af <= 0.85 ? ` | POWER x${af.toFixed(1)}` : '';
    const isL2 = g.currentLevel === 2;

    let subText, subColor;
    if (wb.wave === 66 && !isL2) {
        subText = '\u2694\uFE0F FINAL BATTLE! DUAL MEGA BOSS!';
        subColor = 0xff0000;
    } else if (wb.wave % 10 === 0) {
        subText = isL2 ? `\u{1F418} ELEPHANT KING!${afLabel}` : `\u{1F525} MEGA BOSS!${afLabel}`;
        subColor = isL2 ? 0xff6600 : 0xff4400;
    } else if (wb.wave % 5 === 0) {
        subText = isL2 ? `\u{1F62D} CRY COW INCOMING!${afLabel}` : `BOSS INCOMING!${afLabel}`;
        subColor = isL2 ? 0x44ddff : 0xcc66ff;
    } else {
        subText = `INCOMING!${afLabel}`;
        subColor = 0xcccccc;
    }

    // Background panel
    const panelW = Math.min(360, screenW * 0.7);
    const panelH = 80;
    const panelX = screenW / 2 - panelW / 2;
    const panelY = cy - panelH / 2;

    hexFill(0x000a1a, Math.floor(alpha * 0.75 * 255)); noStroke();
    rect(panelX, panelY, panelW, panelH, 8);
    hexStroke(0x4488cc, Math.floor(alpha * 0.5 * 255)); strokeWeight(1.5); noFill();
    rect(panelX, panelY, panelW, panelH, 8);
    hexFill(0x4488cc, Math.floor(alpha * 0.6 * 255)); noStroke();
    rect(panelX + 12, panelY, panelW - 24, 2);

    // Wave text
    push();
    textFont('Arial'); textSize(32); textStyle(BOLD); textAlign(CENTER, CENTER);
    drawingContext.shadowColor = 'rgba(0,0,0,0.9)'; drawingContext.shadowBlur = 6;
    hexFill(0xffffff, Math.floor(alpha * 255)); noStroke();
    text(`WAVE ${wb.wave}`, screenW / 2, panelY + 26);
    drawingContext.shadowBlur = 0; drawingContext.shadowColor = 'transparent';

    textSize(14); textStyle(NORMAL);
    drawingContext.shadowColor = 'rgba(0,0,0,0.8)'; drawingContext.shadowBlur = 3;
    hexFill(subColor, Math.floor(alpha * 255));
    text(subText, screenW / 2, panelY + 56);
    drawingContext.shadowBlur = 0; drawingContext.shadowColor = 'transparent';
    pop();
}

// ============================================================
// COMBO COUNTER (right edge mid-screen)
// ============================================================
function drawComboCounter() {
    const g = game;
    if (g.comboCount < 3) return;
    const pulse = 1 + Math.sin(Date.now() * 0.008) * 0.08;
    const comboColor = g.comboCount >= 20 ? 0xff3333
        : g.comboCount >= 10 ? 0xff8800
        : g.comboCount >= 5 ? 0xffcc00
        : 0xffffff;
    push();
    textFont('Arial'); textSize(Math.floor(22 * pulse)); textStyle(BOLD); textAlign(CENTER, CENTER);
    drawingContext.shadowColor = 'rgba(0,0,0,0.9)'; drawingContext.shadowBlur = 5;
    hexFill(comboColor); noStroke();
    text(`COMBO x${g.comboCount}`, screenW - 70, screenH / 2);
    drawingContext.shadowBlur = 0; drawingContext.shadowColor = 'transparent';
    pop();
}

// ============================================================
// DAMAGE NUMBERS + SCORE POPUPS
// ============================================================
function drawDamageNumbers() {
    const g = game;
    g.damageNumbers.forEach(d => {
        const relZ = d.z - g.cameraZ;
        if (relZ < -20) return;
        const p = project(d.x, Math.max(0, relZ));
        const t = d.life / d.maxLife;
        push();
        textFont('Arial'); textSize(16 + (1 - t) * 4); textStyle(BOLD); textAlign(CENTER, CENTER);
        drawingContext.shadowColor = 'rgba(0,0,0,0.9)'; drawingContext.shadowBlur = 3;
        hexFill(d.color, Math.floor(t * 255)); noStroke();
        text(String(d.value), p.x, p.y + d.offsetY);
        drawingContext.shadowBlur = 0; drawingContext.shadowColor = 'transparent';
        pop();
    });
    g.scorePopups.forEach(sp => {
        const t = sp.life / sp.maxLife;
        push();
        textFont('Arial'); textSize(18 + (1 - t) * 6); textStyle(BOLD); textAlign(CENTER, CENTER);
        drawingContext.shadowColor = 'rgba(0,0,0,0.9)'; drawingContext.shadowBlur = 3;
        hexFill(sp.color, Math.floor(t * 255)); noStroke();
        text(sp.text, sp.x, sp.y);
        drawingContext.shadowBlur = 0; drawingContext.shadowColor = 'transparent';
        pop();
    });
}

// ============================================================
// LEVEL-UP ANIMATION
// ============================================================
function drawLevelUpAnim() {
    const g = game;
    if (!g || !g.levelUpAnim) return;
    const la = g.levelUpAnim;
    const t = la.timer / la.maxTimer;
    const cx = screenW / 2, cy = screenH * 0.37;

    let alpha, sc;
    if (t < 0.10) {
        const p = t / 0.10;
        alpha = p; sc = 0.25 + 0.75 * (1 - Math.pow(1 - p, 3));
    } else if (t < 0.75) {
        alpha = 1; sc = 1 + Math.sin((t - 0.10) / 0.65 * Math.PI * 3) * 0.013;
    } else {
        const p = (t - 0.75) / 0.25;
        alpha = 1 - p; sc = 1 + p * 0.18;
    }
    if (alpha <= 0) return;

    // Expanding shockwave rings
    const maxRingR = Math.min(screenW, screenH) * 0.58;
    for (let i = 0; i < 3; i++) {
        const rp = (t * 1.5 + i / 3) % 1.0;
        const rR = rp * maxRingR;
        const rA = (1 - rp) * 0.5 * alpha;
        if (rA < 0.015) continue;
        hexStroke(0x88ffcc, Math.floor(rA * 255));
        strokeWeight(Math.max(1, (1 - rp) * 5)); noFill();
        circle(cx, cy, rR * 2);
    }

    // Main panel
    const panelW = Math.min(490, screenW * 0.74) * sc;
    const panelH = 175 * sc;
    const px = cx - panelW / 2, py = cy - panelH * 0.50;

    hexFill(0x00cc66, Math.floor(0.10 * alpha * 255)); noStroke();
    rect(px - 10, py - 10, panelW + 20, panelH + 20, 20);
    hexFill(0x00100a, Math.floor(0.90 * alpha * 255));
    rect(px, py, panelW, panelH, 13);
    hexStroke(0x88ffcc, Math.floor(0.75 * alpha * 255)); strokeWeight(2.5); noFill();
    rect(px, py, panelW, panelH, 13);
    hexStroke(0xffffff, Math.floor(0.07 * alpha * 255)); strokeWeight(1);
    rect(px + 3, py + 3, panelW - 6, panelH - 6, 11);

    // Accent bars
    hexFill(0x88ffcc, Math.floor(0.6 * alpha * 255)); noStroke();
    rect(px + 18, py, panelW - 36, 2);
    rect(px + 18, py + panelH - 2, panelW - 36, 2);

    // Corner diamonds
    const dpCoords = [[px + 14, py], [px + panelW - 14, py], [px + 14, py + panelH], [px + panelW - 14, py + panelH]];
    dpCoords.forEach(([ox, oy]) => {
        hexFill(0x88ffcc, Math.floor(0.85 * alpha * 255)); noStroke();
        beginShape();
        vertex(ox, oy - 5); vertex(ox + 5, oy); vertex(ox, oy + 5); vertex(ox - 5, oy);
        endShape(CLOSE);
    });

    // Text
    push();
    textFont('Arial'); textAlign(CENTER, CENTER);
    drawingContext.shadowColor = 'rgba(0,0,0,0.9)'; drawingContext.shadowBlur = 6;

    textSize(Math.floor(26 * sc)); textStyle(BOLD);
    hexFill(0x88ffcc, Math.floor(alpha * 255)); noStroke();
    text('\u2B50  LEVEL  UP  \u2B50', cx, py + panelH * 0.22);

    textSize(Math.floor(52 * sc)); textStyle(BOLD);
    hexFill(0xffd700, Math.floor(alpha * 255));
    text(`LV.${la.level}`, cx, py + panelH * 0.52);

    textSize(Math.floor(16 * sc)); textStyle(NORMAL);
    hexFill(0xaaffcc, Math.floor(alpha * 255));
    text(la.bonusDesc || '', cx, py + panelH * 0.82);

    drawingContext.shadowBlur = 0; drawingContext.shadowColor = 'transparent';
    pop();
}

// ============================================================
// PAUSE OVERLAY — HTML handles actual pause display
// ============================================================
function drawPauseOverlay() {
    // HTML #pauseMenuOverlay is shown/hidden by JS in main.js
    // No p5 drawing needed for pause overlay
}
