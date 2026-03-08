// ============================================================
// RENDER (orchestrator) — p5.js version
// No PixiJS graphics objects; direct p5 draw calls in layer order.
// ============================================================

// ============================================================
// SKY BUFFER CACHE
// ============================================================

function ensureSkyBuffer() {
    if (skyBuffer &&
        screenW === _skyBgW &&
        screenH === _skyBgH &&
        game.currentLevel === _skyBgLevel) return;

    if (skyBuffer) skyBuffer.remove();
    skyBuffer = createGraphics(screenW, screenH);
    skyBuffer.noStroke();
    drawSky(skyBuffer);

    _skyBgW = screenW;
    _skyBgH = screenH;
    _skyBgLevel = game.currentLevel;
}

// ============================================================
// MAIN RENDER
// ============================================================

function render() {
    const g = game;
    if (!g) return;

    // Update screen dimensions and projection cache
    screenW = width;
    screenH = height;
    updateProjectionCache();

    // Clear canvas every frame (p5.js does not auto-clear between draw() calls)
    background(0);

    // Sky (cached graphics)
    ensureSkyBuffer();
    image(skyBuffer, 0, 0);

    // Clouds (dynamic, drawn fresh each frame over sky)
    drawClouds();

    // --- Camera shake zone: push/translate/pop wraps all world-space drawing ---
    push();
    if (g.shakeTimer > 0) translate(g.shakeX, g.shakeY);

    // Bridge + road decals
    drawBridge();
    drawRoadDecor();

    // ---- Depth-sorted entity list ----
    const renderList = [];
    g.deadBodies.forEach(d  => renderList.push({ type: 'dead',   data: d,    z: d.z }));
    g.barrels.forEach(b     => { if (b.alive)         renderList.push({ type: 'barrel', data: b,    z: b.z }); });
    g.enemies.forEach(e     => { if (e.alive)         renderList.push({ type: 'enemy',  data: e,    z: e.z }); });
    g.gates.forEach(gate    => {
        if (!gate.triggered || gate.fadeTimer > 0)    renderList.push({ type: 'gate',   data: gate, z: gate.z });
    });
    renderList.sort((a, b) => b.z - a.z);

    renderList.forEach(item => {
        const relZ = item.z - g.cameraZ;
        if (relZ < -20 || relZ > CONFIG.SPAWN_DISTANCE + 200) return;
        const p = project(item.data.x !== undefined ? item.data.x : 0, relZ);

        switch (item.type) {
            case 'dead':
                drawDeadBody(p.x, p.y, p.scale, item.data.timer / 300);
                break;

            case 'barrel': {
                drawBarrel(p.x, p.y, p.scale, item.data);
                if (item.data.hp < item.data.maxHp) {
                    const s    = Math.max(1, p.scale * CONFIG.PIXEL_SIZE * 5.5);
                    const barW = 20 * p.scale;
                    const barH = Math.max(1, 2.5 * p.scale);
                    const barY = p.y - 13 * s;
                    push(); noStroke();
                    hexFill(0x440000); rect(p.x - barW / 2, barY, barW, barH);
                    hexFill(0xff4444); rect(p.x - barW / 2, barY, barW * (item.data.hp / item.data.maxHp), barH);
                    pop();
                }
                break;
            }

            case 'enemy':
                _renderEnemy(item.data, p, relZ);
                break;

            case 'gate':
                drawGate(item.data);
                break;
        }
    });

    // ---- Coins ----
    g.coins.forEach(coin => {
        const relZ = coin.z - g.cameraZ;
        if (relZ < -10 || relZ > CONFIG.SPAWN_DISTANCE + 100) return;
        const p         = project(coin.x, relZ);
        const s         = Math.max(2, 6 * p.scale);
        const bob       = Math.sin(coin.bobPhase) * 3 * p.scale;
        const cy        = p.y + coin.y * p.scale + bob;
        const fadeAlpha = coin.life < 60 ? coin.life / 60 : 1;

        push(); noStroke();
        hexFill(0xffd700, 0.20 * fadeAlpha * 255); circle(p.x, cy, s * 5.0);    // glow (diameter = s*2.5 * 2)
        hexFill(0xffd700, 0.90 * fadeAlpha * 255); circle(p.x, cy, s * 2.0);    // body
        hexFill(0xffffff, 0.60 * fadeAlpha * 255); circle(p.x - s * 0.25, cy - s * 0.25, s * 0.9); // highlight
        if (coin.sparkle > 0.7 && Math.sin(Date.now() * 0.01 + coin.bobPhase) > 0.5) {
            hexFill(0xffffff, 0.80 * fadeAlpha * 255);
            circle(p.x + s * 0.5, cy - s * 0.5, s * 0.6);
        }
        pop();
    });

    // ---- Gems (boss drops — purple diamond) ----
    g.gems.forEach(gem => {
        const relZ = gem.z - g.cameraZ;
        if (relZ < -10 || relZ > CONFIG.SPAWN_DISTANCE + 100) return;
        const p         = project(gem.x, relZ);
        const s         = Math.max(3, 9 * p.scale);
        const bob       = Math.sin(gem.bobPhase) * 4 * p.scale;
        const cy        = p.y + gem.y * p.scale + bob;
        const fadeAlpha = gem.life < 60 ? gem.life / 60 : 1;
        const spin      = gem.bobPhase * 2;
        const cosSpin   = Math.cos(spin * 0.3);
        const sinSpin   = Math.sin(spin * 0.3);
        const hw = s * 0.85, hh = s * 1.3;

        push(); noStroke();
        hexFill(0x9900ff, 0.10 * fadeAlpha * 255); circle(p.x, cy, s * 6.4);   // outer glow (r*3.2 * 2)
        hexFill(0xcc44ff, 0.18 * fadeAlpha * 255); circle(p.x, cy, s * 4.0);   // inner glow (r*2.0 * 2)

        // Diamond body (rotated rhombus)
        const rawBody  = [[0, -hh], [hw, 0], [0, hh], [-hw, 0]];
        const bodyPts  = rawBody.flatMap(([dx, dy]) => [
            p.x + dx * cosSpin - dy * sinSpin,
            cy  + dx * sinSpin + dy * cosSpin,
        ]);
        hexPolyFill(bodyPts, 0xbb33ff, 0.92 * fadeAlpha * 255);

        // Inner lighter facet
        const rawFacet = [[0, -hh * 0.9], [hw * 0.6, -hh * 0.1], [0, hh * 0.25], [-hw * 0.6, -hh * 0.1]];
        const facetPts = rawFacet.flatMap(([dx, dy]) => [
            p.x + dx * cosSpin - dy * sinSpin,
            cy  + dx * sinSpin + dy * cosSpin,
        ]);
        hexPolyFill(facetPts, 0xdd88ff, 0.55 * fadeAlpha * 255);

        // Sparkle
        const spkA = (0.6 + Math.sin(Date.now() * 0.012 + gem.bobPhase) * 0.4) * fadeAlpha;
        hexFill(0xffffff, spkA * 255);
        circle(p.x + hw * 0.3 * cosSpin, cy - hh * 0.55 * cosSpin, s * 0.56);
        pop();
    });

    // Player bullets (above entities for readability)
    drawBullets();

    // ---- Enemy bullets (boss projectiles) ----
    const playerZ = g.cameraZ + 10;
    g.enemyBullets.forEach(eb => {
        const relZ = eb.z - g.cameraZ;
        if (relZ < -10 || relZ > CONFIG.SPAWN_DISTANCE + 100) return;
        const ep     = project(eb.x, relZ);
        const isFlame = eb.type === 'flame';
        const isNote  = eb.type === 'note';
        const isLava  = eb.type === 'lava';
        const s = Math.max(3, (isFlame || isLava ? 9 : 7) * ep.scale);

        push();
        if      (isNote)  _renderNoteBullet(eb, ep, relZ, s);
        else if (isLava)  _renderLavaBullet(eb, ep, relZ, s);
        else              _renderDefaultBullet(eb, ep, relZ, s, isFlame);

        // Ground-plane warning ring: project bullet trajectory to player Z
        if (eb.vz < 0 && relZ > 5) {
            const dt = (playerZ - eb.z) / eb.vz;
            if (dt > 0 && dt < 120) {
                const warnX = eb.x + eb.vx * dt;
                if (Math.abs(warnX) < CONFIG.ROAD_HALF_WIDTH + 30) {
                    const wp        = project(warnX, 0);
                    const warnPulse = Math.sin(Date.now() * 0.012 - dt * 0.05) * 0.4 + 0.6;
                    const warnR     = Math.max(6, 14 * wp.scale) * (1 + (1 - Math.min(1, dt / 80)) * 0.5);
                    const warnAlpha = (1 - Math.min(1, dt / 90)) * 0.6 * warnPulse;
                    noFill();
                    hexStroke(0xff2200, warnAlpha * 255);
                    strokeWeight(Math.max(1, 2 * wp.scale));
                    circle(wp.x, wp.y, warnR * 3.2);   // r*1.6 → diameter = r*1.6*2
                    noStroke();
                    hexFill(0xff4400, warnAlpha * 0.5 * 255);
                    circle(wp.x, wp.y, warnR * 1.4);   // r*0.7 → diameter = r*0.7*2
                }
            }
        }
        pop();
    });

    // ---- Ground slam warnings ----
    g.slamWarnings.forEach(sw => {
        const relZ = sw.z - g.cameraZ;
        if (relZ < -20 || relZ > CONFIG.SPAWN_DISTANCE + 200) return;
        const progress = sw.timer / sw.maxTimer;
        const pulse    = Math.sin(progress * Math.PI * 6) * 0.15 + 0.35;
        const urgency  = 0.3 + progress * 0.7;
        const alpha    = pulse * urgency;

        const pLeft   = project(sw.x - sw.halfWidth, relZ);
        const pRight  = project(sw.x + sw.halfWidth, relZ);
        const pCenter = project(sw.x, relZ);
        const zoneW   = pRight.x - pLeft.x;
        const zoneH   = Math.max(20, 60 * pCenter.scale);
        const zoneY   = pCenter.y - zoneH / 2;

        push();
        noStroke();
        hexFill(0xff2200, alpha * 0.25 * 255);
        rect(pLeft.x, zoneY, zoneW, zoneH);

        // Diagonal hazard stripes
        const stripeCount = Math.max(4, Math.floor(zoneW / 20));
        hexStroke(0xff4400, alpha * 0.4 * 255);
        strokeWeight(Math.max(2, 3 * pCenter.scale));
        noFill();
        for (let si = 0; si < stripeCount; si++) {
            const sx = pLeft.x + (si / stripeCount) * zoneW;
            line(sx, zoneY, sx + zoneH * 0.5, zoneY + zoneH);
        }

        // Border
        hexStroke(0xff0000, alpha * 0.7 * 255);
        strokeWeight(Math.max(2, 4 * pCenter.scale));
        rect(pLeft.x, zoneY, zoneW, zoneH);

        // Countdown bar (shrinks as timer progresses)
        const remaining = 1 - progress;
        const barH      = Math.max(2, 4 * pCenter.scale);
        noStroke();
        hexFill(0xffaa00, 0.8 * 255);
        rect(pLeft.x, zoneY - barH - 2, zoneW * remaining, barH);
        pop();

        // Warning label (shown until 80% of timer)
        if (progress < 0.8) {
            push();
            const fSz = Math.max(16, Math.floor(24 * pCenter.scale));
            textFont('Arial');
            textSize(fSz);
            textStyle(BOLD);
            textAlign(CENTER, BOTTOM);
            noStroke();
            fill(255, 68, 68, alpha * 255);
            text('\u26a0 DODGE!', pCenter.x, zoneY - 4 * pCenter.scale);
            pop();
        }
    });

    // Effects
    drawExplosions();
    drawParticles();

    // Player + squad (always on top of world entities)
    drawSquadAndPlayer();

    // Gate shatter pieces
    drawGateShatterPieces();

    // Speed lines
    drawSpeedLines();

    pop(); // end camera shake zone

    // ---- Screen-space overlays (not affected by camera shake) ----

    // White screen flash
    if (g.screenFlash > 0) {
        push(); noStroke();
        fill(255, 255, 255, g.screenFlash * 0.3 * 255);
        rect(0, 0, screenW, screenH);
        pop();
    }

    // Gate colored flash
    if (g.gateFlash) {
        const fa  = g.gateFlash.timer / g.gateFlash.maxTimer;
        const rr  = (g.gateFlash.color >> 16) & 0xFF;
        const rg  = (g.gateFlash.color >>  8) & 0xFF;
        const rb  =  g.gateFlash.color        & 0xFF;
        push(); noStroke();
        fill(rr, rg, rb, fa * 0.35 * 255);
        rect(0, 0, screenW, screenH);
        pop();
    }

    // Gate collapse panels
    drawGateCollapsePanels();

    // Vignette flash (red tint on damage taken)
    if (g.vignetteFlash > 0) {
        push(); noStroke();
        fill(170, 0, 0, g.vignetteFlash * 0.15 * 255);
        rect(0, 0, screenW, screenH);
        pop();
    }

    // Floating texts (damage numbers, gate text, barrel text)
    drawDamageNumbers();
    drawGateFloatingText();
    drawBarrelExplosionTexts();

    // HUD layer
    updateHUD();
    drawBossHud();
    drawWaveBanner();
    drawLevelUpAnim();
    drawComboCounter();

    if (g.state === 'paused') drawPauseOverlay();
}

