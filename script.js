
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
const menuArt = document.getElementById("menu-art");
const menuArtContext = menuArt.getContext("2d");
const menuHighScore = document.getElementById("menu-high-score");
const mainMenu = document.getElementById("main-menu");
const gameScreen = document.getElementById("game-screen");
const playButton = document.getElementById("play-button");
const howToPlayButton = document.getElementById("how-to-play-button");
const howToPlayDialog = document.getElementById("how-to-play-dialog");
const closeHowToPlayButton = document.getElementById("close-how-to-play");
const dialogPlayButton = document.getElementById("dialog-play-button");
const soundToggle = document.getElementById("sound-toggle");

const backgroundMusic = new Audio("background_music.mp3");
backgroundMusic.loop = true;
const batterySound = new Audio("battery_collect.mp3");
const collisionSound = new Audio("enemy_collision.mp3");
const gameSounds = [backgroundMusic, batterySound, collisionSound];
let soundMuted = false;

function playSound(sound) {
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

soundToggle.addEventListener("click", () => {
  soundMuted = !soundMuted;
  gameSounds.forEach((sound) => {
    sound.muted = soundMuted;
  });
  soundToggle.textContent = soundMuted ? "SOUND OFF" : "SOUND ON";
  soundToggle.setAttribute("aria-pressed", String(soundMuted));
  soundToggle.setAttribute("aria-label", soundMuted ? "Unmute sound" : "Mute sound");
});

const assetPaths = {
  player: "runner.png",
  battery: "battery.png",
  speedster: "enemy_speedster.png",
  chaser: "enemy_chaser.png",
  hunter: "enemy_hunter.png",
  boss: "enemy_boss.png",
  collectEffect: "collect_effect.png",
  hitEffect: "hit_effect.png"
};

const assets = {};
const activeEffects = [];
const EFFECT_DURATION_MS = 420;

function prepareSprite(image) {
  const spriteCanvas = document.createElement("canvas");
  spriteCanvas.width = image.naturalWidth;
  spriteCanvas.height = image.naturalHeight;

  const spriteContext = spriteCanvas.getContext("2d");
  spriteContext.drawImage(image, 0, 0);

  const imageData = spriteContext.getImageData(
    0, 0,
    spriteCanvas.width,
    spriteCanvas.height
  );
  const { data, width, height } = imageData;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const backgroundThreshold = 92;
  let queueEnd = 0;

  function addBackgroundPixel(index) {
    if (visited[index]) return;

    const pixel = index * 4;
    const brightness = Math.max(data[pixel], data[pixel + 1], data[pixel + 2]);
    if (brightness > backgroundThreshold) return;

    visited[index] = 1;
    queue[queueEnd++] = index;
  }

  for (let x = 0; x < width; x++) {
    addBackgroundPixel(x);
    addBackgroundPixel((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    addBackgroundPixel(y * width);
    addBackgroundPixel(y * width + width - 1);
  }

  for (let queueIndex = 0; queueIndex < queueEnd; queueIndex++) {
    const index = queue[queueIndex];
    const pixel = index * 4;
    const brightness = Math.max(data[pixel], data[pixel + 1], data[pixel + 2]);
    const alpha = Math.max(0, Math.min(255,
      Math.round((brightness - 28) * 255 / (backgroundThreshold - 28))
    ));
    data[pixel + 3] = Math.min(data[pixel + 3], alpha);

    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) addBackgroundPixel(index - 1);
    if (x < width - 1) addBackgroundPixel(index + 1);
    if (y > 0) addBackgroundPixel(index - width);
    if (y < height - 1) addBackgroundPixel(index + width);
  }

  spriteContext.putImageData(imageData, 0, 0);
  return spriteCanvas;
}

function loadAsset(name, path) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      try {
        assets[name] = prepareSprite(image);
      } catch (error) {
        console.warn(`Could not process ${path}; using the original image.`, error);
        assets[name] = image;
      }
      resolve();
    };
    image.onerror = () => {
      console.error(`Could not load game asset: ${path}`);
      resolve();
    };
    image.src = path;
  });
}

function updateMenuHighScore() {
  menuHighScore.textContent = String(highScore).padStart(4, "0");
}

