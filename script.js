// Game constants
const GRID_SIZE = 14;
const CELL_SIZE = 24;
const INITIAL_SPEED = 180;
const TRAVEL_DECAY_RATE = 10; // Travel distance to lose 1 point
const MIN_POINTS = 1; // Minimum points value
const POWER_UP_DURATION = {
	SPEED: 10000,
	SHRINK: 10000,
	INVINCIBLE: 10000,
	MAGNET: 8000,
};

// Import the API functions
import { getHighscores, saveHighscore as apiSaveHighscore } from './api.js';

// Snake graphics - pixelated patterns for retro look
const SNAKE_GRAPHICS = {
	// Head of the snake with eye and diamond pattern
	HEAD_UP: `
        ########
        ##....##
        #..##..#
        #......#
        #.#..#.#
        #......#
        ##....##
        ########
    `,
	HEAD_DOWN: `
        ########
        ##....##
        #......#
        #.#..#.#
        #......#
        #..##..#
        ##....##
        ########
    `,
	HEAD_LEFT: `
        ########
        ##....##
        #.#....#
        #......#
        #......#
        #.#....#
        ##....##
        ########
    `,
	HEAD_RIGHT: `
        ########
        ##....##
        #....#.#
        #......#
        #......#
        #....#.#
        ##....##
        ########
    `,
	// Body segments with diamond pattern
	BODY: `
        ########
        ##....##
        #..##..#
        #.#..#.#
        #.#..#.#
        #..##..#
        ##....##
        ########
    `,
	// Tail segment with tapered end
	TAIL: `
        ########
        ###..###
        ##....##
        ##....##
        ###..###
        ####.###
        #######.
        ########
    `,
};

// Convert ASCII art to image data for rendering
function createSnakeGraphic(artString, color) {
	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");
	const lines = artString.trim().split("\n");
	const height = lines.length;
	const width = lines[0].length;

	canvas.width = width;
	canvas.height = height;

	ctx.fillStyle = color;

	for (let y = 0; y < height; y++) {
		const line = lines[y].trim();
		for (let x = 0; x < width; x++) {
			if (line[x] === "#") {
				ctx.fillRect(x, y, 1, 1);
			}
		}
	}

	return canvas;
}

// Pre-render all snake graphics
let snakeGraphics;

// Power-up types
const POWER_UPS = {
	SPEED: {
		name: "Speed Boost",
		color: "#6a92b8",
		class: "speed-boost",
		effect: (game) => {
			// Store the current speed before speeding up
			const originalSpeed = game.snake.speed;
			// Set to half the current speed (faster)
			game.snake.speed = Math.floor(originalSpeed / 2);

			setTimeout(() => {
				// Reset to original speed
				game.snake.speed = originalSpeed;
				game.removePowerUp("SPEED");
			}, POWER_UP_DURATION.SPEED);
		},
	},
	SHRINK: {
		name: "Shrink",
		color: "#6a92b8",
		class: "shrink",
		effect: (game) => {
			// Remove 3 segments with a glow effect
			for (let i = 0; i < 3; i++) {
				if (game.snake.body.length > 3) {
					setTimeout(() => {
						game.snake.body.pop();
					}, i * 300);
				}
			}
			setTimeout(() => {
				game.removePowerUp("SHRINK");
			}, POWER_UP_DURATION.SHRINK);
		},
	},
	INVINCIBLE: {
		name: "Invincible",
		color: "#6a92b8",
		class: "invincible",
		effect: (game) => {
			game.invincible = true;
			game.snake.element.classList.add("invincible-active");
			setTimeout(() => {
				game.invincible = false;
				game.snake.element.classList.remove("invincible-active");
				game.removePowerUp("INVINCIBLE");
			}, POWER_UP_DURATION.INVINCIBLE);
		},
	},
	MAGNET: {
		name: "Magnet",
		color: "#6a92b8",
		class: "magnet",
		effect: (game) => {
			game.magnetActive = true;
			game.snake.element.classList.add("magnet-active");
			setTimeout(() => {
				game.magnetActive = false;
				game.snake.element.classList.remove("magnet-active");
				game.removePowerUp("MAGNET");
			}, POWER_UP_DURATION.MAGNET);
		},
	},
};

