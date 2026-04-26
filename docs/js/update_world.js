// ============================================================
// UPDATE SUBSYSTEM: Gates, wave spawning, barrels, coins, gems
// ============================================================
function updateWorld(g, dt, dtF, bossAlive) {
    // Gate collision
    g.gates.forEach(gate => {
        if (gate.triggered && gate.fadeTimer > 0) {
            // Use dtF so the fade duration stays wall-clock-stable when the
            // frame rate dips (matches the rest of the effect timers).
            gate.fadeTimer = Math.max(0, gate.fadeTimer - dtF);
            return;
        }
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
                    emitSpeedLines(g, screenW / 2, screenH * 0.45, 28, flashColor, { spdBase: 8, spdVar: 8, lifeBase: 12, lifeVar: 12, lenBase: 25, lenVar: 35 });

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
    // Tutorial never uses the camera-crossing trigger (nextWaveZ is parked
    // at infinity); progression happens in updateTutorial via goal checks.
    if (!g.isTutorial && !bossAlive && g.cameraZ + CONFIG.SPAWN_DISTANCE > g.nextWaveZ) {
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
    }
    if (g.cameraZ + CONFIG.SPAWN_DISTANCE > g.nextGateZ) spawnGate();

    // Barrel chain reaction timers
    g.barrels.forEach(br => {
        if (!br.alive || br.chainTimer < 0) return;
        if (br.chainTimer > 0) { br.chainTimer -= dtF; }
        else if (br.chainTimer === 0) { br.chainTimer = -1; explodeBarrel(br); }
    });

    // Barrel smoke/sparks for damaged barrels — probabilistic emission keyed
    // off dtF so the per-second rate stays constant across frame rates
    // (per-frame modulo halved the smoke at 30fps).
    g.barrels.forEach(br => {
        if (!br.alive || br.hp >= br.maxHp) return;
        br.smokeTimer += dtF;
        if (Math.random() < dtF / 6) {
            g.particles.push({
                x: br.x + (Math.random() - 0.5) * 10, z: br.z,
                vx: (Math.random() - 0.5) * 0.5, vz: 0,
                vy: -1.0 - Math.random() * 0.5, y: 0,
                life: 18 + Math.random() * 10, maxLife: 28,
                color: 0x555555, size: 3 + Math.random() * 3,
            });
        }
        if (Math.random() < dtF / 10) {
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
            if (!g.isTutorial) {
                playerData.coins += coin.value;
                addStat('totalCoinsEarned', coin.value);
                markPlayerDataDirty();
            }
            // Pickup effect — golden burst with speed lines
            const cp = project(coin.x, coin.z - g.cameraZ);
            addScorePopup(`🪙+${coin.value}`, cp.x, cp.y - 20, 0xffd700);
            addParticles(coin.x, coin.z, 14, 0xffd700, 4, 18);
            addParticles(coin.x, coin.z, 6, 0xffffff, 3, 10);
            addParticles(coin.x, coin.z, 4, 0xffaa00, 2, 12);
            // Speed lines radiating from pickup point
            emitSpeedLines(g, cp.x, cp.y, 8, 0xffd700, { spdBase: 4, spdVar: 3, lifeBase: 6, lifeVar: 4, lenBase: 12, lenVar: 10 });
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
            if (!g.isTutorial) {
                playerData.gems = (playerData.gems || 0) + gem.value;
                addStat('totalGemsEarned', gem.value);
                markPlayerDataDirty();
            }
            // Pickup effect — purple explosion with blast ring + speed lines
            const gp = project(gem.x, gem.z - g.cameraZ);
            addScorePopup(`💎+${gem.value}`, gp.x, gp.y - 25, 0xcc44ff);
            addParticles(gem.x, gem.z, 20, 0xaa22ff, 5, 25);
            addParticles(gem.x, gem.z, 10, 0xffffff, 4, 12);
            addParticles(gem.x, gem.z, 8, 0xcc88ff, 6, 18);
            addParticles(gem.x, gem.z, 4, 0xff44ff, 3, 15);
            // Speed lines radiating from pickup — more dramatic
            emitSpeedLines(g, gp.x, gp.y, 16, 0xcc44ff, { spdBase: 5, spdVar: 5, lifeBase: 8, lifeVar: 6, lenBase: 18, lenVar: 15 });
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
}
