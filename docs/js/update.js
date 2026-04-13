// ============================================================
// UPDATE — main game loop orchestrator
// ============================================================
function update(dt) {
    const g = game;
    if (g.state !== 'playing') return;
    const dtF = Math.min(dt, 50) / 16.667;

    const bossAlive = updateTimers(g, dt, dtF);
    updateBulletCollisions(g, dtF);
    updateEnemies(g, dt, dtF, bossAlive);
    updateWorld(g, dt, dtF, bossAlive);
    updateEffects(g, dt, dtF);
    updateTutorial();

    flushPlayerDataSave(false);
}
