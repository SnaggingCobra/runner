# Batti

A small browser survival game. Collect batteries, avoid the enemies, and see how
long you can last.

## Run

Open index.html in a browser, or start a local server from this folder:


Then visit https://snaggingcobra.github.io/runner/

## Controls

- Move: WASD or arrow keys
- Pause or resume: P or Escape
- Restart after game over: R

## How the chase works

- Collecting a battery adds one point and increases every enemy's base speed by
  0.08, up to a cap of 2.5.
- Another enemy appears at 15 batteries, then every 15 after that (30, 45, and
  so on). Enemies enter from a randomly chosen edge of the arena.
- Enemies steer toward the player's center. Each enemy type has its own speed
  multiplier and orbit strength, and each gets a random orbit direction so they
  approach from different angles instead of following one identical path.
- When enemies get close to one another, a separation force nudges them apart.
  Their movement combines pursuit, orbiting, and spacing, creating varied
  paths while keeping them aimed at the player.
- You start with three lives. An enemy collision costs one life and briefly
  moves you back to your starting position.