class Snake {
	constructor() {
		this.reset();
		this.element = document.createElement("div");
		this.element.className = "snake";
	}

	reset() {
		this.body = [
			{ x: 8, y: 8 },
			{ x: 7, y: 8 },
			{ x: 6, y: 8 },
		];
		this.direction = "right";
		this.nextDirection = "right";
		this.speed = INITIAL_SPEED;
		this.shouldGrow = false;
		this.totalTravelDistance = 0;
	}

	move() {
		const head = { ...this.body[0] };

		switch (this.direction) {
			case "up":
				head.y--;
				break;
			case "down":
				head.y++;
				break;
			case "left":
				head.x--;
				break;
			case "right":
				head.x++;
				break;
		}

		// Increment travel distance
		this.totalTravelDistance++;

		// Wrap around the grid
		if (head.x < 0) head.x = GRID_SIZE - 1;
		if (head.x >= GRID_SIZE) head.x = 0;
		if (head.y < 0) head.y = GRID_SIZE - 1;
		if (head.y >= GRID_SIZE) head.y = 0;

		this.body.unshift(head);
		this.direction = this.nextDirection;

		if (!this.shouldGrow) {
			this.body.pop();
		} else {
			this.shouldGrow = false;
		}
	}

	// Calculate current food value based on travel distance
	getCurrentFoodValue() {
		const baseValue = 10; // Base food value
		const decayAmount = Math.floor(this.totalTravelDistance / TRAVEL_DECAY_RATE);
		return Math.max(MIN_POINTS, baseValue - decayAmount);
	}

	// Calculate current powerup value based on travel distance
	getCurrentPowerupValue() {
		const baseValue = 20; // Base powerup value
		const decayAmount = Math.floor(this.totalTravelDistance / TRAVEL_DECAY_RATE);
		return Math.max(MIN_POINTS * 2, baseValue - decayAmount);
	}

	grow() {
		this.shouldGrow = true;
	}

	shrink() {
		if (this.body.length > 3) {
			this.body.pop();
		}
	}

	resetTravelDistance() {
		this.totalTravelDistance = 0;
	}
}

class Game {
	constructor() {
		this.canvas = document.getElementById("gameCanvas");
		this.ctx = this.canvas.getContext("2d");
		this.canvas.width = GRID_SIZE * CELL_SIZE;
		this.canvas.height = GRID_SIZE * CELL_SIZE;

		// Animation frame tracking
		this.animationFrameId = null;
		this.gameLoopTimeoutId = null;

		// Initialize snake graphics after CSS has loaded
		const style = getComputedStyle(document.documentElement);
		const darkGray =
			style.getPropertyValue("--gb-bg-darkest").trim() || "#383838";
		const mediumGray =
			style.getPropertyValue("--gb-bg-dark").trim() || "#707070";

		snakeGraphics = {
			headUp: createSnakeGraphic(SNAKE_GRAPHICS.HEAD_UP, darkGray),
			headDown: createSnakeGraphic(SNAKE_GRAPHICS.HEAD_DOWN, darkGray),
			headLeft: createSnakeGraphic(SNAKE_GRAPHICS.HEAD_LEFT, darkGray),
			headRight: createSnakeGraphic(SNAKE_GRAPHICS.HEAD_RIGHT, darkGray),
			body: createSnakeGraphic(SNAKE_GRAPHICS.BODY, mediumGray),
			tail: createSnakeGraphic(SNAKE_GRAPHICS.TAIL, mediumGray),
		};

		this.snake = new Snake();
		this.food = this.generateFood();
		this.powerUp = null;
		this.score = 0;
		this.displayScore = 0;
		this.gameOver = false;
		this.paused = false;
		this.reverseGrowth = false;
		this.invincible = false;
		this.activePowerUps = new Set();
		this.foodCount = 0;
		this.lastPowerUpType = null;
		this.magnetActive = false;
		this.magnetRange = 5; // Range in grid cells
		this.inModal = false;
		this.animatingScore = false;
		this.animatingValue = false;
		this.keyStates = {
			up: false,
			down: false,
			left: false,
			right: false,
			space: false,
		};

		// Initialize all DOM elements
		this.modal = document.getElementById("gameOverModal");
		this.pauseModal = document.getElementById("pauseModal");

		// Make sure pauseModal exists and is hidden initially
		if (!this.pauseModal) {
			console.error("Pause modal not found in the DOM!");
		} else {
			this.pauseModal.style.display = "none";
		}

		this.finalScoreElement = document.getElementById("finalScore");
		this.playAgainButton = document.getElementById("playAgain");
		this.saveScoreButton = document.getElementById("saveScore");
		this.playerNameInput = document.getElementById("playerName");
		this.highscoresModal = document.getElementById("highscoresModal");
		this.highscoresList = document.getElementById("highscoresList");
		this.closeHighscoresButton = document.getElementById("closeHighscores");
		this.showHighscoresButton = document.getElementById("showHighscores");
		this.valueDisplay = document.getElementById("currentValue");

		// Initialize highscores with empty array
		this.highscores = [];

		// Get highscores from the API on game load
		this.fetchHighscores();

		this.setupEventListeners();
		this.updateScore();
		this.updateFoodValue();
		this.gameLoop();
	}

