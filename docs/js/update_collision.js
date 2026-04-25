// ============================================================
// UPDATE SUBSYSTEM: Bullet physics and collision detection
// ============================================================
// Note: hit / explosion SFX rate-limiting is now centralised in
// audio.js playSound (_SFX_MIN_INTERVAL_MS). Call sites here just call
// playSound(...) and the throttle takes care of the rest.

function updateBulletCollisions(g, dtF) {
    // Bullets
    g.bullets.forEach(b => {
        // Dead bullets kept alive for a few frames render an impact flash
        // so the player clearly sees the kill. Don't move or re-check.
        if (b.dead) { b.deathTimer = (b.deathTimer || 0) - dtF; return; }
        // Remember last frame's position so the collision pass can do a
        // swept-AABB check (prevents fast bullets from jumping over small
        // hit boxes in a single frame at high dtF).
        b.prevX = b.x; b.prevZ = b.z;
        b.x += b.vx * g.slowMoFactor * dtF; b.z += b.vz * g.slowMoFactor * dtF;
        // Rocket smoke trail
        if (b.weapon === 'rocket' && Math.random() < 0.4) {
            g.particles.push({
                x: b.x + (Math.random() - 0.5) * 4, z: b.z - 3,
                vx: (Math.random() - 0.5) * 0.3, vz: -0.2,
                vy: -0.5 - Math.random() * 0.3, y: 0,
                life: 10 + Math.random() * 6, maxLife: 16,
                color: 0x888888, size: 2 + Math.random() * 2,
            });
        }
    });
    // Far-z cull — extended to cover bosses holding at CONFIG.BOSS_HOLD_Z,
    // otherwise player bullets die before reaching the boss at its new
    // hold distance.
    const maxBulletRelZ = Math.max(CONFIG.SPAWN_DISTANCE, CONFIG.BOSS_HOLD_Z) + 100;
    g.bullets = g.bullets.filter(b => {
        if (b.dead) return b.deathTimer > 0;
        if (b.z - g.cameraZ > maxBulletRelZ || b.z < g.cameraZ - 10) return false;
        if (b.maxRange && b.z - b.startZ > b.maxRange) return false;
        return true;
    });
    const bulletLimit = _proj.isMobile ? 120 : 300;
    if (g.bullets.length > bulletLimit) g.bullets.splice(0, g.bullets.length - Math.floor(bulletLimit * 0.7));

    // Bullet-enemy collision
    // Per-frame throttle map to avoid redundant work when many bullets hit same frame
    const enemyDmgMap = new Map();           // enemy -> merged damage payload for this frame
    g.bullets.forEach(b => {
        if (b.dead) return; // lingering impact flash, no more collisions
        for (let e of g.enemies) {
            if (!e.alive) continue;
            if (b.pierce && b.hitEnemies && b.hitEnemies.has(e)) continue;
            // Hit box calibrated to the visible sprite footprint so every
            // bullet that visually overlaps the sprite counts as a hit, and
            // bullets that visually clear the sprite go straight through.
            // Derivation: sprite visual world-width ≈ 120 * sizeMult * 2 / xScale
            // ≈ sizeMult * 132 for the default screen aspect; half that is
            // the hitX we need. 22 × visMult approximates that half-width.
            let visMult = 1.0;
            if (e.isMegaBoss)            visMult = 8.0;   // sizeMult ≈ 7.5
            else if (e.isBoss)           visMult = 6.0;   // sizeMult ≈ 5.0
            else if (e.type === 3)       visMult = 2.6;   // fire dragon
            else if (e.isHeavy)          visMult = 1.7;
            let hitX = (b.weapon === 'rocket' ? 28 : 22) * visMult;
            let hitZ = (b.weapon === 'rocket' ? 20 : 16) * visMult;
            // Swept AABB: does the bullet's travel segment (prevZ → z)
            // intersect the enemy's hit box? Fixes fast bullets skipping
            // over small hit boxes when dtF is large.
            const prevZ = b.prevZ !== undefined ? b.prevZ : b.z;
            const prevX = b.prevX !== undefined ? b.prevX : b.x;
            const segMinZ = Math.min(prevZ, b.z);
            const segMaxZ = Math.max(prevZ, b.z);
            const segMinX = Math.min(prevX, b.x);
            const segMaxX = Math.max(prevX, b.x);
            const zHit = segMaxZ >= e.z - hitZ && segMinZ <= e.z + hitZ;
            const xHit = segMaxX >= e.x - hitX && segMinX <= e.x + hitX;
            if (zHit && xHit) {
                // L2 Engineer shield: block bullet, show BLOCKED! effect
                if (e.shieldActive) {
                    b.x = e.x; b.z = e.z;
                    b.dead = true; b.deathTimer = 3;
                    const bp = project(e.x, e.z - g.cameraZ);
                    addScorePopup('BLOCKED!', bp.x, bp.y - 15, 0x00ffff);
                    addParticles(e.x, e.z, 4, 0x00ffff, 2, 8);
                    break;
                }
                // Shotgun falloff: close range bonus, far range penalty.
                // ≤50: 400%, 50~150: 400%→100%, 150~700: 100%→40%, >700: 40% floor.
                // Tuned so the shotgun still deals meaningful damage to bosses
                // at CONFIG.BOSS_HOLD_Z without breaking the close-range identity.
                let hitDmg = b.damage || 1;
                if (b.falloff) {
                    const travelDist = b.z - b.startZ;
                    let mult;
                    if (travelDist <= 50) {
                        mult = 4.0;
                    } else if (travelDist <= 150) {
                        mult = 4.0 - (travelDist - 50) / 100 * 3.0; // 4.0 → 1.0
                    } else {
                        mult = Math.max(0.4, 1.0 - (travelDist - 150) / 550 * 0.6);
                    }
                    hitDmg = Math.max(1, Math.round(hitDmg * mult));
                }
                const isCrit = Math.random() < CONFIG.CRIT_CHANCE;
                if (isCrit) {
                    hitDmg = Math.max(hitDmg + 1, Math.round(hitDmg * CONFIG.CRIT_MULT));
                }
                e.hp -= hitDmg;
                e.hitFlash = 4;
                playSound('hit');
                addImpactFeedback(e.x, e.z, isCrit
                    ? {
                        color: 0xffc24b,
                        particleBurst: 10,
                        sparkleBurst: 5,
                        flash: 0.09,
                        shake: CONFIG.HIT_SHAKE_CRIT,
                        shakePower: 1.15,
                        particleSize: 3.6,
                        particleLife: 14,
                    }
                    : {
                        color: 0xffaa00,
                        particleBurst: 4,
                        sparkleBurst: 2,
                        flash: 0.035,
                        shake: CONFIG.HIT_SHAKE_LIGHT,
                        shakePower: 0.45,
                        particleSize: 2.2,
                        particleLife: 9,
                    });
                // Accumulate damage per enemy; emit merged damage number after loop
                const merged = enemyDmgMap.get(e) || { damage: 0, crit: false };
                merged.damage += hitDmg;
                merged.crit = merged.crit || isCrit;
                enemyDmgMap.set(e, merged);

                if (b.pierce && b.hitEnemies) { b.hitEnemies.add(e); }
                else if (b.aoeRadius) {
                    // Snap to enemy position so the explosion visual is
                    // centred on the contact point, not past it.
                    b.x = e.x; b.z = e.z;
                    b.dead = true; b.deathTimer = 3;
                    addExplosion(b.x, b.z);
                    g.shakeTimer = 8; g.screenFlash = 0.3;
                    playSound('explosion');
                    g.enemies.forEach(other => {
                        if (!other.alive || other === e) return;
                        const adx = Math.abs(other.x - b.x), adz = Math.abs(other.z - b.z);
                        if (adx < b.aoeRadius && adz < b.aoeRadius) {
                            // Distance falloff: center=100%, edge=30%
                            const dist = Math.sqrt(adx * adx + adz * adz);
                            const falloff = Math.max(0.3, 1 - dist / b.aoeRadius * 0.7);
                            const aoeDmg = Math.max(1, Math.floor((b.damage || 1) * falloff));
                            other.hp -= aoeDmg; other.hitFlash = 4;
                            if (other.hp <= 0) {
                                processEnemyKill(g, other, { skipSound: true });
                            }
                        }
                    });
                } else {
                    // Non-pierce non-AOE: snap to the enemy, flag dead,
                    // and linger 3 frames so drawBullets can render a
                    // bright impact flash at the contact point — the
                    // player unmistakably sees "bullet → hit → gone".
                    b.x = e.x; b.z = e.z;
                    b.dead = true; b.deathTimer = 3;
                    if (g.particles.length < 340) {
                        addParticles(e.x, e.z, 6, 0xffee88, 3, 9);
                        addParticles(e.x, e.z, 3, 0xffffff, 2, 6);
                    }
                }

                if (e.hp <= 0) {
                    processEnemyKill(g, e);
                }
                if (!b.pierce) break;
            }
        }
    });
    // Emit one merged damage number per enemy (replaces per-hit addDamageNumber calls)
    enemyDmgMap.forEach((payload, e) => addDamageNumber(
        e.x,
        e.z,
        payload.damage,
        payload.crit ? 0xffc24b : 0xffffff,
        payload.crit ? { crit: true, prefix: 'CRIT ', scaleBoost: 0.45 } : null
    ));
    g.bullets = g.bullets.filter(b => !b.dead || b.deathTimer > 0);

    // Bullet-barrel collision (also swept so fast bullets can't skip barrels)
    g.bullets.forEach(b => {
        if (b.dead) return;
        const prevZ = b.prevZ !== undefined ? b.prevZ : b.z;
        const prevX = b.prevX !== undefined ? b.prevX : b.x;
        const segMinZ = Math.min(prevZ, b.z), segMaxZ = Math.max(prevZ, b.z);
        const segMinX = Math.min(prevX, b.x), segMaxX = Math.max(prevX, b.x);
        for (let br of g.barrels) {
            if (!br.alive) continue;
            if (segMaxZ >= br.z - 15 && segMinZ <= br.z + 15 &&
                segMaxX >= br.x - 18 && segMinX <= br.x + 18) {
                br.hp--;
                addParticles(br.x, br.z, 3, 0xff8800, 2, 10);
                if (!b.pierce) { b.x = br.x; b.z = br.z; b.dead = true; b.deathTimer = 3; }
                if (br.hp <= 0) explodeBarrel(br);
                if (!b.pierce) break;
            }
        }
    });
    g.bullets = g.bullets.filter(b => !b.dead || b.deathTimer > 0);
}
