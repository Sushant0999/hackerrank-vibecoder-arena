/**
 * Cosmic Drift - Arcade Game: Main logic and rendering.
 * This script handles player movement, obstacle generation, reward collection,
 * collision detection, and game state management for a space-themed dodge game.
 */

"use strict";

//-------------------------//
//--   CONFIG CONSTANTS   --//
//-------------------------//
const GAME_WIDTH = 800; // Width of the game canvas
const GAME_HEIGHT = 600; // Height of the game canvas

const PLAYER_WIDTH = 50; // Width of the player's spaceship
const PLAYER_HEIGHT = 80; // Height of the player's spaceship
const PLAYER_ACCELERATION = 2250; // How quickly the player accelerates
const PLAYER_MAX_SPEED = 410; // Maximum speed the player can reach
const PLAYER_DRAG = 0.14; // Friction applied to slow the player down
const PLAYER_MOVEMENT_SENSITIVITY = 0.8; // Controls how responsive the player movement is (lower is less sensitive)
const PLAYER_INVINCIBLE_DURATION = 1.5; // Duration of player invincibility after collision in seconds

const STAR_SIZE_MIN = 0.5; // Minimum size for background stars
const STAR_SIZE_MAX = 2; // Maximum size for background stars
const STAR_COUNT = 100; // Number of background stars
const STAR_MOVEMENT_SPEED = 50; // Speed at which background stars move

const METEOR_SIZE_MIN = 40; // Minimum size for meteor obstacles
const METEOR_SIZE_MAX = 120; // Maximum size for meteor obstacles
const METEOR_SPEED_INITIAL = 80; // Initial speed of meteors
const METEOR_SPAWN_INTERVAL = 0.8; // Base spawn interval for meteors (seconds per meteor)

const BROKEN_PLANET_SIZE_MIN = 80; // Minimum size for broken planet obstacles
const BROKEN_PLANET_SIZE_MAX = 200; // Maximum size for broken planet obstacles
const BROKEN_PLANET_SPAWN_CHANCE = 0.05; // Spawn chance for broken planets (per update frame)

const REWARD_SPAWN_CHANCE = 0.02; // Spawn chance for rewards (per update frame)
const REWARD_DURATION = 5; // Duration of most power-ups in seconds
const REWARD_SPEED = 100; // Speed at which rewards fall
const BULLET_SPEED = 400; // Speed of player-fired bullets
const BULLET_SIZE = 8; // Size of player-fired bullets
const SHOOT_COOLDOWN = 0.2; // Cooldown between player shots in seconds

const TURBO_SPEED_MULTIPLIER = 2; // Speed multiplier when turbo reward is active
const TURBO_REWARD_DURATION = 3; // Duration of turbo reward in seconds

const EXHAUST_ANIM_SPEED = 10; // Speed of player exhaust animation
const COLLISION_SHAKE_DURATION = 0.22; // Duration of screen shake effect after collision
const NEBULA_ANIMATION_FACTOR = 0.00001; // Factor for subtle nebula background animation

const PLAYER_MAX_HEALTH = 100; // Maximum health of the player
const DAMAGE_SMALL_COLLISION = 10; // Damage from small collision
const DAMAGE_MEDIUM_COLLISION = 30; // Damage from medium collision
const DAMAGE_STRONG_COLLISION = 60; // Damage from strong collision
const HEALTH_PICKUP = 30; // Health restored by health reward

const LEVEL_UP_SCORE_THRESHOLD = 500; // Score required to level up
const ENVIRONMENT_CHANGE_SCORE_THRESHOLD = 2000; // Score required to change environment

// Game over quotes
const GAME_OVER_QUOTES = [
  "Space is vast, and so are its perils. Try again!",
  "The cosmos claims another. But your legend awaits!",
  "Lost in the void. Chart a new course!",
  "Failure is just a part of the journey through the stars.",
  "Your ship may be gone, but your spirit of adventure remains!",
  "Even the bravest explorers fall. Rise once more!"
];

// Environments configuration
const ENVIRONMENTS = [
  { name: "Andromeda Galaxy", bgColor: ['#00000a', '#0a0a20', '#00000a'], nebulaColor: 'rgba(100, 50, 150, 0.1)', obstacleColor: ['#5a5a5a', '#777777', '#999999'] },
  { name: "Milky Way Galaxy", bgColor: ['#0d0d1a', '#1a1a3a', '#0d0d1a'], nebulaColor: 'rgba(50, 100, 150, 0.1)', obstacleColor: ['#6a5a5a', '#887777', '#a99999'] },
  { name: "Nebula Galaxy", bgColor: ['#0a0510', '#200a20', '#0a0510'], nebulaColor: 'rgba(150, 50, 100, 0.1)', obstacleColor: ['#4a4a4a', '#666666', '#888888'] },
  { name: "Wormhole", bgColor: ['#000000', '#202020', '#000000'], nebulaColor: 'rgba(20, 20, 20, 0.2)', obstacleColor: ['#707070', '#909090', '#b0b0b0'] },
  { name: "Black Hole", bgColor: ['#000000', '#000000', '#000000'], nebulaColor: 'rgba(0, 0, 0, 0.3)', obstacleColor: ['#303030', '#505050', '#707070'] }
];

//-------------------------//
//--   GAME STATE VARS   --//
//-------------------------//
let player = {
  x: GAME_WIDTH / 2 - PLAYER_WIDTH / 2, // Player's X position
  y: GAME_HEIGHT - PLAYER_HEIGHT - 20, // Player's Y position
  vx: 0, vy: 0, // Player's velocity in X and Y
  exhaustOffset: 0, // Used for exhaust animation
  lastCollisionTime: 0, // Timestamp of the last player collision for screen shake
  invincible: false, shooter: false, turbo: false, // Power-up states
  invincibleTimer: 0, shooterTimer: 0, turboTimer: 0, // Power-up countdown timers
  lastShotTime: 0, // Timestamp of the last shot fired
  health: PLAYER_MAX_HEALTH, // Current player health
  blink: false, // Used for player invincibility blink effect
  blinkTimer: 0, // Tracks blinking time
  invincibleEffectEndTime: 0, // Timestamp when invincibility ends
};

