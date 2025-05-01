// Game constants
const FIELD_WIDTH = 800;
const FIELD_HEIGHT = 600;
const PLAYER_RADIUS = 10;
const BALL_RADIUS = 7;
const PLAYERS_PER_TEAM = 5; // Using 5 players per team for simplicity
const PLAYER_SPEED = 3;
const SPRINT_MULTIPLIER = 1.6;
const BALL_FRICTION = 0.98;
const AI_UPDATE_FREQUENCY = 30; // Update AI every 30ms
const HALF_LENGTH = 2 * 60; // 2 minutes per half in seconds

// DOM Elements - Adding these at the beginning
const fieldEl = document.getElementById('field');
const scoreBoardEl = document.getElementById('scoreboard');
const timerEl = document.getElementById('timer');
const messageEl = document.getElementById('message');
const messageTextEl = document.getElementById('message-text');
const restartBtnEl = document.getElementById('restart-btn');

// Game state variables
let players = [];
let ball = {
    x: FIELD_WIDTH / 2,
    y: FIELD_HEIGHT / 2,
    vx: 0,
    vy: 0,
    lastTouchedBy: null,
};
let activePlayer = 0; // Index of the active player (user-controlled)
let activeTeam = 'A'; // Default team controlled by the user
let score = { A: 0, B: 0 };
let gameStarted = false;
let gameOver = false;
let halfTime = false;
let activePowerKick = false;
let powerKickCharge = 0;
let spacePressed = false;
let sprinting = false;
let timer = 0; // Game timer in seconds
let currentHalf = 1;
let gameStrategy = 'balanced'; // balanced, offensive, defensive
let lastAiUpdate = 0;

// Key state tracking
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    space: false,
    shift: false,
    arrowUp: false,
    arrowDown: false,
    arrowLeft: false,
    arrowRight: false,
    q: false,
    e: false,
    r: false,
};

// Initialize the game
function initGame() {
    createPlayers();
    createBall();
    resetPositions(true);
    updateScoreboard();

    // Set up event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    restartBtnEl.addEventListener('click', restartGame);

    // Show start message
    showMessage('Press Enter to Start!');

    // Start the game loop
    requestAnimationFrame(gameLoop);
}

// Create player elements and objects
function createPlayers() {
    players = [];

    // Create Team A (red) players
    for (let i = 0; i < PLAYERS_PER_TEAM; i++) {
        const player = {
            id: `player-a-${i}`,
            team: 'A',
            x: FIELD_WIDTH / 4,
            y: FIELD_HEIGHT / 2 + (i - Math.floor(PLAYERS_PER_TEAM / 2)) * 60,
            vx: 0,
            vy: 0,
            speed: PLAYER_SPEED,
            isGoalkeeper: i === 0,
            number: i + 1,
            element: document.createElement('div')
        };

        player.element.id = player.id;
        player.element.className = `player team-a${i === activePlayer ? ' active-player' : ''}`;
        player.element.textContent = player.number;
        fieldEl.appendChild(player.element);
        players.push(player);
    }

    // Create Team B (blue) players
    for (let i = 0; i < PLAYERS_PER_TEAM; i++) {
        const player = {
            id: `player-b-${i}`,
            team: 'B',
            x: FIELD_WIDTH * 3 / 4,
            y: FIELD_HEIGHT / 2 + (i - Math.floor(PLAYERS_PER_TEAM / 2)) * 60,
            vx: 0,
            vy: 0,
            speed: PLAYER_SPEED,
            isGoalkeeper: i === 0,
            number: i + 1,
            element: document.createElement('div')
        };

        player.element.id = player.id;
        player.element.className = 'player team-b';
        player.element.textContent = player.number;
        fieldEl.appendChild(player.element);
        players.push(player);
    }
}

// Create ball element
function createBall() {
    const ballEl = document.createElement('div');
    ballEl.id = 'ball';
    fieldEl.appendChild(ballEl);
}

