// Pong Game Implementation

class PongGame {
    constructor(engine) {
        this.engine = engine;
        this.canvas = engine.canvas;
        this.ctx = engine.ctx;
        
        // Game state
        this.player1Score = 0;
        this.player2Score = 0;
        this.maxScore = 11;
        this.gameOver = false;
        this.winner = null;
        
        // Game objects
        this.paddle1 = null;
        this.paddle2 = null;
        this.ball = null;
        
        // Settings
        this.settings = {
            paddleSpeed: 8,
            paddleWidth: 15,
            paddleHeight: 80,
            ballRadius: 8,
            ballSpeed: 300
        };
        
        this.init();
    }

    init() {
        const canvasSize = this.engine.getCanvasSize();
        const centerX = canvasSize.x / 2;
        const centerY = canvasSize.y / 2;
        
        // Create paddles
        this.paddle1 = new Paddle(
            50, 
            centerY, 
            this.settings.paddleWidth * GameManager.settings.paddleSize, 
            this.settings.paddleHeight * GameManager.settings.paddleSize,
            true
        );
        
        this.paddle2 = new Paddle(
            canvasSize.x - 50, 
            centerY, 
            this.settings.paddleWidth * GameManager.settings.paddleSize, 
            this.settings.paddleHeight * GameManager.settings.paddleSize,
            false
        );
        
        // Set paddle movement bounds
        this.paddle1.bounds = new Rectangle(20, 20, 80, canvasSize.y - 40);
        this.paddle2.bounds = new Rectangle(canvasSize.x - 100, 20, 80, canvasSize.y - 40);
        
        // Create ball
        this.ball = new Ball(centerX, centerY, this.settings.ballRadius);
        this.ball.speed = this.settings.ballSpeed * GameManager.settings.gameSpeed;
        
        // Add to engine
        this.engine.addGameObject(this.paddle1);
        this.engine.addGameObject(this.paddle2);
        this.engine.addGameObject(this.ball);
        
        // Reset ball
        this.resetBall();
        
        // Bind update method
        this.update = this.update.bind(this);
    }

    update() {
        if (this.gameOver) return;
        
        const canvasSize = this.engine.getCanvasSize();
        
        // Ball collision with top and bottom walls
        if (this.ball.position.y - this.ball.radius <= 0 || 
            this.ball.position.y + this.ball.radius >= canvasSize.y) {
            
            this.ball.bounceOffWall(new Vector2(0, this.ball.position.y <= canvasSize.y / 2 ? 1 : -1));
            AudioManager.playSound('wallHit');
            
            // Particle effect
            this.engine.particleSystem.emit(
                this.ball.position.x, 
                this.ball.position.y <= canvasSize.y / 2 ? 0 : canvasSize.y, 
                5, 
                '#ffff00'
            );
        }
        
        // Ball collision with paddles
        const ballBounds = this.ball.getBounds();
        const paddle1Bounds = this.paddle1.getBounds();
        const paddle2Bounds = this.paddle2.getBounds();
        
        if (ballBounds.intersects(paddle1Bounds) && this.ball.velocity.x < 0) {
            this.ball.bounceOffPaddle(this.paddle1, this.ball.position);
            AudioManager.playSound('paddleHit');
            this.engine.particleSystem.emit(this.ball.position.x, this.ball.position.y, 8, '#ff6b6b');
        }
        
        if (ballBounds.intersects(paddle2Bounds) && this.ball.velocity.x > 0) {
            this.ball.bounceOffPaddle(this.paddle2, this.ball.position);
            AudioManager.playSound('paddleHit');
            this.engine.particleSystem.emit(this.ball.position.x, this.ball.position.y, 8, '#4ecdc4');
        }
        
        // Ball out of bounds (scoring)
        if (this.ball.position.x < -50) {
            this.score(2);
        } else if (this.ball.position.x > canvasSize.x + 50) {
            this.score(1);
        }
        
        // Update paddle positions based on input
        this.updatePaddleInput();
    }

    updatePaddleInput() {
        const touches = InputManager.getTouches();
        const canvasSize = this.engine.getCanvasSize();
        
        // Player 1 (left side) - bottom half of screen when rotated
        const player1Touch = touches.find(touch => 
            touch.y > canvasSize.y / 2 && touch.x < canvasSize.x / 2
        );
        
        if (player1Touch) {
            // For player 1, the touch controls are rotated 180 degrees
            const rotatedX = canvasSize.x - player1Touch.x;
            const rotatedY = canvasSize.y - player1Touch.y;
            this.paddle1.moveTo(this.paddle1.position.x, rotatedY);
        }
        
        // Player 2 (right side) - top half of screen
        const player2Touch = touches.find(touch => 
            touch.y < canvasSize.y / 2 && touch.x > canvasSize.x / 2
        );
        
        if (player2Touch) {
            this.paddle2.moveTo(this.paddle2.position.x, player2Touch.y);
        }
    }

