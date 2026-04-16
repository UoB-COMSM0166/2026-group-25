// ============================================================
// UPDATE — main game loop orchestrator
// ============================================================
function update(dt) {
    const g = game;
    if (g.state !== 'playing') return;
    const dtF = Math.min(dt, 50) / 16.667;

    const bossAlive = updateTimers(g, dt, dtF);
    // Enemies (including the boss hard-lock at playerZ + bossHoldZ) must
    // update BEFORE bullet collision, otherwise bullets check against the
    // previous frame's boss position and can fly visibly past it before
    // the snap catches up.
    updateEnemies(g, dt, dtF, bossAlive);
    updateBulletCollisions(g, dtF);
    updateWorld(g, dt, dtF, bossAlive);
    updateEffects(g, dt, dtF);
    updateTutorial();

    flushPlayerDataSave(false);
}
