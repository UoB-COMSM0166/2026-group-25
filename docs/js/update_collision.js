// ============================================================
// UPDATE SUBSYSTEM: Bullet physics and collision detection
// ============================================================
function updateBulletCollisions(g, dtF) {
    // Bullets
    g.bullets.forEach(b => {
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
        if (b.dead) return false;
        if (b.z - g.cameraZ > maxBulletRelZ || b.z < g.cameraZ - 10) return false;
        if (b.maxRange && b.z - b.startZ > b.maxRange) return false;
        return true;
    });
    const bulletLimit = _proj.isMobile ? 120 : 300;
    if (g.bullets.length > bulletLimit) g.bullets.splice(0, g.bullets.length - Math.floor(bulletLimit * 0.7));

    // Bullet-enemy collision
    // Per-frame throttle maps to avoid redundant work when many bullets hit same frame
    let hitSoundedThisFrame = false;         // play hit sound at most once per frame
    const enemyDmgMap = new Map();           // enemy → accumulated damage this frame (for merged damage numbers)
    g.bullets.forEach(b => {
        if (b.dead) return;
        for (let e of g.enemies) {
            if (!e.alive) continue;
            if (b.pierce && b.hitEnemies && b.hitEnemies.has(e)) continue;
            const dx = Math.abs(b.x - e.x), dz = Math.abs(b.z - e.z);
            const hitX = b.weapon === 'rocket' ? 28 : 22, hitZ = b.weapon === 'rocket' ? 20 : 16;
            if (dx < hitX && dz < hitZ) {
                // L2 Engineer shield: block bullet, show BLOCKED! effect
                if (e.shieldActive) {
                    b.dead = true;
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
                e.hp -= hitDmg;
                e.hitFlash = 4;
                // hit sound disabled — too noisy during rapid combat
                // Skip hit particles when near the particle cap to avoid wasted work
                if (g.particles.length < 320) addParticles(e.x, e.z, 3, 0xffaa00, 2, 10);
                // Accumulate damage per enemy; emit merged damage number after loop
                enemyDmgMap.set(e, (enemyDmgMap.get(e) || 0) + hitDmg);

                if (b.pierce && b.hitEnemies) { b.hitEnemies.add(e); }
                else if (b.aoeRadius) {
                    b.dead = true;
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
                } else { b.dead = true; }

                if (e.hp <= 0) {
                    processEnemyKill(g, e);
                }
                if (!b.pierce) break;
            }
        }
    });
    // Emit one merged damage number per enemy (replaces per-hit addDamageNumber calls)
    enemyDmgMap.forEach((totalDmg, e) => addDamageNumber(e.x, e.z, totalDmg));
    g.bullets = g.bullets.filter(b => !b.dead);

    // Bullet-barrel collision
    g.bullets.forEach(b => {
        if (b.dead) return;
        for (let br of g.barrels) {
            if (!br.alive) continue;
            if (Math.abs(b.x - br.x) < 18 && Math.abs(b.z - br.z) < 15) {
                br.hp--;
                addParticles(br.x, br.z, 3, 0xff8800, 2, 10);
                if (!b.pierce) b.dead = true;
                if (br.hp <= 0) explodeBarrel(br);
                if (!b.pierce) break;
            }
        }
        }
    );
    g.bullets = g.bullets.filter(b => !b.dead);
}
