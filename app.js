// 遊戲常數
const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SNAKE_LENGTH = 3;
const GAME_SPEED = 100;

// 遊戲變數
let canvas, ctx;
let snake = [];
let direction = 'right';
let nextDirection = 'right';
let food = null;
let score = 0;
let gameLoop = null;
let isPaused = false;

// DOM 元素
const startBtn = document.getElementById('startBtn');
const scoreElement = document.getElementById('score');

// 初始化遊戲
function initGame() {
    canvas = document.getElementById('gameCanvas');
    canvas.width = GRID_SIZE * CELL_SIZE;
    canvas.height = GRID_SIZE * CELL_SIZE;
    ctx = canvas.getContext('2d');
    
    // 初始化蛇的位置
    snake = [];
    const startX = Math.floor(GRID_SIZE / 2);
    const startY = Math.floor(GRID_SIZE / 2);
    for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
        snake.push({ x: startX - i, y: startY });
    }
    
    // 生成第一個食物
    generateFood();
    
    // 更新分數顯示
    score = 0;
    scoreElement.textContent = score;
    
    // 重設方向
    direction = 'right';
    nextDirection = 'right';
    
    // 開始遊戲循環
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(gameStep, GAME_SPEED);
    
    // 更新按鈕狀態
    startBtn.textContent = '重新開始';
}

// 生成食物
function generateFood() {
    while (true) {
        const x = Math.floor(Math.random() * GRID_SIZE);
        const y = Math.floor(Math.random() * GRID_SIZE);
        
        // 確保食物不會生成在蛇身上
        let onSnake = false;
        for (const segment of snake) {
            if (segment.x === x && segment.y === y) {
                onSnake = true;
                break;
            }
        }
        
        if (!onSnake) {
            food = { x, y };
            break;
        }
    }
}

// 遊戲步驟
function gameStep() {
    if (isPaused) return;
    
    // 更新蛇的方向
    direction = nextDirection;
    
    // 計算新的頭部位置
    const head = { ...snake[0] };
    switch (direction) {
        case 'up': head.y--; break;
        case 'down': head.y++; break;
        case 'left': head.x--; break;
        case 'right': head.x++; break;
    }
    
    // 檢查碰撞
    if (isCollision(head)) {
        gameOver();
        return;
    }
    
    // 移動蛇
    snake.unshift(head);
    
    // 檢查是否吃到食物
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        generateFood();
    } else {
        snake.pop();
    }
    
    // 繪製遊戲畫面
    drawGame();
}

// 檢查碰撞
function isCollision(head) {
    // 檢查牆壁碰撞
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        return true;
    }
    
    // 檢查自身碰撞
    for (const segment of snake) {
        if (head.x === segment.x && head.y === segment.y) {
            return true;
        }
    }
    
    return false;
}

// 繪製遊戲畫面
function drawGame() {
    // 清除畫布
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 繪製蛇
    ctx.fillStyle = '#4CAF50';
    for (const segment of snake) {
        ctx.fillRect(
            segment.x * CELL_SIZE,
            segment.y * CELL_SIZE,
            CELL_SIZE - 1,
            CELL_SIZE - 1
        );
    }
    
    // 繪製食物
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(
        food.x * CELL_SIZE,
        food.y * CELL_SIZE,
        CELL_SIZE - 1,
        CELL_SIZE - 1
    );
}

// 遊戲結束
function gameOver() {
    clearInterval(gameLoop);
    gameLoop = null;
    alert('遊戲結束！您的分數是：' + score);
    startBtn.textContent = '開始遊戲';
}

// 事件監聽
startBtn.addEventListener('click', initGame);

document.addEventListener('keydown', (event) => {
    // 方向鍵控制
    const key = event.key.toLowerCase();
    
    // 處理方向鍵和 WASD
    if ((key === 'arrowup' || key === 'w') && direction !== 'down') {
        nextDirection = 'up';
    } else if ((key === 'arrowdown' || key === 's') && direction !== 'up') {
        nextDirection = 'down';
    } else if ((key === 'arrowleft' || key === 'a') && direction !== 'right') {
        nextDirection = 'left';
    } else if ((key === 'arrowright' || key === 'd') && direction !== 'left') {
        nextDirection = 'right';
    }
    
    // 空白鍵暫停
    if (key === ' ') {
        isPaused = !isPaused;
    }
});

// 確保畫布在視窗大小改變時保持正確大小
window.addEventListener('resize', () => {
    if (canvas) {
        canvas.width = GRID_SIZE * CELL_SIZE;
        canvas.height = GRID_SIZE * CELL_SIZE;
        drawGame();
    }
});