// ============================================================
// ENEMY SPRITE + HP BAR RENDERER
// ============================================================

function _renderEnemy(e, p, relZ) {
    // ---- Auras behind sprite ----
    if (e.isMegaBoss) {
        const pulse = Math.sin(Date.now() * 0.005) * 0.15 + 0.3;
        const auraR = 50 * p.scale;
        push(); noStroke();
        hexFill(0xff2200, pulse * 0.12 * 255); circle(p.x, p.y, auraR * 3.0);
        hexFill(0xff4400, pulse * 255);         circle(p.x, p.y, auraR * 2.0);
        hexFill(0xff8800, pulse * 0.5 * 255);   circle(p.x, p.y, auraR * 1.0);
        pop();
    } else if (e.isBoss) {
        const pulse = Math.sin(Date.now() * 0.004) * 0.15 + 0.25;
        const auraR = 30 * p.scale;
        push(); noStroke();
        hexFill(0x9933ff, pulse * 255);         circle(p.x, p.y, auraR * 2.0);
        hexFill(0xcc66ff, pulse * 0.5 * 255);   circle(p.x, p.y, auraR * 1.2);
        pop();
    }
    if (e.type === 3) {
        const pulse = Math.sin(Date.now() * 0.007) * 0.15 + 0.25;
        const auraR = 22 * p.scale;
        push(); noStroke();
        hexFill(0xff4400, pulse * 255);         circle(p.x, p.y, auraR * 2.0);
        hexFill(0xff8800, pulse * 0.5 * 255);   circle(p.x, p.y, auraR * 1.1);
        pop();
    }
    if (e.type === L2_TYPE_PIG_HERO && e.isDashing) {
        const da = 0.55 + Math.sin(Date.now() * 0.03) * 0.15;
        push(); noStroke();
        hexFill(0xffee00, da * 0.35 * 255); circle(p.x, p.y, 36 * p.scale);
        hexFill(0xffffff, da * 0.50 * 255); circle(p.x, p.y, 20 * p.scale);
        pop();
    }
    if (e.shieldActive) {
        const pulse = Math.sin(Date.now() * 0.008) * 0.2 + 0.5;
        const auraR = 28 * p.scale;
        push();
        noStroke(); hexFill(0x00ffff, pulse * 0.18 * 255); circle(p.x, p.y, auraR * 2.0);
        noFill();   hexStroke(0x00ffff, pulse * 0.8 * 255); strokeWeight(2.5); circle(p.x, p.y, auraR * 2.0);
        pop();
    }
    if (e.isDashing) {
        const da = Math.sin(Date.now() * 0.015) * 0.2 + 0.35;
        push(); noStroke();
        hexFill(0xff8800, da * 0.5 * 255); circle(p.x, p.y, 40 * p.scale);
        pop();
    }

    // ---- Sprite selection ----
    const TARGET_H = 120;
    let frame    = null;
    let frameH   = PATRICK_FRAME_H;
    let sizeMult = 1.3;
    let tintHex  = 0xffffff;

    if (monsterSpritesLoaded) {
        if (e.isElephantBoss && elephantFrames.length > 0) {
            frame    = elephantFrames[Math.floor(e.animFrame * 0.35) % elephantFrames.length];
            frameH   = ELEPHANT_FRAME_SIZE; sizeMult = 7.5;
        } else if (e.isCowCryBoss && cowCryFrames.length > 0) {
            frame    = cowCryFrames[Math.floor(e.animFrame * 0.4) % cowCryFrames.length];
            frameH   = COW_CRY_FRAME_SIZE; sizeMult = 4.8;
        } else if (e.isBoss) {
            frame    = bossFrames[Math.floor(e.animFrame * 0.4) % bossFrames.length];
            frameH   = MONSTER_FRAME_SIZE; sizeMult = e.isMegaBoss ? 7.0 : 4.2;
        } else if (e.type === 1 && xiaoNaiLongFrames.length > 0) {
            frame    = xiaoNaiLongFrames[Math.floor(e.animFrame * 0.4) % xiaoNaiLongFrames.length];
            frameH   = XIAO_NAI_LONG_FRAME_SIZE; sizeMult = 1.4;
        } else if (e.type === 3 && fireEnemyFrames.length > 0) {
            frame    = fireEnemyFrames[Math.floor(e.animFrame * 0.25) % fireEnemyFrames.length];
            frameH   = FIRE_ENEMY_FRAME_SIZE; sizeMult = 2.2;
        } else if (e.type === L2_TYPE_PIG_ENGINEER && pigEngineerFrames.length > 0) {
            frame    = pigEngineerFrames[Math.floor(e.animFrame * 0.4) % pigEngineerFrames.length];
            frameH   = PIG_ENGINEER_FRAME_SIZE; sizeMult = 2.0;
        } else if (e.type === L2_TYPE_COW_GUN && cowGunFrames.length > 0) {
            frame    = cowGunFrames[Math.floor(e.animFrame * 0.4) % cowGunFrames.length];
            frameH   = COW_GUN_FRAME_SIZE; sizeMult = 1.8;
        } else if ((e.type === L2_TYPE_PIG_HERO || e.type === L2_TYPE_MINI) && capybaraFrames.length > 0) {
            frame    = capybaraFrames[Math.floor(e.animFrame * 0.4) % capybaraFrames.length];
            frameH   = CAPYBARA_FRAME_SIZE;
            sizeMult = e.type === L2_TYPE_MINI ? 0.8 : 1.6;
        } else if (e.type === L2_TYPE_ELEPHANT && elephantFrames.length > 0) {
            frame    = elephantFrames[Math.floor(e.animFrame * 0.35) % elephantFrames.length];
            frameH   = ELEPHANT_FRAME_SIZE; sizeMult = 2.2;
        } else if (normalMonsterFrames.length > 0) {
            frame    = normalMonsterFrames[Math.floor(e.animFrame * 0.4) % normalMonsterFrames.length];
            frameH   = PATRICK_FRAME_H; sizeMult = 1.3;
        }

        if (e.isHeavy && !e.isBoss) sizeMult = Math.max(sizeMult, 1.6);

        tintHex = e.hitFlash > 0 ? 0xffaaaa
            : e.isElephantBoss ? 0xff6600
            : e.isMegaBoss     ? 0xff2222
            : e.type === 3     ? 0xff5533
            : 0xffffff;

        if (frame) {
            const sprScale = p.scale * (TARGET_H / frameH) * sizeMult;
            const wobble   = Math.sin(e.animFrame * 0.15) * 0.02;
            drawSpriteFrame(frame, p.x, p.y,
                frameH * (sprScale + wobble),
                frameH * (sprScale - wobble),
                tintHex);
        }
    } else {
        // Fallback: procedural soldier shape
        drawEnemySoldier(p.x, p.y, p.scale, e.animFrame, e.hitFlash, e.type);
    }

    // ---- HP bar ----
    if (e.hp < e.maxHp || e.isHeavy || e.isBoss || e.type === 3) {
        const barSizeMult = e.isMegaBoss ? 5.0 : e.isBoss ? 3.5 : e.type === 3 ? 1.8 : e.isHeavy ? 1.35 : 1;
        const barW = (e.isMegaBoss ? 90 : e.isBoss ? 65 : e.type === 3 ? 32 : e.isHeavy ? 26 : 20) * p.scale;
        const barH = Math.max(1, (e.isMegaBoss ? 7 : e.isBoss ? 5 : 3) * p.scale);
        const barY = p.y - 18 * p.scale * barSizeMult;
        const barColor = e.isMegaBoss ? 0xff2222 : e.isBoss ? 0xcc44ff : e.type === 3 ? 0xff6622 : e.isHeavy ? 0xff6666 : 0xff4444;

        push(); noStroke();
        hexFill(0x440000); rect(p.x - barW / 2, barY, barW, barH);
        hexFill(barColor); rect(p.x - barW / 2, barY, barW * (e.hp / e.maxHp), barH);
        pop();

        // Boss label above HP bar (English only)
        if (e.isBoss) {
            const labelStr   = e.isElephantBoss ? 'ELEPHANT KING'
                : e.isCowCryBoss ? 'CRY COW'
                : e.isMegaBoss   ? 'MEGA BOSS'
                : 'BOSS DRAGON';
            const labelColor = e.isElephantBoss ? 0xff6600
                : e.isCowCryBoss ? 0xff9944
                : e.isMegaBoss   ? 0xff4444
                : 0xcc66ff;
            const fSz   = Math.max(12, Math.floor((e.isMegaBoss ? 22 : 18) * p.scale));
            const labelY = barY - (e.isMegaBoss ? 14 : 10) * p.scale;

            push();
            textFont('Arial');
            textSize(fSz);
            textStyle(BOLD);
            textAlign(CENTER, BOTTOM);
            noStroke();
            hexFill(labelColor);
            drawingContext.shadowColor = 'rgba(0,0,0,0.85)';
            drawingContext.shadowBlur  = 4;
            text(labelStr, p.x, labelY);
            drawingContext.shadowBlur  = 0;
            pop();
        }

        // Heavy indicator dot
        if (e.isHeavy && !e.isBoss) {
            push(); noStroke();
            hexFill(0xff4444);
            circle(p.x, barY - 4 * p.scale, 5 * p.scale);
            pop();
        }
    }
}