	setupEventListeners() {
		// Main keyboard event handler for all game controls
		document.addEventListener("keydown", (e) => {
			// Update key states for visual feedback
			if (e.key === "ArrowUp") this.updateKeyState("up", true);
			if (e.key === "ArrowDown") this.updateKeyState("down", true);
			if (e.key === "ArrowLeft") this.updateKeyState("left", true);
			if (e.key === "ArrowRight") this.updateKeyState("right", true);
			if (e.key === " " || e.code === "Space")
				this.updateKeyState("space", true);

			// Handle pause toggle with space bar (only when not in game over and not in modal)
			if ((e.key === " " || e.code === "Space") && !this.gameOver) {
				this.togglePause();
				e.preventDefault();
				return;
			}

			// If game is paused or over, don't process direction changes
			if (this.paused || this.gameOver || this.inModal) return;

			// Process arrow key directions for snake movement
			switch (e.key) {
				case "ArrowUp":
					if (this.snake.direction !== "down")
						this.snake.nextDirection = "up";
					break;
				case "ArrowDown":
					if (this.snake.direction !== "up")
						this.snake.nextDirection = "down";
					break;
				case "ArrowLeft":
					if (this.snake.direction !== "right")
						this.snake.nextDirection = "left";
					break;
				case "ArrowRight":
					if (this.snake.direction !== "left")
						this.snake.nextDirection = "right";
					break;
			}
		});

		document.addEventListener("keyup", (e) => {
			// Reset key states when keys are released
			if (e.key === "ArrowUp") this.updateKeyState("up", false);
			if (e.key === "ArrowDown") this.updateKeyState("down", false);
			if (e.key === "ArrowLeft") this.updateKeyState("left", false);
			if (e.key === "ArrowRight") this.updateKeyState("right", false);
			if (e.key === " " || e.code === "Space")
				this.updateKeyState("space", false);
		});

		this.playAgainButton.addEventListener("click", () => {
			this.modal.style.display = "none";
			this.inModal = false;
			this.reset();
		});

		this.saveScoreButton.addEventListener("click", () => {
			const name = this.playerNameInput.value.trim() || "Anonymous";
			this.addHighscore(name, this.score);
			this.modal.style.display = "none";
			this.highscoresModal.style.display = "block";
			this.inModal = true;
		});

		this.closeHighscoresButton.addEventListener("click", () => {
			this.highscoresModal.style.display = "none";
			this.inModal = false;
			// Start a new game when closing highscores
			this.reset();
		});

		this.showHighscoresButton.addEventListener("click", () => {
			this.highscoresModal.style.display = "block";
			this.inModal = true;
		});

		this.modal.addEventListener("click", (e) => {
			// Prevent clicks on the modal content from closing it
			if (e.target === this.modal) {
				this.inModal = true;
			}
		});

		this.highscoresModal.addEventListener("click", (e) => {
			// Prevent clicks on the modal content from closing it
			if (e.target === this.highscoresModal) {
				this.inModal = true;
			}
		});

		// Click on pause modal to resume
		this.pauseModal.addEventListener("click", () => {
			this.togglePause();
		});
	}

