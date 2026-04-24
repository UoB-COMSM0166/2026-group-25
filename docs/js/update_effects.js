// ============================================================
// UPDATE SUBSYSTEM: Cleanup, particles, effects, end-of-frame
// ============================================================
function updateEffects(g, dt, dtF) {
    // Cleanup
    g.enemies = g.enemies.filter(e => e.alive || e.z > g.cameraZ - 50);
    // Cap non-boss enemies to prevent performance issues during multi-boss summon spam
    const maxEnemies = _proj.isMobile ? 40 : 80;
    if (g.enemies.length > maxEnemies) {
        // Keep bosses, remove oldest non-boss enemies
        const bosses = g.enemies.filter(e => e.isBoss);
        const nonBosses = g.enemies.filter(e => !e.isBoss);
        if (nonBosses.length > maxEnemies - bosses.length) {
            nonBosses.splice(0, nonBosses.length - (maxEnemies - bosses.length));
        }
        g.enemies = bosses.concat(nonBosses);
    }
    g.gates = g.gates.filter(gate => gate.z > g.cameraZ - 50 && (!gate.triggered || gate.fadeTimer > 0));
    g.barrels = g.barrels.filter(b => b.alive && b.z > g.cameraZ - 50);
    g.deadBodies.forEach(d => d.timer -= dtF);
    g.deadBodies = g.deadBodies.filter(d => d.timer > 0 && d.z > g.cameraZ - 50);
    if (g.deadBodies.length > 60) g.deadBodies.splice(0, g.deadBodies.length - 40);

    // Particles
    g.particles.forEach(p => { p.x += p.vx * dtF; p.z += p.vz * dtF; p.y += p.vy * dtF; p.vy += 0.3 * dtF; p.life -= dtF; });
    g.particles = g.particles.filter(p => p.life > 0);
    // Adaptive particle cap: reduce when FPS drops below ~40 (deltaMS > 25ms)
    const frameMs = deltaTime;
    const particleLimit = _proj.isMobile ? 120 : (frameMs > 30 ? 150 : frameMs > 22 ? 250 : 400);
    if (g.particles.length > particleLimit) g.particles.splice(0, g.particles.length - Math.floor(particleLimit * 0.75));

    // Explosions
    g.explosions.forEach(e => e.timer++);
    g.explosions = g.explosions.filter(e => e.timer < e.maxTimer);
    if (g.explosions.length > 40) g.explosions.splice(0, g.explosions.length - 30);

    // Shake
    if (g.shakeTimer > 0) {
        const amp = Math.max(0.25, g.shakePower || 0.6);
        g.shakeX = (Math.random() - 0.5) * g.shakeTimer * amp;
        g.shakeY = (Math.random() - 0.5) * g.shakeTimer * amp * 0.7;
        g.shakePower = Math.max(0, (g.shakePower || 0) * Math.pow(0.9, dtF));
        g.shakeTimer = Math.max(0, g.shakeTimer - dtF);
    } else { g.shakeX = 0; g.shakeY = 0; g.shakePower = 0; }

    // Gate shatter pieces (fly toward player then fade)
    g.gateShatterPieces.forEach(p => {
        p.x += ((p.targetX - p.x) * 0.07 + p.vx) * dtF;
        p.y += ((p.targetY - p.y) * 0.07 + p.vy) * dtF;
        p.vx *= 0.9; p.vy *= 0.9;
        p.life -= dtF;
    });
    g.gateShatterPieces = g.gateShatterPieces.filter(p => p.life > 0);
    if (g.gateShatterPieces.length > 100) g.gateShatterPieces.splice(0, g.gateShatterPieces.length - 80);

    // Gate floating text
    if (g.gateText) {
        g.gateText.timer += dtF;
        if (g.gateText.timer < 12) g.gateText.scale = Math.min(1.8, g.gateText.scale + 0.16 * dtF);
        else if (g.gateText.timer > 55) g.gateText.scale = Math.max(0.01, g.gateText.scale * Math.pow(0.94, dtF));
        if (g.gateText.timer >= g.gateText.maxTimer) g.gateText = null;
    }

    // Gate collapse panels
    g.gateCollapsePanels.forEach(p => {
        p.crackProgress = Math.min(1, p.crackProgress + 0.06 * dtF);
        if (p.crackProgress >= 0.5) {
            p.vy += 1.5 * dtF;
            p.sy += p.vy * dtF;
            p.rotAngle += p.rotSpeed * dtF;
        }
        p.life -= dtF;
    });
    g.gateCollapsePanels = g.gateCollapsePanels.filter(p => p.life > 0);

    // Speed lines
    g.speedLines.forEach(s => { s.x += s.vx * dtF; s.y += s.vy * dtF; s.life -= dtF; });
    g.speedLines = g.speedLines.filter(s => s.life > 0);

    // Gate flash
    if (g.gateFlash) {
        g.gateFlash.timer -= dtF;
        if (g.gateFlash.timer <= 0) g.gateFlash = null;
    }

    // Barrel explosion texts
    g.barrelExplosionTexts.forEach(t => {
        t.timer += dtF;
        if (t.timer < 10) t.scale = Math.min(2.2, t.scale + 0.22 * dtF);
        t.y -= 1.5 * dtF;
    });
    g.barrelExplosionTexts = g.barrelExplosionTexts.filter(t => t.timer < t.maxTimer);

    // Damage numbers
    g.damageNumbers.forEach(d => { d.offsetY -= 1.2 * dtF; d.life -= dtF; });
    g.damageNumbers = g.damageNumbers.filter(d => d.life > 0);
    if (g.damageNumbers.length > 30) g.damageNumbers.splice(0, g.damageNumbers.length - 20);

    // Score popups
    g.scorePopups.forEach(p => { p.y -= 1.5 * dtF; p.life -= dtF; });
    g.scorePopups = g.scorePopups.filter(p => p.life > 0);

    // Combo timer
    if (g.comboTimer > 0) {
        g.comboTimer -= dt;
        if (g.comboTimer <= 0) {
            if (g.comboCount >= 3) {
                const bonus = g.comboCount * 5;
                g.score += bonus;
                addScorePopup(`COMBO x${g.comboCount}! +${bonus}`, screenW / 2, screenH * 0.4, 0xff8800);
            }
            g.comboCount = 0;
        }
    }

    // Wave banner
    if (g.waveBanner) {
        g.waveBanner.timer += dtF;
        if (g.waveBanner.timer >= g.waveBanner.maxTimer) g.waveBanner = null;
    }

    // Level-up overlay animation
    if (g.levelUpAnim) {
        g.levelUpAnim.timer += dtF;
        if (g.levelUpAnim.timer >= g.levelUpAnim.maxTimer) g.levelUpAnim = null;
    }

    // Ground slam warnings — tick and resolve
    for (let si = g.slamWarnings.length - 1; si >= 0; si--) {
        const sw = g.slamWarnings[si];
        // Keep z anchored to the player's current Z so the warning stays
        // visible as the camera advances during the boss fight.
        sw.z = g.cameraZ + 10;
        sw.timer += dtF;
        if (sw.timer >= sw.maxTimer) {
            // Slam resolves — check if player is in the danger zone
            const playerInZone = Math.abs(g.player.x - sw.x) < sw.halfWidth;
            if (playerInZone && !g.shieldActive) {
                const finalDmg = applyTroopDamage(g, sw.damage);
                g.gateText = { text: `⚡ GROUND SLAM \u2212${finalDmg}!`, color: 0xff2222, timer: 0, maxTimer: 80, scale: 0.1 };
                g.gateFlash = { color: 0xff2222, timer: 18, maxTimer: 18 };
                g.vignetteFlash = Math.min(1.5, 0.9);
                addParticles(g.player.x, g.cameraZ + 10, 12, 0xff6644, 4, 15);
                if (g.squadCount <= 0) { handlePlayerDeath(); }
            } else if (playerInZone && g.shieldActive) {
                addParticles(g.player.x, g.cameraZ + 10, 10, 0xffdd44, 3, 12);
                g.gateText = { text: '⚡ GROUND SLAM (BLOCKED!)', color: 0xffdd44, timer: 0, maxTimer: 70, scale: 0.1 };
            } else {
                // Dodged!
                g.gateText = { text: '⚡ GROUND SLAM (DODGED!)', color: 0x44ff44, timer: 0, maxTimer: 70, scale: 0.1 };
                g.score += 50;
                addScorePopup('DODGE! +50', screenW / 2, screenH * 0.35, 0x44ff44);
            }
            // Impact visual effects
            g.explosions.push({ x: sw.x, z: sw.z, timer: 0, maxTimer: 35, isBlastRing: true });
            addParticles(sw.bossX, sw.bossZ, 25, 0xff4444, 6, 25);
            g.shakeTimer = Math.max(g.shakeTimer, 22);
            g.screenFlash = Math.max(g.screenFlash, 0.4);
            // Speed lines for shockwave
            const pp = project(sw.x, sw.z - g.cameraZ);
            emitSpeedLines(g, pp.x, pp.y, 20, 0xff4444, { spdBase: 7, spdVar: 7, lifeBase: 10, lifeVar: 8, lenBase: 20, lenVar: 25 });
            g.slamWarnings.splice(si, 1);
        }
    }

    // Vignette flash decay
    g.vignetteFlash = Math.max(0, g.vignetteFlash - 0.03 * dtF);
    g.screenFlash = Math.max(0, g.screenFlash - 0.05 * dtF);

    // Mid-game shop timer (after mega boss kill)
    if (g.midShopTimer > 0) {
        g.midShopTimer -= dtF;
        if (g.midShopTimer <= 0) {
            openMidShop();
        }
    }

    // Clouds
    g.clouds.forEach(c => {
        c.x += c.speed * 0.00008 * dtF;
        if (c.x > 1.3) c.x = -0.3;
    });

    // Level clear detection
    const maxWave = g.currentLevel === 2 ? MAX_WAVES_LEVEL2 : MAX_WAVES_LEVEL1;
    const finalBossAlive = g.enemies.some(e => e.alive && e.isBoss);
    if ((g.currentLevel === 1 || g.currentLevel === 2) &&
        g.wave >= maxWave && !finalBossAlive && !g.levelCompleted) {
        g.levelCompleted = true;
        triggerLevelComplete();
    }
}
