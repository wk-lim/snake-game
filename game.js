const canvas = document.getElementById('game-board');
const context = canvas.getContext('2d');

let score = 0;
let animationFrameId = null;
let lastMoveTime = 0;
let gameOver = false;
let gameSpeed = 160;
let gamePaused = false;
let pauseStartedAt = 0;
let playerNickname = "";
let scoreSubmitted = false;

const playerSetup = document.getElementById('player-setup');
const gameArea = document.getElementById('game-area');
const nicknameInput = document.getElementById('nickname-input');
const nicknameError = document.getElementById('nickname-error');
const startPlayerButton = document.getElementById('start-player-button');
const changePlayerButton = document.getElementById('change-player-button');
const playerNameDisplay = document.getElementById('player-name');

const SUPABASE_URL = "https://loylvcigvdwpkvtcdaon.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-wvbLkaTcNoF0qQner3bFg_qFL28sne";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const leaderboardStatus = document.getElementById('leaderboard-status');
const leaderboardList = document.getElementById('leaderboard-list');

const minimumSpeed = 80;
const speedIncrease = 5;
const foodNeededForSpeedUp = 10;

const scoreElement = document.getElementById('score');

const highScoreElement = document.getElementById('high-score');

let highScore = Number(localStorage.getItem('snakeHighScore')) || 0;

highScoreElement.textContent = highScore;

const statusMessage = document.getElementById('status-message');

const restartButton = document.getElementById('restart-button');

const gridSize = 20;

const tileCount = canvas.width / gridSize;

const direction = {
    x: 1,
    y: 0
};

document.addEventListener('keydown', changeDirection);

let snake = [
    { x: 15, y: 15 },
    { x: 14, y: 15 },
    { x: 13, y: 15 },
];

function copySnake(source) {
    return source.map(function (segment) {
        return {
            x: segment.x,
            y: segment.y
        };
    });
}

let previousSnake = copySnake(snake);

function getInterpolatedSnake(progress) {
    return snake.map(function (segment, index) {
        const previousSegment =
            previousSnake[index] ||
            previousSnake[previousSnake.length - 1] ||
            segment;

        return {
            x: previousSegment.x +
                (segment.x - previousSegment.x) * progress,
            y: previousSegment.y +
                (segment.y - previousSegment.y) * progress
        };
    });
}

let food = {
    x: 20,
    y: 15
};