// Reset player and ball positions
function resetPositions(kickOff = false) {
    // Set Team A positions
    for (let i = 0; i < PLAYERS_PER_TEAM; i++) {
        const player = players[i];
        if (player.isGoalkeeper) {
            // Goalkeeper
            player.x = 30;
            player.y = FIELD_HEIGHT / 2;
        } else if (kickOff && i === 1) {
            // Center forward for kickoff
            player.x = FIELD_WIDTH / 2 - 20;
            player.y = FIELD_HEIGHT / 2;
        } else {
            // Other players
            const posX = FIELD_WIDTH / 4 + (i % 2 === 0 ? -40 : 40);
            const posY = FIELD_HEIGHT / 2 + (i - Math.floor(PLAYERS_PER_TEAM / 2)) * 80;
            player.x = posX;
            player.y = Math.max(30, Math.min(FIELD_HEIGHT - 30, posY));
        }
        player.vx = 0;
        player.vy = 0;
    }

    // Set Team B positions
    for (let i = 0; i < PLAYERS_PER_TEAM; i++) {
        const player = players[i + PLAYERS_PER_TEAM];
        if (player.isGoalkeeper) {
            // Goalkeeper
            player.x = FIELD_WIDTH - 30;
            player.y = FIELD_HEIGHT / 2;
        } else if (kickOff && i === 1) {
            // Center forward for kickoff
            player.x = FIELD_WIDTH / 2 + 20;
            player.y = FIELD_HEIGHT / 2;
        } else {
            // Other players
            const posX = FIELD_WIDTH * 3 / 4 + (i % 2 === 0 ? 40 : -40);
            const posY = FIELD_HEIGHT / 2 + (i - Math.floor(PLAYERS_PER_TEAM / 2)) * 80;
            player.x = posX;
            player.y = Math.max(30, Math.min(FIELD_HEIGHT - 30, posY));
        }
        player.vx = 0;
        player.vy = 0;
    }

    // Reset ball position
    ball.x = FIELD_WIDTH / 2;
    ball.y = FIELD_HEIGHT / 2;
    ball.vx = 0;
    ball.vy = 0;

    // Update active player (select a field player, not goalkeeper)
    if (activeTeam === 'A') {
        activePlayer = 1; // First field player for team A
    } else {
        activePlayer = PLAYERS_PER_TEAM + 1; // First field player for team B
    }

    // Update player highlights
    updateActivePlayer();
}

// Update the visuals of the active player
function updateActivePlayer() {
    players.forEach((player, index) => {
        if (index === activePlayer) {
            player.element.classList.add('active-player');
        } else {
            player.element.classList.remove('active-player');
        }
    });
}

// Switch to the nearest player to the ball
function switchToNearestPlayer() {
    let closestDistance = Infinity;
    let closestIndex = activePlayer;

    const teamStartIndex = activeTeam === 'A' ? 0 : PLAYERS_PER_TEAM;
    const teamEndIndex = activeTeam === 'A' ? PLAYERS_PER_TEAM - 1 : PLAYERS_PER_TEAM * 2 - 1;

    for (let i = teamStartIndex; i <= teamEndIndex; i++) {
        const player = players[i];
        const dx = player.x - ball.x;
        const dy = player.y - ball.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = i;
        }
    }

    if (closestIndex !== activePlayer) {
        activePlayer = closestIndex;
        updateActivePlayer();
    }
}

