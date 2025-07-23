const player = document.getElementById('player');
const gameContainer = document.getElementById('game-container');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const startButton = document.getElementById('start-button');
const gameOverScreen = document.getElementById('game-over');
const finalScoreDisplay = document.getElementById('final-score');
// const restartButton = document.getElementById('restart-button'); // 不要なので削除

let score = 0;
let lives = 3;
let gameLoopAnimationId;
let spawnLoopTimeoutId;

// アイテムと障害物の設定
const fallingObjectTypes = [
    { class: 'item-star', score: 15 }, // 星のかけら
    { class: 'item-potion', score: 25 }, // 魔法のポーション
    { class: 'item-crystal', score: 35 }, // クリスタル
    { class: 'obstacle-ghost', score: 0 }, // おばけ
    { class: 'obstacle-ghost', score: 0 } // おばけ（出現率アップ）
];

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
        movePlayer('left');
    } else if (e.key === 'ArrowRight') {
        movePlayer('right');
    }
});

startButton.addEventListener('click', startGame);
// restartButton.addEventListener('click', restartGame); // 不要なので削除

function movePlayer(direction) {
    const playerLeft = parseInt(window.getComputedStyle(player).getPropertyValue('left'));
    const playerWidth = parseInt(window.getComputedStyle(player).getPropertyValue('width'));
    const gameWidth = parseInt(window.getComputedStyle(gameContainer).getPropertyValue('width'));

    // プレイヤーの移動速度を調整
    if (direction === 'left' && playerLeft > 0) {
        player.style.left = `${playerLeft - 30}px`;
    } else if (direction === 'right' && playerLeft < (gameWidth - playerWidth)) {
        player.style.left = `${playerLeft + 30}px`;
    }
}

function getDifficulty() {
    // 初期値
    let fallSpeed = 3;
    let spawnRate = 1200; // ms

    if (score < 200) {
        // 0-200点: 徐々に速くなる
        const progress = score / 200; // 0.0 ~ 1.0
        fallSpeed = 3 + (4 * progress); // 落下速度: 3 -> 7
        spawnRate = 1200 - (500 * progress); // 出現頻度: 1200ms -> 700ms
    } else if (score < 400) {
        // 200-400点: さらに速くなる
        const progress = (score - 200) / 200; // 0.0 ~ 1.0
        fallSpeed = 7 + (3 * progress); // 落下速度: 7 -> 10
        spawnRate = 700 - (200 * progress); // 出現頻度: 700ms -> 500ms
    } else {
        // 400点以上: 上限に向かってさらに速くなる
        const progress = Math.min((score - 400) / 500, 1.0); // 難易度の上昇を制限
        fallSpeed = 10 + (5 * progress); // 落下速度: 10 -> 15 (最大)
        spawnRate = 500 - (200 * progress); // 出現頻度: 500ms -> 300ms (最小)
    }

    return { fallSpeed, spawnRate };
}


function createFallingObject() {
    const typeIndex = Math.floor(Math.random() * fallingObjectTypes.length);
    const type = fallingObjectTypes[typeIndex];
    const gameWidth = parseInt(window.getComputedStyle(gameContainer).getPropertyValue('width'));

    const object = document.createElement('div');
    object.classList.add('falling-object', type.class);
    object.dataset.score = type.score;
    object.style.left = `${Math.random() * (gameWidth - 40)}px`; // 40はオブジェクトのおおよその幅
    object.style.top = '-50px';
    gameContainer.appendChild(object);
}

function updateGameArea() {
    const { fallSpeed } = getDifficulty();
    const allObjects = document.querySelectorAll('.falling-object');
    const gameHeight = parseInt(window.getComputedStyle(gameContainer).getPropertyValue('height'));

    allObjects.forEach(object => {
        const objectTop = parseInt(object.style.top);
        if (objectTop > gameHeight) {
            object.remove();
        } else {
            object.style.top = `${objectTop + fallSpeed}px`;
            checkCollision(object);
        }
    });

    gameLoopAnimationId = requestAnimationFrame(updateGameArea);
}


function checkCollision(object) {
    // オブジェクトがDOMに存在する場合のみ衝突判定を行う
    if (!object.parentNode) {
        return;
    }

    const playerRect = player.getBoundingClientRect();
    const objectRect = object.getBoundingClientRect();

    // 当たり判定を厳しくするためのオフセット（内側にどれだけ判定を縮めるか）
    // この値を調整することで、当たり判定の精度を変更できます
    const playerInset = {
        top: playerRect.height * 0.2,
        bottom: playerRect.height * 0.1,
        left: playerRect.width * 0.25,
        right: playerRect.width * 0.25
    };
    const objectInset = {
        top: objectRect.height * 0.2,
        bottom: objectRect.height * 0.2,
        left: objectRect.width * 0.2,
        right: objectRect.width * 0.2
    };

    // 新しい当たり判定用の矩形を計算
    const effectivePlayerRect = {
        top: playerRect.top + playerInset.top,
        bottom: playerRect.bottom - playerInset.bottom,
        left: playerRect.left + playerInset.left,
        right: playerRect.right - playerInset.right
    };

    const effectiveObjectRect = {
        top: objectRect.top + objectInset.top,
        bottom: objectRect.bottom - objectInset.bottom,
        left: objectRect.left + objectInset.left,
        right: objectRect.right - objectInset.right
    };


    // 縮小した矩形で衝突判定
    if (
        effectiveObjectRect.bottom >= effectivePlayerRect.top &&
        effectiveObjectRect.top <= effectivePlayerRect.bottom &&
        effectiveObjectRect.right >= effectivePlayerRect.left &&
        effectiveObjectRect.left <= effectivePlayerRect.right
    ) {
        if (object.classList.contains('obstacle-ghost')) {
            lives--;
            updateLivesDisplay();
            if (lives <= 0) {
                endGame();
            }
        } else {
            score += parseInt(object.dataset.score);
            scoreDisplay.textContent = score;
        }
        object.remove();
    }
}

function updateLivesDisplay() {
    livesDisplay.textContent = '❤️'.repeat(lives);
}

function spawnLoop() {
    const { spawnRate } = getDifficulty();
    createFallingObject();
    spawnLoopTimeoutId = setTimeout(spawnLoop, spawnRate);
}


function startGame() {
    // 念のため、既存のゲームループが動いていれば完全に停止する
    if (gameLoopAnimationId) {
        cancelAnimationFrame(gameLoopAnimationId);
    }
    if (spawnLoopTimeoutId) {
        clearTimeout(spawnLoopTimeoutId);
    }

    startButton.style.display = 'none';
    gameOverScreen.style.display = 'none';
    
    score = 0;
    lives = 3;
    scoreDisplay.textContent = score;
    updateLivesDisplay();

    // 残っているオブジェクトをクリア
    const fallingObjects = document.querySelectorAll('.falling-object');
    fallingObjects.forEach(obj => obj.remove());

    // 新しいゲームループを開始
    gameLoopAnimationId = requestAnimationFrame(updateGameArea);
    spawnLoop();
}

function endGame() {
    cancelAnimationFrame(gameLoopAnimationId);
    clearTimeout(spawnLoopTimeoutId);
    gameOverScreen.style.display = 'block';
    finalScoreDisplay.textContent = score;
    startButton.style.display = 'block';
    startButton.textContent = 'もう一度プレイ';
}

// 不要なので削除
// function restartGame() {
//     startGame();
// }