let obstacles = []; // Array to store active obstacles
let bullets = []; // Array to store active bullets
let rewards = []; // Array to store active rewards

let score = 0; // Current score
let highestScore = 0; // Highest score achieved in localStorage
let level = 1; // Current level
let currentEnvironmentIndex = 0; // Current environment index
let gameOver = true; // Is the game over?
let gameRunning = false; // Is the game currently active?
let timePlayed = 0; // Total time played in current game session

let lastObstacleSpawnTime = 0; // Timestamp for controlling obstacle spawn rate
let lastFrameTime = 0; // Timestamp of the previous frame for delta time calculation
let keys = {}; // Object to track currently pressed keys
let backgroundStars = []; // Array for background star objects
let requestAnimationFrameId = null; // ID of the requestAnimationFrame loop for cancellation

// Environment transition
let lastEnvironmentChangeScore = 0; // Score at which environment last changed

//-------------------------//
//--   DOM CACHE + SETUP  --//
//-------------------------//
const canvas = globalThis.document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = globalThis.document.getElementById('score');
const levelDisplay = globalThis.document.getElementById('level');
const healthDisplay = globalThis.document.getElementById('health');
const startScreen = globalThis.document.getElementById('start-screen');
const gameOverScreen = globalThis.document.getElementById('game-over-screen');
const finalScoreDisplay = globalThis.document.getElementById('final-score');
const startButton = globalThis.document.getElementById('start-btn');
const restartButton = globalThis.document.getElementById('restart-btn');
const invincibleRewardIndicator = globalThis.document.getElementById('invincible-reward');
const shooterRewardIndicator = globalThis.document.getElementById('shooter-reward');
const healthRewardIndicator = globalThis.document.getElementById('health-reward');
const turboRewardIndicator = globalThis.document.getElementById('turbo-reward');
const highestScoreDisplay = globalThis.document.getElementById('highest-score-display');
const gameOverHighestScoreDisplay = globalThis.document.getElementById('game-over-highest-score');
const gameOverQuoteDisplay = globalThis.document.getElementById('game-over-quote');

canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

//-------------------------//
//--   HELPER FUNCTIONS   --//
//-------------------------//

/**
 * Generates a cryptographically secure random floating-point number within a specified range.
 * @param {number} min - The minimum value (inclusive).
 * @param {number} max - The maximum value (exclusive).
 * @returns {number} A random number between min and max.
 */
function getRandomArbitrary(min, max) {
  const array = new Uint32Array(1);
  globalThis.crypto.getRandomValues(array);
  return (array[0] / 0x100000000) * (max - min) + min;
}

/**
 * Generates a cryptographically secure random integer within a specified range.
 * @param {number} min - The minimum value (inclusive).
 * @param {number} max - The maximum value (inclusive).
 * @returns {number} A random integer between min and max.
 */
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(getRandomArbitrary(min, max + 1));
}

/**
 * Loads the highest score from local storage.
 */
function loadHighestScore() {
  const storedScore = globalThis.localStorage.getItem('cosmicDriftHighestScore');
  highestScore = storedScore ? Number.parseFloat(storedScore) : 0;
  if(highestScoreDisplay) highestScoreDisplay.textContent = Math.floor(highestScore);
  if(gameOverHighestScoreDisplay) gameOverHighestScoreDisplay.textContent = Math.floor(highestScore);
}

/**
 * Saves the current high score to local storage.
 */
function saveHighestScore() {
  if (score > highestScore) {
    highestScore = score;
    globalThis.localStorage.setItem('cosmicDriftHighestScore', Math.floor(highestScore));
    if(highestScoreDisplay) highestScoreDisplay.textContent = Math.floor(highestScore);
    if(gameOverHighestScoreDisplay) gameOverHighestScoreDisplay.textContent = Math.floor(highestScore);
  }
}

//-------------------------//
//--     INIT STARS      --//
//-------------------------//
/**
 * Initializes the array of background stars with random positions, sizes, and speeds.
 */
function initializeStars() {
  backgroundStars = []; // Clear existing stars
  for (let i = 0; i < STAR_COUNT; i++) {
    backgroundStars.push({
      x: getRandomArbitrary(0, GAME_WIDTH),
      y: getRandomArbitrary(0, GAME_HEIGHT),
      size: getRandomArbitrary(STAR_SIZE_MIN, STAR_SIZE_MAX / 2),
      speed: getRandomArbitrary(0.1, 0.5)
    });
  }
}
initializeStars(); // Call once at startup

//-------------------------//
//--   INPUT HANDLERS    --//
//-------------------------//
/**
 * Handles keydown events to track which keys are pressed.
 * Prevents key repeat from constantly triggering actions.
 * @param {KeyboardEvent} e - The keyboard event object.
 */
globalThis.document.addEventListener('keydown', function(e) {
  if (!e.repeat) { // Ignore key repeats
    keys[e.key.toLowerCase()] = true;
    // Prevent default scrolling behavior for arrow keys and spacebar
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) {
        e.preventDefault();
    }
  }
});

/**
 * Handles keyup events to track which keys are no longer pressed.
 * @param {KeyboardEvent} e - The keyboard event object.
 */
globalThis.document.addEventListener('keyup', function(e) {
  keys[e.key.toLowerCase()] = false;
});

/**
 * Updates player's velocity based on key presses, applying acceleration,
 * drag, and clamping to maximum speed. Normalizes diagonal movement sensitivity.
 * @param {number} dt - Delta time (time elapsed since last frame) for frame independence.
 */