// Handle keyboard input
function handleKeyDown(e) {
    // Prevent default actions (like scrolling with arrow keys)
    if(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) > -1) {
        e.preventDefault();
    }

    switch (e.key.toLowerCase()) {
        case 'w': keys.w = true; break;
        case 'a': keys.a = true; break;
        case 's': keys.s = true; break;
        case 'd': keys.d = true; break;
        case ' ': 
            keys.space = true; 
            handleSpaceStart();
            break;
        case 'shift': 
            keys.shift = true; 
            sprinting = true;
            break;
        case 'arrowup': 
            keys.arrowUp = true; 
            switchToNearestPlayer();
            break;
        case 'arrowdown': keys.arrowDown = true; break;
        case 'arrowleft': 
            keys.arrowLeft = true; 
            switchPlayerWithinTeam(-1);
            break;
        case 'arrowright': 
            keys.arrowRight = true; 
            switchPlayerWithinTeam(1);
            break;
        case 'q': 
            keys.q = true; 
            if (gameStarted && !gameOver && !halfTime) shortPass();
            break;
        case 'e': 
            keys.e = true; 
            if (gameStarted && !gameOver && !halfTime) shoot();
            break;
        case 'r': 
            keys.r = true; 
            cycleGameStrategy();
            break;
        case 'enter':
            if (!gameStarted) {
                startGame();
            } else if (halfTime) {
                startSecondHalf();
            }
            break;
    }
}

function handleKeyUp(e) {
    // Prevent default actions
    if(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) > -1) {
        e.preventDefault();
    }

    switch (e.key.toLowerCase()) {
        case 'w': keys.w = false; break;
        case 'a': keys.a = false; break;
        case 's': keys.s = false; break;
        case 'd': keys.d = false; break;
        case ' ': 
            keys.space = false; 
            if (spacePressed) handleSpaceRelease();
            break;
        case 'shift': 
            keys.shift = false; 
            sprinting = false;
            break;
        case 'arrowup': keys.arrowUp = false; break;
        case 'arrowdown': keys.arrowDown = false; break;
        case 'arrowleft': keys.arrowLeft = false; break;
        case 'arrowright': keys.arrowRight = false; break;
        case 'q': keys.q = false; break;
        case 'e': keys.e = false; break;
        case 'r': keys.r = false; break;
    }
}

// Switch to next/previous player within the team
function switchPlayerWithinTeam(direction) {
    const teamStartIndex = activeTeam === 'A' ? 0 : PLAYERS_PER_TEAM;
    const teamEndIndex = activeTeam === 'A' ? PLAYERS_PER_TEAM - 1 : PLAYERS_PER_TEAM * 2 - 1;

    let newIndex = activePlayer + direction;

    if (newIndex < teamStartIndex) {
        newIndex = teamEndIndex;
    } else if (newIndex > teamEndIndex) {
        newIndex = teamStartIndex;
    }

    activePlayer = newIndex;
    updateActivePlayer();
}

// Handle spacebar press (begin power kick charge)
function handleSpaceStart() {
    if (!gameStarted || gameOver || halfTime) return;

    spacePressed = true;
    activePowerKick = true;
    powerKickCharge = 0;
}

// Handle spacebar release (execute power kick)
function handleSpaceRelease() {
    if (!gameStarted || gameOver || halfTime) return;

    spacePressed = false;
    activePowerKick = false;

    kickBall(powerKickCharge);
    powerKickCharge = 0;
}

// Perform a short pass to the nearest teammate
function shortPass() {
    const currentPlayer = players[activePlayer];
    let closestTeammate = null;
    let closestDistance = Infinity;

    // Find the closest teammate
    const teamStartIndex = activeTeam === 'A' ? 0 : PLAYERS_PER_TEAM;
    const teamEndIndex = activeTeam === 'A' ? PLAYERS_PER_TEAM - 1 : PLAYERS_PER_TEAM * 2 - 1;

    for (let i = teamStartIndex; i <= teamEndIndex; i++) {
        if (i === activePlayer) continue;

        const teammate = players[i];
        const dx = teammate.x - currentPlayer.x;
        const dy = teammate.y - currentPlayer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < closestDistance && distance < 200) { // Only pass to players within a reasonable range
            closestDistance = distance;
            closestTeammate = teammate;
        }
    }

    if (closestTeammate) {
        // Calculate direction to teammate
        const dx = closestTeammate.x - currentPlayer.x;
        const dy = closestTeammate.y - currentPlayer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const dirX = dx / distance;
        const dirY = dy / distance;

        // Set ball velocity towards teammate with appropriate power
        const passStrength = 8 + Math.min(distance / 30, 6);
        ball.vx = dirX * passStrength;
        ball.vy = dirY * passStrength;
        ball.lastTouchedBy = currentPlayer;
    }
}