function drawMenuArt() {
  const width = menuArt.width;
  const height = menuArt.height;
  menuArtContext.imageSmoothingEnabled = false;
  menuArtContext.fillStyle = "#091516";
  menuArtContext.fillRect(0, 0, width, height);

  menuArtContext.strokeStyle = "rgba(120, 226, 189, 0.08)";
  menuArtContext.lineWidth = 1;
  for (let x = 20; x < width; x += 28) {
    menuArtContext.beginPath();
    menuArtContext.moveTo(x, 0);
    menuArtContext.lineTo(x, height);
    menuArtContext.stroke();
  }
  for (let y = 18; y < height; y += 28) {
    menuArtContext.beginPath();
    menuArtContext.moveTo(0, y);
    menuArtContext.lineTo(width, y);
    menuArtContext.stroke();
  }

  menuArtContext.fillStyle = "#112925";
  menuArtContext.fillRect(0, 220, width, 40);
  menuArtContext.fillStyle = "#78e2bd";
  menuArtContext.fillRect(16, 220, width - 32, 2);

  if (assets.player) menuArtContext.drawImage(assets.player, 65, 58, 100, 162);
  if (assets.battery) menuArtContext.drawImage(assets.battery, 203, 48, 42, 58);
  if (assets.chaser) menuArtContext.drawImage(assets.chaser, 288, 104, 72, 116);
  if (assets.hunter) menuArtContext.drawImage(assets.hunter, 374, 48, 56, 88);
}

function spawnEffect(type, x, y) {
  activeEffects.push({ type, x, y, startedAt: performance.now() });
}

const player = {
  x: 100,
  y: 100,
  size: 30,
  speed: 4
};

const battery = {
  x: 400,
  y: 250,
  size: 20
};


const enemies = [
  {
    x: 650,
    y: 350,
    size: 30,
    speed: 1.2,
    sprite: "speedster",
    orbitDirection: Math.random() < 0.5 ? -1 : 1
  }
];

const ENEMY_SPEED_INCREASE = 0.08;
const MAX_ENEMY_SPEED = 2.5;
const enemySpriteSettings = {
  speedster: { width: 52, height: 63, color: "#45d9ff" },
  chaser: { width: 52, height: 60, color: "#b85cff" },
  hunter: { width: 54, height: 64, color: "#45d9ff" },
  boss: { width: 66, height: 80, color: "#45d9ff" }
};
const enemyMovementStyles = {
  speedster: { speedMultiplier: 1.15, orbit: 0.12, separation: 48 },
  chaser: { speedMultiplier: 0.9, orbit: 0.3, separation: 56 },
  hunter: { speedMultiplier: 1.05, orbit: 0.46, separation: 64 },
  boss: { speedMultiplier: 0.78, orbit: 0.2, separation: 72 }
};

let nextEnemyScore = 15;



let score = 0;
let highScore = Number(localStorage.getItem("highScore") || 0);

let lives = 3;
let gameOver = false;
let isPaused = false;


const keys = {};

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if ((key === "p" || event.key === "Escape") && !event.repeat) {
    if (!gameOver && gameStarted) {
      isPaused = !isPaused;
      if (isPaused) {
        backgroundMusic.pause();
      } else {
        backgroundMusic.play().catch(() => {});
      }
    }
    return;
  }

  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
    event.preventDefault();
    keys[key] = true;
  }
});

window.addEventListener("keyup", (event) => {
  keys[event.key.toLowerCase()] = false;
});

function spawnBattery() {
  battery.x = 30 + Math.random() * (canvas.width - battery.size - 60);
  battery.y = 30 + Math.random() * (canvas.height - battery.size - 60);
}

function collectBattery() {
  const touching =
    player.x < battery.x + battery.size &&
    player.x + player.size > battery.x &&
    player.y < battery.y + battery.size &&
    player.y + player.size > battery.y;

  
if (touching) {
  score++;
  playSound(batterySound);
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("highScore", highScore);
    updateMenuHighScore();
  }


  spawnEffect(
    "collectEffect",
    battery.x + battery.size / 2,
    battery.y + battery.size / 2
  );
  increaseDifficulty();
  spawnBattery();
}

}