	updateKeyState(key, isPressed) {
		this.keyStates[key] = isPressed;

		// Update control button visuals based on key states
		const keyElements = {
			up: document.querySelector(".arrow-row:first-child .key-icon"),
			left: document.querySelector(
				".arrow-row:nth-child(2) .key-icon:first-child"
			),
			down: document.querySelector(
				".arrow-row:nth-child(2) .key-icon:nth-child(2)"
			),
			right: document.querySelector(
				".arrow-row:nth-child(2) .key-icon:last-child"
			),
			space: document.querySelector(".space-key .key-icon"),
		};

		if (keyElements[key]) {
			if (isPressed) {
				keyElements[key].classList.add("key-active");
			} else {
				keyElements[key].classList.remove("key-active");
			}
		}
	}

	togglePause() {
		// Toggle the pause state
		this.paused = !this.paused;

		// Update UI
		this.pauseModal.style.display = this.paused ? "block" : "none";

		// Set modal state
		this.inModal = this.paused;

		console.log(`Game is now ${this.paused ? 'PAUSED' : 'RESUMED'}`);
	}

	async fetchHighscores() {
		try {
			const scores = await getHighscores();
			if (scores && scores.length) {
				this.highscores = scores;
				this.updateHighscoresList();
			} else {
				// Fall back to local storage if API call fails
				this.highscores = JSON.parse(localStorage.getItem("highscores")) || [];
				this.updateHighscoresList();
			}
		} catch (error) {
			console.error("Error fetching highscores from API:", error);
			// Fall back to local storage
			this.highscores = JSON.parse(localStorage.getItem("highscores")) || [];
			this.updateHighscoresList();
		}
	}

	async addHighscore(name, score) {
		// First add to local array
		this.highscores.push({ name, score });
		this.highscores.sort((a, b) => b.score - a.score);
		this.highscores = this.highscores.slice(0, 10); // Keep only top 10

		// Save to local storage as backup
		localStorage.setItem("highscores", JSON.stringify(this.highscores));

		// Update display
		this.updateHighscoresList();

		// Save to the database via API
		try {
			await apiSaveHighscore(name, score);
			// Refresh highscores from the database to get latest
			await this.fetchHighscores();
		} catch (error) {
			console.error("Error saving highscore to database:", error);
		}
	}

	updateHighscoresList() {
		this.highscoresList.innerHTML = "";
		this.highscores.forEach((highscore) => {
			const item = document.createElement("div");
			item.className = "highscore-item";
			item.innerHTML = `
                <span class="highscore-name">${highscore.name}</span>
                <span class="highscore-score">${highscore.score}</span>
            `;
			this.highscoresList.appendChild(item);
		});
	}

	showGameOverModal() {
		this.finalScoreElement.textContent = this.score;
		this.playerNameInput.value = "";
		this.modal.style.display = "block";
		this.inModal = true;
	}

	generateFood() {
		let food;
		do {
			food = {
				x: Math.floor(Math.random() * GRID_SIZE),
				y: Math.floor(Math.random() * GRID_SIZE),
			};
		} while (
			this.snake.body.some(
				(segment) => segment.x === food.x && segment.y === food.y
			)
		);
		return food;
	}

	generatePowerUp() {
		this.foodCount++;
		if (this.foodCount >= 5 && this.foodCount <= 8 && !this.powerUp) {
			const types = Object.keys(POWER_UPS).filter(
				(type) => type !== this.lastPowerUpType
			);
			const type = types[Math.floor(Math.random() * types.length)];
			let position;
			do {
				position = {
					x: Math.floor(Math.random() * GRID_SIZE),
					y: Math.floor(Math.random() * GRID_SIZE),
				};
			} while (
				this.snake.body.some(
					(segment) => segment.x === position.x && segment.y === position.y
				)
			);

			this.powerUp = { type, position };
			this.lastPowerUpType = type;
			this.foodCount = 0;
			return true;
		}
		return false;
	}