// Shoot towards the opponent's goal
function shoot() {
    const currentPlayer = players[activePlayer];

    // Determine which goal to aim for
    const targetGoalX = activeTeam === 'A' ? FIELD_WIDTH : 0;
    const targetGoalY = FIELD_HEIGHT / 2;

    // Calculate direction to goal
    const dx = targetGoalX - currentPlayer.x;
    const dy = targetGoalY - currentPlayer.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const dirX = dx / distance;
    const dirY = dy / distance;

    // Set ball velocity towards goal with high power
    const shootStrength = 12 + Math.min(4, Math.random() * 6);
    ball.vx = dirX * shootStrength;
    ball.vy = dirY * shootStrength + (Math.random() * 2 - 1); // Add a slight vertical randomness
    ball.lastTouchedBy = currentPlayer;
}

// Cycle through game strategies
function cycleGameStrategy() {
    if (gameStrategy === 'balanced') {
        gameStrategy = 'offensive';
        showMessage('Offensive Strategy', 1000);
    } else if (gameStrategy === 'offensive') {
        gameStrategy = 'defensive';
        showMessage('Defensive Strategy', 1000);
    } else {
        gameStrategy = 'balanced';
        showMessage('Balanced Strategy', 1000);
    }
}

// Kick the ball based on power charge
function kickBall(power) {
    const currentPlayer = players[activePlayer];
    const playerToBallDistance = getDistance(currentPlayer, ball);

    // Only kick if the ball is close enough
    if (playerToBallDistance <= PLAYER_RADIUS + BALL_RADIUS + 15) {
        // Calculate direction from player to ball
        const dx = ball.x - currentPlayer.x;
        const dy = ball.y - currentPlayer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Normalize direction
        const dirX = dx / distance;
        const dirY = dy / distance;

        // Apply force based on power (min 3, max 12)
        const kickStrength = 3 + (power / 100) * 9;
        ball.vx = dirX * kickStrength;
        ball.vy = dirY * kickStrength;
        ball.lastTouchedBy = currentPlayer;
    }
}

// Start the game
function startGame() {
    gameStarted = true;
    gameOver = false;
    halfTime = false;
    score = { A: 0, B: 0 };
    timer = 0;
    currentHalf = 1;
    updateScoreboard();
    resetPositions(true);
    hideMessage();
}

// Start the second half
function startSecondHalf() {
    halfTime = false;
    currentHalf = 2;
    resetPositions(true);
    hideMessage();
}

// Restart the game
function restartGame() {
    gameStarted = false;
    gameOver = false;
    halfTime = false;
    score = { A: 0, B: 0 };
    timer = 0;
    currentHalf = 1;
    updateScoreboard();
    resetPositions(true);
    showMessage('Press Enter to Start!');
    restartBtnEl.style.display = 'none';
}

// Show a message on screen
function showMessage(text, timeout = 0) {
    messageTextEl.textContent = text;
    messageEl.style.display = 'block';

    if (timeout > 0) {
        setTimeout(hideMessage, timeout);
    }
}

// Hide the message
function hideMessage() {
    messageEl.style.display = 'none';
}

// Update the scoreboard
function updateScoreboard() {
    scoreBoardEl.textContent = `Team A: ${score.A} - ${score.B} :Team B`;

    // Format timer as MM:SS
    const minutes = Math.floor(timer / 60).toString().padStart(2, '0');
    const seconds = (timer % 60).toString().padStart(2, '0');
    timerEl.textContent = `${minutes}:${seconds} - Half ${currentHalf}`;
}