function updateEnemies() {
  const enemyPositions = enemies.map((enemy) => ({
    x: enemy.x + enemy.size / 2,
    y: enemy.y + enemy.size / 2
  }));
  const playerCenterX = player.x + player.size / 2;
  const playerCenterY = player.y + player.size / 2;

  enemies.forEach((enemy, enemyIndex) => {
    const position = enemyPositions[enemyIndex];
    const toPlayerX = playerCenterX - position.x;
    const toPlayerY = playerCenterY - position.y;
    const distanceToPlayer = Math.hypot(toPlayerX, toPlayerY);
    const targetX = distanceToPlayer > 0 ? toPlayerX / distanceToPlayer : 0;
    const targetY = distanceToPlayer > 0 ? toPlayerY / distanceToPlayer : 0;
    const style = enemyMovementStyles[enemy.sprite] || enemyMovementStyles.speedster;
    let separationX = 0;
    let separationY = 0;

    enemyPositions.forEach((otherPosition, otherIndex) => {
      if (enemyIndex === otherIndex) return;

      const awayX = position.x - otherPosition.x;
      const awayY = position.y - otherPosition.y;
      const neighborDistance = Math.hypot(awayX, awayY);
      if (neighborDistance >= style.separation) return;

      const strength = neighborDistance === 0
        ? 1
        : (style.separation - neighborDistance) / style.separation;
      const angle = neighborDistance === 0
        ? (enemyIndex < otherIndex ? Math.PI / 2 : -Math.PI / 2)
        : Math.atan2(awayY, awayX);
      separationX += Math.cos(angle) * strength;
      separationY += Math.sin(angle) * strength;
    });

    const orbitDirection = enemy.orbitDirection || 1;
    const directionX = targetX + separationX * 1.8 - targetY * style.orbit * orbitDirection;
    const directionY = targetY + separationY * 1.8 + targetX * style.orbit * orbitDirection;
    const directionLength = Math.hypot(directionX, directionY);

    if (directionLength > 0) {
      const speed = Math.min(enemy.speed * style.speedMultiplier, MAX_ENEMY_SPEED);
      enemy.x += (directionX / directionLength) * speed;
      enemy.y += (directionY / directionLength) * speed;
    }
  });
}

let lastHitTime = 0;

function checkEnemyCollision() {
  const now = Date.now();

  if (now - lastHitTime < 1000) {
    return;
  }

  for (const enemy of enemies) {
    const touching =
      player.x < enemy.x + enemy.size &&
      player.x + player.size > enemy.x &&
      player.y < enemy.y + enemy.size &&
      player.y + player.size > enemy.y;

    if (touching) {
      lives--;
      playSound(collisionSound);
      lastHitTime = now;
      spawnEffect(
        "hitEffect",
        player.x + player.size / 2,
        player.y + player.size / 2
      );

      player.x = 100;
      player.y = 100;

      if (lives <= 0) {
        gameOver = true;
      }

      break;
    }
  }
}


function update() {
  if (isPaused || gameOver) {
    return;
  }

  if (keys["arrowup"] || keys["w"]) {
    player.y -= player.speed;
  }

  if (keys["arrowdown"] || keys["s"]) {
    player.y += player.speed;
  }

  if (keys["arrowleft"] || keys["a"]) {
    player.x -= player.speed;
  }

  if (keys["arrowright"] || keys["d"]) {
    player.x += player.speed;
  }

  player.x = Math.max(0, Math.min(canvas.width - player.size, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.size, player.y));
}


function increaseDifficulty() {
  // Increase the speed of every existing enemy
  enemies.forEach(enemy => {
    enemy.speed = Math.min(
      enemy.speed + ENEMY_SPEED_INCREASE,
      MAX_ENEMY_SPEED
    );
  });

  // Spawn another enemy every 15 batteries
  if (score >= nextEnemyScore) {
    spawnEnemy();
    nextEnemyScore += 15;
  }
}

function spawnEnemy() {
  // Pick a random edge of the game area
  const side = Math.floor(Math.random() * 4);

  let x, y;

  if (side === 0) {
    x = 0;
    y = Math.random() * canvas.height;
  } else if (side === 1) {
    x = canvas.width - 30;
    y = Math.random() * canvas.height;
  } else if (side === 2) {
    x = Math.random() * canvas.width;
    y = 0;
  } else {
    x = Math.random() * canvas.width;
    y = canvas.height - 30;
  }

  const sprite = ["speedster", "chaser", "hunter", "boss"][
    Math.min(enemies.length, 3)
  ];
  const averageSpeed = enemies.length > 0
    ? enemies.reduce((total, enemy) => total + enemy.speed, 0) / enemies.length
    : 1.2;

  enemies.push({
    x: x,
    y: y,
    size: 30,
    speed: Math.min(averageSpeed * (0.85 + Math.random() * 0.3), MAX_ENEMY_SPEED),
    sprite,
    orbitDirection: Math.random() < 0.5 ? -1 : 1
  });
}


