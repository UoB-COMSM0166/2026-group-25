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
    if (game !== g) return;
    updateEffects(g, dt, dtF);

    flushPlayerDataSave(false);
}