async function loadLeaderboard() {
    leaderboardStatus.textContent = "Loading scores...";

    const { data, error } = await supabaseClient
        .from("scores")
        .select("player_name, score, created_at")
        .order("score", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(20);

    if (error) {
        console.error(error);

        leaderboardStatus.textContent = "Could not load the leaderboard.";
        return;
    }

    renderLeaderboard(data);
}

async function submitScore() {
    if (scoreSubmitted || playerNickname === "" || score<= 0) {
        return;
    }

    scoreSubmitted = true;

    leaderboardStatus.textContent = "Submitting score...";

    const { error } = await supabaseClient.rpc("submit_high_score", {
        p_player_name: playerNickname,
        p_score: score
    });

    if (error) {
        console.error("Score submission failed:", error);

        leaderboardStatus.textContent = "Could not save your score.";

        scoreSubmitted = false;
        return;
    }

    await loadLeaderboard();
}

function renderLeaderboard(scores) {
    leaderboardList.replaceChildren();

    if (scores.length === 0) {
        leaderboardStatus.textContent = "No scores yet. Be the first player!";
        return;
    }

    leaderboardStatus.textContent = "";

    scores.forEach(function (entry, index) {
        const item = document.createElement("li");

        const rank = document.createElement("span");
        const name = document.createElement("span");
        const scoreValue = document.createElement("span");

        rank.className = "leaderboard-rank";
        scoreValue.className = "leaderboard-score";

        rank.textContent = `${index + 1}.`;
        name.textContent = entry.player_name;
        scoreValue.textContent = entry.score;

        item.append(rank, name, scoreValue);
        leaderboardList.append(item);
    });
}

function drawSnakeConnections(snakeToDraw) {
    context.lineCap = "round";
    context.lineJoin = "round";

    for (let index = 0; index < snakeToDraw.length - 1; index++) {
        const current = snakeToDraw[index];
        const next = snakeToDraw[index + 1];

        const currentX = current.x * gridSize + gridSize / 2;
        const currentY = current.y * gridSize + gridSize / 2;

        const nextX = next.x * gridSize + gridSize / 2;
        const nextY = next.y * gridSize + gridSize / 2;

        context.beginPath();
        context.moveTo(currentX, currentY);
        context.lineTo(nextX, nextY);
        context.strokeStyle = "#276b35";
        context.lineWidth = 18;
        context.stroke();

        context.beginPath();
        context.moveTo(currentX, currentY);
        context.lineTo(nextX, nextY);
        context.strokeStyle = "#65ce50";
        context.lineWidth = 14;
        context.stroke();
    }
}

function drawSnake(snakeToDraw = snake) {
    drawSnakeConnections(snakeToDraw);
    
    const head = snakeToDraw[0];

    const centerX = head.x * gridSize + gridSize / 2;
    const centerY = head.y * gridSize + gridSize / 2;

    context.beginPath();
    context.arc(centerX, centerY, 9, 0, 2 * Math.PI);

    context.fillStyle = "#9bf26f";
    context.fill();

    context.strokeStyle = "#276b35";
    context.lineWidth = 2;
    context.stroke();

    drawSnakeEyes(centerX, centerY);
}

function drawSnakeEyes(centerX, centerY) {
    const sideX = -direction.y;
    const sideY = direction.x;

    const frontX = direction.x * 3;
    const frontY = direction.y * 3;

    const firstEyeX = centerX + frontX + sideX * 4;
    const firstEyeY = centerY + frontY + sideY * 4;

    const secondEyeX = centerX + frontX - sideX * 4;
    const secondEyeY = centerY + frontY - sideY * 4;

    drawEye(firstEyeX, firstEyeY);
    drawEye(secondEyeX, secondEyeY);
}

function drawEye(x, y) {
    context.beginPath();
    context.fillStyle = "#ffffff";
    context.arc(x, y, 3, 0, 2 * Math.PI);
    context.fill();

    context.beginPath();
    context.fillStyle = "#142018";
    context.arc(x, y, 1.4, 0, 2 * Math.PI);
    context.fill();
}

function clearBoard() {
    context.clearRect(0, 0, canvas.width, canvas.height);
}

function moveSnake() {
  const currentHead = snake[0];

  const newHead = {
    x: currentHead.x + direction.x,
    y: currentHead.y + direction.y
  };

  const ateFood =
    newHead.x === food.x &&
    newHead.y === food.y;

  /*
    When the snake does not eat, its tail will move away.
    Therefore, exclude the final tail segment when checking
    for a body collision.
  */
  const bodyToCheck = ateFood
    ? snake
    : snake.slice(0, -1);

  if (
    hitWall(newHead) ||
    hitSnake(newHead, bodyToCheck)
  ) {
    return false;
  }

  snake.unshift(newHead);

  if (ateFood) {
    score = score + 1;
    scoreElement.textContent = score;

    if (score > highScore) {
        highScore = score;

        highScoreElement.textContent = highScore;

        localStorage.setItem('snakeHighScore', highScore);
    }

    if (score % foodNeededForSpeedUp === 0) {
        increaseSpeed();
    }
    placeFood();
  } else {
    snake.pop();
  }

  return true;
}

function changeDirection(event) {
    if (event.code === 'Space') {
        event.preventDefault();
        togglePause();
        return;
    }
    const goingUp = direction.y === -1;
    const goingDown = direction.y === 1;
    const goingRight = direction.x === 1;
    const goingLeft = direction.x === -1;

    if (event.key === 'ArrowUp' && !goingDown) {
        direction.x = 0;
        direction.y = -1;
    }

    if (event.key === 'ArrowDown' && !goingUp) {
        direction.x = 0;
        direction.y = 1;
    }

    if (event.key === 'ArrowLeft' && !goingRight) {
        direction.x = -1;
        direction.y = 0;
    }

    if (event.key === 'ArrowRight' && !goingLeft) {
        direction.x = 1;
        direction.y = 0;
    }

    if (event.key.startsWith('Arrow')) {
        event.preventDefault();
        startGame();
    }
}

restartButton.addEventListener('click', restartGame);

startPlayerButton.addEventListener('click', saveNickname);
changePlayerButton.addEventListener('click', changePlayer);
nicknameInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        saveNickname();
    }
});

function saveNickname() {
    const nickname = nicknameInput.value.trim();

    if (nickname.length < 2) {
        nicknameError.textContent = "Nickname must be at least 2 characters.";
        return;
    }

    const validNickname = /^[a-zA-Z0-9_]+$/.test(nickname);

    if (!validNickname) {
        nicknameError.textContent = "Use lettters, numbers, spaces, - or _ only.";
        return;
    }

    playerNickname = nickname;
    playerNameDisplay.textContent = playerNickname;
    nicknameError.textContent = "";
    playerSetup.hidden = true;
    gameArea.hidden = false;
    restartGame();
    loadLeaderboard();
}

function changePlayer() {
    restartGame();

    playerNickname = "";
    playerNameDisplay.textContent = "";

    gameArea.hidden = true;
    playerSetup.hidden = false;

    nicknameInput.value = "";
    nicknameError.textContent = "";
    nicknameInput.focus();
}

function startGame() {
    if (animationFrameId === null && !gameOver && !gamePaused && playerNickname !== "") {
        statusMessage.textContent = "Use the arrow keys to move - Space to pause";
        previousSnake = copySnake(snake);

        // Subtract one tick so movement begins on the first animation frame.
        lastMoveTime = performance.now() - gameSpeed;
        animationFrameId = requestAnimationFrame(animationLoop);
    }
}

