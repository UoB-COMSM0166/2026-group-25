function update(dt) {
    const g = game;
    if (g.state !== 'playing') return;
    // Normalized time factor: 1.0 at 60 FPS, 2.0 at 30 FPS.
    // Capped at 50ms to prevent teleportation when tab regains focus.
    const dtF = Math.min(dt, 50) / 16.667;

    // Keyboard
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) g.inputX = g.player.x - CONFIG.PLAYER_SPEED * 10;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) g.inputX = g.player.x + CONFIG.PLAYER_SPEED * 10;

    // Slow-mo processing
    if (g.slowMo > 0) {
        g.slowMo -= dt;
        g.slowMoFactor = 0.3;
    } else {
        g.slowMoFactor = 1.0;
    }

    // Camera: slow down during boss fight but keep moving (so player can still reach gates/weapons)
    const bossAlive = g.enemies.some(e => e.alive && e.isBoss);
    const cameraSpeedMult = bossAlive ? 0.4 : 1.0; // 40% speed during boss fight
    g.cameraZ += CONFIG.CAMERA_SPEED * g.slowMoFactor * cameraSpeedMult * dtF;

    if (g.inputX !== null) {
        g.player.x += (g.inputX - g.player.x) * Math.min(1, 0.12 * dtF);
    }
    g.player.x = Math.max(-CONFIG.ROAD_HALF_WIDTH + 15, Math.min(CONFIG.ROAD_HALF_WIDTH - 15, g.player.x));

    g.player.animFrame += 0.3 * dtF;
    g.player.muzzleFlash = Math.max(0, g.player.muzzleFlash - dtF);

    // Gate weapon timer: gate weapons temporarily override pistol
    if (g.weaponTimer > 0) {
        g.weaponTimer -= dt;
        if (g.weaponTimer <= 0) {
            g.weaponTimer = 0;
            g.weapon = 'pistol'; // return to default pistol
        }
    }

    // Shield (invincibility) timer — independent
    if (g.shieldActive && g.shieldTimer > 0) {
        g.shieldTimer -= dt;
        if (g.shieldTimer <= 0) {
            g.shieldActive = false;
            g.shieldTimer = 0;
        }
    }

    // Invincibility cooldown timer
    if (g.skillCooldown > 0) {
        g.skillCooldown -= dt;
        if (g.skillCooldown <= 0) {
            g.skillCooldown = 0;
            g.skillReady = ((playerData.weaponCharges || {})['invincibility'] || 0) > 0;
        }
    }

    // Stimulant timer — independent
    if (g.stimulantActive && g.stimulantTimer > 0) {
        g.stimulantTimer -= dt;
        if (g.stimulantTimer <= 0) {
            g.stimulantActive = false;
            g.stimulantTimer = 0;
            g.stimulantCooldown = 8000;
            g.gateText = { text: '💚 STIMULANT ENDED', color: 0x44ff88, timer: 0, maxTimer: 60, scale: 0.08 };
        }
    }
    if (g.stimulantCooldown > 0) {
        g.stimulantCooldown -= dt;
        if (g.stimulantCooldown <= 0) g.stimulantCooldown = 0;
    }

    // L2 fire rate debuff (from nearby Elephant)
    if (g.fireRateDebuff > 0) {
        g.fireRateDebuff -= dt;
        if (g.fireRateDebuff < 0) g.fireRateDebuff = 0;
    }

    // Auto-shoot
    g.shootTimer -= dt;
    const fireWeapon_ = g.weapon;
    const fireRateDebuffMult = g.fireRateDebuff > 0 ? 1.3 : 1.0;
    const fireInterval = (fireWeapon_ === 'pistol' ? 90 : CONFIG.SHOOT_INTERVAL * WEAPON_DEFS[fireWeapon_].fireRateMult) * getTalentFireRateMult() * getLevelFireRateMult() * fireRateDebuffMult;
    if (g.shootTimer <= 0) { g.shootTimer = fireInterval; fireWeapon(); }

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
    g.bullets = g.bullets.filter(b => {
        if (b.dead) return false;
        if (b.z - g.cameraZ > CONFIG.SPAWN_DISTANCE + 100 || b.z < g.cameraZ - 10) return false;
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
                // Shotgun falloff: close range bonus, far range penalty
                // ≤50: 400%, 50~150: 400%→100%, 150~500: 100%→25%
                let hitDmg = b.damage || 1;
                if (b.falloff) {
                    const travelDist = b.z - b.startZ;
                    let mult;
                    if (travelDist <= 50) {
                        mult = 4.0;
                    } else if (travelDist <= 150) {
                        mult = 4.0 - (travelDist - 50) / 100 * 3.0; // 4.0 → 1.0
                    } else {
                        mult = Math.max(0.25, 1.0 - (travelDist - 150) / 350 * 0.75);
                    }
                    hitDmg = Math.max(1, Math.round(hitDmg * mult));
                }
                e.hp -= hitDmg;
                e.hitFlash = 4;
                // Throttle hit sound to once per frame (max shotgun = 16 hits/frame)
                if (!hitSoundedThisFrame) { playSound('hit'); hitSoundedThisFrame = true; }
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
                                const ksBase = other.isMegaBoss ? 300 : other.isBoss ? 100 : (L2_KILL_SCORES[other.type] || (other.isHeavy ? 25 : 10));
                                const ks = Math.ceil(ksBase * (LEVEL_CONFIGS[g.currentLevel] ? LEVEL_CONFIGS[g.currentLevel].scoreMultiplier : 1));
                                other.alive = false; g.score += ks; g.killCount++;
                                addExplosion(other.x, other.z);
                                g.deadBodies.push({ x: other.x, z: other.z, timer: 300 });
                                if (!other.isBoss) awardKillXP(g, other.isHeavy);
                                if (other.isBoss) {
                            spawnBossCoins(other.x, other.z); spawnBossGems(other.x, other.z);
                            if (other.isMegaBoss) spawnBossCoins(other.x, other.z); // mega boss double coins
                            awardBossExp(other.isMegaBoss, other.x, other.z);
                            const stillBossAlive = g.enemies.some(o => o !== other && o.alive && o.isBoss);
                            if (!stillBossAlive) {
                                g.enemyBullets = [];
                                if (other.isMegaBoss) g.midShopTimer = 90;
                            }
                        }
                            }
                        }
                    });
                } else { b.dead = true; }

                if (e.hp <= 0) {
                    const killScoreBase = e.isMegaBoss ? 300 : e.isBoss ? 100 : (L2_KILL_SCORES[e.type] || (e.isHeavy ? 25 : 10));
                    const killScore = Math.ceil(killScoreBase * (LEVEL_CONFIGS[g.currentLevel] ? LEVEL_CONFIGS[g.currentLevel].scoreMultiplier : 1));
                    e.alive = false; g.score += killScore; g.killCount++;
                    g.comboCount++; g.comboTimer = CONFIG.COMBO_TIMEOUT;
                    if (g.comboCount > g.bestCombo) g.bestCombo = g.comboCount;
                    addExplosion(e.x, e.z);
                    g.deadBodies.push({ x: e.x, z: e.z, timer: 300 });
                    playSound('explosion');
                    const ep = project(e.x, e.z - g.cameraZ);
                    if (e.isMegaBoss) {
                        // Mega boss death: massive explosion cascade
                        for (let mi = 0; mi < 5; mi++) {
                            addExplosion(e.x + (Math.random() - 0.5) * 60, e.z + (Math.random() - 0.5) * 60);
                        }
                        addParticles(e.x, e.z, 60, 0xff4400, 8, 45);
                        addParticles(e.x, e.z, 30, 0xffaa00, 6, 35);
                        addParticles(e.x, e.z, 20, 0xffffff, 5, 25);
                        g.shakeTimer = 35; g.screenFlash = 0.9;
                        g.slowMo = 400;
                        addScorePopup(`${e.isElephantBoss ? '🐘 ELEPHANT KING' : '🔥 MEGA BOSS'} +${killScore}!`, ep.x, ep.y - 40, 0xff4400);
                        // Extra loot — more coins and guaranteed gems
                        spawnBossCoins(e.x, e.z);
                        spawnBossCoins(e.x, e.z); // double coins
                        spawnBossGems(e.x, e.z);
                        awardBossExp(true, e.x, e.z);
                        const otherBossAlive = g.enemies.some(o => o !== e && o.alive && o.isBoss);
                        if (!otherBossAlive) {
                            g.enemyBullets = [];
                            g.midShopTimer = 90; // open shop after effects
                        }
                    } else if (e.isBoss) {
                        // Boss death: big explosion + extra particles + strong shake
                        addExplosion(e.x + 20, e.z + 15);
                        addExplosion(e.x - 20, e.z - 15);
                        addParticles(e.x, e.z, 40, 0xcc66ff, 6, 35);
                        addParticles(e.x, e.z, 20, 0xffffff, 4, 25);
                        g.shakeTimer = 25; g.screenFlash = 0.6;
                        addScorePopup(`${e.isCowCryBoss ? '🎵 CRY COW' : 'BOSS DRAGON'} +${killScore}!`, ep.x, ep.y - 30, e.isCowCryBoss ? 0xff9944 : 0xcc66ff);
                        // Drop coins + gems per boss
                        spawnBossCoins(e.x, e.z);
                        spawnBossGems(e.x, e.z);
                        awardBossExp(false, e.x, e.z);
                        // Only clear bullets when the LAST boss dies
                        const otherBossAlive = g.enemies.some(o => o !== e && o.alive && o.isBoss);
                        if (!otherBossAlive) g.enemyBullets = [];
                    } else {
                        g.shakeTimer = 5;
                        addScorePopup(`+${killScore}`, ep.x, ep.y - 20, e.isHeavy ? 0xff8800 : 0xffcc00);
                        awardKillXP(g, e.isHeavy);
                        // L2 Pig Hero: splits into 2 minis on death
                        if (e.type === L2_TYPE_PIG_HERO && !e.isMini) {
                            spawnMiniEnemies(e, 2);
                        }
                    }
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
    });
    g.bullets = g.bullets.filter(b => !b.dead);

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
                const rawDmg = e.damage || 1;
                // more troops = higher defense: +1 reduction per 15 troops, max +2
                const squadArmor = Math.floor(g.squadCount / 15);
                const baseDmg = Math.max(1, rawDmg - (playerData.armor || 0) - squadArmor);
                const dmg = g.stimulantActive ? Math.ceil(baseDmg / 2) : baseDmg;
                g.squadCount = Math.max(0, g.squadCount - dmg);
                if (bossAlive) g.squadLostDuringBoss = (g.squadLostDuringBoss || 0) + dmg;

                // --- Troop loss visual effects (mirror of gate "+TROOPS" effect) ---
                const lossColor = 0xff3333;

                // 1. Big floating text: "-X TROOPS"
                g.gateText = { text: `−${dmg} TROOPS`, color: lossColor, timer: 0, maxTimer: 70, scale: 0.1 };

                // 2. Screen red flash
                g.gateFlash = { color: lossColor, timer: 15, maxTimer: 15 };

                // 3. Red shatter pieces flying outward from player
                const playerP = project(g.player.x, 0);
                for (let f = 0; f < 15 + dmg * 5; f++) {
                    const angle = Math.random() * Math.PI * 2;
                    const spd = 3 + Math.random() * 5;
                    g.gateShatterPieces.push({
                        x: playerP.x + (Math.random() - 0.5) * 40,
                        y: playerP.y + (Math.random() - 0.5) * 30,
                        targetX: playerP.x + Math.cos(angle) * 200,
                        targetY: playerP.y + Math.sin(angle) * 200,
                        vx: Math.cos(angle) * spd,
                        vy: Math.sin(angle) * spd,
                        size: 2 + Math.random() * 4,
                        color: lossColor,
                        life: 20 + Math.random() * 15,
                        maxLife: 35,
                    });
                }

                // 4. Red speed lines radiating from player
                for (let s = 0; s < 16; s++) {
                    const angle = (s / 16) * Math.PI * 2;
                    const spd = 6 + Math.random() * 6;
                    g.speedLines.push({
                        x: playerP.x, y: playerP.y,
                        vx: Math.cos(angle) * spd,
                        vy: Math.sin(angle) * spd,
                        life: 10 + Math.random() * 8,
                        maxLife: 18,
                        length: 20 + Math.random() * 25,
                        color: lossColor,
                    });
                }

                // 5. Explosion particles + shake + vignette
                addParticles(e.x, e.z, 8 + dmg * 2, 0xff0000, 2.5, 18);
                g.shakeTimer = Math.min(20, 8 + dmg * 3);
                g.vignetteFlash = Math.min(1.5, 0.8 + dmg * 0.15);
                g.slowMo = 150;
                playSound('explosion');
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
        // Off-screen cleanup
        const relZ = eb.z - g.cameraZ;
        if (relZ < -50 || relZ > CONFIG.SPAWN_DISTANCE + 100 ||
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
                    // Dodged! Full MISS visual effects (mirrors squad loss effect)
                    const missColor = 0xaaaaaa;
                    const mp = project(g.player.x, 0);
                    // 1. Big floating MISS text
                    g.gateText = { text: 'MISS', color: missColor, timer: 0, maxTimer: 60, scale: 0.1 };
                    // 2. Brief cyan screen flash
                    g.gateFlash = { color: missColor, timer: 8, maxTimer: 8 };
                    // 3. Cyan shatter pieces flying outward
                    for (let f = 0; f < 10; f++) {
                        const a = Math.random() * Math.PI * 2;
                        const spd = 3 + Math.random() * 4;
                        g.gateShatterPieces.push({
                            x: mp.x + (Math.random() - 0.5) * 30,
                            y: mp.y + (Math.random() - 0.5) * 20,
                            targetX: mp.x + Math.cos(a) * 130,
                            targetY: mp.y + Math.sin(a) * 130,
                            vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
                            size: 1.5 + Math.random() * 2.5, color: missColor,
                            life: 12 + Math.random() * 10, maxLife: 22,
                        });
                    }
                    // 4. Speed lines radiating outward
                    for (let s = 0; s < 10; s++) {
                        const a = (s / 10) * Math.PI * 2;
                        g.speedLines.push({
                            x: mp.x, y: mp.y,
                            vx: Math.cos(a) * (4 + Math.random() * 4),
                            vy: Math.sin(a) * (4 + Math.random() * 4),
                            life: 7 + Math.random() * 5, maxLife: 12,
                            length: 12 + Math.random() * 15, color: missColor,
                        });
                    }
                    // 5. Floating MISS number + particles + micro-shake
                    addDamageNumber(g.player.x + (Math.random() - 0.5) * 25, pz, 'MISS', missColor);
                    addParticles(g.player.x, pz, 8, missColor, 2.5, 12);
                    g.shakeTimer = Math.min(g.shakeTimer + 3, 5);
                } else {
                const rawDmg = eb.damage || 1;
                // more troops = higher defense: +1 reduction per 15 troops, max +2
                const squadArmor = Math.floor(g.squadCount / 15);
                const baseDmg = Math.max(1, rawDmg - (playerData.armor || 0) - squadArmor);
                const dmg = g.stimulantActive ? Math.ceil(baseDmg / 2) : baseDmg;
                g.squadCount = Math.max(0, g.squadCount - dmg);
                g.squadLostDuringBoss = (g.squadLostDuringBoss || 0) + dmg; // boss bullets always count
                const hitColor = 0xff3333;
                g.gateText = { text: `−${dmg} TROOPS`, color: hitColor, timer: 0, maxTimer: 70, scale: 0.1 };
                g.gateFlash = { color: hitColor, timer: 12, maxTimer: 12 };
                const pp = project(g.player.x, 0);
                for (let f = 0; f < 10 + dmg * 3; f++) {
                    const a = Math.random() * Math.PI * 2;
                    g.gateShatterPieces.push({
                        x: pp.x + (Math.random() - 0.5) * 30,
                        y: pp.y + (Math.random() - 0.5) * 20,
                        targetX: pp.x + Math.cos(a) * 150,
                        targetY: pp.y + Math.sin(a) * 150,
                        vx: Math.cos(a) * (3 + Math.random() * 4),
                        vy: Math.sin(a) * (3 + Math.random() * 4),
                        size: 2 + Math.random() * 3, color: hitColor,
                        life: 15 + Math.random() * 12, maxLife: 27,
                    });
                }
                for (let s = 0; s < 12; s++) {
                    const a = (s / 12) * Math.PI * 2;
                    g.speedLines.push({
                        x: pp.x, y: pp.y,
                        vx: Math.cos(a) * (5 + Math.random() * 5),
                        vy: Math.sin(a) * (5 + Math.random() * 5),
                        life: 8 + Math.random() * 6, maxLife: 14,
                        length: 15 + Math.random() * 20, color: hitColor,
                    });
                }
                addParticles(g.player.x, pz, 6 + dmg, 0xff4444, 2, 12);
                g.shakeTimer = Math.min(15, 6 + dmg * 2);
                g.vignetteFlash = Math.min(1.2, 0.6 + dmg * 0.1);
                playSound('explosion');
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

    // Gate collision
    g.gates.forEach(gate => {
        if (gate.triggered && gate.fadeTimer > 0) { gate.fadeTimer--; return; }
        if (gate.triggered) return;
        const relZ = gate.z - g.cameraZ;
        if (relZ <= 8 && relZ > -25) {
            for (let i = 0; i < gate.options.length; i++) {
                const opt = gate.options[i];
                const xMargin = 12; // extra forgiving margin on each side
                if (g.player.x > opt.x - opt.width / 2 - xMargin && g.player.x < opt.x + opt.width / 2 + xMargin) {
                    gate.triggered = true; gate.fadeTimer = 60; gate.chosenIdx = i;

                    // Determine flash color and text
                    let flashColor, floatingText;
                    if (opt.gateType === 'weapon') {
                        flashColor = 0xffd700;
                        floatingText = opt.weapon.toUpperCase() + '!';
                        g.weapon = opt.weapon;
                        g.weaponTimer = WEAPON_DEFS[opt.weapon].duration * 1000;
                        playSound('weapon_pickup');
                    } else {
                        const op = opt.op || '+';
                        const oldSquad = g.squadCount;
                        g.squadCount = applyTroopGateOp(g.squadCount, op, opt.value);
                        if (g.squadCount > g.peakSquad) g.peakSquad = g.squadCount;
                        const diff = g.squadCount - oldSquad;
                        // Show actual gain/loss
                        if (diff >= 0) {
                            flashColor = (op === '×') ? 0x44ddff : (op === '+%') ? 0x30dd80 : 0x4488ff;
                            floatingText = `+${diff} TROOPS!`;
                            playSound('gate_good');
                        } else {
                            flashColor = (op === '÷') ? 0xff8800 : (op === '-%') ? 0xe06070 : 0xff3333;
                            floatingText = `${diff} TROOPS`;
                            playSound('gate_bad');
                        }
                    }

                    // 1. Screen-wide colored flash
                    g.gateFlash = { color: flashColor, timer: 20, maxTimer: 20 };

                    // 2. Shatter chosen panel into pixel fragments toward player
                    const chosenP = project(opt.x, Math.max(1, relZ));
                    const playerP = project(g.player.x, 0);
                    for (let f = 0; f < 35; f++) {
                        g.gateShatterPieces.push({
                            x: chosenP.x + (Math.random() - 0.5) * 100,
                            y: chosenP.y + (Math.random() - 0.5) * 80,
                            targetX: playerP.x, targetY: playerP.y,
                            vx: (Math.random() - 0.5) * 6,
                            vy: (Math.random() - 0.5) * 6,
                            size: 3 + Math.random() * 6,
                            color: flashColor,
                            life: 30 + Math.random() * 20,
                            maxLife: 50,
                        });
                    }

                    // 3. Big floating text
                    g.gateText = { text: floatingText, color: flashColor, timer: 0, maxTimer: 90, scale: 0.1 };

                    // 4. Unchosen panels crack and collapse
                    gate.options.forEach((otherOpt, otherIdx) => {
                        if (otherIdx === i) return;
                        const otherP = project(otherOpt.x, Math.max(1, relZ));
                        g.gateCollapsePanels.push({
                            sx: otherP.x, sy: otherP.y - 80 * otherP.scale,
                            w: 100 * otherP.scale, h: 80 * otherP.scale,
                            vy: 0, rotAngle: 0,
                            rotSpeed: (Math.random() - 0.5) * 0.12,
                            life: 45, maxLife: 45,
                            color: otherOpt.gateType === 'weapon' ? 0xd4a020
                                : otherOpt.value > 0 ? 0x2098e0 : 0xd03030,
                            crackProgress: 0,
                        });
                    });

                    // 5. Strong camera shake
                    g.shakeTimer = Math.max(g.shakeTimer, 18);

                    // 6. Slow-mo effect
                    g.slowMo = 250;

                    // 7. Speed lines radiating from center
                    for (let s = 0; s < 28; s++) {
                        const angle = (s / 28) * Math.PI * 2;
                        const spd = 8 + Math.random() * 8;
                        g.speedLines.push({
                            x: screenW / 2, y: screenH * 0.45,
                            vx: Math.cos(angle) * spd,
                            vy: Math.sin(angle) * spd,
                            life: 12 + Math.random() * 12,
                            maxLife: 24,
                            length: 25 + Math.random() * 35,
                            color: flashColor,
                        });
                    }

                    // Original particles too
                    addParticles(opt.x, gate.z, 25, flashColor, 5, 30);
                    addParticles(g.player.x, g.cameraZ, 12, 0xffffff, 3, 20);

                    break;
                }
            }
            if (!gate.triggered && relZ < -8) { gate.triggered = true; gate.fadeTimer = 0; }
        }
    });

    // Spawning — blocked while boss is alive (must defeat boss before next wave)
    if (!bossAlive && g.cameraZ + CONFIG.SPAWN_DISTANCE > g.nextWaveZ) {
        spawnEnemyWave();
        if (Math.random() > 0.55) spawnBarrels();
        g.wave++;
        // Boss waves — L1 uses dragon bosses, L2 uses cow cry / elephant
        // Wave 66: final wave of L1 — spawn two mega bosses side by side
        // Wave 88: final wave of L2 — spawn two elephant bosses side by side
        if (g.wave === 66 && g.currentLevel === 1) {
            g.preBossSquad = g.squadCount;
            g.squadLostDuringBoss = 0;
            const xOff = CONFIG.ROAD_HALF_WIDTH * 0.45;
            spawnMegaBoss(g.nextWaveZ - 80, -xOff);
            spawnMegaBoss(g.nextWaveZ - 80,  xOff);
        } else if (g.wave === 88 && g.currentLevel === 2) {
            g.preBossSquad = g.squadCount;
            g.squadLostDuringBoss = 0;
            const xOff = CONFIG.ROAD_HALF_WIDTH * 0.45;
            spawnElephantBoss(g.nextWaveZ - 80, -xOff);
            spawnElephantBoss(g.nextWaveZ - 80,  xOff);
        } else if (g.wave % 10 === 0) {
            g.preBossSquad = g.squadCount;
            g.squadLostDuringBoss = 0;
            if (g.currentLevel === 2) spawnElephantBoss(g.nextWaveZ - 80);
            else spawnMegaBoss(g.nextWaveZ - 80);
        } else if (g.wave % 5 === 0) {
            g.preBossSquad = g.squadCount;
            g.squadLostDuringBoss = 0;
            if (g.currentLevel === 2) spawnCowCryBoss(g.nextWaveZ - 80);
            else spawnBoss(g.nextWaveZ - 80);
        }
        g.waveBanner = { wave: g.wave, timer: 0, maxTimer: CONFIG.WAVE_BANNER_DURATION };
        playSound('wave_start');
    }
    if (g.cameraZ + CONFIG.SPAWN_DISTANCE > g.nextGateZ) spawnGate();

    // Barrel chain reaction timers
    g.barrels.forEach(br => {
        if (!br.alive || br.chainTimer < 0) return;
        if (br.chainTimer > 0) { br.chainTimer -= dtF; }
        else if (br.chainTimer === 0) { br.chainTimer = -1; explodeBarrel(br); }
    });

    // Barrel smoke/sparks for damaged barrels
    g.barrels.forEach(br => {
        if (!br.alive || br.hp >= br.maxHp) return;
        br.smokeTimer++;
        if (br.smokeTimer % 6 === 0) {
            g.particles.push({
                x: br.x + (Math.random() - 0.5) * 10, z: br.z,
                vx: (Math.random() - 0.5) * 0.5, vz: 0,
                vy: -1.0 - Math.random() * 0.5, y: 0,
                life: 18 + Math.random() * 10, maxLife: 28,
                color: 0x555555, size: 3 + Math.random() * 3,
            });
        }
        if (br.smokeTimer % 10 === 0) {
            g.particles.push({
                x: br.x + (Math.random() - 0.5) * 8, z: br.z,
                vx: (Math.random() - 0.5) * 2, vz: (Math.random() - 0.5),
                vy: -2.5 - Math.random() * 2, y: 0,
                life: 8 + Math.random() * 5, maxLife: 13,
                color: 0xff8800, size: 1 + Math.random() * 2,
            });
        }
    });

    // Coin physics + pickup
    const playerZ = g.cameraZ + 10;
    g.coins.forEach(coin => {
        // Physics: scatter then settle
        coin.x += coin.vx * dtF;
        coin.z += coin.vz * dtF;
        coin.y += coin.vy * dtF;
        coin.vy += 0.25 * dtF; // gravity
        if (coin.y > 0) { coin.y = 0; coin.vy = -coin.vy * 0.3; coin.vx *= 0.8; coin.vz *= 0.8; }
        coin.vx *= 0.97; coin.vz *= 0.97;
        coin.bobPhase += 0.08 * dtF;
        coin.life -= dtF;
        // Magnet: pull toward player
        const dx = g.player.x - coin.x;
        const dz = playerZ - coin.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (coin.y >= 0) {
            // Landed: home in directly on player
            coin.x += dx * 0.2;
            coin.z += dz * 0.2;
        } else if (dist < COIN_MAGNET_RANGE) {
            const pull = 0.15 * (1 - dist / COIN_MAGNET_RANGE);
            coin.x += dx * pull;
            coin.z += dz * pull;
        }
        // Pickup
        if (dist < 25) {
            coin.collected = true;
            g.coinsCollected += coin.value;
            playerData.coins += coin.value;
            markPlayerDataDirty();
            // Pickup effect — golden burst with speed lines
            const cp = project(coin.x, coin.z - g.cameraZ);
            addScorePopup(`🪙+${coin.value}`, cp.x, cp.y - 20, 0xffd700);
            addParticles(coin.x, coin.z, 14, 0xffd700, 4, 18);
            addParticles(coin.x, coin.z, 6, 0xffffff, 3, 10);
            addParticles(coin.x, coin.z, 4, 0xffaa00, 2, 12);
            // Speed lines radiating from pickup point
            for (let s = 0; s < 8; s++) {
                const a = (s / 8) * Math.PI * 2;
                g.speedLines.push({
                    x: cp.x, y: cp.y,
                    vx: Math.cos(a) * (4 + Math.random() * 3),
                    vy: Math.sin(a) * (4 + Math.random() * 3),
                    life: 6 + Math.random() * 4, maxLife: 10,
                    length: 12 + Math.random() * 10, color: 0xffd700,
                });
            }
            g.screenFlash = Math.max(g.screenFlash, 0.12);
            g.shakeTimer = Math.max(g.shakeTimer, 3);
            // Big floating text like troop change
            g.gateText = { text: `🪙 +${coin.value} COINS`, color: 0xffd700, timer: 0, maxTimer: 60, scale: 0.1 };
            g.gateFlash = { color: 0xffd700, timer: 10, maxTimer: 10 };
            playSound('gate_good');
        }
    });
    g.coins = g.coins.filter(c => !c.collected && c.life > 0);

    // Gem physics + pickup
    const GEM_MAGNET_RANGE = 120;
    g.gems.forEach(gem => {
        gem.x += gem.vx * dtF;
        gem.z += gem.vz * dtF;
        gem.y += gem.vy * dtF;
        gem.vy += 0.25 * dtF;
        if (gem.y > 0) { gem.y = 0; gem.vy = -gem.vy * 0.25; gem.vx *= 0.75; gem.vz *= 0.75; }
        gem.vx *= 0.97; gem.vz *= 0.97;
        gem.bobPhase += 0.06 * dtF;
        gem.life -= dtF;
        const gdx = g.player.x - gem.x;
        const gdz = playerZ - gem.z;
        const gdist = Math.sqrt(gdx * gdx + gdz * gdz);
        if (gem.y >= 0) {
            // Landed: home in directly on player
            gem.x += gdx * 0.2;
            gem.z += gdz * 0.2;
        } else if (gdist < GEM_MAGNET_RANGE) {
            const pull = 0.12 * (1 - gdist / GEM_MAGNET_RANGE);
            gem.x += gdx * pull;
            gem.z += gdz * pull;
        }
        if (gdist < 25) {
            gem.collected = true;
            g.gemsCollected += gem.value;
            playerData.gems = (playerData.gems || 0) + gem.value;
            markPlayerDataDirty();
            // Pickup effect — purple explosion with blast ring + speed lines
            const gp = project(gem.x, gem.z - g.cameraZ);
            addScorePopup(`💎+${gem.value}`, gp.x, gp.y - 25, 0xcc44ff);
            addParticles(gem.x, gem.z, 20, 0xaa22ff, 5, 25);
            addParticles(gem.x, gem.z, 10, 0xffffff, 4, 12);
            addParticles(gem.x, gem.z, 8, 0xcc88ff, 6, 18);
            addParticles(gem.x, gem.z, 4, 0xff44ff, 3, 15);
            // Speed lines radiating from pickup — more dramatic
            for (let s = 0; s < 16; s++) {
                const a = (s / 16) * Math.PI * 2;
                const spd = 5 + Math.random() * 5;
                g.speedLines.push({
                    x: gp.x, y: gp.y,
                    vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
                    life: 8 + Math.random() * 6, maxLife: 14,
                    length: 18 + Math.random() * 15, color: 0xcc44ff,
                });
            }
            // Shatter pieces flying outward
            for (let f = 0; f < 12; f++) {
                const a = Math.random() * Math.PI * 2;
                g.gateShatterPieces.push({
                    x: gp.x + (Math.random() - 0.5) * 20,
                    y: gp.y + (Math.random() - 0.5) * 15,
                    targetX: gp.x + Math.cos(a) * 150,
                    targetY: gp.y + Math.sin(a) * 150,
                    vx: Math.cos(a) * (3 + Math.random() * 3),
                    vy: Math.sin(a) * (3 + Math.random() * 3),
                    size: 2 + Math.random() * 4, color: 0xcc44ff,
                    life: 18 + Math.random() * 10, maxLife: 28,
                });
            }
            g.screenFlash = Math.max(g.screenFlash, 0.25);
            g.shakeTimer = Math.max(g.shakeTimer, 8);
            g.slowMo = Math.max(g.slowMo, 80);
            // Big floating text like troop change
            g.gateText = { text: `💎 +${gem.value} GEMS`, color: 0xcc44ff, timer: 0, maxTimer: 70, scale: 0.1 };
            g.gateFlash = { color: 0xcc44ff, timer: 12, maxTimer: 12 };
            playSound('weapon_pickup');
        }
    });
    g.gems = g.gems.filter(gem => !gem.collected && gem.life > 0);

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
        g.shakeX = (Math.random() - 0.5) * g.shakeTimer * 1.5;
        g.shakeY = (Math.random() - 0.5) * g.shakeTimer * 1.5;
        g.shakeTimer = Math.max(0, g.shakeTimer - dtF);
    } else { g.shakeX = 0; g.shakeY = 0; }

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
                const squadArmor = Math.floor(g.squadCount / 15);
                const baseFinalDmg = Math.max(1, sw.damage - (playerData.armor || 0) - squadArmor);
                const finalDmg = g.stimulantActive ? Math.ceil(baseFinalDmg / 2) : baseFinalDmg;
                g.squadCount = Math.max(0, g.squadCount - finalDmg);
                g.gateText = { text: `⚡ GROUND SLAM −${finalDmg}!`, color: 0xff2222, timer: 0, maxTimer: 80, scale: 0.1 };
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
            for (let s = 0; s < 20; s++) {
                const a = (s / 20) * Math.PI * 2;
                const spd = 7 + Math.random() * 7;
                g.speedLines.push({
                    x: pp.x, y: pp.y,
                    vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
                    life: 10 + Math.random() * 8, maxLife: 18,
                    length: 20 + Math.random() * 25, color: 0xff4444,
                });
            }
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
    if (g.currentLevel === 1 && g.wave > MAX_WAVES_LEVEL1 && !g.levelCompleted) {
        g.levelCompleted = true;
        triggerLevelComplete();
    }
    if (g.currentLevel === 2 && g.wave > MAX_WAVES_LEVEL2 && !g.levelCompleted) {
        g.levelCompleted = true;
        triggerLevelComplete();
    }

    // Throttled save: flush dirty player data at most once every ~3s
    flushPlayerDataSave(false);
}
