
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

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

const hazard = {
  x: 600,
  y: 300,
  size: 30,
  speedx: 2,
  speedy: 2
};


let score = 0;
let lives = 3;
let gameOver = false;

const keys = {};

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

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
    spawnBattery();
  }
}

function updateHazard() {

  hazard.x += hazard.speedx;
  hazard.y += hazard.speedy;

  if (hazard.x <= 0 || hazard.x + hazard.size >= canvas.width) {
    hazard.speedx *= -1;

  }

  if (hazard.y <= 70 || hazard.y + hazard.size >= canvas.height) {
    hazard.speedy *= -1;
  }
}
function checkHazardCollision() {
  const touching = 
  player.x < hazard.x + hazard.size &&
  player.x + player.size > hazard.x &&
  player.y < hazard.y + hazard.size &&
  player.y + player.size > hazard.y;
  
  if (touching) {
    lives--;
    player.x = 100;
    player.y = 100;
    if (lives <= 0) {
      gameOver = true;
    }
  }
}


function update() {
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


function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw player
  ctx.fillStyle = "#ffd54a";
  ctx.fillRect(player.x, player.y, player.size, player.size);

  // Draw battery
  ctx.fillStyle = "#ffd54a";
  ctx.fillRect(battery.x, battery.y, battery.size, battery.size);

  // Battery terminal
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(battery.x + 6, battery.y + 5, 8, 10);

  // Draw electrical hazard
  ctx.fillStyle = "#45d9ff";
  ctx.fillRect(hazard.x, hazard.y, hazard.size, hazard.size);

  // Score
  ctx.fillStyle = "#ffffff";
  ctx.font = "20px monospace";
  ctx.fillText("BATTERIES: " + score, 20, 30);

  // Lives
  ctx.fillStyle = "#ff7777";
  ctx.fillText("LIVES: " + lives, 650, 30);

// gametitle
  ctx.fillStyle = "#8ee6a8";
  ctx.font = "16px monospace";
  ctx.fillText("POWER THE TOWN!", 20, 60);


  if (gameOver) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ff5555";
    ctx.font = "48px monospace";
    ctx.fillText("GAME OVER", 245, 230);

    ctx.fillStyle = "#ffffff";
    ctx.font = "22px monospace";
    ctx.fillText("FINAL SCORE: " + score, 285, 275);
  }
}


function gameLoop() {
  if (!gameOver) {
    update();
    updateHazard();
    collectBattery();
    checkHazardCollision();
  }

  draw();

  if (!gameOver) {
    requestAnimationFrame(gameLoop);
  }
}

spawnBattery();
gameLoop();