function restartGame() {
    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
    }

    animationFrameId = null;
    lastMoveTime = 0;
    gameOver = false;
    gamePaused = false;
    pauseStartedAt = 0;
    scoreSubmitted = false;

    statusMessage.textContent = "Press an arrow key to start";

    snake = [
        { x: 15, y: 15 },
        { x: 14, y: 15 },
        { x: 13, y: 15 },
    ];

    previousSnake = copySnake(snake);

    direction.x = 1;
    direction.y = 0;

    food.x = 20;
    food.y = 15;

    score = 0;
    scoreElement.textContent = score;
    gameSpeed = 160;

    clearBoard();
    drawFood();
    drawSnake();
}

function togglePause() {
    if (gameOver) {
        return;
    }
    if (animationFrameId === null && !gamePaused) {
        return;
    }

    if (gamePaused) {
        gamePaused = false;

        const pausedDuration = performance.now() - pauseStartedAt;
        lastMoveTime = lastMoveTime + pausedDuration;

        statusMessage.textContent = "Use the arrow keys to move - Space to pause";
        animationFrameId = requestAnimationFrame(animationLoop);
    } else {
        gamePaused = true;
        pauseStartedAt = performance.now();

        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;

        statusMessage.textContent = "Paused - press Space to resume";
    }
}

function increaseSpeed() {
    if (gameSpeed > minimumSpeed) {
        gameSpeed = Math.max(
            minimumSpeed,
            gameSpeed - speedIncrease
        );
    }
}

function animationLoop(timestamp) {
    const elapsedTime = timestamp - lastMoveTime;

    if (elapsedTime >= gameSpeed) {
        previousSnake = copySnake(snake);

        const movedSuccessfully = moveSnake();
        lastMoveTime = timestamp;

        if (!movedSuccessfully) {
            finishGame();
            return;
        }
    }

    const progress = Math.min(
        (timestamp - lastMoveTime) / gameSpeed,
        1
    );

    const visualSnake = getInterpolatedSnake(progress);

    clearBoard();
    drawFood();
    drawSnake(visualSnake);

    animationFrameId = requestAnimationFrame(animationLoop);
}

function finishGame() {
    clearBoard();
    drawFood();
    drawSnake();
    drawGameOver();

    statusMessage.textContent = "Game over - click Restart Game";
    animationFrameId = null;
    gameOver = true;
    gamePaused = false;
    submitScore();
}

function hitWall(head) {
    return (
        head.x < 0 ||
        head.x >= tileCount ||
        head.y < 0 ||
        head.y >= tileCount
    );
}

function hitSnake(head, body) {
    return body.some(function (segment) {
        return (
            segment.x === head.x &&
            segment.y === head.y
        );
    });
}

function drawGameOver() {
    context.fillStyle = "#ffffff";
    context.font = "bold 36px Arial";
    context.textAlign = "center";

    context.fillText(
        "Game Over",
        canvas.width / 2,
        canvas.height / 2
    );
}

function drawFood() {
    const centerX = food.x * gridSize + gridSize / 2;
    const centerY = food.y * gridSize + gridSize / 2;
    
    context.beginPath();
    context.moveTo(centerX, centerY - 5);

    context.bezierCurveTo(
        centerX - 8,
        centerY - 10,
        centerX - 11,
        centerY,
        centerX - 8,
        centerY + 6
    );

    context.bezierCurveTo(
        centerX - 4,
        centerY + 11,
        centerX - 1,
        centerY + 8,
        centerX,
        centerY + 8
    );

    context.bezierCurveTo(
        centerX + 1,
        centerY + 8,
        centerX + 4,
        centerY + 11,
        centerX + 8,
        centerY + 6
    );

    context.bezierCurveTo(
        centerX + 11,
        centerY,
        centerX + 8,
        centerY - 10,
        centerX,
        centerY - 5
    );

    context.fillStyle = "#ff4f5e";
    context.fill();

    context.strokeStyle = "#a82232";
    context.lineWidth = 1.5;
    context.stroke();

    context.fillStyle = "#754321";
    context.fillRect(centerX - 1, centerY - 10, 3, 6);

    context.beginPath();
    context.fillStyle = "#65ce50";

    context.ellipse(
    centerX + 5,
    centerY - 8,
    5,
    2.5,
    -0.5,
    0,
    Math.PI * 2
  );

  context.fill();

  context.beginPath();
  context.fillStyle = "rgba(255, 255, 255, 0.7)";
  context.arc(
    centerX - 4,
    centerY - 2,
    2,
    0,
    Math.PI * 2
  );
    context.fill();

}

function placeFood() {
    do {
        food.x = Math.floor(Math.random() * tileCount);
        food.y = Math.floor(Math.random() * tileCount);
    } while (snake.some(function (segment) {
        return segment.x === food.x && segment.y === food.y;
    })
    );
}

drawSnake();
drawFood();
