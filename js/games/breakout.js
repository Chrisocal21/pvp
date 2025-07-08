// Breakout Duel Game Implementation

class BreakoutGame {
    constructor(engine) {
        this.engine = engine;
        this.canvas = engine.canvas;
        this.ctx = engine.ctx;
        
        // Game state
        this.player1Score = 0;
        this.player2Score = 0;
        this.gameOver = false;
        this.winner = null;
        
        // Game objects
        this.paddle1 = null;
        this.paddle2 = null;
        this.ball = null;
        this.bricks1 = []; // Player 1's bricks to defend
        this.bricks2 = []; // Player 2's bricks to defend
        
        // Settings
        this.settings = {
            paddleWidth: 60,
            paddleHeight: 15,
            ballRadius: 8,
            ballSpeed: 280,
            brickWidth: 40,
            brickHeight: 20,
            brickRows: 4,
            brickCols: 8
        };
        
        this.init();
    }

    init() {
        const canvasSize = this.engine.getCanvasSize();
        const centerX = canvasSize.x / 2;
        const centerY = canvasSize.y / 2;
        
        // Create paddles
        this.paddle1 = new Paddle(
            centerX, 
            canvasSize.y - 40, 
            this.settings.paddleWidth * GameManager.settings.paddleSize, 
            this.settings.paddleHeight * GameManager.settings.paddleSize,
            true
        );
        
        this.paddle2 = new Paddle(
            centerX, 
            40, 
            this.settings.paddleWidth * GameManager.settings.paddleSize, 
            this.settings.paddleHeight * GameManager.settings.paddleSize,
            false
        );
        
        // Set paddle movement bounds
        this.paddle1.bounds = new Rectangle(0, canvasSize.y - 80, canvasSize.x, 60);
        this.paddle2.bounds = new Rectangle(0, 20, canvasSize.x, 60);
        
        // Create ball
        this.ball = new Ball(centerX, centerY, this.settings.ballRadius);
        this.ball.speed = this.settings.ballSpeed * GameManager.settings.gameSpeed;
        
        // Create brick walls
        this.createBricks();
        
        // Add to engine
        this.engine.addGameObject(this.paddle1);
        this.engine.addGameObject(this.paddle2);
        this.engine.addGameObject(this.ball);
        this.bricks1.forEach(brick => this.engine.addGameObject(brick));
        this.bricks2.forEach(brick => this.engine.addGameObject(brick));
        
        // Reset ball
        this.resetBall();
        
        // Bind update method
        this.update = this.update.bind(this);
    }