function updatePlayerVelocity(dt) {
  let targetVx = 0;
  let targetVy = 0;

  // Determine target velocity based on pressed keys
  if (keys['w'] || keys['arrowup'])    targetVy -= 1;
  if (keys['s'] || keys['arrowdown'])  targetVy += 1;
  if (keys['a'] || keys['arrowleft'])  targetVx -= 1;
  if (keys['d'] || keys['arrowright']) targetVx += 1;

  // Normalize diagonal movement to prevent faster diagonal speed
  const mag = Math.hypot(targetVx, targetVy);
  if (Number.isFinite(mag) && mag > 0) { // Check for valid magnitude
    targetVx /= mag;
    targetVy /= mag;
  }

  // Calculate maximum speed considering turbo power-up
  const maxSpeed = player.turbo ? PLAYER_MAX_SPEED * TURBO_SPEED_MULTIPLIER : PLAYER_MAX_SPEED;

  // Apply acceleration based on target direction
  player.vx += targetVx * PLAYER_ACCELERATION * dt * PLAYER_MOVEMENT_SENSITIVITY;
  player.vy += targetVy * PLAYER_ACCELERATION * dt * PLAYER_MOVEMENT_SENSITIVITY;

  // Apply drag to gradually slow down the ship
  player.vx -= player.vx * PLAYER_DRAG;
  player.vy -= player.vy * PLAYER_DRAG;
  
  // Clamp velocity to maximum speed
  const currentVelMag = Math.hypot(player.vx, player.vy);
  if (Number.isFinite(currentVelMag) && currentVelMag > maxSpeed) { // Check for valid magnitude
    const scale = maxSpeed / currentVelMag;
    player.vx *= scale;
    player.vy *= scale;
  }
}

/**
 * Handles the logic for firing bullets when the player has the 'shooter' power-up.
 * @param {number} timestamp - The current timestamp for shot cooldown.
 */
function handleShooting(timestamp) {
  // Check if shooter power-up is active, shoot key is pressed, and cooldown is ready
  if (player.shooter && (keys[' '] || keys['control']) && (timestamp - player.lastShotTime > SHOOT_COOLDOWN * 1000)) {
    bullets.push({
      x: player.x + PLAYER_WIDTH / 2, // Bullet starts at the center of the ship
      y: player.y, // Bullet starts at the top of the ship
      power: 1 // Damage power of the bullet
    });
    player.lastShotTime = timestamp; // Reset shot cooldown timer
  }
}

/**
 * The main game loop function.
 * Calculates delta time, updates game state, and renders everything.
 * Uses requestAnimationFrame for smooth animation.
 * @param {DOMHighResTimeStamp} timestamp - The current time provided by requestAnimationFrame.
 */
function gameLoop(timestamp) {
  // Initialize lastFrameTime on the first call
  if (lastFrameTime === 0) {
    lastFrameTime = timestamp;
  }

  // Calculate delta time in seconds, clamped to avoid large jumps if tab is backgrounded
  const dt = Math.min((timestamp - lastFrameTime) / 1000, 0.1);
  lastFrameTime = timestamp;

  if (!gameOver && gameRunning) { // Only update if game is running
    update(dt, timestamp); // Update game logic
  }
  render(dt, timestamp); // Draw game elements regardless of state to show overlays/menus

  // Request the next animation frame, perpetuating the loop
  requestAnimationFrameId = globalThis.requestAnimationFrame(gameLoop);
}

/**
 * Updates bullets position and handles their lifecycle.
 * @param {number} dt - Delta time for frame independence.
 */
function updateBullets(dt) {
  const activeBullets = [];
  for (const b of bullets) {
    b.y -= BULLET_SPEED * dt;
    if (b.y > -BULLET_SIZE) { // Keep bullet if still on screen
      activeBullets.push(b);
    }
  }
  bullets = activeBullets;
}

/**
 * Updates obstacles position and handles their lifecycle, including bullet collisions.
 * @param {number} dt - Delta time for frame independence.
 */
function updateObstacles(dt) {
  const retainedObstacles = [];
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    o.y += o.speed * dt; // Move obstacle downwards

    const newBullets = []; // Bullets that did not hit this obstacle
    for (const b of bullets) {
      if (player.shooter && !o.isDestroyed) { // Only check collision if player has shooter
        const distSq = (b.x - o.x) * (b.x - o.x) + (b.y - o.y) * (b.y - o.y);
        if (Number.isFinite(distSq) && distSq < (o.radius + BULLET_SIZE / 2) * (o.radius + BULLET_SIZE / 2)) {
          o.health -= b.power; // Reduce obstacle health
          if (o.health <= 0) {
            score += Math.floor(o.initialRadius * 2); // Award score based on obstacle size
            o.isDestroyed = true; // Mark obstacle as destroyed
          }
        } else {
          newBullets.push(b); // If bullet didn't hit, keep it
        }
      } else {
        newBullets.push(b); // If no shooter power-up, keep bullets
      }
    }
    bullets = newBullets; // Update bullets array

    // Retain obstacles that are still active (on screen or not destroyed by bullet)
    if (o.y < GAME_HEIGHT + o.radius && !o.isDestroyed) {
      retainedObstacles.push(o);
    } else if (o.y >= GAME_HEIGHT + o.radius && !o.isDestroyed) {
      score += 50; // Bonus score for avoiding un-destroyed obstacles that pass the bottom
    }
  }
  obstacles = retainedObstacles;
}

/**
 * Updates rewards position and handles their lifecycle and player collection.
 * @param {number} dt - Delta time for frame independence.
 * @param {number} timestamp - Current timestamp for time-based logic.
 */