function drawAsset(name, x, y, width, height, fallbackColor) {
  const image = assets[name];
  if (image) {
    ctx.drawImage(image, x, y, width, height);
    return;
  }

  ctx.fillStyle = fallbackColor;
  ctx.fillRect(x, y, width, height);
}

function drawActor(name, actor, width, height, fallbackColor) {
  drawAsset(
    name,
    actor.x + (actor.size - width) / 2,
    actor.y + actor.size - height,
    width,
    height,
    fallbackColor
  );
}

function drawEffects(now) {
  for (let index = activeEffects.length - 1; index >= 0; index--) {
    const effect = activeEffects[index];
    const progress = (now - effect.startedAt) / EFFECT_DURATION_MS;
    if (progress >= 1) {
      activeEffects.splice(index, 1);
      continue;
    }

    const image = assets[effect.type];
    if (!image) continue;

    const baseSize = effect.type === "collectEffect" ? 52 : 64;
    const size = baseSize * (1 + progress * 0.4);
    ctx.globalAlpha = 1 - progress;
    ctx.drawImage(
      image,
      effect.x - size / 2,
      effect.y - size / 2,
      size,
      size
    );
  }
  ctx.globalAlpha = 1;
}



function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawActor("player", player, 44, 68, "#ffd54a");
  drawAsset(
    "battery",
    battery.x + (battery.size - 34) / 2,
    battery.y + (battery.size - 46) / 2,
    34,
    46,
    "#ffd54a"
  );

  // Draw all chasing enemies
  enemies.forEach(enemy => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawActor("player", player, 44, 68, "#ffd54a");
  drawAsset(
    "battery",
    battery.x + (battery.size - 34) / 2,
    battery.y + (battery.size - 46) / 2,
    34,
    46,
    "#ffd54a"
  );

  // Draw all chasing enemies
  enemies.forEach(enemy => {
    const sprite = enemySpriteSettings[enemy.sprite] || enemySpriteSettings.speedster;
    drawActor(enemy.sprite, enemy, sprite.width, sprite.height, sprite.color);
  });

  // Score
  ctx.fillStyle = "#ffffff";
  ctx.font = "20px monospace";
  ctx.fillText("BATTERIES: " + score, 20, 30);

  // High score
  ctx.fillStyle = "#ffd54a";
  ctx.font = "17px monospace";
  ctx.fillText("BEST: " + highScore, 22, 58);

  // Lives
  ctx.fillStyle = "#ff7777";
  ctx.fillText("LIVES: " + lives, 650, 30);

  // Enemy count
  ctx.fillStyle = "#45d9ff";
  ctx.font = "16px monospace";
  ctx.fillText("ENEMIES: " + enemies.length, 20, 85);

  drawEffects(performance.now());

  // Game over
  if (gameOver) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = "center";

    ctx.fillStyle = "#ff5555";
    ctx.font = "48px monospace";
    ctx.fillText("GAME OVER", 400, 210);

    ctx.fillStyle = "#ffffff";
    ctx.font = "22px monospace";
    ctx.fillText("FINAL SCORE: " + score, 400, 260);

    ctx.fillStyle = "#ffd54a";
    ctx.font = "20px monospace";
    ctx.fillText("HIGH SCORE: " + highScore, 400, 300);

    ctx.fillStyle = "#ffd54a";
    ctx.font = "18px monospace";
    ctx.fillText("PRESS R TO RESTART", 400, 350);



    ctx.textAlign = "left";
  }

    const sprite = enemySpriteSettings[enemy.sprite] || enemySpriteSettings.speedster;
    drawActor(enemy.sprite, enemy, sprite.width, sprite.height, sprite.color);
  });


  // Score
  
  ctx.fillStyle = "#ffffff";
  ctx.font = "20px monospace";
  ctx.fillText("BATTERIES: " + score, 20, 30);

  // High score
  
  ctx.fillStyle = "#ffd54a";
  ctx.font = "17px monospace";
  ctx.fillText("BEST: " + highScore, 22, 58);

  // Lives
  ctx.fillStyle = "#ff7777";
  
  ctx.fillText("LIVES: " + lives, 650, 30);

  // Enemy count
  ctx.fillStyle = "#45d9ff";
  ctx.font = "16px monospace";
  ctx.fillText("ENEMIES: " + enemies.length, 20, 85);

  drawEffects(performance.now());

  // Game over
  if (gameOver) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = "center";

    ctx.fillStyle = "#ff5555";
    ctx.font = "48px monospace";
    ctx.fillText("GAME OVER", 400, 210);

    ctx.fillStyle = "#ffffff";
    ctx.font = "22px monospace";
    ctx.fillText("FINAL SCORE: " + score, 400, 260);

    ctx.fillStyle = "#ffd54a";
    ctx.font = "20px monospace";
    ctx.fillText("HIGH SCORE: " + highScore, 400, 300);

    ctx.fillStyle = "#ffd54a";
    ctx.font = "18px monospace";
    ctx.fillText("PRESS R TO RESTART", 400, 350);

    ctx.textAlign = "left";
  }
}