	checkCollision() {
		const head = this.snake.body[0];

		// Self collision
		for (let i = 1; i < this.snake.body.length; i++) {
			if (head.x === this.snake.body[i].x && head.y === this.snake.body[i].y) {
				return !this.invincible;
			}
		}

		return false;
	}

	updateScore() {
		const scoreElement = document.getElementById("score");

		// If already animating, just update the target score
		if (this.animatingScore) {
			return;
		}

		// Start animation
		this.animatingScore = true;

		const animate = () => {
			if (this.displayScore < this.score) {
				this.displayScore += 1;
				scoreElement.textContent = this.displayScore;

				// Add the counter animation class
				scoreElement.classList.add("score-change");

				// Remove the class after animation completes
				setTimeout(() => {
					scoreElement.classList.remove("score-change");
				}, 300);

				requestAnimationFrame(animate);
			} else {
				this.animatingScore = false;
			}
		};

		requestAnimationFrame(animate);
	}

	updateFoodValue() {
		// Update the display of current food value
		const valueElement = document.getElementById("currentValue");
		if (valueElement) {
			const targetValue = this.powerUp ?
				this.snake.getCurrentPowerupValue() :
				this.snake.getCurrentFoodValue();

			// If already animating, just update the target value
			if (this.animatingValue) {
				return;
			}

			// Current displayed value
			const currentDisplayValue = parseInt(valueElement.textContent);

			// Only animate if the value is changing
			if (currentDisplayValue !== targetValue) {
				// Start animation
				this.animatingValue = true;

				const animate = () => {
					const displayValue = parseInt(valueElement.textContent);

					if (displayValue < targetValue) {
						// Increasing
						valueElement.textContent = displayValue + 1;
						valueElement.classList.add("score-change");

						// Remove the class after animation completes
						setTimeout(() => {
							valueElement.classList.remove("score-change");
						}, 300);

						requestAnimationFrame(animate);
					} else if (displayValue > targetValue) {
						// Decreasing
						valueElement.textContent = displayValue - 1;
						valueElement.classList.add("score-change");

						// Remove the class after animation completes
						setTimeout(() => {
							valueElement.classList.remove("score-change");
						}, 300);

						requestAnimationFrame(animate);
					} else {
						this.animatingValue = false;
					}
				};

				requestAnimationFrame(animate);
			}
		}
	}

	addPowerUp(type) {
		this.activePowerUps.add(type);
		const powerUpElement = document.createElement("div");
		powerUpElement.className = `power-up ${POWER_UPS[type].class}`;
		powerUpElement.textContent = POWER_UPS[type].name;
		document.getElementById("activePowerUps").appendChild(powerUpElement);
	}

	removePowerUp(type) {
		this.activePowerUps.delete(type);
		const powerUpsContainer = document.getElementById("activePowerUps");
		const elements = powerUpsContainer.getElementsByClassName(
			POWER_UPS[type].class
		);
		if (elements.length > 0) {
			elements[0].remove();
		}
	}