function updateRewards(dt, timestamp) {
  const retainedRewards = [];
  for (const r of rewards) {
    r.y += REWARD_SPEED * dt; // Move reward downwards

    // Player-reward circular collision check
    const playerCenterX = player.x + PLAYER_WIDTH / 2;
    const playerCenterY = player.y + PLAYER_HEIGHT / 2;
    const playerEffectiveRadius = Math.min(PLAYER_WIDTH, PLAYER_HEIGHT) / 2; 

    const distSq = (playerCenterX - r.x) * (playerCenterX - r.x) +
                   (playerCenterY - r.y) * (playerCenterY - r.y);

    if (Number.isFinite(distSq) && distSq < (r.radius + playerEffectiveRadius) * (r.radius + playerEffectiveRadius)) {
      activateReward(r.type, timestamp); // Activate reward effect
    } else if (r.y <= GAME_HEIGHT + r.radius) { // Reward is on screen, keep it
      retainedRewards.push(r);
    }
  }
  rewards = retainedRewards;
}

/**
 * Manages the countdown timers for player power-ups and updates their UI indicators.
 * @param {number} timestamp - Current timestamp for accurate timer calculations.
 * @param {number} dt - Delta time for smooth blinking.
 */
function updatePowerupTimers(timestamp, dt) {
  // Invincibility management
  if (player.invincible && timestamp > player.invincibleEffectEndTime) {
    player.invincible = false;
    player.blink = false;
    invincibleRewardIndicator.style.display = 'none';
  } else if (player.invincible) {
    player.blinkTimer = (player.blinkTimer + dt);
    if (player.blinkTimer >= 0.1) {
      player.blink = !player.blink;
      player.blinkTimer = 0;
    }
    const remainingDuration = (player.invincibleEffectEndTime - timestamp) / 1000;
    invincibleRewardIndicator.style.opacity = (Number.isFinite(remainingDuration) && remainingDuration <= PLAYER_INVINCIBLE_DURATION / 3 && Math.floor(remainingDuration * 10) % 2 === 0) ? '0.3' : '1';
    invincibleRewardIndicator.style.display = 'inline-block';
  } else {
    invincibleRewardIndicator.style.display = 'none';
    player.blink = false;
  }

  // Shooter management
  if (player.shooter && timestamp > player.shooterTimer) {
    player.shooter = false;
    shooterRewardIndicator.style.display = 'none';
  } else if (player.shooter) {
    const remainingDuration = (player.shooterTimer - timestamp) / 1000;
    shooterRewardIndicator.style.opacity = (Number.isFinite(remainingDuration) && remainingDuration <= REWARD_DURATION / 3 && Math.floor(remainingDuration * 10) % 2 === 0) ? '0.3' : '1';
    shooterRewardIndicator.style.display = 'inline-block';
  } else {
    shooterRewardIndicator.style.display = 'none';
  }

  // Turbo management
  if (player.turbo && timestamp > player.turboTimer) {
    player.turbo = false;
    turboRewardIndicator.style.display = 'none';
  } else if (player.turbo) {
    const remainingDuration = (player.turboTimer - timestamp) / 1000;
    turboRewardIndicator.style.opacity = (Number.isFinite(remainingDuration) && remainingDuration <= TURBO_REWARD_DURATION / 3 && Math.floor(remainingDuration * 10) % 2 === 0) ? '0.3' : '1';
    turboRewardIndicator.style.display = 'inline-block';
  } else {
    turboRewardIndicator.style.display = 'none';
  }
}

/**
 * The main update function.
 * Manages player movement, obstacle/reward spawning, power-up timers,
 * and calls collision detection.
 * @param {number} dt - Delta time (time elapsed since last frame) for frame independence.
 * @param {number} timestamp - Current timestamp for time-based logic.
 */
function update(dt, timestamp) {
  timePlayed += dt; // Increment total time played

  // Player physics and boundary clamping
  updatePlayerVelocity(dt);
  handleShooting(timestamp); // Pass timestamp for accurate cooldown
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  // Clamp player position within canvas bounds
  player.x = Math.max(0, Math.min(GAME_WIDTH - PLAYER_WIDTH, player.x));
  player.y = Math.max(0, Math.min(GAME_HEIGHT - PLAYER_HEIGHT, player.y));

  // Update exhaust animation offset
  player.exhaustOffset = (player.exhaustOffset + dt * EXHAUST_ANIM_SPEED) % 2;

  // Obstacle spawning logic (dynamic based on level)
  lastObstacleSpawnTime += dt;
  const currentMeteorSpawnInterval = METEOR_SPAWN_INTERVAL / Math.sqrt(level); // Meteor rate increases with level

  if (lastObstacleSpawnTime >= currentMeteorSpawnInterval) {
    lastObstacleSpawnTime = 0;
    spawnObstacle('meteor');
  }
  if (getRandomArbitrary(0, 1) < BROKEN_PLANET_SPAWN_CHANCE * dt * Math.sqrt(level)) { // Chance increases with level for broken planets
    spawnObstacle('brokenPlanet');
  }
  
  updateObstacles(dt);
  updateBullets(dt);
  updateRewards(dt, timestamp);
  updatePowerupTimers(timestamp, dt);
  
  // Collision detection between player and obstacles
  if (!player.invincible) { // Only check if player is not invincible
    checkPlayerObstacleCollisions(timestamp);
  } else {
    // If invincible, collect points from obstacles instead of taking damage
    const retainedObstaclesInvincible = [];
    for (const o of obstacles) {
      const playerCenterX = player.x + PLAYER_WIDTH / 2;
      const playerCenterY = player.y + PLAYER_HEIGHT / 2;
      const playerEffectiveRadius = Math.min(PLAYER_WIDTH, PLAYER_HEIGHT) / 2; // Approximate player as circle
      const distSq = (playerCenterX - o.x) * (playerCenterX - o.x) +
                     (playerCenterY - o.y) * (playerCenterY - o.y);
      if (Number.isFinite(distSq) && distSq < (o.radius + playerEffectiveRadius) * (o.radius + playerEffectiveRadius)) {
        score += 20; // Bonus points for passing through obstacles while invincible
        player.lastCollisionTime = timestamp / 1000; // Trigger screen shake
      } else {
        retainedObstaclesInvincible.push(o); // Keep obstacle if no collision
      }
    }
    obstacles = retainedObstaclesInvincible; // Update obstacle list
  }
  
  // Score and level progression
  score += dt * 10; // Score increases over time
  level = Math.floor(score / LEVEL_UP_SCORE_THRESHOLD) + 1; // Update level based on score

  // Environment transition based on score
  if (Number.isFinite(score) && score - lastEnvironmentChangeScore >= ENVIRONMENT_CHANGE_SCORE_THRESHOLD) {
    currentEnvironmentIndex = (currentEnvironmentIndex + 1) % ENVIRONMENTS.length;
    lastEnvironmentChangeScore = score;
  }

  // Update UI elements
  if(scoreDisplay) scoreDisplay.textContent = Math.floor(score);
  if(levelDisplay) levelDisplay.textContent = level;
  if(healthDisplay) healthDisplay.textContent = player.health;

  // Check for game over condition
  if (player.health <= 0) {
    triggerGameOver();
  }
}

