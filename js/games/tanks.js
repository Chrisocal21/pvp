// Tank Battle Game Implementation

class TankGame {
    constructor(engine) {
        this.engine = engine;
        this.canvas = engine.canvas;
        this.ctx = engine.ctx;
        
        // Game state
        this.player1Score = 0;
        this.player2Score = 0;
        this.maxScore = 5;
        this.gameOver = false;
        this.winner = null;
        
        // Game objects
        this.tank1 = null;
        this.tank2 = null;
        this.bullets = [];
        this.obstacles = [];
        
        // Settings
        this.settings = {
            tankSize: 25,
            tankSpeed: 150,
            bulletSpeed: 400,
            maxBullets: 3,
            fireRate: 500 // ms between shots
        };
        
        this.init();
    }

    init() {
        const canvasSize = this.engine.getCanvasSize();
        
        // Create tanks
        this.tank1 = new Tank(
            canvasSize.x * 0.25, 
            canvasSize.y * 0.75, 
            this.settings.tankSize,
            true
        );
        
        this.tank2 = new Tank(
            canvasSize.x * 0.75, 
            canvasSize.y * 0.25, 
            this.settings.tankSize,
            false
        );
        
        // Set tank bounds
        this.tank1.bounds = new Rectangle(20, canvasSize.y / 2 + 20, canvasSize.x - 40, canvasSize.y / 2 - 40);
        this.tank2.bounds = new Rectangle(20, 20, canvasSize.x - 40, canvasSize.y / 2 - 40);
        
        // Create obstacles
        this.createObstacles();
        
        // Add to engine
        this.engine.addGameObject(this.tank1);
        this.engine.addGameObject(this.tank2);
        this.obstacles.forEach(obstacle => this.engine.addGameObject(obstacle));
        
        // Bind update method
        this.update = this.update.bind(this);
    }

    createObstacles() {
        const canvasSize = this.engine.getCanvasSize();
        const obstacleSize = 40;
        
        // Create some strategic obstacles
        const positions = [
            { x: canvasSize.x * 0.3, y: canvasSize.y * 0.3 },
            { x: canvasSize.x * 0.7, y: canvasSize.y * 0.7 },
            { x: canvasSize.x * 0.5, y: canvasSize.y * 0.4 },
            { x: canvasSize.x * 0.5, y: canvasSize.y * 0.6 },
            { x: canvasSize.x * 0.2, y: canvasSize.y * 0.5 },
            { x: canvasSize.x * 0.8, y: canvasSize.y * 0.5 }
        ];
        
        positions.forEach(pos => {
            const obstacle = new Obstacle(pos.x, pos.y, obstacleSize, obstacleSize);
            this.obstacles.push(obstacle);
        });
    }

    update() {
        if (this.gameOver) return;
        
        // Update tanks based on input
        this.updateTankInput();
        
        // Update bullets
        this.updateBullets();
        
        // Check collisions
        this.checkCollisions();
    }

    updateTankInput() {
        const touches = InputManager.getTouches();
        const canvasSize = this.engine.getCanvasSize();
        
        // Player 1 (bottom tank) - bottom half of screen when rotated
        const player1Touch = touches.find(touch => 
            touch.y > canvasSize.y / 2
        );
        
        if (player1Touch) {
            // For player 1, the touch controls are rotated 180 degrees
            const rotatedX = canvasSize.x - player1Touch.x;
            const rotatedY = canvasSize.y - player1Touch.y;
            this.tank1.moveTo(rotatedX, rotatedY);
        }
        
        // Player 2 (top tank) - top half of screen
        const player2Touch = touches.find(touch => 
            touch.y < canvasSize.y / 2
        );
        
        if (player2Touch) {
            this.tank2.moveTo(player2Touch.x, player2Touch.y);
        }
    }

    updateBullets() {
        // Remove bullets that are out of bounds
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            const canvasSize = this.engine.getCanvasSize();
            
            if (bullet.position.x < 0 || bullet.position.x > canvasSize.x ||
                bullet.position.y < 0 || bullet.position.y > canvasSize.y) {
                this.engine.removeGameObject(bullet);
                this.bullets.splice(i, 1);
            }
        }
        
