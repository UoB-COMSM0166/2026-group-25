// ============================================================
// UPDATE SUBSYSTEM: Timers, input, auto-shooting
// ============================================================
function updateTimers(g, dt, dtF) {
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
    let cameraSpeedMult = bossAlive ? 0.4 : 1.0; // 40% speed during boss fight
    // Tutorial overrides camera speed per-step (freeze / slow crawl) so
    // each step's content stays in front of the player until the goal is met.
    if (g.isTutorial) {
        cameraSpeedMult = g.tutorialGoalMet ? 1.0 : (g.tutorialCamMult !== undefined ? g.tutorialCamMult : 0);
    }
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

    return bossAlive;
}