// ============================================================
// ENEMY BULLET RENDERERS
// ============================================================

function _renderNoteBullet(eb, ep, relZ, s) {
    const noteT = Date.now() * 0.008 + eb.x * 0.05 + eb.z * 0.03;

    // Shimmer trail
    const trailP = project(eb.x - eb.vx * 4, relZ - eb.vz * 4);
    if (trailP.scale > 0) {
        noFill();
        hexStroke(0xaa44ff, 0.55 * 255);
        strokeWeight(Math.max(1.5, s * 0.9));
        line(trailP.x, trailP.y, ep.x, ep.y);
    }

    // Outer glow
    noStroke();
    hexFill(0xcc55ff, 0.10 * 255); circle(ep.x, ep.y, s * 7.6);
    hexFill(0xaa44ff, 0.22 * 255); circle(ep.x, ep.y, s * 4.4);

    // Note head (oval) — PixiJS ellipse(cx,cy,rx,ry) uses half-widths → p5 uses full widths (*2)
    const nh = s * 1.1;
    hexFill(0xcc55ff, 0.95 * 255); ellipse(ep.x, ep.y, nh * 2.0,  nh * 0.72 * 2);
    hexFill(0xffffff, 0.55 * 255); ellipse(ep.x, ep.y, nh * 1.0,  nh * 0.35 * 2);

    // Stem
    noFill();
    hexStroke(0xee88ff, 0.9 * 255);
    strokeWeight(Math.max(1, s * 0.35));
    const stemH = s * 2.0;
    line(ep.x + nh * 0.65, ep.y, ep.x + nh * 0.65, ep.y - stemH);

    // Flag (bezier curve)
    hexStroke(0xee88ff, 0.85 * 255);
    strokeWeight(Math.max(1, s * 0.3));
    beginShape();
    vertex(ep.x + nh * 0.65, ep.y - stemH);
    bezierVertex(
        ep.x + nh * 0.65 + s,       ep.y - stemH + s * 0.4,
        ep.x + nh * 0.65 + s * 0.8, ep.y - stemH + s * 1.1,
        ep.x + nh * 0.65 + s * 0.2, ep.y - stemH + s * 1.6
    );
    endShape();

    // Orbiting sparkle dots
    noStroke();
    for (let oi = 0; oi < 3; oi++) {
        const oAngle = noteT + (oi / 3) * Math.PI * 2;
        const oR     = s * 2.2;
        const ox     = ep.x + Math.cos(oAngle) * oR;
        const oy     = ep.y + Math.sin(oAngle) * oR * 0.6;
        hexFill(oi === 0 ? 0xffffff : 0xcc99ff, 0.75 * 255);
        circle(ox, oy, Math.max(1, s * 0.28) * 2);
    }
}