	draw() {
		const style = getComputedStyle(document.documentElement);
		const borderRadius = parseInt(
			style.getPropertyValue("--border-radius").trim() || "5"
		);

		// Clear canvas
		const bgColor = style.getPropertyValue("--gb-bg-light").trim() || "#b8b89c";
		this.ctx.fillStyle = bgColor;
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

		// Draw snake with proper graphics
		this.snake.body.forEach((segment, index) => {
			// Determine segment type and corresponding graphic
			let graphic;
			let scale = 1;

			if (index === 0) {
				// Head - use direction-specific head graphic
				switch (this.snake.direction) {
					case "up":
						graphic = snakeGraphics.headUp;
						break;
					case "down":
						graphic = snakeGraphics.headDown;
						break;
					case "left":
						graphic = snakeGraphics.headLeft;
						break;
					case "right":
						graphic = snakeGraphics.headRight;
						break;
				}
			} else if (index === this.snake.body.length - 1) {
				// Tail
				graphic = snakeGraphics.tail;
				scale = 0.6; // 60% size for the last segment
			} else if (index === this.snake.body.length - 2) {
				// Second to last segment
				graphic = snakeGraphics.body;
				scale = 0.8; // 80% size for the second-to-last segment
			} else {
				// Body segments
				graphic = snakeGraphics.body;
			}

			// Calculate position and size based on scale
			const size = CELL_SIZE - 1;
			const scaledSize = size * scale;
			const offset = (size - scaledSize) / 2;

			// Draw the segment with appropriate graphic
			if (graphic) {
				// Use modified color when invincible
				if (this.invincible) {
					// Create a blue tint version for invincibility
					const tempCanvas = document.createElement('canvas');
					tempCanvas.width = graphic.width;
					tempCanvas.height = graphic.height;
					const tempCtx = tempCanvas.getContext('2d');

					// Draw original graphic
					tempCtx.drawImage(graphic, 0, 0);

					// Apply blue tint effect
					tempCtx.globalCompositeOperation = 'source-atop';
					tempCtx.fillStyle = 'rgba(100, 180, 255, 0.7)';
					tempCtx.fillRect(0, 0, graphic.width, graphic.height);

					// Use tinted version
					this.ctx.drawImage(
						tempCanvas,
						0,
						0,
						graphic.width,
						graphic.height,
						segment.x * CELL_SIZE + offset,
						segment.y * CELL_SIZE + offset,
						scaledSize,
						scaledSize
					);
				} else {
					// Use normal graphic
					this.ctx.drawImage(
						graphic,
						0,
						0,
						graphic.width,
						graphic.height,
						segment.x * CELL_SIZE + offset,
						segment.y * CELL_SIZE + offset,
						scaledSize,
						scaledSize
					);
				}
			}
		});

		// Draw food or power-up with rounded corners
		const foodColor = style.getPropertyValue("--gb-food").trim() || "#505050";
		const powerupColor =
			style.getPropertyValue("--gb-accent").trim() || "#787878";

		if (this.powerUp) {
			this.ctx.fillStyle = powerupColor;
			this.roundRect(
				this.powerUp.position.x * CELL_SIZE,
				this.powerUp.position.y * CELL_SIZE,
				CELL_SIZE - 1,
				CELL_SIZE - 1,
				borderRadius
			);
		} else {
			this.ctx.fillStyle = foodColor;
			this.roundRect(
				this.food.x * CELL_SIZE,
				this.food.y * CELL_SIZE,
				CELL_SIZE - 1,
				CELL_SIZE - 1,
				borderRadius
			);
		}

		// Draw grid
		const gridColor =
			style.getPropertyValue("--gb-bg-medium").trim() || "#a8a878";
		this.ctx.strokeStyle = gridColor;
		this.ctx.lineWidth = 0.5;
		for (let i = 0; i <= GRID_SIZE; i++) {
			this.ctx.beginPath();
			this.ctx.moveTo(i * CELL_SIZE, 0);
			this.ctx.lineTo(i * CELL_SIZE, GRID_SIZE * CELL_SIZE);
			this.ctx.stroke();

			this.ctx.beginPath();
			this.ctx.moveTo(0, i * CELL_SIZE);
			this.ctx.lineTo(GRID_SIZE * CELL_SIZE, i * CELL_SIZE);
			this.ctx.stroke();
		}
	}

	roundRect(x, y, width, height, radius) {
		this.ctx.beginPath();
		this.ctx.moveTo(x + radius, y);
		this.ctx.lineTo(x + width - radius, y);
		this.ctx.quadraticCurveTo(
			x + width,
			y,
			x + width,
			y + radius
		);
		this.ctx.lineTo(x + width, y + height - radius);
		this.ctx.quadraticCurveTo(
			x + width,
			y + height,
			x + width - radius,
			y + height
		);
		this.ctx.lineTo(x + radius, y + height);
		this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
		this.ctx.lineTo(x, y + radius);
		this.ctx.quadraticCurveTo(x, y, x + radius, y);
		this.ctx.closePath();
		this.ctx.fill();
	}