    score(player) {
        if (player === 1) {
            this.player1Score++;
        } else {
            this.player2Score++;
        }
        
        AudioManager.playSound('score');
        
        // Update UI
        GameManager.updateScore(this.player1Score, this.player2Score);
        
        // Particle explosion
        const canvasSize = this.engine.getCanvasSize();
        const goalX = player === 1 ? canvasSize.x : 0;
        this.engine.particleSystem.emit(goalX, canvasSize.y / 2, 20, player === 1 ? '#ff6b6b' : '#4ecdc4');
        
        // Check for game over
        if (this.player1Score >= this.maxScore || this.player2Score >= this.maxScore) {
            this.gameOver = true;
            this.winner = this.player1Score >= this.maxScore ? 1 : 2;
            GameManager.gameOver(this.winner);
        } else {
            // Reset ball after a short delay
            setTimeout(() => {
                this.resetBall();
            }, 1000);
        }
    }

    resetBall() {
        const canvasSize = this.engine.getCanvasSize();
        const centerX = canvasSize.x / 2;
        const centerY = canvasSize.y / 2;
        
        // Random direction towards the player who didn't score
        const angle = Utils.random(-Math.PI/4, Math.PI/4);
        const direction = this.player1Score > this.player2Score ? -1 : 1;
        
        this.ball.reset(
            centerX, 
            centerY, 
            new Vector2(Math.cos(angle) * direction, Math.sin(angle))
        );
    }

    restart() {
        this.player1Score = 0;
        this.player2Score = 0;
        this.gameOver = false;
        this.winner = null;
        
        GameManager.updateScore(0, 0);
        this.resetBall();
        
        // Reset paddle positions
        const canvasSize = this.engine.getCanvasSize();
        this.paddle1.position.y = canvasSize.y / 2;
        this.paddle2.position.y = canvasSize.y / 2;
        this.paddle1.targetPosition.y = canvasSize.y / 2;
        this.paddle2.targetPosition.y = canvasSize.y / 2;
    }

    cleanup() {
        // Remove game objects from engine
        this.engine.removeGameObject(this.paddle1);
        this.engine.removeGameObject(this.paddle2);
        this.engine.removeGameObject(this.ball);
        this.engine.particleSystem.clear();
    }

    render() {
        const canvasSize = this.engine.getCanvasSize();
        const ctx = this.ctx;
        
        // Draw center line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(canvasSize.x / 2, 0);
        ctx.lineTo(canvasSize.x / 2, canvasSize.y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw center circle
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(canvasSize.x / 2, canvasSize.y / 2, 50, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw goal areas
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        
        // Left goal
        ctx.strokeRect(0, canvasSize.y * 0.3, 50, canvasSize.y * 0.4);
        // Right goal  
        ctx.strokeRect(canvasSize.x - 50, canvasSize.y * 0.3, 50, canvasSize.y * 0.4);
        
        // Game over overlay
        if (this.gameOver && this.winner) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvasSize.x, canvasSize.y);
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Player ${this.winner} Wins!`, canvasSize.x / 2, canvasSize.y / 2);
            
            ctx.font = '24px Arial';
            ctx.fillText('Tap to continue', canvasSize.x / 2, canvasSize.y / 2 + 50);
        }
    }

    // Handle settings changes
    updateSettings() {
        if (this.paddle1 && this.paddle2) {
            // Update paddle sizes
            this.paddle1.width = this.settings.paddleWidth * GameManager.settings.paddleSize;
            this.paddle1.height = this.settings.paddleHeight * GameManager.settings.paddleSize;
            this.paddle2.width = this.settings.paddleWidth * GameManager.settings.paddleSize;
            this.paddle2.height = this.settings.paddleHeight * GameManager.settings.paddleSize;
        }
        
        if (this.ball) {
            // Update ball speed
            const currentSpeed = this.ball.velocity.magnitude();
            if (currentSpeed > 0) {
                this.ball.velocity = this.ball.velocity.normalize().multiply(
                    this.settings.ballSpeed * GameManager.settings.gameSpeed
                );
            }
        }
    }
}