        // Auto-fire for tanks
        this.tank1.tryAutoFire();
        this.tank2.tryAutoFire();
    }

    checkCollisions() {
        // Bullet vs tank collisions
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            // Don't check collision with own tank
            const targetTank = bullet.owner === this.tank1 ? this.tank2 : this.tank1;
            
            if (bullet.getBounds().intersects(targetTank.getBounds())) {
                // Hit!
                this.tankHit(targetTank);
                this.engine.removeGameObject(bullet);
                this.bullets.splice(i, 1);
                continue;
            }
            
            // Bullet vs obstacle collisions
            for (let j = 0; j < this.obstacles.length; j++) {
                const obstacle = this.obstacles[j];
                if (bullet.getBounds().intersects(obstacle.getBounds())) {
                    // Bullet destroyed by obstacle
                    this.engine.particleSystem.emit(bullet.position.x, bullet.position.y, 5, '#ffff00');
                    this.engine.removeGameObject(bullet);
                    this.bullets.splice(i, 1);
                    AudioManager.playSound('wallHit');
                    break;
                }
            }
        }
    }

    tankHit(tank) {
        // Tank was hit
        if (tank === this.tank1) {
            this.player2Score++;
        } else {
            this.player1Score++;
        }
        
        AudioManager.playSound('explosion');
        
        // Update UI
        GameManager.updateScore(this.player1Score, this.player2Score);
        
        // Explosion effect
        this.engine.particleSystem.emit(tank.position.x, tank.position.y, 20, '#ff6600');
        
        // Respawn tank
        this.respawnTank(tank);
        
        // Check for game over
        if (this.player1Score >= this.maxScore || this.player2Score >= this.maxScore) {
            this.gameOver = true;
            this.winner = this.player1Score >= this.maxScore ? 1 : 2;
            GameManager.gameOver(this.winner);
        }
    }

    respawnTank(tank) {
        const canvasSize = this.engine.getCanvasSize();
        
        if (tank === this.tank1) {
            // Player 1 respawns in bottom area
            tank.position.x = canvasSize.x * 0.25;
            tank.position.y = canvasSize.y * 0.75;
        } else {
            // Player 2 respawns in top area
            tank.position.x = canvasSize.x * 0.75;
            tank.position.y = canvasSize.y * 0.25;
        }
        
        tank.velocity = new Vector2(0, 0);
        tank.rotation = 0;
    }

    fireBullet(tank, direction) {
        // Check max bullets
        const tankBullets = this.bullets.filter(bullet => bullet.owner === tank);
        if (tankBullets.length >= this.settings.maxBullets) {
            return;
        }
        
        const bullet = new Bullet(
            tank.position.x + Math.cos(tank.rotation) * tank.size,
            tank.position.y + Math.sin(tank.rotation) * tank.size,
            direction,
            this.settings.bulletSpeed * GameManager.settings.gameSpeed,
            tank
        );
        
        this.bullets.push(bullet);
        this.engine.addGameObject(bullet);
        AudioManager.playSound('tankShot');
    }

    restart() {
        this.player1Score = 0;
        this.player2Score = 0;
        this.gameOver = false;
        this.winner = null;
        
        GameManager.updateScore(0, 0);
        
        // Clear bullets
        this.bullets.forEach(bullet => this.engine.removeGameObject(bullet));
        this.bullets = [];
        
        // Reset tank positions
        this.respawnTank(this.tank1);
        this.respawnTank(this.tank2);
    }

    cleanup() {
        this.engine.removeGameObject(this.tank1);
        this.engine.removeGameObject(this.tank2);
        this.bullets.forEach(bullet => this.engine.removeGameObject(bullet));
        this.obstacles.forEach(obstacle => this.engine.removeGameObject(obstacle));
        this.engine.particleSystem.clear();
    }

    render() {
        const canvasSize = this.engine.getCanvasSize();
        const ctx = this.ctx;
        
        // Draw center line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(0, canvasSize.y / 2);
        ctx.lineTo(canvasSize.x, canvasSize.y / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw bullet count indicators
        const tank1Bullets = this.bullets.filter(bullet => bullet.owner === this.tank1).length;
        const tank2Bullets = this.bullets.filter(bullet => bullet.owner === this.tank2).length;
        
        ctx.fillStyle = 'rgba(255, 107, 107, 0.7)';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Ammo: ${this.settings.maxBullets - tank1Bullets}`, canvasSize.x / 4, canvasSize.y - 10);
        
        ctx.fillStyle = 'rgba(78, 205, 196, 0.7)';
        ctx.fillText(`Ammo: ${this.settings.maxBullets - tank2Bullets}`, canvasSize.x * 3/4, 30);
        
        // Game over overlay
        if (this.gameOver && this.winner) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvasSize.x, canvasSize.y);
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Player ${this.winner} Wins!`, canvasSize.x / 2, canvasSize.y / 2);
            
            ctx.font = '24px Arial';
            ctx.fillText('Tank Battle Complete!', canvasSize.x / 2, canvasSize.y / 2 + 40);
            ctx.fillText('Tap to continue', canvasSize.x / 2, canvasSize.y / 2 + 80);
        }
    }

    updateSettings() {
        // Apply settings changes
        if (this.tank1) {
            this.tank1.speed = this.settings.tankSpeed * GameManager.settings.gameSpeed;
        }
        if (this.tank2) {
            this.tank2.speed = this.settings.tankSpeed * GameManager.settings.gameSpeed;
        }
    }
}