/**
 * Activates a power-up or applies a health bonus based on the reward type.
 * @param {string} type - The type of reward collected ('invincible', 'shooter', 'health', 'turbo').
 * @param {number} timestamp - Current timestamp for setting power-up end times.
 */
function activateReward(type, timestamp) {
  if (type === 'invincible') {
    player.invincible = true;
    player.invincibleEffectEndTime = timestamp + REWARD_DURATION * 1000; // Store end time
    player.blink = true; // Start blinking for visual feedback
  } else if (type === 'shooter') {
    player.shooter = true;
    player.shooterTimer = timestamp + REWARD_DURATION * 1000; // Store end time
  } else if (type === 'health') {
    player.health = Math.min(player.health + HEALTH_PICKUP, PLAYER_MAX_HEALTH); // Restore health, cap at max
  } else if (type === 'turbo') {
    player.turbo = true;
    player.turboTimer = timestamp + TURBO_REWARD_DURATION * 1000; // Store end time
  }
}


/**
 * Renders all game elements onto the canvas.
 * Applies screen shake and draws background, player, bullets, and obstacles.
 * @param {number} dt - Delta time for smooth animations.
 * @param {number} timestamp - Current timestamp for time-based effects.
 */
function render(dt, timestamp) {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT); // Clear canvas once at the beginning of render

  ctx.save(); // Save initial canvas state

  // Apply screen shake effect if a collision recently occurred
  const timeSinceCollision = (timestamp / 1000) - player.lastCollisionTime;
  if (Number.isFinite(timeSinceCollision) && timeSinceCollision < COLLISION_SHAKE_DURATION && !gameOver) { // Only shake if game is not over
    ctx.translate(getRandomArbitrary(-5, 5), getRandomArbitrary(-5, 5));
  }

  // Draw background elements (stars, nebula)
  drawBackground(dt, ENVIRONMENTS[currentEnvironmentIndex]);

  // Draw rewards and collectibles
  for (const reward of rewards) {
    ctx.fillStyle = reward.color;
    ctx.beginPath();
    ctx.arc(reward.x, reward.y, reward.radius, 0, Math.PI * 2);
    ctx.shadowColor = reward.color;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw emoji icons for rewards
    ctx.fillStyle = "#FFF";
    ctx.font = `${reward.radius * 1.2}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (reward.type === 'invincible') ctx.fillText("🛡️", reward.x, reward.y + 2);
    else if (reward.type === 'shooter') ctx.fillText("🔫", reward.x, reward.y + 2);
    else if (reward.type === 'health') ctx.fillText("❤️", reward.x, reward.y + 2);
    else if (reward.type === 'turbo') ctx.fillText("⚡", reward.x, reward.y + 2);
  }

  // Draw player ship only if not completely invisible during invincibility blink and game is running
  if (gameRunning && (!player.invincible || (player.invincible && player.blink))) {
    drawPlayerShip(player.x, player.y);
    drawExhaust(); // Draw exhaust particles for the player ship
  }

  // Draw bullets
  for (const bullet of bullets) {
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, BULLET_SIZE / 2, 0, Math.PI * 2);
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Draw obstacles (meteors and broken planets) without spinning, only movement
  for (const o of obstacles) {
    ctx.save();
    ctx.translate(o.x, o.y); // Translate to the obstacle's center
    
    ctx.beginPath();
    // Use dynamic number of segments for irregular shapes
    const segments = (o.type === 'meteor') ? getRandomInt(5, 8) : getRandomInt(8, 12);
    // Draw the irregular shape based on fixed random points per obstacle
    for (let i = 0; i < segments; i++) {
        const angle = (Math.PI * 2 / segments) * i;
        // Ensure o.randomPoints[i] exists, otherwise fall back to o.radius
        const currentRadius = Number.isFinite(o.randomPoints[i]) ? o.randomPoints[i] : o.radius; 
        const xCoord = currentRadius * Math.cos(angle + o.initialRotationOffset); 
        const yCoord = currentRadius * Math.sin(angle + o.initialRotationOffset);
        if (i === 0) ctx.moveTo(xCoord, yCoord);
        else ctx.lineTo(xCoord, yCoord);
    }
    ctx.closePath();
    ctx.fillStyle = o.color;
    ctx.shadowColor = o.color;
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;

    // For broken planets, add crack details
    if (o.type === 'brokenPlanet') {
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; // Darken for cracks
      for(let j = 0; j < o.cracks.length; j++) {
        const crack = o.cracks[j];
        ctx.beginPath();
        ctx.arc(crack.x, crack.y, crack.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore(); // Restore canvas state after drawing each obstacle
  }

  // Render game over or start screens if active.
  // These DOM elements are handled by CSS display property set in startGame/triggerGameOver.
  // No need to draw them on canvas.

  ctx.restore(); // Restore canvas state for screen shake effect
}

//-------------------------//
//--    DRAWING SYSTEM   --//
//-------------------------//

/**
 * Draws the player's spaceship with a sleek, futuristic design.
 * @param {number} x - X coordinate of the spaceship.
 * @param {number} y - Y coordinate of the spaceship.
 */
function drawPlayerShip(x, y) {
  ctx.save();
  ctx.translate(x + PLAYER_WIDTH / 2, y + PLAYER_HEIGHT / 2); // Center drawing origin
  // Scale based on PLAYER_WIDTH/HEIGHT to maintain proportion
  ctx.scale(PLAYER_WIDTH / 70, PLAYER_HEIGHT / 110);

  // Main hull/fuselage (cyan-blue gradient)
  ctx.beginPath();
  ctx.moveTo(0, -52); // Nose tip
  ctx.lineTo(-20, 30); // Left wing back
  ctx.lineTo(-10, 20);
  ctx.lineTo(-6, 34); // Left exhaust part
  ctx.lineTo(0, 32); // Bottom center
  ctx.lineTo(6, 34); // Right exhaust part
  ctx.lineTo(10, 20);
  ctx.lineTo(20, 30); // Right wing back
  ctx.closePath();
  // Hull gradient for depth
  const hullGradient = ctx.createLinearGradient(0, -52, 0, 34);
  hullGradient.addColorStop(0, '#e8faff');
  hullGradient.addColorStop(0.5, '#85d9f7');
  hullGradient.addColorStop(1, '#58aee4');
  ctx.fillStyle = hullGradient;
  ctx.shadowColor = '#aefaff'; // Neon glow
  ctx.shadowBlur = 14;
  ctx.fill();
  ctx.shadowBlur = 0; // Reset shadow for other elements

  // Wing lines for detail and structure
  ctx.strokeStyle = '#58aee4';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-18, 0); ctx.lineTo(18, 0); // Main wing line
  ctx.moveTo(-10, 20); ctx.lineTo(10, 20); // Rear wing line
  ctx.stroke();

  // Cockpit bubble: glowing blue ellipse
  ctx.beginPath();
  ctx.ellipse(0, -22, 8, 13, 0, 0, 2 * Math.PI);
  ctx.fillStyle = '#26c6f5';
  ctx.strokeStyle = '#eafefd';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.93; // Slight transparency for glass effect
  ctx.fill();
  ctx.globalAlpha = 1.0;
  ctx.stroke();

  ctx.restore(); // Restore canvas state
}

/**
 * Draws the exhaust flames behind the player ship, with a flickering effect.
 */
function drawExhaust() {
  const color1 = 'rgba(255, 100, 0, 0.8)'; // Orange flame
  const color2 = 'rgba(255, 200, 0, 0.6)'; // Yellow flame
  const exhaustBaseY = player.y + PLAYER_HEIGHT; // Base of exhaust
  const exhaustWidth = PLAYER_WIDTH * 0.4; // Width of exhaust plume

  ctx.save();
  ctx.globalAlpha = 0.82;

  // Outer flame
  ctx.fillStyle = color1;
  ctx.beginPath();
  ctx.moveTo(player.x + PLAYER_WIDTH / 2 - exhaustWidth / 2, exhaustBaseY);
  ctx.lineTo(player.x + PLAYER_WIDTH / 2 + exhaustWidth / 2, exhaustBaseY);
  // Oscillate height for flickering
  ctx.lineTo(player.x + PLAYER_WIDTH / 2 + exhaustWidth / 4, exhaustBaseY + 16 + player.exhaustOffset * 6);
  ctx.lineTo(player.x + PLAYER_WIDTH / 2 - exhaustWidth / 4, exhaustBaseY + 16 + player.exhaustOffset * 6);
  ctx.closePath();
  ctx.fill();

  // Inner flame
  ctx.fillStyle = color2;
  ctx.beginPath();
  ctx.moveTo(player.x + PLAYER_WIDTH / 2 - exhaustWidth / 3, exhaustBaseY);
  ctx.lineTo(player.x + PLAYER_WIDTH / 2 + exhaustWidth / 3, exhaustBaseY);
  // Oscillate height
  ctx.lineTo(player.x + PLAYER_WIDTH / 2 + exhaustWidth / 6, exhaustBaseY + 10 + player.exhaustOffset * 4);
  ctx.lineTo(player.x + PLAYER_WIDTH / 2 - exhaustWidth / 6, exhaustBaseY + 10 + player.exhaustOffset * 4);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 1.0;
  ctx.restore();
}

/**
 * Draws the animated background, including twinkling stars and drifting nebulae.
 * @param {number} dt - Delta time for motion independence.
 * @param {object} environment - Current environment settings for colors.
 */
function drawBackground(dt, environment) {
  // Deep space-like gradient background based on current environment
  const gradient = ctx.createLinearGradient(0, 0, GAME_WIDTH, GAME_HEIGHT);
  gradient.addColorStop(0, environment.bgColor[0]);
  gradient.addColorStop(0.5, environment.bgColor[1]);
  gradient.addColorStop(1, environment.bgColor[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Twinkling and scrolling stars
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  for (const star of backgroundStars) {
    star.y += star.speed * STAR_MOVEMENT_SPEED * dt; // Move stars downwards
    if (star.y > GAME_HEIGHT) { // Reset star to top if it goes off-screen
      star.y = 0;
      star.x = getRandomArbitrary(0, GAME_WIDTH);
      star.size = getRandomArbitrary(STAR_SIZE_MIN, STAR_SIZE_MAX / 2); // Recalculate size
    }
    ctx.fillRect(star.x, star.y, star.size, star.size); // Draw star as a rectangle
  }

  // Nebula blobs with subtle "drift" animation for cosmic feel
  ctx.fillStyle = environment.nebulaColor; // Nebula color from environment
  const now = globalThis.performance.now(); // Current time for animation offset

  // Nebula 1
  const nebula1X = GAME_WIDTH * 0.2 + (Math.sin(now * NEBULA_ANIMATION_FACTOR) * 50);
  const nebula1Y = GAME_HEIGHT * 0.3 + (Math.cos(now * NEBULA_ANIMATION_FACTOR) * 30);
  ctx.beginPath();
  ctx.arc(nebula1X, nebula1Y, 100, 0, Math.PI * 2);
  ctx.fill();

  // Nebula 2
  const nebula2X = GAME_WIDTH * 0.8 - (Math.cos(now * NEBULA_ANIMATION_FACTOR) * 40);
  const nebula2Y = GAME_HEIGHT * 0.7 - (Math.sin(now * NEBULA_ANIMATION_FACTOR) * 20);
  ctx.beginPath();
  ctx.arc(nebula2X, nebula2Y, 120, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Spawns a new obstacle (meteor or broken planet) at the top of the screen.
 * Obstacles have irregular shapes and fall downwards without spinning.
 * @param {'meteor'|'brokenPlanet'} type - The type of obstacle to spawn.
 */
function spawnObstacle(type) {
  let radius, speed, colors, damage, health;
  
  const currentEnvironment = ENVIRONMENTS[currentEnvironmentIndex];

  if (type === 'meteor') {
    radius = getRandomArbitrary(METEOR_SIZE_MIN, METEOR_SIZE_MAX) / 2;
    speed = METEOR_SPEED_INITIAL * getRandomArbitrary(0.8, 1.2) + (level - 1) * 10;
    colors = currentEnvironment.obstacleColor; // Use environment specific colors
    damage = DAMAGE_SMALL_COLLISION;
    health = 1;
  } else { // Broken Planet
    radius = getRandomArbitrary(BROKEN_PLANET_SIZE_MIN, BROKEN_PLANET_SIZE_MAX) / 2;
    speed = METEOR_SPEED_INITIAL * getRandomArbitrary(0.5, 0.9) * 0.8 + (level - 1) * 5;
    colors = currentEnvironment.obstacleColor; // Use environment specific colors
    damage = DAMAGE_MEDIUM_COLLISION;
    health = 3;
  }
  
  // Cap speed increase to prevent obstacles being un-dodgeable
  speed = Math.min(speed, PLAYER_MAX_SPEED * 0.8);

  // Random X position, starting from just above the canvas
  const x = getRandomArbitrary(radius, GAME_WIDTH - radius);
  const y = -radius;
  const color = colors[getRandomInt(0, colors.length - 1)];

  // Pre-calculate random points for irregular shape once
  const segments = (type === 'meteor') ? getRandomInt(5, 8) : getRandomInt(8, 12);
  const randomPoints = [];
  for (let i = 0; i < segments; i++) {
    randomPoints.push(radius * getRandomArbitrary(0.8, 1.1));
  }

  // Pre-calculate crack details for broken planets once
  const cracks = [];
  if (type === 'brokenPlanet') {
    for(let j = 0; j < getRandomInt(1, 4); j++) {
      cracks.push({
        radius: radius * getRandomArbitrary(0.1, 0.3),
        x: getRandomArbitrary(-radius * 0.4, radius * 0.4),
        y: getRandomArbitrary(-radius * 0.4, radius * 0.4)
      });
    }
  }

  obstacles.push({
    x, y, radius, 
    initialRadius: radius, // Store initial radius for scoring
    speed, color, type, damage, health,
    initialRotationOffset: getRandomArbitrary(0, Math.PI * 2), // Fixed random rotation for drawing irregular shape
    isDestroyed: false, // Flag to check if obstacle is destroyed by player shooting
    randomPoints: randomPoints, // Pre-calculated points for irregular shape
    cracks: cracks // Pre-calculated crack details
  });
}

/**
 * Spawns a new reward (invincible, shooter, health, or turbo) at the top of the screen.
 */
function spawnReward() {
  const rewardTypes = ['invincible', 'shooter', 'health', 'turbo'];
  const type = rewardTypes[getRandomInt(0, rewardTypes.length - 1)]; // Randomly select reward type
  let color;

  // Assign color based on reward type
  if (type === 'invincible')      color = '#00ffff'; // Cyan
  else if (type === 'shooter')    color = '#ff00ff'; // Magenta
  else if (type === 'health')     color = '#00ff00'; // Green
  else                            color = '#ffff00'; // Yellow

  // Fixed radius for rewards
  const radius = 15;
  // Random X position
  const x = getRandomArbitrary(radius, GAME_WIDTH - radius);
  // Start above canvas
  const y = -radius;

  rewards.push({ x, y, radius, type, color });
}

/**
 * Checks for collisions between the player and active obstacles.
 * Applies damage if not invincible and triggers game over if health drops to zero.
 * @param {number} timestamp - The current timestamp for registering collision time.
 */
function checkPlayerObstacleCollisions(timestamp) {
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    // Check for circular collision between player's approximate center and obstacle
    const playerCenterX = player.x + PLAYER_WIDTH / 2;
    const playerCenterY = player.y + PLAYER_HEIGHT / 2;
    const playerEffectiveRadius = Math.min(PLAYER_WIDTH, PLAYER_HEIGHT) / 2;

    const distSq = (playerCenterX - o.x) * (playerCenterX - o.x) +
                   (playerCenterY - o.y) * (playerCenterY - o.y);

    if (Number.isFinite(distSq) && distSq < (o.radius + playerEffectiveRadius) * (o.radius + playerEffectiveRadius)) {
      player.lastCollisionTime = timestamp / 1000; // Trigger screen shake
      
      let damageToApply = o.damage;

      // Adjust damage for broken planets based on their size
      if (o.type === 'brokenPlanet') {
          // Corrected radius check to avoid invalid numeric comparison
          damageToApply = (Number.isFinite(o.initialRadius) && o.initialRadius > BROKEN_PLANET_SIZE_MAX * 0.75 / 2) ? DAMAGE_STRONG_COLLISION : DAMAGE_MEDIUM_COLLISION;
      }
      player.health -= damageToApply; // Apply damage

      obstacles.splice(i, 1); // Remove the collided obstacle
      player.invincible = true; // Grant temporary invincibility after taking damage
      player.invincibleEffectEndTime = timestamp + PLAYER_INVINCIBLE_DURATION * 1000;
      player.blink = true;

      // Cap player health at 0 to avoid negative display issues
      if (player.health < 0) {
        player.health = 0;
      }

      if (player.health <= 0) {
        triggerGameOver(); // End game if health is zero
      }
      return; // Only one collision per frame to prevent multiple hits from one obstacle
    }
  }
}

/**
 * Triggers the game over state: stops the game, shows the game over screen,
 * and resets player inputs/power-ups.
 */
function triggerGameOver() {
  gameOver = true;
  gameRunning = false;
  saveHighestScore(); // Save high score on game over
  
  if(gameOverScreen && startScreen) {
    gameOverScreen.style.display = 'flex'; // Show game over overlay
    startScreen.style.display = 'none'; // Hide start screen
  }

  if(finalScoreDisplay) finalScoreDisplay.textContent = Math.floor(score); // Display final score
  if(gameOverHighestScoreDisplay) gameOverHighestScoreDisplay.textContent = Math.floor(highestScore); // Display highest score on game over screen
  if(gameOverQuoteDisplay) gameOverQuoteDisplay.textContent = GAME_OVER_QUOTES[getRandomInt(0, GAME_OVER_QUOTES.length - 1)]; // Display random quote

  // Reset player state to prevent carry-over
  player.vx = 0; player.vy = 0;
  keys = {}; // Clear pressed keys
  
  // Hide all reward indicators visibly
  if (invincibleRewardIndicator) invincibleRewardIndicator.style.display = 'none';
  if (shooterRewardIndicator) shooterRewardIndicator.style.display = 'none';
  if (healthRewardIndicator) healthRewardIndicator.style.display = 'none';
  if (turboRewardIndicator) turboRewardIndicator.style.display = 'none';
}

/**
 * Resets all game variables to their initial state and starts a new game.
 * This function is called when the 'Start Game' or 'Restart' button is clicked.
 */
function startGame() {
  score = 0; level = 1; // Reset score and level
  timePlayed = 0; // Reset time played
  currentEnvironmentIndex = 0; // Reset environment
  lastEnvironmentChangeScore = 0; // Reset environment transition timer
  gameOver = false; gameRunning = true; // Set game state
  
  // Reset player position and state
  player.x = GAME_WIDTH / 2 - PLAYER_WIDTH / 2;
  player.y = GAME_HEIGHT - PLAYER_HEIGHT - 20;
  player.vx = 0; player.vy = 0;
  player.exhaustOffset = 0;
  player.lastCollisionTime = 0;
  player.invincible = false; player.shooter = false; player.turbo = false;
  player.invincibleEffectEndTime = 0; player.shooterTimer = 0; player.turboTimer = 0;
  player.health = PLAYER_MAX_HEALTH; player.blink = false; player.blinkTimer = 0;
  player.lastShotTime = 0;
  
  // Clear all entities
  // Clear entities more efficiently without creating new arrays constantly during game loop
  obstacles.length = 0; 
  bullets.length = 0; 
  rewards.length = 0;
  
  lastObstacleSpawnTime = 0;
  lastFrameTime = 0; // Reset last timestamp for dt calculation
  keys = {}; // Clear active keys
  
  // Reset UI displays
  if(scoreDisplay) scoreDisplay.textContent = '0';
  if(levelDisplay) levelDisplay.textContent = '1';
  if(healthDisplay) healthDisplay.textContent = PLAYER_MAX_HEALTH;
  
  // Hide overlays
  if(startScreen) startScreen.style.display = 'none';
  if(gameOverScreen) gameOverScreen.style.display = 'none';
  
  // Ensure reward indicators are hidden at start visibly
  if (invincibleRewardIndicator) invincibleRewardIndicator.style.display = 'none';
  if (shooterRewardIndicator) shooterRewardIndicator.style.display = 'none';
  if (healthRewardIndicator) healthRewardIndicator.style.display = 'none';
  if (turboRewardIndicator) turboRewardIndicator.style.display = 'none';

  // Start the game loop if it's not already running
  // Cancel any existing loop to prevent duplicates
  if (requestAnimationFrameId) {
    globalThis.cancelAnimationFrame(requestAnimationFrameId);
    requestAnimationFrameId = null;
  }
  requestAnimationFrameId = globalThis.requestAnimationFrame(gameLoop);

  loadHighestScore(); // Load highest score at game start
}

//-------------------------//
//--   MAIN  ENTRYPOINT   --//
//-------------------------//
// Event listeners for Start and Restart buttons
if(startButton) startButton.addEventListener('click', startGame);
if(restartButton) restartButton.addEventListener('click', startGame);

// Load highest score initially when the page loads
globalThis.document.addEventListener('DOMContentLoaded', loadHighestScore);

// Show the start screen initially
if(startScreen) startScreen.style.display = 'flex';

// Begin the animation loop, it will wait for startGame() to set gameRunning=true
// before calling update()
// We call gameLoop once immediately so that the start screen is rendered without a delay.
// This ensures that the background and initial UI are drawn immediately.
if (!requestAnimationFrameId) {
  requestAnimationFrameId = globalThis.requestAnimationFrame(gameLoop);
}