function _renderLavaBullet(eb, ep, relZ, s) {
    const lavaT = Date.now() * 0.006 + eb.x * 0.04;

    // Hot trail
    const trailP = project(eb.x - eb.vx * 3, relZ - eb.vz * 3);
    if (trailP.scale > 0) {
        noFill();
        hexStroke(0xff4400, 0.65 * 255);
        strokeWeight(Math.max(2, s * 1.5));
        line(trailP.x, trailP.y, ep.x, ep.y);
    }

    const lavaPulse = 0.8 + Math.sin(lavaT * 2.5) * 0.2;
    noStroke();
    hexFill(0xff3300, 0.12 * 255); circle(ep.x, ep.y, s * 4.5 * lavaPulse * 2);
    hexFill(0xff6600, 0.25 * 255); circle(ep.x, ep.y, s * 2.8 * lavaPulse * 2);
    hexFill(0xff8800, 0.45 * 255); circle(ep.x, ep.y, s * 1.7 * 2);
    hexFill(0xff6600, 0.98 * 255); circle(ep.x, ep.y, s * 2.0);
    hexFill(0xffcc44, 0.90 * 255); circle(ep.x, ep.y, s * 0.55 * 2);
    hexFill(0xffffff, 0.70 * 255); circle(ep.x, ep.y, s * 0.22 * 2);

    // Drip particles moved to update loop (enemyBullet tick) to avoid render-update coupling
}

function _renderDefaultBullet(eb, ep, relZ, s, isFlame) {
    // Trail
    const trailP = project(eb.x - eb.vx * 3, relZ - eb.vz * 3);
    if (trailP.scale > 0) {
        noFill();
        hexStroke(eb.color, (isFlame ? 0.7 : 0.5) * 255);
        strokeWeight(Math.max(2, s * (isFlame ? 1.4 : 1.0)));
        line(trailP.x, trailP.y, ep.x, ep.y);
    }

    noStroke();
    hexFill(eb.color, (isFlame ? 0.18 : 0.12) * 255); circle(ep.x, ep.y, s * 3.5 * 2);
    hexFill(eb.color, 0.30 * 255);                     circle(ep.x, ep.y, s * 2.0 * 2);
    hexFill(eb.color, 0.95 * 255);                     circle(ep.x, ep.y, s * 2.0);
    hexFill(isFlame ? 0xffee44 : 0xffffff, 0.9 * 255); circle(ep.x, ep.y, s * 0.45 * 2);

    // Flame particle trail moved to update loop (enemyBullet tick) to avoid render-update coupling
}