    createBricks() {
        const canvasSize = this.engine.getCanvasSize();
        const brickWidth = this.settings.brickWidth;
        const brickHeight = this.settings.brickHeight;
        const rows = this.settings.brickRows;
        const cols = this.settings.brickCols;
        
        const totalWidth = cols * brickWidth;
        const startX = (canvasSize.x - totalWidth) / 2;
        
        // Player 1's bricks (bottom area)
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = startX + col * brickWidth;
                const y = canvasSize.y - 120 - row * brickHeight;
                const brick = new Brick(x, y, brickWidth - 2, brickHeight - 2, '#ff6b6b', 1);
                this.bricks1.push(brick);
            }
        }
        
        // Player 2's bricks (top area)
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = startX + col * brickWidth;
                const y = 100 + row * brickHeight;
                const brick = new Brick(x, y, brickWidth - 2, brickHeight - 2, '#4ecdc4', 2);
                this.bricks2.push(brick);
            }
        }
    }

    update() {
        if (this.gameOver) return;
        
        const canvasSize = this.engine.getCanvasSize();
        
        // Ball collision with side walls
        if (this.ball.position.x - this.ball.radius <= 0 || 
            this.ball.position.x + this.ball.radius >= canvasSize.x) {
            
            this.ball.velocity.x = -this.ball.velocity.x;
            this.ball.position.x = Utils.clamp(
                this.ball.position.x, 
                this.ball.radius, 
                canvasSize.x - this.ball.radius
            );
            
            AudioManager.playSound('wallHit');
            this.engine.particleSystem.emit(this.ball.position.x, this.ball.position.y, 5, '#ffff00');
        }
        
        // Ball collision with paddles
        const ballBounds = this.ball.getBounds();
        const paddle1Bounds = this.paddle1.getBounds();
        const paddle2Bounds = this.paddle2.getBounds();
        
        if (ballBounds.intersects(paddle1Bounds) && this.ball.velocity.y > 0) {
            this.ball.bounceOffPaddle(this.paddle1, this.ball.position);
            AudioManager.playSound('paddleHit');
            this.engine.particleSystem.emit(this.ball.position.x, this.ball.position.y, 8, '#ff6b6b');
        }
        
        if (ballBounds.intersects(paddle2Bounds) && this.ball.velocity.y < 0) {
            this.ball.bounceOffPaddle(this.paddle2, this.ball.position);
            AudioManager.playSound('paddleHit');
            this.engine.particleSystem.emit(this.ball.position.x, this.ball.position.y, 8, '#4ecdc4');
        }
        
        // Ball collision with bricks
        this.checkBrickCollisions();
        
        // Ball out of bounds (check for game over)
        if (this.ball.position.y < -50) {
            // Ball went past player 2's paddle - check remaining bricks
            this.checkGameOver();
        } else if (this.ball.position.y > canvasSize.y + 50) {
            // Ball went past player 1's paddle - check remaining bricks
            this.checkGameOver();
        }
        
        // Update paddle positions based on input
        this.updatePaddleInput();
    }

    checkBrickCollisions() {
        const ballBounds = this.ball.getBounds();
        
        // Check collisions with all bricks
        const allBricks = [...this.bricks1, ...this.bricks2];
        
        for (let i = allBricks.length - 1; i >= 0; i--) {
            const brick = allBricks[i];
            if (!brick.active) continue;
            
            const brickBounds = brick.getBounds();
            
            if (ballBounds.intersects(brickBounds)) {
                // Determine collision side
                const ballCenterX = this.ball.position.x;
                const ballCenterY = this.ball.position.y;
                const brickCenterX = brick.position.x + brick.width / 2;
                const brickCenterY = brick.position.y + brick.height / 2;
                
                const deltaX = ballCenterX - brickCenterX;
                const deltaY = ballCenterY - brickCenterY;
                
                // Calculate which side was hit
                const absX = Math.abs(deltaX);
                const absY = Math.abs(deltaY);
                
                if (absX > absY) {
                    // Hit left or right side
                    this.ball.velocity.x = -this.ball.velocity.x;
                } else {
                    // Hit top or bottom
                    this.ball.velocity.y = -this.ball.velocity.y;
                }
                
                // Destroy brick
                brick.hit();
                
                // Add score for the opposing player
                if (brick.player === 1) {
                    this.player2Score += 10;
                } else {
                    this.player1Score += 10;
                }
                
                GameManager.updateScore(this.player1Score, this.player2Score);
                
                // Particle effect
                this.engine.particleSystem.emit(
                    brick.position.x + brick.width / 2, 
                    brick.position.y + brick.height / 2, 
                    12, 
                    brick.color
                );
                
                AudioManager.playSound('wallHit');
                
                // Remove brick from array
                if (brick.player === 1) {
                    const index = this.bricks1.indexOf(brick);
                    if (index > -1) this.bricks1.splice(index, 1);
                } else {
                    const index = this.bricks2.indexOf(brick);
                    if (index > -1) this.bricks2.splice(index, 1);
                }
                
                break; // Only hit one brick per frame
            }
        }
    }

    checkGameOver() {
        // Check if either player has lost all their bricks
        const player1HasBricks = this.bricks1.some(brick => brick.active);
        const player2HasBricks = this.bricks2.some(brick => brick.active);
        
        if (!player1HasBricks) {
            // Player 1 lost all bricks, Player 2 wins
            this.gameOver = true;
            this.winner = 2;
            GameManager.gameOver(this.winner);
        } else if (!player2HasBricks) {
            // Player 2 lost all bricks, Player 1 wins
            this.gameOver = true;
            this.winner = 1;
            GameManager.gameOver(this.winner);
        } else {
            // Game continues, reset ball
            this.resetBall();
        }
    }

    updatePaddleInput() {
        const touches = InputManager.getTouches();
        const canvasSize = this.engine.getCanvasSize();
        
        // Player 1 (bottom paddle) - bottom half of screen when rotated
        const player1Touch = touches.find(touch => 
            touch.y > canvasSize.y / 2
        );
        
        if (player1Touch) {
            // For player 1, the touch controls are rotated 180 degrees
            const rotatedX = canvasSize.x - player1Touch.x;
            this.paddle1.moveTo(rotatedX, this.paddle1.position.y);
        }
        
        // Player 2 (top paddle) - top half of screen
        const player2Touch = touches.find(touch => 
            touch.y < canvasSize.y / 2
        );
        
        if (player2Touch) {
            this.paddle2.moveTo(player2Touch.x, this.paddle2.position.y);
        }
    }

    resetBall() {
        const canvasSize = this.engine.getCanvasSize();
        const centerX = canvasSize.x / 2;
        const centerY = canvasSize.y / 2;
        
        // Random direction up or down
        const angle = Utils.random(-Math.PI/4, Math.PI/4);
        const direction = Math.random() > 0.5 ? 1 : -1;
        
        this.ball.reset(
            centerX, 
            centerY, 
            new Vector2(Math.sin(angle), Math.cos(angle) * direction)
        );
    }

    restart() {
        this.player1Score = 0;
        this.player2Score = 0;
        this.gameOver = false;
        this.winner = null;
        
        GameManager.updateScore(0, 0);
        
        // Remove old bricks
        this.bricks1.forEach(brick => this.engine.removeGameObject(brick));
        this.bricks2.forEach(brick => this.engine.removeGameObject(brick));
        this.bricks1 = [];
        this.bricks2 = [];
        
        // Create new bricks
        this.createBricks();
        this.bricks1.forEach(brick => this.engine.addGameObject(brick));
        this.bricks2.forEach(brick => this.engine.addGameObject(brick));
        
        this.resetBall();
        
        // Reset paddle positions
        const canvasSize = this.engine.getCanvasSize();
        const centerX = canvasSize.x / 2;
        this.paddle1.position.x = centerX;
        this.paddle2.position.x = centerX;
        this.paddle1.targetPosition.x = centerX;
        this.paddle2.targetPosition.x = centerX;
    }

    cleanup() {
        this.engine.removeGameObject(this.paddle1);
        this.engine.removeGameObject(this.paddle2);
        this.engine.removeGameObject(this.ball);
        this.bricks1.forEach(brick => this.engine.removeGameObject(brick));
        this.bricks2.forEach(brick => this.engine.removeGameObject(brick));
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
        
        // Draw brick count indicators
        const player1BrickCount = this.bricks1.filter(brick => brick.active).length;
        const player2BrickCount = this.bricks2.filter(brick => brick.active).length;
        
        ctx.fillStyle = 'rgba(255, 107, 107, 0.7)';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Bricks: ${player1BrickCount}`, canvasSize.x / 4, canvasSize.y - 20);
        
        ctx.fillStyle = 'rgba(78, 205, 196, 0.7)';
        ctx.fillText(`Bricks: ${player2BrickCount}`, canvasSize.x * 3/4, 40);
        
        // Game over overlay
        if (this.gameOver && this.winner) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvasSize.x, canvasSize.y);
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Player ${this.winner} Wins!`, canvasSize.x / 2, canvasSize.y / 2);
            
            ctx.font = '24px Arial';
            ctx.fillText('All opponent bricks destroyed!', canvasSize.x / 2, canvasSize.y / 2 + 40);
            ctx.fillText('Tap to continue', canvasSize.x / 2, canvasSize.y / 2 + 80);
        }
    }

    updateSettings() {
        if (this.paddle1 && this.paddle2) {
            this.paddle1.width = this.settings.paddleWidth * GameManager.settings.paddleSize;
            this.paddle1.height = this.settings.paddleHeight * GameManager.settings.paddleSize;
            this.paddle2.width = this.settings.paddleWidth * GameManager.settings.paddleSize;
            this.paddle2.height = this.settings.paddleHeight * GameManager.settings.paddleSize;
        }
        
        if (this.ball) {
            const currentSpeed = this.ball.velocity.magnitude();
            if (currentSpeed > 0) {
                this.ball.velocity = this.ball.velocity.normalize().multiply(
                    this.settings.ballSpeed * GameManager.settings.gameSpeed
                );
            }
        }
    }
}

// Brick class for Breakout game
class Brick extends GameObject {
    constructor(x, y, width, height, color, player) {
        super(x, y);
        this.width = width;
        this.height = height;
        this.color = color;
        this.player = player; // 1 or 2
        this.maxHealth = 1;
        this.health = this.maxHealth;
        this.glowIntensity = 0;
    }

    update(deltaTime) {
        // Update glow effect
        this.glowIntensity = Math.max(0, this.glowIntensity - deltaTime * 4);
        
        super.update(deltaTime);
    }

    draw(ctx) {
        if (!this.active) return;
        
        // Glow effect when hit
        if (this.glowIntensity > 0) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 20 * this.glowIntensity;
        }
        
        // Calculate alpha based on health
        const alpha = this.health / this.maxHealth;
        
        // Main brick
        ctx.fillStyle = this.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(-this.width/2, -this.height/2, this.width/3, this.height/3);
        
        // Border
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-this.width/2, -this.height/2, this.width, this.height);
        
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }

    hit() {
        this.health--;
        this.glowIntensity = 1;
        
        if (this.health <= 0) {
            this.destroy();
        }
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
