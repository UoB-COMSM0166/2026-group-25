// ============================================================
// p5.js LIFECYCLE — preload, setup, draw, sprites
// ============================================================

// Images loaded in preload (p5.Image objects)
let _p5PatrickImg, _p5XiaoNaiLongImg, _p5BossImg, _p5FireEnemyImg;
let _p5CapybaraImg, _p5PigEngineerImg, _p5CowGunImg, _p5CowCryImg, _p5ElephantImg;
let _p5TutorialImpImg, _p5TutorialBossImg;
let _p5Level1BgImg, _p5Level2BgImg;

function preload() {
    _p5PatrickImg      = loadImage('assets/patrick.png');
    _p5XiaoNaiLongImg  = loadImage('assets/small_dragon.png');
    _p5BossImg         = loadImage('assets/boss_dragon.png');
    _p5FireEnemyImg    = loadImage('assets/fire_enemy.png');
    _p5CapybaraImg     = loadImage('assets/capybara.png');
    _p5PigEngineerImg  = loadImage('assets/pig_engineer.png');
    _p5CowGunImg       = loadImage('assets/cow_gun.png');
    _p5CowCryImg       = loadImage('assets/cow_cry.png');
    _p5ElephantImg     = loadImage('assets/elephant.png');
    _p5TutorialImpImg  = loadImage('assets/tutorial_imp.png');
    _p5TutorialBossImg = loadImage('assets/tutorial_boss.png');
    _p5Level1BgImg     = loadImage('assets/level1_background.png');
    _p5Level2BgImg     = loadImage('assets/level2_background.png');
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    noSmooth();
    frameRate(60);

    screenW = width;
    screenH = height;

    // Use DOM img elements declared in index.html (#spritePreloads)
    rawPatrickImg      = document.getElementById('spritePatrick');
    rawXiaoNaiLongImg  = document.getElementById('spriteSmallDragon');
    rawBossImg         = document.getElementById('spriteBoss');
    rawCapybaraImg     = document.getElementById('spriteCapybara');
    rawPigEngineerImg  = document.getElementById('spritePigEngineer');
    rawCowGunImg       = document.getElementById('spriteCowGun');
    rawCowCryImg       = document.getElementById('spriteCowCry');
    rawElephantImg     = document.getElementById('spriteElephant');
    rawTutorialImpImg  = document.getElementById('spriteTutorialImp');
    rawTutorialBossImg = document.getElementById('spriteTutorialBoss');

    _buildSpriteFrames();
    initAudio();
    setupInput();

    // Shop buttons — #shopBtn / #shopBackBtn already wired via inline
    // onclick in index.html; only bind the elements that have no inline handler.
    const midShopGoBtn = document.getElementById('midShopGoBtn');
    if (midShopGoBtn) midShopGoBtn.addEventListener('click', closeMidShop);
    document.querySelectorAll('.shop-tab').forEach(btn => {
        btn.addEventListener('click', () => switchShopTab(btn.dataset.tab));
    });

    // #startBtn is wired via inline onclick in index.html — no JS binding here.

    // Update coin/gem display on menu
    const coinCountEl = document.getElementById('coinCount');
    if (coinCountEl) coinCountEl.textContent = playerData.coins;
    const gemCountEl = document.getElementById('gemCount');
    if (gemCountEl) gemCountEl.textContent = playerData.gems || 0;
}