// Score a goal
function scoreGoal(team) {
    score[team]++;
    updateScoreboard();

    const scoringTeam = team === 'A' ? 'Team A' : 'Team B';
    showMessage(`GOAL! ${scoringTeam} scores!`, 2000);

    setTimeout(() => {
        resetPositions(true);
    }, 2000);
}

// End the game
function endGame() {
    gameOver = true;

    let resultMessage = '';
    if (score.A > score.B) {
        resultMessage = `Game Over! Team A wins ${score.A}-${score.B}!`;
    } else if (score.B > score.A) {
        resultMessage = `Game Over! Team B wins ${score.B}-${score.A}!`;
    } else {
        resultMessage = `Game Over! It's a draw ${score.A}-${score.B}!`;
    }

    showMessage(resultMessage);
    restartBtnEl.style.display = 'block';
}

// Half time break
function startHalfTime() {
    halfTime = true;
    showMessage('Half Time! Press Enter to start second half.');
}

// Calculate distance between two objects
function getDistance(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// AI logic for the computer-controlled team
function updateAI(timestamp) {
    if (timestamp - lastAiUpdate < AI_UPDATE_FREQUENCY) return;
    lastAiUpdate = timestamp;

    const opposingTeam = activeTeam === 'A' ? 'B' : 'A';
    const teamStartIndex = opposingTeam === 'A' ? 0 : PLAYERS_PER_TEAM;
    const teamEndIndex = opposingTeam === 'A' ? PLAYERS_PER_TEAM - 1 : PLAYERS_PER_TEAM * 2 - 1;

    // Get the closest player to the ball from the AI team
    let closestPlayer = null;
    let closestDistance = Infinity;

    // Reset AI player velocities
    for (let i = teamStartIndex; i <= teamEndIndex; i++) {
        const player = players[i];
        player.vx = 0;
        player.vy = 0;

        const distance = getDistance(player, ball);
        if (distance < closestDistance) {
            closestDistance = distance;
            closestPlayer = player;
        }
    }

    // Determine which goal to attack
    const attackGoalX = opposingTeam === 'A' ? FIELD_WIDTH : 0;
    const defenseGoalX = opposingTeam === 'A' ? 0 : FIELD_WIDTH;

    // Move AI players based on their role and the situation
    for (let i = teamStartIndex; i <= teamEndIndex; i++) {
        const player = players[i];

        if (player.isGoalkeeper) {
            // Goalkeeper logic - stay near the goal line and try to block the ball
            let targetX = defenseGoalX + (opposingTeam === 'A' ? 30 : -30);
            let targetY = ball.y;

            // Limit goalkeeper movement range
            targetY = Math.max(FIELD_HEIGHT / 2 - 80, Math.min(FIELD_HEIGHT / 2 + 80, targetY));

            // Move towards target position
            const dx = targetX - player.x;
            const dy = targetY - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 5) {
                player.vx = (dx / distance) * player.speed * 0.8;
                player.vy = (dy / distance) * player.speed * 0.8;
            }
        } 
        else if (player === closestPlayer) {
            // Closest player chases the ball
            const dx = ball.x - player.x;
            const dy = ball.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > PLAYER_RADIUS + BALL_RADIUS) {
                player.vx = (dx / distance) * player.speed;
                player.vy = (dy / distance) * player.speed;
            } 
            else {
                // If close to the ball, try to kick it towards the goal
                const goalX = attackGoalX;
                const goalY = FIELD_HEIGHT / 2;

                const goalDx = goalX - ball.x;
                const goalDy = goalY - ball.y;
                const goalDistance = Math.sqrt(goalDx * goalDx + goalDy * goalDy);

                // Kick the ball
                if (Math.random() < 0.05 && getDistance(player, ball) <= PLAYER_RADIUS + BALL_RADIUS + 10) {
                    const kickStrength = 5 + Math.random() * 5;

                    if (goalDistance < 200 && Math.random() < 0.7) {
                        // Close to goal, attempt a shot
                        ball.vx = (goalDx / goalDistance) * kickStrength * 1.5;
                        ball.vy = (goalDy / goalDistance) * kickStrength * 1.5 + (Math.random() * 2 - 1);
                    } else {
                        // Pass to a teammate or move forward
                        ball.vx = (goalDx / goalDistance) * kickStrength;
                        ball.vy = (goalDy / goalDistance) * kickStrength + (Math.random() * 4 - 2);
                    }
                    ball.lastTouchedBy = player;
                }
            }
        } else {
            // Other players - position themselves strategically
            let targetX, targetY;
            
            // Field position based on strategy
            if (gameStrategy === 'defensive') {
                // More defensive positioning
                targetX = defenseGoalX + (opposingTeam === 'A' ? 150 : -150);
                targetY = FIELD_HEIGHT / 2 + ((i - teamStartIndex) - Math.floor(PLAYERS_PER_TEAM / 2)) * 80;
            } else if (gameStrategy === 'offensive') {
                // More offensive positioning
                targetX = attackGoalX - (opposingTeam === 'A' ? 150 : -150);
                targetY = FIELD_HEIGHT / 2 + ((i - teamStartIndex) - Math.floor(PLAYERS_PER_TEAM / 2)) * 80;
            } else {
                // Balanced positioning
                targetX = FIELD_WIDTH / 2 + (opposingTeam === 'A' ? -100 : 100);
                targetY = FIELD_HEIGHT / 2 + ((i - teamStartIndex) - Math.floor(PLAYERS_PER_TEAM / 2)) * 80;
            }
            
            // Adjust position based on ball location
            targetX += (ball.x - FIELD_WIDTH / 2) * 0.3;
            
            // Keep players within bounds
            targetY = Math.max(30, Math.min(FIELD_HEIGHT - 30, targetY));
            
            // Move towards target position
            const dx = targetX - player.x;
            const dy = targetY - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 10) {
                player.vx = (dx / distance) * player.speed * 0.7;
                player.vy = (dy / distance) * player.speed * 0.7;
            }
        }
    }
}

