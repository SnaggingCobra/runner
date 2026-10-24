
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

let score = 0;

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

  ctx.fillStyle = "#ffd54a";
  ctx.fillRect(player.x, player.y, player.size, player.size);

  ctx.fillStyle = "#ffd54a";
  ctx.fillRect(battery.x, battery.y, battery.size, battery.size);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(battery.x + 6, battery.y + 5, 8, 10);

  ctx.fillStyle = "#ffffff";
  ctx.font = "20px monospace";
  ctx.fillText("BATTERIES: " + score, 20, 30);

  ctx.fillStyle = "#8ee6a8";
  ctx.font = "16px monospace";
  ctx.fillText("POWER THE TOWN!", 20, 60);
}

function gameloop() {
  update();
  collectBattery();
  draw();
  requestAnimationFrame(gameloop);
}

spawnBattery();
gameloop();


