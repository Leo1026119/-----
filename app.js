// GUN 初始化
const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']);
const players = gun.get('snake-players');
const leaderboard = gun.get('snake-leaderboard');

// 遊戲常數
const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SNAKE_LENGTH = 3;
const GAME_SPEED = 100;

// 遊戲變數
let canvas, ctx;
let mySnake = [];
let direction = 'right';
let nextDirection = 'right';
let food = null;
let score = 0;
let gameLoop = null;
let isPaused = false;
let playerId = Math.random().toString(36).substr(2, 9);
let playerName = '';
let otherPlayers = new Map();
let highScore = 0;

// DOM 元素
const startBtn = document.getElementById('startBtn');
const scoreElement = document.getElementById('score');
const playerNameInput = document.getElementById('playerName');
const playersList = document.getElementById('playersList');
const playerCountElement = document.getElementById('playerCount');
const highScoreElement = document.getElementById('highScore');
const leaderboardBody = document.getElementById('leaderboardBody');

// 玩家名稱輸入處理
playerNameInput.addEventListener('change', (e) => {
    playerName = e.target.value;
    if (playerName) {
        startBtn.disabled = false;
    } else {
        startBtn.disabled = true;
    }
});

// 初始化遊戲
function initGame() {
    if (!playerName) {
        alert('請先輸入您的名字！');
        return;
    }

    canvas = document.getElementById('gameCanvas');
    canvas.width = GRID_SIZE * CELL_SIZE;
    canvas.height = GRID_SIZE * CELL_SIZE;
    ctx = canvas.getContext('2d');
    
    // 初始化蛇的位置
    mySnake = [];
    const startX = Math.floor(Math.random() * (GRID_SIZE - INITIAL_SNAKE_LENGTH));
    const startY = Math.floor(Math.random() * GRID_SIZE);
    for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
        mySnake.push({ x: startX - i, y: startY });
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
    
    // 廣播玩家加入
    updatePlayerStatus();

    // 載入玩家最高分
    leaderboard.get(playerId).once((data) => {
        if (data) {
            highScore = data.score || 0;
            highScoreElement.textContent = highScore;
        }
    });
}

// 更新玩家狀態
function updatePlayerStatus() {
    players.get(playerId).put({
        name: playerName,
        score: score,
        snake: mySnake,
        lastUpdate: Date.now()
    });
}

// 更新排行榜
function updateLeaderboard() {
    if (score > highScore) {
        highScore = score;
        highScoreElement.textContent = highScore;
        leaderboard.get(playerId).put({
            name: playerName,
            score: highScore,
            lastUpdate: Date.now()
        });
    }
}

// 更新排行榜顯示
function updateLeaderboardDisplay() {
    const scores = [];
    leaderboard.map().once((data, id) => {
        if (data && data.name && data.score) {
            scores.push({
                id,
                name: data.name,
                score: data.score,
                lastUpdate: data.lastUpdate
            });
        }
    });

    // 排序分數
    scores.sort((a, b) => b.score - a.score);

    // 更新顯示
    leaderboardBody.innerHTML = '';
    scores.slice(0, 10).forEach((player, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${player.name}</td>
            <td>${player.score}</td>
        `;
        if (player.id === playerId) {
            row.style.backgroundColor = '#e8f5e9';
            row.style.fontWeight = 'bold';
        }
        leaderboardBody.appendChild(row);
    });
}

// 生成食物
function generateFood() {
    while (true) {
        const x = Math.floor(Math.random() * GRID_SIZE);
        const y = Math.floor(Math.random() * GRID_SIZE);
        
        // 確保食物不會生成在任何蛇身上
        let onSnake = false;
        for (const segment of mySnake) {
            if (segment.x === x && segment.y === y) {
                onSnake = true;
                break;
            }
        }
        
        for (const [_, player] of otherPlayers) {
            for (const segment of player.snake) {
                if (segment.x === x && segment.y === y) {
                    onSnake = true;
                    break;
                }
            }
        }
        
        if (!onSnake) {
            food = { x, y };
            // 廣播食物位置
            gun.get('snake-food').put({ x, y });
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
    const head = { ...mySnake[0] };
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
    mySnake.unshift(head);
    
    // 檢查是否吃到食物
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        updateLeaderboard();
        generateFood();
    } else {
        mySnake.pop();
    }
    
    // 更新玩家狀態
    updatePlayerStatus();
    
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
    for (const segment of mySnake) {
        if (head.x === segment.x && head.y === segment.y) {
            return true;
        }
    }
    
    // 檢查與其他玩家的碰撞
    for (const [_, player] of otherPlayers) {
        for (const segment of player.snake) {
            if (head.x === segment.x && head.y === segment.y) {
                return true;
            }
        }
    }
    
    return false;
}

// 繪製遊戲畫面
function drawGame() {
    // 清除畫布
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 繪製我的蛇
    ctx.fillStyle = '#4CAF50';
    for (const segment of mySnake) {
        ctx.fillRect(
            segment.x * CELL_SIZE,
            segment.y * CELL_SIZE,
            CELL_SIZE - 1,
            CELL_SIZE - 1
        );
    }
    
    // 繪製其他玩家的蛇
    for (const [id, player] of otherPlayers) {
        ctx.fillStyle = `hsl(${hashCode(id) % 360}, 70%, 50%)`;
        for (const segment of player.snake) {
            ctx.fillRect(
                segment.x * CELL_SIZE,
                segment.y * CELL_SIZE,
                CELL_SIZE - 1,
                CELL_SIZE - 1
            );
        }
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

// 生成玩家顏色的雜湊函數
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
}

// 遊戲結束
function gameOver() {
    clearInterval(gameLoop);
    gameLoop = null;
    updateLeaderboard();
    alert('遊戲結束！您的分數是：' + score);
    startBtn.textContent = '開始遊戲';
    // 移除玩家狀態
    players.get(playerId).put(null);
}

// 更新玩家列表
function updatePlayersList() {
    playersList.innerHTML = '';
    let count = 0;
    for (const [id, player] of otherPlayers) {
        const li = document.createElement('li');
        li.innerHTML = `${player.name} <span class="player-score">${player.score}</span>`;
        li.style.color = `hsl(${hashCode(id) % 360}, 70%, 50%)`;
        playersList.appendChild(li);
        count++;
    }
    if (gameLoop) count++; // 加上自己
    playerCountElement.textContent = count;
}

// 監聽其他玩家
players.map().on(function(data, id) {
    if (id === playerId || !data) return;
    
    // 更新或添加玩家
    if (data) {
        otherPlayers.set(id, data);
    } else {
        otherPlayers.delete(id);
    }
    
    // 更新玩家列表
    updatePlayersList();
});

// 監聽食物位置更新
gun.get('snake-food').on(function(data) {
    if (data && !food) {
        food = data;
    }
});

// 監聽排行榜更新
leaderboard.map().on(() => {
    updateLeaderboardDisplay();
});

// 初始載入排行榜
updateLeaderboardDisplay();

// 清理離線玩家
setInterval(() => {
    const now = Date.now();
    for (const [id, player] of otherPlayers) {
        if (now - player.lastUpdate > 5000) { // 5秒沒有更新就視為離線
            otherPlayers.delete(id);
        }
    }
    updatePlayersList();
}, 5000);

// 事件監聽
startBtn.addEventListener('click', initGame);
startBtn.disabled = true;

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