// Main game loop
function gameLoop(timestamp) {
    // Update game timer
    if (gameStarted && !gameOver && !halfTime) {
        const deltaTime = 1/60; // Assume 60fps for timer
        timer += deltaTime;
        
        // Check for end of half or game
        if (currentHalf === 1 && timer >= HALF_LENGTH) {
            startHalfTime();
        } else if (currentHalf === 2 && timer >= HALF_LENGTH * 2) {
            endGame();
        }
        
        updateScoreboard();
    }

    // Process player input
    const currentPlayer = players[activePlayer];
    if (gameStarted && !gameOver && !halfTime) {
        // Movement direction
        let moveX = 0;
        let moveY = 0;
        
        if (keys.w) moveY -= 1;
        if (keys.s) moveY += 1;
        if (keys.a) moveX -= 1;
        if (keys.d) moveX += 1;
        
        // Normalize diagonal movement
        if (moveX !== 0 && moveY !== 0) {
            const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
            moveX /= magnitude;
            moveY /= magnitude;
        }
        
        // Apply sprint multiplier if sprinting
        const speedMultiplier = sprinting ? SPRINT_MULTIPLIER : 1;
        
        // Set player velocity
        currentPlayer.vx = moveX * currentPlayer.speed * speedMultiplier;
        currentPlayer.vy = moveY * currentPlayer.speed * speedMultiplier;
        
        // Update power kick charge
        if (activePowerKick) {
            powerKickCharge = Math.min(100, powerKickCharge + 2);
        }
        
        // Update AI
        updateAI(timestamp);
    }
    
    // Update player positions
    for (let i = 0; i < players.length; i++) {
        const player = players[i];
        
        // Update position
        player.x += player.vx;
        player.y += player.vy;
        
        // Keep player within bounds
        player.x = Math.max(PLAYER_RADIUS, Math.min(FIELD_WIDTH - PLAYER_RADIUS, player.x));
        player.y = Math.max(PLAYER_RADIUS, Math.min(FIELD_HEIGHT - PLAYER_RADIUS, player.y));
        
        // Update player element position
        player.element.style.transform = `translate(${Math.round(player.x - PLAYER_RADIUS)}px, ${Math.round(player.y - PLAYER_RADIUS)}px)`;
    }
    
    // Update ball physics
    if (gameStarted && !gameOver && !halfTime) {
        // Apply friction
        ball.vx *= BALL_FRICTION;
        ball.vy *= BALL_FRICTION;
        
        // Update position
        ball.x += ball.vx;
        ball.y += ball.vy;
        
        // Bounce off walls
        if (ball.x < BALL_RADIUS) {
            // Left wall
            if (ball.y > FIELD_HEIGHT / 2 - 50 && ball.y < FIELD_HEIGHT / 2 + 50) {
                // Goal for Team B
                scoreGoal('B');
            } else {
                // Bounce off wall
                ball.x = BALL_RADIUS;
                ball.vx = -ball.vx * 0.7;
            }
        } else if (ball.x > FIELD_WIDTH - BALL_RADIUS) {
            // Right wall
            if (ball.y > FIELD_HEIGHT / 2 - 50 && ball.y < FIELD_HEIGHT / 2 + 50) {
                // Goal for Team A
                scoreGoal('A');
            } else {
                // Bounce off wall
                ball.x = FIELD_WIDTH - BALL_RADIUS;
                ball.vx = -ball.vx * 0.7;
            }
        }
        
        if (ball.y < BALL_RADIUS) {
            // Top wall
            ball.y = BALL_RADIUS;
            ball.vy = -ball.vy * 0.7;
        } else if (ball.y > FIELD_HEIGHT - BALL_RADIUS) {
            // Bottom wall
            ball.y = FIELD_HEIGHT - BALL_RADIUS;
            ball.vy = -ball.vy * 0.7;
        }
        
        // Ball-Player collision
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            const dx = ball.x - player.x;
            const dy = ball.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < PLAYER_RADIUS + BALL_RADIUS) {
                // Collision response
                const nx = dx / distance;
                const ny = dy / distance;
                const relativeVelocityX = ball.vx - player.vx;
                const relativeVelocityY = ball.vy - player.vy;
                const dotProduct = nx * relativeVelocityX + ny * relativeVelocityY;
                
                // Only bounce if moving towards each other
                if (dotProduct < 0) {
                    // Apply impulse
                    const impulse = -1.2 * dotProduct;
                    ball.vx += impulse * nx;
                    ball.vy += impulse * ny;
                    
                    // Record last touch
                    ball.lastTouchedBy = player;
                }
                
                // Separate ball and player
                const separationDistance = PLAYER_RADIUS + BALL_RADIUS - distance;
                ball.x += nx * separationDistance;
                ball.y += ny * separationDistance;
            }
        }
        
        // Stop ball if very slow
        if (Math.abs(ball.vx) < 0.1 && Math.abs(ball.vy) < 0.1) {
            ball.vx = 0;
            ball.vy = 0;
        }
    }
    
    // Update ball element position
    const ballEl = document.getElementById('ball');
    ballEl.style.transform = `translate(${Math.round(ball.x - BALL_RADIUS)}px, ${Math.round(ball.y - BALL_RADIUS)}px)`;
    
    // Continue the game loop
    requestAnimationFrame(gameLoop);
}

// Initialize the game when the page loads
window.addEventListener('load', initGame);