function _buildSpriteFrames() {
    // Patrick: 6 cols x 4 rows grid, last row has 5 frames
    for (let r = 0; r < PATRICK_ROWS; r++) {
        const colsInRow = r === PATRICK_ROWS - 1 ? 5 : PATRICK_COLS;
        for (let c = 0; c < colsInRow; c++) {
            normalMonsterFrames.push({
                img: _p5PatrickImg,
                sx: c * PATRICK_FRAME_W, sy: r * PATRICK_FRAME_H,
                sw: PATRICK_FRAME_W, sh: PATRICK_FRAME_H,
            });
        }
    }
    for (let i = 0; i < XIAO_NAI_LONG_FRAME_COUNT; i++) {
        xiaoNaiLongFrames.push({ img: _p5XiaoNaiLongImg, sx: i * XIAO_NAI_LONG_FRAME_SIZE, sy: 0, sw: XIAO_NAI_LONG_FRAME_SIZE, sh: XIAO_NAI_LONG_FRAME_SIZE });
    }
    for (let i = 0; i < MONSTER_FRAME_COUNT; i++) {
        bossFrames.push({ img: _p5BossImg, sx: i * MONSTER_FRAME_SIZE, sy: 0, sw: MONSTER_FRAME_SIZE, sh: MONSTER_FRAME_SIZE });
    }
    for (let i = 0; i < FIRE_ENEMY_FRAME_COUNT; i++) {
        fireEnemyFrames.push({ img: _p5FireEnemyImg, sx: i * FIRE_ENEMY_FRAME_SIZE, sy: 0, sw: FIRE_ENEMY_FRAME_SIZE, sh: FIRE_ENEMY_FRAME_SIZE });
    }
    for (let i = 0; i < CAPYBARA_FRAME_COUNT; i++) {
        capybaraFrames.push({ img: _p5CapybaraImg, sx: i * CAPYBARA_FRAME_SIZE, sy: 0, sw: CAPYBARA_FRAME_SIZE, sh: CAPYBARA_FRAME_SIZE });
    }
    for (let i = 0; i < PIG_ENGINEER_FRAME_COUNT; i++) {
        pigEngineerFrames.push({ img: _p5PigEngineerImg, sx: i * PIG_ENGINEER_FRAME_SIZE, sy: 0, sw: PIG_ENGINEER_FRAME_SIZE, sh: PIG_ENGINEER_FRAME_SIZE });
    }
    for (let i = 0; i < COW_GUN_FRAME_COUNT; i++) {
        cowGunFrames.push({ img: _p5CowGunImg, sx: i * COW_GUN_FRAME_SIZE, sy: 0, sw: COW_GUN_FRAME_SIZE, sh: COW_GUN_FRAME_SIZE });
    }
    for (let i = 0; i < COW_CRY_FRAME_COUNT; i++) {
        cowCryFrames.push({ img: _p5CowCryImg, sx: i * COW_CRY_FRAME_SIZE, sy: 0, sw: COW_CRY_FRAME_SIZE, sh: COW_CRY_FRAME_SIZE });
    }
    for (let i = 0; i < ELEPHANT_FRAME_COUNT; i++) {
        elephantFrames.push({ img: _p5ElephantImg, sx: i * ELEPHANT_FRAME_SIZE, sy: 0, sw: ELEPHANT_FRAME_SIZE, sh: ELEPHANT_FRAME_SIZE });
    }
    for (let i = 0; i < TUTORIAL_IMP_FRAME_COUNT; i++) {
        tutorialImpFrames.push({ img: _p5TutorialImpImg, sx: i * TUTORIAL_IMP_FRAME_SIZE, sy: 0, sw: TUTORIAL_IMP_FRAME_SIZE, sh: TUTORIAL_IMP_FRAME_SIZE });
    }
    for (let i = 0; i < TUTORIAL_BOSS_FRAME_COUNT; i++) {
        tutorialBossFrames.push({ img: _p5TutorialBossImg, sx: i * TUTORIAL_BOSS_FRAME_SIZE, sy: 0, sw: TUTORIAL_BOSS_FRAME_SIZE, sh: TUTORIAL_BOSS_FRAME_SIZE });
    }
    monsterSpritesLoaded = true;
}

function draw() {
    screenW = width;
    screenH = height;

    if (game && (game.state === 'playing' || game.state === 'paused' || game.state === 'revive')) {
        update(deltaTime);
    }
    render();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    screenW = width;
    screenH = height;
    _skyBgW = 0; _skyBgH = 0; _skyBgLevel = 0;
}
