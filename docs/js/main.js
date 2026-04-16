// ============================================================
// p5.js LIFECYCLE — preload, setup, draw, sprites
// ============================================================

// Images loaded in preload (p5.Image objects)
let _p5PatrickImg, _p5XiaoNaiLongImg, _p5BossImg, _p5FireEnemyImg;
let _p5CapybaraImg, _p5PigEngineerImg, _p5CowGunImg, _p5CowCryImg, _p5ElephantImg;

const CRITICAL_IMAGE_ASSETS = [
    ['Patrick enemy sprite', 'assets/patrick.png'],
    ['Small dragon sprite', 'assets/small_dragon.png'],
    ['Boss dragon sprite', 'assets/boss_dragon.png'],
    ['Fire enemy sprite', 'assets/fire_enemy.png'],
    ['Capybara sprite', 'assets/capybara.png'],
    ['Pig engineer sprite', 'assets/pig_engineer.png'],
    ['Cow gun sprite', 'assets/cow_gun.png'],
    ['Crying cow sprite', 'assets/cow_cry.png'],
    ['Elephant sprite', 'assets/elephant.png'],
];

function loadCriticalImage(label, path) {
    return loadImage(
        path,
        () => {},
        () => recordAssetLoadError(label, path)
    );
}

function preload() {
    _p5PatrickImg      = loadCriticalImage(...CRITICAL_IMAGE_ASSETS[0]);
    _p5XiaoNaiLongImg  = loadCriticalImage(...CRITICAL_IMAGE_ASSETS[1]);
    _p5BossImg         = loadCriticalImage(...CRITICAL_IMAGE_ASSETS[2]);
    _p5FireEnemyImg    = loadCriticalImage(...CRITICAL_IMAGE_ASSETS[3]);
    _p5CapybaraImg     = loadCriticalImage(...CRITICAL_IMAGE_ASSETS[4]);
    _p5PigEngineerImg  = loadCriticalImage(...CRITICAL_IMAGE_ASSETS[5]);
    _p5CowGunImg       = loadCriticalImage(...CRITICAL_IMAGE_ASSETS[6]);
    _p5CowCryImg       = loadCriticalImage(...CRITICAL_IMAGE_ASSETS[7]);
    _p5ElephantImg     = loadCriticalImage(...CRITICAL_IMAGE_ASSETS[8]);
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

    _buildSpriteFrames();
    showAssetErrorOverlay();
    initAudio();
    setupInput();

    // Shop buttons
    document.getElementById('shopBtn') && document.getElementById('shopBtn').addEventListener('click', openShop);
    document.getElementById('shopBackBtn') && document.getElementById('shopBackBtn').addEventListener('click', closeShop);

    // Start button
    const startBtnEl = document.getElementById('startBtn');
    if (startBtnEl) startBtnEl.addEventListener('click', showLevelSelect);

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
    monsterSpritesLoaded = true;
    console.log('Sprites loaded: Patrick', normalMonsterFrames.length, 'XiaoNaiLong', xiaoNaiLongFrames.length, 'Boss', bossFrames.length);
}

function draw() {
    screenW = width;
    screenH = height;

    if (game && game.state === 'playing') {
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
