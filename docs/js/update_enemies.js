// ============================================================
// UPDATE SUBSYSTEM: Enemy AI, boss skills, enemy bullets
// ============================================================
function updateEnemies(g, dt, dtF, bossAlive) {
    // Enemies
    g.enemies.forEach(e => {
        if (!e.alive) return;
        e.animFrame += 0.2 * dtF;
        e.hitFlash = Math.max(0, e.hitFlash - dtF);
        const playerZ = g.cameraZ + 10;

        if (e.isBoss) {
            // === BOSS AI: locked at far range, remote attack only ===
            // Hard-lock to hold distance — never drift closer
            e.z = playerZ + e.bossHoldZ;

            // Lateral tracking with separation — bosses avoid overlapping
            const otherBosses = g.enemies.filter(b => b.alive && b.isBoss && b !== e);
            // Repulsion from other bosses
            let repelX = 0;
            const minSep = 80; // minimum separation
            for (const ob of otherBosses) {
                const sep = e.x - ob.x;
                const absSep = Math.abs(sep);
                if (absSep < minSep) {
                    // stronger force when closer
                    const force = (minSep - absSep) / minSep * 0.6;
                    repelX += (sep === 0 ? (Math.random() - 0.5) : Math.sign(sep)) * force;
                }
            }
            // Track player loosely
            const lateralDx = g.player.x - e.x;
            const trackSpeed = otherBosses.length > 0 ? 0.2 : 0.3; // slower tracking with multiple bosses
            const deadZone = otherBosses.length > 0 ? 40 : 25; // larger dead zone with multiple bosses
            let moveX = 0;
            if (Math.abs(lateralDx) > deadZone) {
                moveX = Math.sign(lateralDx) * trackSpeed * dtF;
            }
            // Combine tracking + separation, clamp to road
            e.x += moveX + repelX * dtF;
            e.x = Math.max(-CONFIG.ROAD_HALF_WIDTH * 0.85, Math.min(CONFIG.ROAD_HALF_WIDTH * 0.85, e.x));
            // Ranged attack: shoot at player from far range
            e.bossShootTimer += dtF;
            if (e.bossShootTimer >= e.bossShootInterval) {
                e.bossShootTimer = 0;
                const dx = g.player.x - e.x;
                const dz = playerZ - e.z;
                const dist = Math.sqrt(dx * dx + dz * dz) || 1;
                const bossLvl = Math.floor(g.wave / 5);
                const mobileScale = _proj.isMobile ? 0.9 : 1.0; // slight 10% speed reduction on mobile
                const speed = Math.min(CONFIG.BOSS_BULLET_SPEED_MAX, CONFIG.BOSS_BULLET_SPEED + bossLvl * CONFIG.BOSS_BULLET_SPEED_SCALE) * mobileScale;
                // L2 bosses use themed bullet types
                const mainType = e.isCowCryBoss ? 'note' : e.isElephantBoss ? 'lava' : 'aimed';
                const mainColor = e.isCowCryBoss ? 0xcc55ff : e.isElephantBoss ? 0xff6600 : 0xff3333;
                // Main shot aimed at player
                g.enemyBullets.push({
                    x: e.x, z: e.z,
                    vx: dx / dist * speed, vz: dz / dist * speed,
                    damage: e.damage, life: 300,
                    type: mainType, color: mainColor,
                });
                // Spread shots only at boss level 3+ (wave 15+)
                if (bossLvl >= 3) {
                    const spreadType = e.isCowCryBoss ? 'note' : e.isElephantBoss ? 'lava' : 'spread';
                    const spreadColor = e.isCowCryBoss ? 0x88aaff : e.isElephantBoss ? 0xff9900 : 0xff6644;
                    for (let s = -1; s <= 1; s += 2) {
                        const angle = Math.atan2(dz, dx) + s * 0.25;
                        g.enemyBullets.push({
                            x: e.x, z: e.z,
                            vx: Math.cos(angle) * speed * 0.85, vz: Math.sin(angle) * speed * 0.85,
                            damage: Math.max(1, e.damage - 1), life: 250,
                            type: spreadType, color: spreadColor,
                        });
                    }
                }
                // Muzzle flash particles
                const flashColor = e.isCowCryBoss ? 0xcc55ff : e.isElephantBoss ? 0xff6600 : (e.isMegaBoss ? 0xff2200 : 0xff4444);
                addParticles(e.x, e.z, 4, flashColor, 3, 10);
            }

            // === COW CRY BOSS SKILL SYSTEM ===
            if (e.isCowCryBoss) {
                e.cowSkillTimer += dtF;
                // Handle ongoing burst sequence (3 consecutive waves)
                if (e.burstRemaining > 0) {
                    e.burstDelay -= dtF;
                    if (e.burstDelay <= 0) {
                        const bulletCount = 12 + Math.min(e.bossLevel, 8) * 2;
                        const speed = Math.min(CONFIG.BOSS_BULLET_SPEED_MAX, CONFIG.BOSS_BULLET_SPEED + e.bossLevel * CONFIG.BOSS_BULLET_SPEED_SCALE);
                        const angleOffset = (3 - e.burstRemaining) * (Math.PI / bulletCount); // rotate each burst slightly
                        for (let i = 0; i < bulletCount; i++) {
                            const angle = (i / bulletCount) * Math.PI * 2 + angleOffset;
                            g.enemyBullets.push({
                                x: e.x, z: e.z,
                                vx: Math.cos(angle) * speed, vz: Math.sin(angle) * speed,
                                damage: Math.max(1, e.damage - 1), life: 280,
                                type: 'note', color: 0xcc55ff,
                            });
                        }
                        addParticles(e.x, e.z, 10, 0xcc55ff, 3, 14);
                        g.shakeTimer = Math.max(g.shakeTimer, 5);
                        e.burstRemaining--;
                        e.burstDelay = 18; // ~0.3s between bursts
                    }
                } else if (e.cowSkillTimer >= e.cowSkillCooldown) {
                    e.cowSkillTimer = 0;
                    const skill = e.cowNextSkill % 2;
                    e.cowNextSkill++;
                    const bp = project(e.x, e.z - g.cameraZ);

                    if (skill === 0) {
                        // --- cry shockwave: 3-burst circular volley ---
                        e.burstRemaining = 3;
                        e.burstDelay = 0; // fire first burst immediately
                        addScorePopup('🎵 NOTE SHOCKWAVE!', bp.x, bp.y - 40, 0xcc55ff);
                    } else {
                        // --- self-heal: recover 8% of max HP ---
                        const heal = Math.ceil(e.maxHp * 0.08);
                        e.hp = Math.min(e.maxHp, e.hp + heal);
                        addParticles(e.x, e.z, 12, 0x88ff88, 3, 15);
                        addScorePopup(`💚 HEALED +${heal}`, bp.x, bp.y - 40, 0x88ff88);
                    }
                }
            }

            // === MEGA BOSS SKILL SYSTEM ===
            if (e.isMegaBoss) {
                e.megaSkillTimer += dtF;
                if (e.megaSkillTimer >= e.megaSkillCooldown) {
                    e.megaSkillTimer = 0;
                    const skill = e.megaNextSkill % 3;
                    e.megaNextSkill++;

                    if (skill === 0) {
                        // --- FLAME BREATH: fan of fire projectiles ---
                        const fanCount = 7 + Math.min(e.megaLevel, 5) * 2;
                        const fanSpread = 0.6 + e.megaLevel * 0.05;
                        const mobileScale = _proj.isMobile ? 0.9 : 1.0;
                        const fSpeed = Math.min(CONFIG.MEGA_BULLET_SPEED_MAX, CONFIG.MEGA_BULLET_SPEED + e.megaLevel * CONFIG.MEGA_BULLET_SPEED_SCALE) * mobileScale;
                        for (let fi = 0; fi < fanCount; fi++) {
                            const angle = -fanSpread + 2 * fanSpread * fi / (fanCount - 1);
                            const baseAngle = Math.atan2(playerZ - e.z, g.player.x - e.x);
                            const finalAngle = baseAngle + angle;
                            g.enemyBullets.push({
                                x: e.x, z: e.z,
                                vx: Math.cos(finalAngle) * fSpeed,
                                vz: Math.sin(finalAngle) * fSpeed,
                                damage: Math.max(1, e.damage - 1), life: 200,
                                type: 'lava', color: 0xff6600,
                            });
                        }
                        addParticles(e.x, e.z, 20, 0xff4400, 5, 20);
                        addParticles(e.x, e.z, 10, 0xffaa00, 4, 15);
                        g.shakeTimer = Math.max(g.shakeTimer, 10);
                        // Warning text
                        const bp = project(e.x, e.z - g.cameraZ);
                        addScorePopup('🐘 STOMP WAVE!', bp.x, bp.y - 40, 0xff4400);
                    } else if (skill === 1) {
                        // --- SUMMON MINIONS: spawn a small squad of enemies ---
                        if (e.megaSummonCount < 3 + e.megaLevel) {
                            e.megaSummonCount++;
                            const summonCount = 3 + Math.min(e.megaLevel, 4);
                            const summonZ = e.z - 30;
                            const af2 = getAdaptiveFactor();
                            for (let si = 0; si < summonCount; si++) {
                                const sx = e.x + (si - (summonCount - 1) / 2) * 40 + (Math.random() - 0.5) * 15;
                                const rawHp = CONFIG.ENEMY_HP + g.wave * 0.6;
                                const summonHp = Math.ceil(rawHp * af2 * 0.7 * 1.38);
                                const summonDmg = Math.max(1, Math.ceil((1 + Math.floor(g.wave / 8)) * 0.8));
                                g.enemies.push({
                                    x: sx, z: summonZ + (Math.random() - 0.5) * 20,
                                    hp: summonHp, maxHp: summonHp, alive: true,
                                    damage: summonDmg, isHeavy: false,
                                    animFrame: 0, animTimer: Math.random() * 500, hitFlash: 0,
                                    type: Math.random() < 0.5 ? 0 : 1,
                                });
                            }
                            // Summon visual
                            addParticles(e.x, summonZ, 15, 0xcc44ff, 4, 18);
                            g.shakeTimer = Math.max(g.shakeTimer, 6);
                            const bp2 = project(e.x, e.z - g.cameraZ);
                            addScorePopup('👹 SUMMON MINIONS!', bp2.x, bp2.y - 40, 0xcc44ff);
                        } else {
                            // Max summons reached, do flame breath instead
                            e.megaSkillTimer = e.megaSkillCooldown - 20; // quick retry with next skill
                        }
                    } else if (skill === 2) {
                        // --- GROUND SLAM: delayed shockwave with warning zone ---
                        // Choose slam zone: left, right, or center (player can dodge to safe side)
                        const roadW = CONFIG.ROAD_HALF_WIDTH;
                        // Danger zone covers 50-65% of road width, leaving enough safe space
                        const slamWidth = roadW * (1.0 + Math.min(e.megaLevel, 5) * 0.06); // halfWidth = 110~143
                        // Bias toward player position with randomness — but ensure safe zone is reachable
                        const biasX = g.player.x * 0.5 + (Math.random() - 0.5) * roadW * 0.6;
                        const slamCenterX = Math.max(-roadW + slamWidth / 2 + 30, Math.min(roadW - slamWidth / 2 - 30, biasX));
                        const slamDmg = Math.max(1, Math.ceil(e.damage * 0.6));
                        const warningDuration = Math.max(90, 130 - e.megaLevel * 6); // frames: ~2.2s down to ~1.5s
                        g.slamWarnings.push({
                            x: slamCenterX, z: playerZ,
                            halfWidth: slamWidth / 2,
                            damage: slamDmg,
                            timer: 0, maxTimer: warningDuration,
                            bossX: e.x, bossZ: e.z,
                        });
                        // Warning text
                        const bp3 = project(e.x, e.z - g.cameraZ);
                        addScorePopup('⚡ GROUND SLAM!', bp3.x, bp3.y - 40, 0xff2222);
                        // Pre-shake to alert player
                        g.shakeTimer = Math.max(g.shakeTimer, 8);
                        playSound('explosion');
                    }
                }
            }
        } else {
            // === Normal enemy AI ===
            const af = getAdaptiveFactor();
            const speedMult = 1 + (af - 1) * 0.25;
            const mobileSpeedScale = _proj.isMobile ? 0.9 : 1.0;

            // L2 Engineer: shield cycle (3s active / 2s off per 5s period)
            if (e.type === L2_TYPE_PIG_ENGINEER) {
                e.shieldCycle = (e.shieldCycle || 0) + dt;
                e.shieldActive = (e.shieldCycle % 5000) < 2000;
            }

            // L2 Capybara: dash sprint — speed, duration, cooldown scale with wave
            if (e.type === L2_TYPE_PIG_HERO) {
                const capyDashDur = 700 + g.wave * 6;                        // 700ms → ~1200ms by w88
                const capyCooldown = Math.max(1200, 2500 - g.wave * 15);     // 2500ms → ~1200ms by w88
                if (e.isDashing) {
                    e.dashTimer -= dt;
                    if (e.dashTimer <= 0) { e.isDashing = false; e.dashCooldown = capyCooldown + Math.random() * 800; }
                } else {
                    e.dashCooldown = (e.dashCooldown || (capyCooldown * 0.6 + Math.random() * 800)) - dt;
                    if (e.dashCooldown <= 0) { e.isDashing = true; e.dashTimer = capyDashDur; }
                }
            }

            // L2 CowGun: periodic aimed shot — fire rate and projectile count scale with wave
            if (e.type === L2_TYPE_COW_GUN) {
                e.shootTimer = (e.shootTimer || (Math.random() * 180)) - dtF;
                if (e.shootTimer <= 0) {
                    const pz = g.cameraZ + 10;
                    const dx = g.player.x - e.x;
                    const dz = pz - e.z;
                    const dist = Math.sqrt(dx * dx + dz * dz) || 1;
                    const speed = 4.5 + g.wave * 0.05;
                    // Wave 30+: fire 2 bullets (spread), wave 60+: fire 3
                    const shotCount = g.wave >= 60 ? 3 : g.wave >= 30 ? 2 : 1;
                    for (let s = 0; s < shotCount; s++) {
                        const spread = (s - (shotCount - 1) / 2) * 0.18;
                        const angle = Math.atan2(dz, dx) + spread;
                        g.enemyBullets.push({
                            x: e.x, z: e.z,
                            vx: Math.cos(angle) * speed, vz: Math.sin(angle) * speed,
                            damage: e.damage, life: 260,
                            type: 'aimed', color: 0xffaa00,
                        });
                    }
                    e.shootTimer = Math.max(70, 220 - g.wave * 2);
                }
            }

            // L2 Elephant: dash — duration and cooldown scale with wave
            if (e.type === L2_TYPE_ELEPHANT) {
                const elDashDur = 500 + g.wave * 5;                          // 500ms → ~940ms by w88
                const elCooldown = Math.max(2000, 4000 - g.wave * 20);       // 4000ms → ~2000ms by w88
                if (e.isDashing) {
                    e.dashTimer -= dt;
                    if (e.dashTimer <= 0) { e.isDashing = false; e.dashCooldown = elCooldown + Math.random() * 1000; }
                } else {
                    e.dashCooldown = (e.dashCooldown || 3000) - dt;
                    if (e.dashCooldown <= 0) { e.isDashing = true; e.dashTimer = elDashDur; }
                }
                // Apply fire rate debuff if elephant is within threat range
                const elephantDist = e.z - (g.cameraZ + 10);
                if (elephantDist < CONFIG.SPAWN_DISTANCE * 0.5) {
                    g.fireRateDebuff = Math.max(g.fireRateDebuff, 2000);
                }
            }

            const capyDashSpeed = 5.5 + g.wave * 0.04;                      // 5.5× → ~9× by w88
            const dashSpeedMult = (e.type === L2_TYPE_ELEPHANT && e.isDashing) ? 4.0
                                : (e.type === L2_TYPE_PIG_HERO && e.isDashing) ? capyDashSpeed : 1.0;
            const baseSpeed = (CONFIG.ENEMY_SPEED + g.wave * CONFIG.ENEMY_SPEED_WAVE_SCALE) * speedMult * g.slowMoFactor * mobileSpeedScale * dashSpeedMult;
            const baseLateral = (CONFIG.ENEMY_LATERAL_SPEED + g.wave * CONFIG.ENEMY_LATERAL_WAVE_SCALE) * mobileSpeedScale;
            const distToPlayer = e.z - playerZ; // positive = ahead of player

            // Assign a fixed X-slot when entering crowd range (so enemies spread naturally)
            if (e.meleeOffsetX === undefined && distToPlayer < 90) {
                e.meleeOffsetX = (Math.random() - 0.5) * 36;
            }
            const inCrowd = distToPlayer < 90;

            // CowGun: stop at standoff distance and shoot; only advance if too far
            const cowGunStopDist = 160 + (e.meleeOffsetX !== undefined ? 0 : 0); // hold at ~160 units
            if (e.type === L2_TYPE_COW_GUN && distToPlayer <= cowGunStopDist) {
                // Strafe slowly left/right while holding position
                if (!e.strafeDir) e.strafeDir = Math.random() < 0.5 ? 1 : -1;
                e.strafeTimer = (e.strafeTimer || 0) - dt;
                if (e.strafeTimer <= 0) { e.strafeDir *= -1; e.strafeTimer = 1200 + Math.random() * 800; }
                e.x += e.strafeDir * baseLateral * 0.6 * dtF;
                e.x = Math.max(-CONFIG.ROAD_HALF_WIDTH * 0.8, Math.min(CONFIG.ROAD_HALF_WIDTH * 0.8, e.x));
            } else {
            // Forward movement: always continues (no Z snap), slight rush in crowd range
            e.z -= baseSpeed * (inCrowd ? 1.12 : 1.0) * dtF;

            // Lateral tracking — triple speed in crowd range, ignores blocking to break through
            const targetX = g.player.x + (inCrowd ? (e.meleeOffsetX || 0) : 0);
            const lateralDx = targetX - e.x;
            if (Math.abs(lateralDx) > 5) {
                if (inCrowd) {
                    // Aggressive homing: ignore blocking, strongly converge on player X slot
                    e.x += Math.sign(lateralDx) * baseLateral * 3.5 * dtF;
                } else {
                    const blocked = g.enemies.some(o => o !== e && o.alive && Math.abs(o.x - e.x) < 35 && o.z < e.z && o.z > e.z - 60);
                    if (!blocked) e.x += Math.sign(lateralDx) * baseLateral * dtF;
                }
            }
            } // end cow_gun standoff else
        } // end Normal enemy AI else
        e.x = Math.max(-CONFIG.ROAD_HALF_WIDTH + 10, Math.min(CONFIG.ROAD_HALF_WIDTH - 10, e.x));
        // Enemy reaches player — natural walk-up, no timer needed
        const dzToPlayer = e.z - playerZ;
        const dxToPlayer = Math.abs(e.x - g.player.x);
        const closeContact = !e.isBoss && dzToPlayer < 10 && dzToPlayer > -25 && dxToPlayer < 80;
        const passedThrough = e.z <= g.cameraZ - 20;
        if (closeContact || passedThrough) {
            // Enemy reaches/passes player — die and cost squad based on enemy damage
            e.alive = false;
            if (g.state !== 'gameover') {
                if (g.shieldActive) {
                    // invincible: deflect effect, no troop loss
                    addParticles(e.x, e.z, 10, 0xffdd44, 3, 12);
                } else {
                const dmg = applyTroopDamage(g, e.damage || 1);
                if (bossAlive) g.squadLostDuringBoss = (g.squadLostDuringBoss || 0) + dmg;
                emitTroopLossEffects(g, dmg, 0xff3333);
                if (g.squadCount <= 0) { handlePlayerDeath(); }
                } // end else (not invincible)
            }
        }
    });

    // Enemy bullets (boss projectiles)
    g.enemyBullets.forEach(eb => {
        eb.x += eb.vx * g.slowMoFactor * dtF;
        eb.z += eb.vz * g.slowMoFactor * dtF;
        eb.life -= dtF;
        if (eb.life <= 0) { eb.dead = true; return; }
        // Off-screen cleanup — far-z must cover BOSS_HOLD_Z, else boss
        // bullets die the instant they spawn.
        const relZ = eb.z - g.cameraZ;
        const farCull = Math.max(CONFIG.SPAWN_DISTANCE, CONFIG.BOSS_HOLD_Z) + 100;
        if (relZ < -50 || relZ > farCull ||
            Math.abs(eb.x) > CONFIG.ROAD_HALF_WIDTH + 50) {
            eb.dead = true; return;
        }
        // Lava drip trail particles (moved from render to avoid frame-rate dependent spawn)
        if (eb.type === 'lava' && Math.random() < 0.5) {
            g.particles.push({
                x: eb.x + (Math.random() - 0.5) * 5, z: eb.z,
                vx: (Math.random() - 0.5) * 0.6, vz: 0.08,
                vy: -0.5 - Math.random() * 0.6, y: 0,
                life: 5 + Math.random() * 5, maxLife: 10,
                color: Math.random() < 0.5 ? 0xff4400 : 0xffaa00,
                size: 2 + Math.random() * 2.5,
            });
        }
        // Flame trail particles (moved from render)
        if (eb.type === 'flame' && Math.random() < 0.3) {
            g.particles.push({
                x: eb.x + (Math.random() - 0.5) * 4, z: eb.z,
                vx: (Math.random() - 0.5) * 0.5, vz: 0.1,
                vy: -0.8 - Math.random() * 0.4, y: 0,
                life: 6 + Math.random() * 4, maxLife: 10,
                color: Math.random() < 0.5 ? 0xff6600 : 0xffaa00,
                size: 1.5 + Math.random() * 2,
            });
        }
        // Hit player?
        const pz = g.cameraZ + 10;
        if (Math.abs(eb.z - pz) < 18 && Math.abs(eb.x - g.player.x) < 30) {
            eb.dead = true;
            if (g.state !== 'gameover') {
                if (g.shieldActive) {
                    // invincible: deflect effect, no troop loss
                    addParticles(g.player.x, pz, 10, 0xffdd44, 3, 12);
                    g.shakeTimer = Math.min(g.shakeTimer, 3);
                } else {
                // Dodge (Miss) chance: base 7.5%, +0.25% per player level above 1, no hard cap
                // Lucky Break talent applies as a multiplier; level + luck together determine final chance
                const dodgeChance = (0.075 + ((g.level || 1) - 1) * 0.0025) * getTalentLuckMult();
                if (Math.random() < dodgeChance) {
                    // Dodged! MISS visual effects
                    const missColor = 0xaaaaaa;
                    const mp = project(g.player.x, 0);
                    g.gateText = { text: 'MISS', color: missColor, timer: 0, maxTimer: 60, scale: 0.1 };
                    g.gateFlash = { color: missColor, timer: 8, maxTimer: 8 };
                    emitShatterPieces(g, mp.x, mp.y, 10, missColor, { radius: 130, spdVar: 4, sizeBase: 1.5, sizeVar: 2.5, spreadX: 30, spreadY: 20, lifeBase: 12, lifeVar: 10, maxLife: 22 });
                    emitSpeedLines(g, mp.x, mp.y, 10, missColor, { spdBase: 4, spdVar: 4, lifeBase: 7, lifeVar: 5, lenBase: 12, lenVar: 15 });
                    addDamageNumber(g.player.x + (Math.random() - 0.5) * 25, pz, 'MISS', missColor);
                    addParticles(g.player.x, pz, 8, missColor, 2.5, 12);
                    g.shakeTimer = Math.min(g.shakeTimer + 3, 5);
                } else {
                const dmg = applyTroopDamage(g, eb.damage || 1);
                g.squadLostDuringBoss = (g.squadLostDuringBoss || 0) + dmg; // boss bullets always count
                emitTroopLossEffects(g, dmg, 0xff3333, { shatterCount: 10, shatterPerDmg: 3, lineCount: 12, flashTimer: 12, shakeMax: 15, shakeBase: 6, vignetteBase: 0.6 });
                if (g.squadCount <= 0) { handlePlayerDeath(); }
                } // end else (not dodged)
                } // end else (not invincible)
            }
        }
    });
    g.enemyBullets = g.enemyBullets.filter(eb => !eb.dead);
    // Cap enemy bullets to prevent performance freeze during multi-boss fights
    const ebLimit = _proj.isMobile ? 80 : 200;
    if (g.enemyBullets.length > ebLimit) g.enemyBullets.splice(0, g.enemyBullets.length - Math.floor(ebLimit * 0.7));
}