// Tank class
class Tank extends GameObject {
    constructor(x, y, size, isPlayer1 = true) {
        super(x, y);
        this.size = size;
        this.isPlayer1 = isPlayer1;
        this.color = isPlayer1 ? '#ff6b6b' : '#4ecdc4';
        this.speed = 150;
        this.targetPosition = new Vector2(x, y);
        this.bounds = null;
        this.lastFireTime = 0;
        this.autoFireDelay = 100; // Auto-fire when near enemy
    }

    update(deltaTime) {
        // Move towards target
        const diff = this.targetPosition.subtract(this.position);
        const distance = diff.magnitude();
        
        if (distance > 2) {
            this.rotation = diff.angle();
            const moveVector = diff.normalize().multiply(this.speed * deltaTime);
            this.velocity = moveVector.divide(deltaTime);
            this.position = this.position.add(moveVector);
        } else {
            this.velocity = new Vector2(0, 0);
        }
        
        // Apply bounds
        if (this.bounds) {
            this.position.x = Utils.clamp(
                this.position.x, 
                this.bounds.left + this.size, 
                this.bounds.right - this.size
            );
            this.position.y = Utils.clamp(
                this.position.y, 
                this.bounds.top + this.size, 
                this.bounds.bottom - this.size
            );
        }
    }

    draw(ctx) {
        // Tank body
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        
        // Tank barrel
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(this.size * 0.8, 0);
        ctx.stroke();
        
        // Tank highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(-this.size/2, -this.size/2, this.size/3, this.size/3);
        
        // Tank border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.size/2, -this.size/2, this.size, this.size);
    }

    moveTo(x, y) {
        this.targetPosition.x = x;
        this.targetPosition.y = y;
    }

    tryAutoFire() {
        const now = Date.now();
        if (now - this.lastFireTime > 800) { // Auto-fire every 800ms
            this.fire();
            this.lastFireTime = now;
        }
    }

    fire() {
        // Get current game instance to fire bullet
        if (GameManager.currentGame && GameManager.currentGame.fireBullet) {
            const direction = Vector2.fromAngle(this.rotation);
            GameManager.currentGame.fireBullet(this, direction);
        }
    }

    getBounds() {
        return new Rectangle(
            this.position.x - this.size/2,
            this.position.y - this.size/2,
            this.size,
            this.size
        );
    }
}

// Bullet class
class Bullet extends GameObject {
    constructor(x, y, direction, speed, owner) {
        super(x, y);
        this.direction = direction.normalize();
        this.speed = speed;
        this.velocity = this.direction.multiply(speed);
        this.owner = owner;
        this.radius = 3;
        this.color = owner.color;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Bullet glow
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    getBounds() {
        return new Circle(this.position.x, this.position.y, this.radius);
    }
}

// Obstacle class
class Obstacle extends GameObject {
    constructor(x, y, width, height) {
        super(x, y);
        this.width = width;
        this.height = height;
        this.color = '#666666';
    }

    draw(ctx) {
        // Obstacle body
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(-this.width/2, -this.height/2, this.width/3, this.height/3);
        
        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-this.width/2, -this.height/2, this.width, this.height);
    }

    getBounds() {
        return new Rectangle(
            this.position.x - this.width/2,
            this.position.y - this.height/2,
            this.width,
            this.height
        );
    }
}