	gameLoop() {
		// Check if the game is paused or over
		if (this.paused || this.gameOver) {
			// Keep requesting animation frames but don't update game state
			this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
			return;
		}

		// Continue with regular game logic
		this.snake.move();

		// Update the current value display
		this.updateFoodValue();

		// Apply magnet effect if active
		if (this.magnetActive) {
			const head = this.snake.body[0];
			const dx = this.food.x - head.x;
			const dy = this.food.y - head.y;
			const distance = Math.sqrt(dx * dx + dy * dy);

			if (distance <= this.magnetRange) {
				// Move food one step closer to snake
				if (Math.abs(dx) > Math.abs(dy)) {
					this.food.x -= Math.sign(dx);
				} else {
					this.food.y -= Math.sign(dy);
				}
			}
		}

		// Check for food/power-up collision
		if (
			this.powerUp &&
			this.snake.body[0].x === this.powerUp.position.x &&
			this.snake.body[0].y === this.powerUp.position.y
		) {
			POWER_UPS[this.powerUp.type].effect(this);
			this.addPowerUp(this.powerUp.type);
			this.powerUp = null;

			// Add score based on current value
			const powerupValue = this.snake.getCurrentPowerupValue();
			this.score += powerupValue;

			// Reset travel distance after collecting powerup
			this.snake.resetTravelDistance();
			this.updateScore();
			this.food = this.generateFood();
		} else if (
			this.snake.body[0].x === this.food.x &&
			this.snake.body[0].y === this.food.y
		) {
			if (!this.reverseGrowth) {
				this.snake.grow();
			}

			// Add score based on current value
			const foodValue = this.snake.getCurrentFoodValue();
			this.score += foodValue;

			// Reset travel distance after collecting food
			this.snake.resetTravelDistance();
			this.updateScore();
			if (this.generatePowerUp()) {
				this.food = this.powerUp.position;
			} else {
				this.food = this.generateFood();
			}
		}

		// Check for collisions
		if (this.checkCollision()) {
			this.gameOver = true;
			this.showGameOverModal();
			return;
		}

		// Render the game
		this.draw();

		// Queue the next frame with appropriate timing
		if (this.gameLoopTimeoutId) {
			clearTimeout(this.gameLoopTimeoutId);
		}

		this.gameLoopTimeoutId = setTimeout(
			() => {
				this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
			},
			this.snake.speed
		);
	}

	reset() {
		// Cancel any existing animation frames and timeouts
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}

		if (this.gameLoopTimeoutId) {
			clearTimeout(this.gameLoopTimeoutId);
			this.gameLoopTimeoutId = null;
		}

		// Clear all active power-ups
		this.activePowerUps.forEach(type => {
			this.removePowerUp(type);
		});

		document.getElementById("activePowerUps").innerHTML = "";

		// Reset game state
		this.snake.reset();
		this.food = this.generateFood();
		this.powerUp = null;
		this.score = 0;
		this.displayScore = 0;
		this.gameOver = false;
		this.paused = false;
		this.reverseGrowth = false;
		this.invincible = false;
		this.activePowerUps.clear();
		this.foodCount = 0;
		this.lastPowerUpType = null;
		this.magnetActive = false;
		this.animatingScore = false;
		this.animatingValue = false;

		// Force score display update
		document.getElementById("score").textContent = "0";

		// Directly set the initial value (no animation)
		const initialValue = this.snake.getCurrentFoodValue();
		document.getElementById("currentValue").textContent = initialValue;

		// Start the game (with a slight delay to ensure clean start)
		setTimeout(() => {
			this.gameLoop();
		}, 50);
	}
}

// Start the game when the page loads
window.onload = () => {
	// Check for any existing game instances and clean them up
	if (window.gameInstance) {
		if (window.gameInstance.animationFrameId) {
			cancelAnimationFrame(window.gameInstance.animationFrameId);
		}
		if (window.gameInstance.gameLoopTimeoutId) {
			clearTimeout(window.gameInstance.gameLoopTimeoutId);
		}
	}

	// Create a new game instance and store it globally
	window.gameInstance = new Game();
};