function drawPauseScreen() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";

  ctx.fillStyle = "#ffd54a";
  ctx.font = "bold 46px monospace";
  ctx.fillText("PAUSED", 400, 180);

  ctx.fillStyle = "#ffffff";
  ctx.font = "18px monospace";
  ctx.fillText("Take a break!", 400, 220);

  ctx.fillStyle = "#1b8f68";
  ctx.fillRect(290, 270, 220, 55);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px monospace";
  ctx.fillText("RESUME", 400, 305);

  ctx.fillStyle = "#aaaaaa";
  ctx.font = "14px monospace";
  ctx.fillText("PRESS P OR ESC TO RESUME", 400, 370);

  ctx.textAlign = "left";
}

canvas.addEventListener("click", (event) => {
  if (!isPaused || gameOver) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mouseX = (event.clientX - rect.left) * scaleX;
  const mouseY = (event.clientY - rect.top) * scaleY;

  if (mouseX >= 290 && mouseX <= 510 && mouseY >= 270 && mouseY <= 325) {
    isPaused = false;
    backgroundMusic.play().catch(() => {});
  }
});



function gameLoop() {
  if (!gameOver && !isPaused) {
    update();
    updateEnemies();
    collectBattery();
    checkEnemyCollision();
  }

  draw();

  if (isPaused && !gameOver) drawPauseScreen();

  requestAnimationFrame(gameLoop);
}

Promise.all(
  Object.entries(assetPaths).map(([name, path]) => loadAsset(name, path))
).then(() => {
  updateMenuHighScore();
  drawMenuArt();
  playButton.disabled = false;
  spawnBattery();
});

let gameStarted = false;

function startGame() {
  if (gameStarted || playButton.disabled) return;

  gameStarted = true;
  mainMenu.hidden = true;
  gameScreen.hidden = false;
  playSound(backgroundMusic);
  gameLoop();
}

playButton.addEventListener("click", startGame);
howToPlayButton.addEventListener("click", () => howToPlayDialog.showModal());
closeHowToPlayButton.addEventListener("click", () => howToPlayDialog.close());
dialogPlayButton.addEventListener("click", () => {
  howToPlayDialog.close();
  startGame();
});
howToPlayDialog.addEventListener("click", (event) => {
  if (event.target === howToPlayDialog) howToPlayDialog.close();
});

function restartGame() {
  score = 0;
  lives = 3;
  gameOver = false;
  isPaused = false;
  player.x = 100;
  player.y = 100;
  enemies.splice(0, enemies.length, {
    x: 650,
    y: 350,
    size: 30,
    speed: 1.2,
    sprite: "speedster",
    orbitDirection: Math.random() < 0.5 ? -1 : 1
  });
  nextEnemyScore = 15;
  lastHitTime = 0;
  activeEffects.length = 0;
  Object.keys(keys).forEach((key) => {
    keys[key] = false;
  });
  spawnBattery();
}

window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "r" && gameOver) {
    restartGame();
  }
});
