    document.addEventListener('DOMContentLoaded', () => {
      // Change these from const to let
      let canvas, ctx, player, enemies, projectiles, powerUps;

      // Add the collision detection function here, before it's used
        function detectCollision(a, b) {
            return !(
            ((a.y + a.height) < (b.y)) ||
            (a.y > (b.y + b.height)) ||
            ((a.x + a.width) < b.x) ||
            (a.x > (b.x + b.width))
                );
            }
      // Make sure this is near the top of your script
      class CityLayer {
        constructor(color, speed, buildingWidth, buildingGap, minHeight, maxHeight) {
          this.color = color;
          this.speed = speed;
          this.buildingWidth = buildingWidth;
          this.buildingGap = buildingGap;
          this.minHeight = minHeight;
          this.maxHeight = maxHeight;
          this.buildings = [];
          this.initBuildings();
        }

        initBuildings() {
          let x = 0;
          while (x < canvas.width + this.buildingWidth) {
            const height = Math.random() * (this.maxHeight - this.minHeight) + this.minHeight;
            this.buildings.push({
              x: x,
              y: canvas.height - height,
              width: this.buildingWidth,
              height: height
            });
            x += this.buildingWidth + this.buildingGap;
          }
        }

        update() {
          this.buildings.forEach(building => {
            building.x -= this.speed;
            if (building.x + this.buildingWidth < 0) {
              const lastBuilding = this.buildings[this.buildings.length - 1];
              const height = Math.random() * (this.maxHeight - this.minHeight) + this.minHeight;
              building.x = lastBuilding.x + this.buildingWidth + this.buildingGap;
              building.y = canvas.height - height;
              building.height = height;
            }
          });

          // Check if we need to add more buildings
          const lastBuilding = this.buildings[this.buildings.length - 1];
          if (lastBuilding.x < canvas.width) {
            const height = Math.random() * (this.maxHeight - this.minHeight) + this.minHeight;
            this.buildings.push({
              x: lastBuilding.x + this.buildingWidth + this.buildingGap,
              y: canvas.height - height,
              width: this.buildingWidth,
              height: height
            });
          }

          // Remove buildings that are far off-screen to the left
          this.buildings = this.buildings.filter(building => building.x > -this.buildingWidth * 2);
        }

        draw() {
          ctx.fillStyle = this.color;
          this.buildings.forEach(building => {
            ctx.fillRect(building.x, building.y, building.width, building.height);
          });
        }
      }

      // Get DOM Elements
      const mainMenuScreen = document.getElementById('main-menu-screen');
      const playButton = document.getElementById('play-button');
      const shopButton = document.getElementById('shop-button');
      const shopScreen = document.getElementById('shop-screen');
      const backToMenuButton = document.getElementById('back-to-menu-button');
      const muteButton = document.getElementById('mute-button');
      const gameOverScreen = document.getElementById('game-over-screen');
      const finalScoreElement = document.getElementById('final-score');
      const scoreElement = document.getElementById('score');
      const pauseButton = document.getElementById('pause-button');
      const pauseScreen = document.getElementById('pause-screen');
      const resumeButton = document.getElementById('resume-button');
      const quitButton = document.getElementById('quit-button');
      const victoryScreen = document.getElementById('victory-screen');
      const nextLevelButton = document.getElementById('next-level-button');
      const victoryScoreElement = document.getElementById('victory-score');
      const gameCompletedScreen = document.getElementById('game-completed-screen');
      const toMainMenuButton = document.getElementById('to-main-menu-button');
      const victoryToMainMenuButton = document.getElementById('victory-to-main-menu-button');
      const completedToMainMenuButton = document.getElementById('completed-to-main-menu-button');

      const gameInfoElement = document.getElementById('game-info');
      const scoreDisplayElement = document.getElementById('score-display');
      const moneyDisplayElement = document.getElementById('money-display');

      // Set Canvas Dimensions
      canvas = document.getElementById('gameCanvas');
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      } else {
        console.error('Canvas element is not defined');
      }

      // Game Variables
      let gameLoopId, obstacleInterval, powerUpInterval;
      let score = 0, level = 1, cyberCoins = 0;
      const CANVAS_WIDTH = 800;
      const CANVAS_HEIGHT = 600;
      const cyberCoinsElement = document.createElement('div');
      cyberCoinsElement.id = 'cyber-coins';
      document.body.appendChild(cyberCoinsElement);
      const GRID_SIZE = 25;
      let gameSpeed = 5;
      let gravity = 0.8;
      let isGameOver = false;
      let isPaused = false;
      let backgroundOffset = 0;
      let obstacleSpawnRate;
      let maxLevels = 3;
      const floorHeight = 50; // Added floor height

      // Dash Variables
      let isDashing = false;
      let dashCooldown = false;
      const DASH_DURATION = 200; // milliseconds
      const DASH_COOLDOWN_TIME = 2000; // milliseconds
      const DASH_DISTANCE = 150; // pixels

      // Particle Array
      let particles = [];

      // Floor Pattern Variable
      let floorPattern;

      // Player Object
      player = { // Remove 'const'
        x: 100,
        y: canvas.height / 2 - 25,
        width: 50,
        height: 50,
        dy: 0,
        jumpStrength: 20,
        jumpCount: 0,
        maxJumps: 5, // Allows multi jump
        color: '#00ffff',
        shielded: false,
        isHandlingCollision: false,
        draw: function() {
          // Draw pixel art player
          ctx.fillStyle = this.color;
          ctx.fillRect(this.x, this.y, this.width, this.height);

          // Add glow effect
          ctx.shadowColor = this.color;
          ctx.shadowBlur = 20;
          ctx.fillRect(this.x, this.y, this.width, this.height);
          ctx.shadowBlur = 0;

          // Draw shield if active
          if (this.shielded) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 5;
            ctx.shadowColor = '#ffff00';
            ctx.shadowBlur = 15;
            ctx.strokeRect(this.x - 5, this.y - 5, this.width + 10, this.height + 10);
            ctx.shadowBlur = 0;
          }
        },
        update: function(deltaTime, gameSpeed) {
          this.dy += gravity;
          this.y += this.dy;

          // Prevent player from falling below the ground
          if (this.y + this.height > canvas.height - floorHeight) {
            this.y = canvas.height - floorHeight - this.height;
            this.dy = 0;
            this.jumpCount = 0; // Reset jump count when on ground
          }

          // Prevent player from going above the canvas
          if (this.y < 0) {
            this.y = 0;
            this.dy = 0;
          }

          // Check if player has gone off-screen to the right
          if (this.x > canvas.width) {
            winLevel();
          }

          // Check if player has gone off-screen to the left
          if (this.x + this.width < 0) {
            endGame();
          }

          this.draw();
          createParticles();
        },
        jump: function() {
          if (this.jumpCount < this.maxJumps) {
            this.dy = -this.jumpStrength;
            this.jumpCount++;
            console.log('Calling playSound("jump")');
            playSound('jump');
          }
        },
        
        dash: function() {
          if (!dashCooldown && !isDashing) {
            isDashing = true;
            const initialX = this.x;
            const targetX = this.x + DASH_DISTANCE;
            const dashStartTime = performance.now();

            const dashDuration = DASH_DURATION;

            const dash = (currentTime) => {
              const elapsed = currentTime - dashStartTime;
              if (elapsed < dashDuration) {
                const progress = elapsed / dashDuration;
                const previousX = this.x;
                this.x = initialX + (targetX - initialX) * easeOutCubic(progress);

                // Collision detection during dash
                const deltaX = this.x - previousX;
                const steps = Math.ceil(Math.abs(deltaX) / 5);
                const stepX = deltaX / steps;

                for (let i = 1; i <= steps; i++) {
                  const testX = previousX + stepX * i;
                  const testRect = {
                    x: testX,
                    y: this.y,
                    width: this.width,
                    height: this.height
                  };
                  // Check collision with obstacles
                  for (let obstacle of obstacles) {
                    const topObstacle = { x: obstacle.x, y: 0, width: obstacle.width, height: obstacle.gapY - obstacle.gapHeight / 2 };
                    const bottomObstacle = { x: obstacle.x, y: obstacle.gapY + obstacle.gapHeight / 2, width: obstacle.width, height: canvas.height - floorHeight - obstacle.gapY - obstacle.gapHeight / 2 };
                    if (detectCollision(testRect, topObstacle) || detectCollision(testRect, bottomObstacle)) {
                      // Collision detected, stop dash
                      this.x = testX - this.width;
                      isDashing = false;
                      dashCooldown = true;
                      setTimeout(() => {
                        dashCooldown = false;
                      }, DASH_COOLDOWN_TIME);
                      console.log('Calling playSound("collision")');
                      playSound('collision');
                      return;
                    }
                  }
                }

                requestAnimationFrame(dash);
              } else {
                this.x = targetX;
                isDashing = false;
                // Start cooldown only if dash was activated
                dashCooldown = true;
                setTimeout(() => {
                  dashCooldown = false;
                }, DASH_COOLDOWN_TIME);
              }
            };

            requestAnimationFrame(dash);
            console.log('Calling playSound("dash")');
            playSound('dash');
          }
        },
        reset: function() {
          this.x = 100;
          this.y = canvas.height / 2 - this.height / 2;
          this.dy = 0;
          this.jumpCount = 0;
          this.color = '#00ffff';
          this.shielded = false;
          isDashing = false;
          dashCooldown = false;
          this.isHandlingCollision = false;
        },
        applyPowerUp: function(type) {
          if (type === 'shield') {
            this.shielded = true;
            setTimeout(() => {
              this.shielded = false;
            }, 5000); // Shield lasts for 5 seconds
          }
          if (type === 'speed') {
            gameSpeed += 2;
            setTimeout(() => {
              gameSpeed -= 2;
            }, 5000); // Speed boost lasts for 5 seconds
          }
          if (type === 'slow') {
            gameSpeed = Math.max(2, gameSpeed - 2);
            setTimeout(() => {
              gameSpeed += 2;
            }, 5000); // Slow effect lasts for 5 seconds
          }
        }
      };

      // Easing function for smooth dash
      function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
      }

      // Obstacle Class
      class Obstacle {
        constructor() {
          this.width = 50;
          this.gapHeight = 200;
          this.x = canvas.width;
          this.gapY = Math.random() * (canvas.height - this.gapHeight - floorHeight) + this.gapHeight / 2;
          this.color = '#ff00ff'; // Base color
          this.passed = false;
          this.createTexture();
        }

        createTexture() {
          const textureCanvas = document.createElement('canvas');
          textureCanvas.width = this.width;
          textureCanvas.height = canvas.height;
          const textureCtx = textureCanvas.getContext('2d');

          // Create gradient
          const gradient = textureCtx.createLinearGradient(0, 0, this.width, 0);
          gradient.addColorStop(0, '#ff00ff');
          gradient.addColorStop(0.5, '#00ffff');
          gradient.addColorStop(1, '#ff00ff');

          // Fill background with gradient
          textureCtx.fillStyle = gradient;
          textureCtx.fillRect(0, 0, this.width, canvas.height);

          // Add cyberpunk-style lines
          textureCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          textureCtx.lineWidth = 2;
          for (let i = 0; i < this.width; i += 10) {
            textureCtx.beginPath();
            textureCtx.moveTo(i, 0);
            textureCtx.lineTo(i, canvas.height);
            textureCtx.stroke();
          }

          // Add glowing edges
          textureCtx.shadowColor = '#00ffff';
          textureCtx.shadowBlur = 10;
          textureCtx.strokeStyle = '#00ffff';
          textureCtx.lineWidth = 4;
          textureCtx.strokeRect(0, 0, this.width, canvas.height);

          this.texture = textureCanvas;
        }

        draw() {
          // Draw top part of the obstacle
          ctx.drawImage(
            this.texture,
            0, 0, this.width, this.gapY - this.gapHeight / 2,
            this.x, 0, this.width, this.gapY - this.gapHeight / 2
          );

          // Draw bottom part of the obstacle
          ctx.drawImage(
            this.texture,
            0, this.gapY + this.gapHeight / 2, this.width, canvas.height - this.gapY - this.gapHeight / 2 - floorHeight,
            this.x, this.gapY + this.gapHeight / 2, this.width, canvas.height - this.gapY - this.gapHeight / 2 - floorHeight
          );

          // Add extra glow effect
          ctx.shadowColor = '#00ffff';
          ctx.shadowBlur = 20;
          ctx.strokeStyle = '#00ffff';
          ctx.lineWidth = 2;
          ctx.strokeRect(this.x, 0, this.width, this.gapY - this.gapHeight / 2);
          ctx.strokeRect(this.x, this.gapY + this.gapHeight / 2, this.width, canvas.height - this.gapY - this.gapHeight / 2 - floorHeight);
          ctx.shadowBlur = 0;
        }

        update(deltaTime, gameSpeed) {
          this.x -= gameSpeed * (deltaTime / 16);
          this.draw();
        }
      }

      // Power-Up Class
      class PowerUp {
        constructor() {
          this.types = ['shield', 'speed', 'slow'];
          this.type = this.types[Math.floor(Math.random() * this.types.length)];
          this.size = 30;
          this.x = canvas.width;
          // Place power-ups at a height that avoids obstacles and above the floor
          this.y = canvas.height - floorHeight - 100;
          this.speed = gameSpeed;
        }

        draw() {
          if (this.type === 'shield') ctx.fillStyle = '#ffff00';
          if (this.type === 'speed') ctx.fillStyle = '#00ff00';
          if (this.type === 'slow') ctx.fillStyle = '#ff00ff';
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fill();

          // Add glow effect
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 15;
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        update(deltaTime, gameSpeed) {
          this.x -= this.speed * gameSpeed * (deltaTime / 16);
          this.draw();
        }
      }

      // Particle Class
      class Particle {
        constructor(x, y, radius, color, velocity) {
          this.x = x;
          this.y = y;
          this.radius = radius;
          this.color = color;
          this.velocity = velocity;
          this.alpha = 1;
        }

        draw(ctx) {
          ctx.save();
          ctx.globalAlpha = this.alpha;
          ctx.fillStyle = this.color;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
          ctx.fill();
          ctx.restore();
        }

        update() {
          this.x += this.velocity.x;
          this.y += this.velocity.y;
          this.alpha -= 0.01;
        }
      }

      // Create Particles
      function createParticles() {
        if (player && player.x !== undefined && player.y !== undefined) {
          particles.push(new Particle(
            player.x + player.width / 2,
            player.y + player.height,
            Math.random() * 2 + 1,
            '#00ffff',
            {
              x: (Math.random() - 0.5) * 2,
              y: Math.random() * 2
            }
          ));
        }

        particles.forEach((particle, index) => {
          if (particle.alpha <= 0) {
            particles.splice(index, 1);
          } else {
            particle.update();
          }
        });
      }

      // Obstacle Array
      let obstacles = [];

      // Handle Key Press
      function handleKeyPress(e) {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
          player.jump();
        }
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
          player.dash();
        }
        if (e.code === 'KeyP') {
          togglePause();
        }
      }

      // Handle Mouse Click
      function handleMouseClick(e) {
        // Only jump if click is not on UI elements
        if (e.target === document.body || e.target === canvas) {
          player.jump();
        }
      }

      // Background Layer Class (Fixed with Additional Designs)
      class BackgroundLayer {
        constructor(color, speed) {
          this.color = color;
          this.speed = speed;
          this.elements = [];
          this.initElements();
        }

        initElements() {
          const elementCount = Math.ceil(canvas.width / 100) + 1;
          for (let i = 0; i < elementCount; i++) {
            this.elements.push({
              x: i * 100,
              y: Math.random() * canvas.height * 0.5,
              width: 50 + Math.random() * 50,
              height: 100 + Math.random() * 200
            });
          }
        }

        update() {
          this.elements.forEach(element => {
            element.x -= this.speed;
            if (element.x + element.width < 0) {
              element.x = canvas.width;
              element.y = Math.random() * canvas.height * 0.5;
              element.width = 50 + Math.random() * 50;
              element.height = 100 + Math.random() * 200;
            }
          });
        }

        draw() {
          ctx.fillStyle = this.color;
          this.elements.forEach(element => {
            ctx.fillRect(element.x, element.y, element.width, element.height);
            
            // Add neon outlines
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(element.x, element.y, element.width, element.height);
            
            // Add some windows
            ctx.fillStyle = '#ffff00';
            for (let i = 0; i < 5; i++) {
              for (let j = 0; j < 3; j++) {
                if (Math.random() > 0.5) {
                  ctx.fillRect(element.x + 10 + j * 15, element.y + 10 + i * 40, 10, 30);
                }
              }
            }
          });
        }
      }

      // Initialize Background Layers
      let backgroundLayers = [];

      function initBackgroundLayers() {
        backgroundLayers = [
          new CityLayer('rgba(20, 20, 40, 0.8)', 0.5, 100, 20, canvas.height * 0.4, canvas.height * 0.7),
          new CityLayer('rgba(40, 40, 80, 0.6)', 1, 80, 15, canvas.height * 0.3, canvas.height * 0.6),
          new CityLayer('rgba(60, 60, 120, 0.4)', 1.5, 60, 10, canvas.height * 0.2, canvas.height * 0.5)
        ];
      }

      function drawNeonFloor() {
        const gridSize = 50;
        const lineWidth = 2;
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = lineWidth;

        // Draw vertical lines
        for (let x = 0; x < canvas.width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, canvas.height - floorHeight);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }

        // Draw horizontal lines
        for (let y = canvas.height - floorHeight; y < canvas.height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        // Add glow effect
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      // Add this function before updateCollisions()
    function handleCollision(player, obstacle) {
    // Only handle collision if not in invincibility frames
    if (!player.isInvincible) {
      if (player.shielded) {
        // If player has shield, remove it but don't end game
        player.shielded = false;
        playSound('shield-break');
      } else {
        // End the game
        isGameOver = true;
        playSound('death');
        showGameOverScreen();
      }
      
      // Add invincibility frames
      player.isInvincible = true;
      setTimeout(() => {
        player.isInvincible = false;
        }, 1000); // 1 second of invincibility
      }
     }
      // Declare grid at a higher scope
    let grid = {};

    function updateCollisions() {
        // Clear grid
        grid = {}; // Reset grid for each update
        
        // Add obstacles to grid
        obstacles.forEach(obstacle => {
          const topObstacle = { 
            x: obstacle.x, 
            y: 0, 
            width: obstacle.width, 
            height: obstacle.gapY - obstacle.gapHeight / 2 
          };
          const bottomObstacle = { 
            x: obstacle.x, 
            y: obstacle.gapY + obstacle.gapHeight / 2, 
            width: obstacle.width, 
            height: canvas.height - floorHeight - obstacle.gapY - obstacle.gapHeight / 2 
          };
          
          addToGrid(topObstacle);
          addToGrid(bottomObstacle);
        });
        
        // Check collisions for player
        const playerGridX = Math.floor(player.x / GRID_SIZE);
        const playerGridY = Math.floor(player.y / GRID_SIZE);
        let hasCollided = false;
        
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const key = `${playerGridX + dx},${playerGridY + dy}`;
            if (grid[key]) {
              grid[key].forEach(obstacle => {
                if (!hasCollided && detectCollision(player, obstacle)) {
                  hasCollided = true;
                  if (player.shielded) {
                    // Handle shield collision
                    player.shielded = false;
                  } else if (!isDashing) { // Only handle collision if not dashing
                    handleCollision(player, obstacle);
                  }
                }
              });
            }
          }
        }
      }

      // Define the addToGrid function
      function addToGrid(obstacle) {
        const gridX = Math.floor(obstacle.x / GRID_SIZE);
        const gridY = Math.floor(obstacle.y / GRID_SIZE);
        const key = `${gridX},${gridY}`;
        
        if (!grid[key]) {
          grid[key] = [];
        }
        
        grid[key].push(obstacle);
      }

      // Game Loop
      function gameLoop() {
        try {
          if (isPaused || isGameOver) return;

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Draw night sky
          const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
          skyGradient.addColorStop(0, '#000033');
          skyGradient.addColorStop(1, '#330033');
          ctx.fillStyle = skyGradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw stars
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          for (let i = 0; i < 100; i++) {
            ctx.beginPath();
            ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height * 0.7, Math.random() * 2, 0, Math.PI * 2);
            ctx.fill();
          }

          // Draw city layers
          backgroundLayers.forEach(layer => {
            layer.update();
            layer.draw();
          });

          // Draw neon floor
          drawNeonFloor();

          // Update and draw player
          player.update();
          player.draw();

          // Update and draw obstacles
          obstacles.forEach((obstacle, index) => {
            obstacle.update(16, gameSpeed); // Pass deltaTime (using 16ms as default) and gameSpeed
            // Remove obstacles that are off screen
            if (obstacle.x + obstacle.width < 0) {
              obstacles.splice(index, 1);
            }
            
          });
        updateCollisions();
          // Update Power-Ups
          powerUps.forEach((powerUp, index) => {
            powerUp.update();

            // Check for collision
            const powerUpCollisionBox = { x: powerUp.x - powerUp.size, y: powerUp.y - powerUp.size, width: powerUp.size * 2, height: powerUp.size * 2 };
            if (detectCollision(player, powerUpCollisionBox)) {
              player.applyPowerUp(powerUp.type);
              powerUps.splice(index, 1);
              playSound('powerup');
            }

            // Remove off-screen power-ups
            if (powerUp.x + powerUp.size < 0) {
              powerUps.splice(index, 1);
            }
          });

          // Update and draw particles
          particles.forEach((particle, index) => {
            if (particle.alpha <= 0) {
              particles.splice(index, 1);
            } else {
              particle.update();
              particle.draw(ctx);
            }
          });

          // Create cyber trail if enabled
          if (player.hasCyberTrail) {
            createParticles();
          }

          // Increase game speed over time, but cap it at a maximum value that increases with level
          const baseMaxGameSpeed = 10; // Base maximum speed
          const maxGameSpeed = baseMaxGameSpeed + (level - 1) * 2; // Increase max speed by 2 for each level
          gameSpeed = Math.min(gameSpeed + 0.0005, maxGameSpeed);
          obstacles.forEach(obstacle => obstacle.speed = gameSpeed);
          powerUps.forEach(powerUp => powerUp.speed = gameSpeed);

          // Continue the loop
          gameLoopId = requestAnimationFrame(gameLoop);
        } catch (error) {
          console.error('Error in game loop:', error);
          cancelAnimationFrame(gameLoopId);
        }
      }

      // Spawn Obstacles
      function spawnObstacles() {
        if (obstacleInterval) clearInterval(obstacleInterval);
        obstacleInterval = setInterval(() => {
          if (!isGameOver && !isPaused) {
            obstacles.push(new Obstacle());
            console.log("Obstacle spawned. Total obstacles:", obstacles.length);
          }
        }, obstacleSpawnRate);
      }

      // Spawn Power-Ups
      function spawnPowerUps() {
        powerUpInterval = setInterval(() => {
          if (!isGameOver && !isPaused) {
            powerUps.push(new PowerUp());
          }
        }, 15000); // Every 15 seconds
      }

      // Start Game
      function startGame() {
        console.log("Starting game...");
        if (!canvas || !ctx) {
          console.error('Canvas element not initialized');
          return;
        }
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.style.display = 'block';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        mainMenuScreen.classList.remove('active');
        gameOverScreen.classList.remove('active');
        victoryScreen.classList.remove('active');
        pauseScreen.classList.remove('active');
        gameCompletedScreen.classList.remove('active');
        shopScreen.classList.remove('active');
        canvas.style.visibility = 'visible';
        canvas.style.opacity = '1';
        gameInfoElement.style.display = 'block';
        pauseButton.style.display = 'block';
        isGameOver = false;
        isPaused = false;
        gameSpeed = 5 + level * 2;
        obstacleSpawnRate = Math.max(4000 - level * 500, 1500);
        obstacles = [];
        particles = [];
        powerUps = [];
        backgroundOffset = 0;
        score = 0;
        updateScoreDisplay();
        updateMoneyDisplay();
        player.reset();
        console.log("Initializing background layers...");
        initBackgroundLayers();
        console.log("Spawning obstacles...");
        spawnObstacles();
        console.log("Spawning power-ups...");
        spawnPowerUps();
        console.log("Initializing sounds...");
        initializeSounds();
        console.log("Playing background music...");
        playBackgroundMusic();
        console.log("Starting game loop...");
        gameLoopId = requestAnimationFrame(gameLoop);
        console.log("Game loop started with ID:", gameLoopId);
      }

      // Level Up
      function winLevel() {
        isGameOver = true;
        clearInterval(obstacleInterval);
        clearInterval(powerUpInterval);
        cancelAnimationFrame(gameLoopId);
        victoryScoreElement.textContent = score;
        cyberCoins += score; // Add score to CyberCoins
        updateMoneyDisplay();
        victoryScreen.classList.add('active');
        canvas.style.display = 'none';
        gameInfoElement.style.display = 'none'; // Hide game info
        pauseButton.style.display = 'none'; // Hide pause button when level is won
        stopBackgroundMusic();
        console.log('Calling playSound("levelComplete")');
        playSound('levelComplete');
      }

      function startNextLevel() {
        if (level >= maxLevels) {
          showGameCompletedScreen();
        } else {
          level++;
          score = 0; // Reset score for the new level
          victoryScreen.classList.remove('active');
          startGame();
        }
      }

      function showGameCompletedScreen() {
        isGameOver = true;
        clearInterval(obstacleInterval);
        clearInterval(powerUpInterval);
        cancelAnimationFrame(gameLoopId);
        cyberCoins += score; // Add final level score to CyberCoins
        updateMoneyDisplay();
        gameCompletedScreen.classList.add('active');
        canvas.style.display = 'none';
        gameInfoElement.style.display = 'none'; // Hide game info
        pauseButton.style.display = 'none'; // Hide pause button when game is completed
        stopBackgroundMusic();
      }

      function restartGame() {
        level = 1;
        score = 0;
        gameCompletedScreen.classList.remove('active');
        startGame();
      }


      // End Game
      function endGame() {
        isGameOver = true;
        clearInterval(obstacleInterval);
        clearInterval(powerUpInterval);
        cancelAnimationFrame(gameLoopId);
        finalScoreElement.textContent = score;
        gameOverScreen.classList.add('active');
        canvas.style.display = 'none';
        gameInfoElement.style.display = 'none'; // Hide game info
        pauseButton.style.display = 'none'; // Hide pause button when game ends
        stopBackgroundMusic();
        console.log('Calling playSound("gameOver")');
        playSound('gameOver');

        // Reset level and score
        level = 1;
        score = 0;
      }

      // Toggle Pause
      function togglePause() {
        if (isGameOver) return;

        isPaused = !isPaused;

        if (isPaused) {
          pauseScreen.classList.add('active');
          cancelAnimationFrame(gameLoopId);
          clearInterval(obstacleInterval);
          clearInterval(powerUpInterval);
          stopBackgroundMusic();
        } else {
          pauseScreen.classList.remove('active');
          spawnObstacles();
          spawnPowerUps();
          playBackgroundMusic();
          gameLoopId = requestAnimationFrame(gameLoop);
        }
      }

      // Resume Game
      function resumeGame() {
        if (!isPaused) return;
        isPaused = false;
        pauseScreen.classList.remove('active');
        spawnObstacles();
        spawnPowerUps();
        playBackgroundMusic();
        gameLoopId = requestAnimationFrame(gameLoop);
      }

      // Quit to Start Screen
      function quitGame() {
        isPaused = false;
        isGameOver = false;
        pauseScreen.classList.remove('active');
        gameOverScreen.classList.remove('active');
        victoryScreen.classList.remove('active');
        gameCompletedScreen.classList.remove('active');
        canvas.style.display = 'none';
        gameInfoElement.style.display = 'none';
        pauseButton.style.display = 'none';
        obstacles = [];
        particles = [];
        powerUps = [];
        cancelAnimationFrame(gameLoopId);
        clearInterval(obstacleInterval);
        clearInterval(powerUpInterval);
        stopBackgroundMusic();
      }

      // Play Background Music
      let backgroundMusic;
      function playBackgroundMusic() {
        backgroundMusic = new Audio('https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3');
        backgroundMusic.loop = true;
        backgroundMusic.volume = 0.1; // Adjust this value for background music volume
        backgroundMusic.play().catch(error => console.error('Error playing background music:', error));
      }

      function stopBackgroundMusic() {
        if (backgroundMusic) {
          backgroundMusic.pause();
          backgroundMusic.currentTime = 0;
        }
      }

      // Sound Effects
      function createAudio(url) {
        const audio = new Audio(url);
        audio.addEventListener('error', (e) => {
          console.error(`Error loading audio from ${url}:`, e);
        });
        return audio;
      }

      const sounds = {
        jump: createAudio('https://assets.mixkit.co/sfx/download/mixkit-quick-jump-arcade-game-239.mp3'),
        collision: createAudio('https://assets.mixkit.co/sfx/download/mixkit-arcade-retro-changing-tab-206.mp3'),
        score: createAudio('https://assets.mixkit.co/sfx/download/mixkit-arcade-mechanical-bling-210.mp3'),
        powerup: createAudio('https://assets.mixkit.co/sfx/download/mixkit-arcade-game-jump-coin-216.mp3'),
        dash: createAudio('https://assets.mixkit.co/sfx/download/mixkit-fast-small-sweep-transition-166.mp3'),
        levelComplete: createAudio('https://assets.mixkit.co/sfx/download/mixkit-arcade-game-complete-or-approved-mission-205.mp3'),
        gameOver: createAudio('https://assets.mixkit.co/sfx/download/mixkit-player-losing-or-failing-2042.mp3')
      };

      // Add this after defining the sounds object
      Object.entries(sounds).forEach(([name, audio]) => {
        audio.addEventListener('canplaythrough', () => console.log(`${name} sound loaded`));
        audio.addEventListener('error', (e) => console.error(`Error loading ${name} sound:`, e));
      });

      function playSound(name) {
        if (sounds[name]) {
          console.log(`Attempting to play ${name} sound`);
          sounds[name].currentTime = 0;
          sounds[name].play().then(() => {
            console.log(`${name} sound played successfully`);
          }).catch(error => {
            console.error(`Error playing ${name} sound:`, error);
          });
        } else {
          console.warn(`Sound "${name}" not found`);
        }
      }

      function initializeSounds() {
        Object.values(sounds).forEach(sound => sound.volume = 0.3); // Adjust this value to set the overall volume
        // Set specific volumes for certain sounds if needed
        sounds.collision.volume = 0.2;
        sounds.gameOver.volume = 0.4;
      }

      // Event Listeners
      playButton.addEventListener('click', startGame);
      resumeButton.addEventListener('click', resumeGame);
      quitButton.addEventListener('click', quitGame);
      pauseButton.addEventListener('click', togglePause);
      nextLevelButton.addEventListener('click', startNextLevel);
      toMainMenuButton.addEventListener('click', showMainMenu);
      victoryToMainMenuButton.addEventListener('click', showMainMenu);
      completedToMainMenuButton.addEventListener('click', showMainMenu);
      document.addEventListener('keydown', handleKeyPress);
      document.addEventListener('click', handleMouseClick);

      // Handle window resize
      window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        player.y = canvas.height / 2 - player.height / 2;
        initBackgroundLayers();
      });

      // Initialize Floor Pattern on Load
      window.onload = () => {
        initBackgroundLayers();
      };

      // Initially show the start screen
      mainMenuScreen.classList.add('active');

      let isMuted = false;

      function toggleMute() {
        isMuted = !isMuted;
        Object.values(sounds).forEach(sound => sound.muted = isMuted);
        if (backgroundMusic) backgroundMusic.muted = isMuted;
        
        // Update mute button text/icon
        muteButton.textContent = isMuted ? 'Unmute' : 'Mute';
      }

      // Show Main Menu
      function showMainMenu() {
        mainMenuScreen.classList.add('active');
        shopScreen.classList.remove('active');
        gameOverScreen.classList.remove('active');
        victoryScreen.classList.remove('active');
        gameCompletedScreen.classList.remove('active');
        pauseScreen.classList.remove('active');
        canvas.style.display = 'none';
        gameInfoElement.style.display = 'none';
        pauseButton.style.display = 'none';
        updateMoneyDisplay();
      }

      // Show Shop
      function showShop() {
        mainMenuScreen.classList.remove('active');
        shopScreen.classList.add('active');
        gameInfoElement.style.display = 'none';
        updateCyberCoinsDisplay();
        initializeShop();
      }

      function initializeShop() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
          button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
          });
        });

        // Populate upgrade items
        const upgradeItems = document.getElementById('upgrade-items');
        upgradeItems.innerHTML = `
          <div class="shop-item">
            <h4>Speed Boost</h4>
            <p>Increase your speed by 10%</p>
            <button onclick="purchaseItem('Speed Boost', 50)">Buy for 50 CyberCoins</button>
          </div>
          <div class="shop-item">
            <h4>Shield</h4>
            <p>Gain a protective shield</p>
            <button onclick="purchaseItem('Shield', 100)">Buy for 100 CyberCoins</button>
          </div>
          <div class="shop-item">
            <h4>Multi-Jump</h4>
            <p>Increase max jumps by 1</p>
            <button onclick="purchaseItem('Multi-Jump', 75)">Buy for 75 CyberCoins</button>
          </div>
        `;

        // Populate cosmetic items
        const cosmeticItems = document.getElementById('cosmetic-items');
        cosmeticItems.innerHTML = `
          <div class="shop-item">
            <h4>Neon Skin</h4>
            <p>Give your character a neon glow</p>
            <button onclick="purchaseItem('Neon Skin', 75)">Buy for 75 CyberCoins</button>
          </div>
          <div class="shop-item">
            <h4>Cyber Trail</h4>
            <p>Leave a trail of cyber particles</p>
            <button onclick="purchaseItem('Cyber Trail', 125)">Buy for 125 CyberCoins</button>
          </div>
        `;
      }

      function purchaseItem(itemName, price) {
        if (cyberCoins >= price) {
          cyberCoins -= price;
          updateCyberCoinsDisplay();
          
          switch(itemName) {
            case 'Speed Boost':
              gameSpeed *= 1.1; // Increase game speed by 10%
              alert('Speed Boost activated! Your speed has increased by 10%.');
              break;
            case 'Shield':
              player.shielded = true;
              setTimeout(() => {
                player.shielded = false;
                alert('Your shield has expired.');
              }, 30000); // Shield lasts for 30 seconds
              alert('Shield activated! You are protected for the next 30 seconds.');
              break;
            case 'Multi-Jump':
              player.maxJumps += 1;
              alert(`Multi-Jump upgraded! You can now jump ${player.maxJumps} times before landing.`);
              break;
            case 'Neon Skin':
              player.color = '#00ff00'; // Bright neon green
              alert('Neon Skin applied! Your character now has a neon glow.');
              break;
            case 'Cyber Trail':
              player.hasCyberTrail = true;
              alert('Cyber Trail activated! You now leave a trail of cyber particles.');
              break;
            default:
              alert(`You purchased ${itemName}!`);
          }
        } else {
          alert("Not enough CyberCoins!");
        }
      }

      // Add this function to create cyber trail particles
      function createCyberTrail() {
        if (player.hasCyberTrail) {
          for (let i = 0; i < 3; i++) {
            particles.push(new Particle(
              player.x + player.width / 2,
              player.y + player.height / 2,
              Math.random() * 3 + 1,
              '#00ffff',
              {
                x: (Math.random() - 0.5) * 3,
                y: (Math.random() - 0.5) * 3
              }
            ));
          }
        }
      }

      // Update the player's draw method to include the neon glow effect
      player.draw = function() {
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;

        if (this.shielded) {
          ctx.strokeStyle = '#ffff00';
          ctx.lineWidth = 3;
          ctx.strokeRect(this.x - 5, this.y - 5, this.width + 10, this.height + 10);
        }
      };

      // Event Listeners
      shopButton.addEventListener('click', showShop);
      backToMenuButton.addEventListener('click', showMainMenu);

      muteButton.addEventListener('click', toggleMute);

      // Initialize game
      function initializeGame() {
        canvas = document.getElementById('gameCanvas');
        ctx = canvas.getContext('2d');
        
        console.log(`Canvas dimensions: width=${canvas.width}, height=${canvas.height}`);
        
        if (canvas.width === 0 || canvas.height === 0) {
          console.error('Canvas dimensions are invalid. Setting default size.');
          canvas.width = 800;  // Set a default width
          canvas.height = 600; // Set a default height
        }

        // Initialize game objects
        player.x = CANVAS_WIDTH / 2; // Set initial player position
        player.y = CANVAS_HEIGHT - 30;
        player.width = 50;  // Increase from 20 to 50
        player.height = 50; // Increase from 20 to 50
        player.dy = 0; // Initial vertical velocity
        player.jumpStrength = 15; // Strength of the jump
        player.jumpCount = 0; // Current jump count
        player.maxJumps = 5; // Maximum number of jumps allowed
        player.color = 'blue';
        player.shielded = false; // Whether the player is shielded
        enemies = [];
        projectiles = [];
        powerUps = [];

        // Set up event listeners
        document.addEventListener('keydown', handleKeyPress);
        // Remove or comment out these lines if they're not needed:
        // document.addEventListener('keyup', handleKeyUp);
        // canvas.addEventListener('click', handleClick);

        // Initialize UI elements
        const playButton = document.getElementById('play-button');
        const shopButton = document.getElementById('shop-button');
        // ... other UI element initializations ...

        if (playButton) playButton.addEventListener('click', startGame);
        if (shopButton) shopButton.addEventListener('click', showShop);
        // ... other UI event listeners ...
      }

      // At the end of the DOMContentLoaded event listener
      initializeGame();

      function preloadSounds() {
        const soundPromises = Object.entries(sounds).map(([name, audio]) => {
          return new Promise((resolve, reject) => {
            audio.addEventListener('canplaythrough', resolve, { once: true });
            audio.addEventListener('error', reject, { once: true });
            audio.load();
          }).then(() => {
            console.log(`${name} sound loaded successfully`);
          }).catch((error) => {
            console.error(`Error loading ${name} sound:`, error);
          });
        });

        return Promise.all(soundPromises);
      }

      // Add this function to update the CyberCoins display
      function updateCyberCoinsDisplay() {
        const cyberCoinsElements = document.querySelectorAll('.cyber-coins-display');
        cyberCoinsElements.forEach(element => {
          element.textContent = `CyberCoins: ${cyberCoins}`;
        });
      }

      // Update the updateScore function
      function updateScore() {
        score++;
        updateScoreDisplay();
      }

      // Add new function to update score display
      function updateScoreDisplay() {
        const scoreDisplayElement = document.getElementById('score-display');
        if (scoreDisplayElement) {
          scoreDisplayElement.textContent = `Level: ${level} Score: ${score}`;
        } else {
          console.error('Score display element not found');
        }
      }

      function loadAudio(src) {
        return new Promise((resolve, reject) => {
          const audio = new Audio(src);
          audio.addEventListener('canplaythrough', () => resolve(audio));
          audio.addEventListener('error', (e) => reject(new Error(`Failed to load audio: ${src}`)));
          audio.load();
        });
      }

      async function initializeAudio() {
        try {
          backgroundMusic = await loadAudio('path/to/background-music.mp3');
          shootSound = await loadAudio('path/to/shoot-sound.mp3');
          // ... load other audio files ...
        } catch (error) {
          console.error(error);
        }
      }

      function updateMoneyDisplay() {
        const moneyDisplayElement = document.getElementById('money-display');
        if (moneyDisplayElement) {
          moneyDisplayElement.textContent = `CyberCoins: ${cyberCoins}`;
        } else {
          console.error('Money display element not found');
        }
      }
     
    });

