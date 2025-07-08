// Air Hockey Game Implementation

class AirHockeyGame {
    constructor(engine) {
        this.engine = engine;
        this.canvas = engine.canvas;
        this.ctx = engine.ctx;
        
        // Game state
        this.player1Score = 0;
        this.player2Score = 0;
        this.maxScore = 7;
        this.gameOver = false;
        this.winner = null;
        
        // Game objects
        this.paddle1 = null;
        this.paddle2 = null;
        this.puck = null;
        
        // Settings
        this.settings = {
            paddleRadius: 25,
            puckRadius: 12,
            puckSpeed: 250,
            friction: 0.98,
            paddleSpeed: 12
        };
        
        this.init();
    }

    init() {
        const canvasSize = this.engine.getCanvasSize();
        const centerX = canvasSize.x / 2;
        const centerY = canvasSize.y / 2;
        
        // Create paddles as circular objects
        this.paddle1 = new AirHockeyPaddle(
            centerX / 2, 
            centerY, 
            this.settings.paddleRadius * GameManager.settings.paddleSize,
            true
        );
        
        this.paddle2 = new AirHockeyPaddle(
            centerX + centerX / 2, 
            centerY, 
            this.settings.paddleRadius * GameManager.settings.paddleSize,
            false
        );
        
        // Set paddle movement bounds (each player gets half the field)
        this.paddle1.bounds = new Rectangle(20, 20, centerX - 40, canvasSize.y - 40);
        this.paddle2.bounds = new Rectangle(centerX + 20, 20, centerX - 40, canvasSize.y - 40);
        
        // Create puck
        this.puck = new AirHockeyPuck(centerX, centerY, this.settings.puckRadius);
        this.puck.speed = this.settings.puckSpeed * GameManager.settings.gameSpeed;
        
        // Add to engine
        this.engine.addGameObject(this.paddle1);
        this.engine.addGameObject(this.paddle2);
        this.engine.addGameObject(this.puck);
        
        // Reset puck
        this.resetPuck();
        
        // Bind update method
        this.update = this.update.bind(this);
    }

    update() {
        if (this.gameOver) return;
        
        const canvasSize = this.engine.getCanvasSize();
        
        // Apply friction to puck
        this.puck.velocity = this.puck.velocity.multiply(this.settings.friction);
        
        // Puck collision with top and bottom walls
        if (this.puck.position.y - this.puck.radius <= 0 || 
            this.puck.position.y + this.puck.radius >= canvasSize.y) {
            
            this.puck.velocity.y = -this.puck.velocity.y * 0.8; // Some energy loss
            this.puck.position.y = Utils.clamp(
                this.puck.position.y, 
                this.puck.radius, 
                canvasSize.y - this.puck.radius
            );
            
            AudioManager.playSound('wallHit');
            this.engine.particleSystem.emit(this.puck.position.x, this.puck.position.y, 3, '#ffff00');
        }
        
        // Puck collision with side walls (goals)
        const goalTop = canvasSize.y * 0.3;
        const goalBottom = canvasSize.y * 0.7;
        
        // Left goal
        if (this.puck.position.x - this.puck.radius <= 0) {
            if (this.puck.position.y >= goalTop && this.puck.position.y <= goalBottom) {
                this.score(2); // Player 2 scores
            } else {
                // Hit wall, bounce back
                this.puck.velocity.x = -this.puck.velocity.x * 0.8;
                this.puck.position.x = this.puck.radius;
                AudioManager.playSound('wallHit');
            }
        }
        
        // Right goal
        if (this.puck.position.x + this.puck.radius >= canvasSize.x) {
            if (this.puck.position.y >= goalTop && this.puck.position.y <= goalBottom) {
                this.score(1); // Player 1 scores
            } else {
                // Hit wall, bounce back
                this.puck.velocity.x = -this.puck.velocity.x * 0.8;
                this.puck.position.x = canvasSize.x - this.puck.radius;
                AudioManager.playSound('wallHit');
            }
        }
        
        // Puck collision with paddles
        this.checkPaddleCollision(this.paddle1);
        this.checkPaddleCollision(this.paddle2);
        
        // Update paddle positions based on input
        this.updatePaddleInput();
    }

    checkPaddleCollision(paddle) {
        const distance = this.puck.position.distance(paddle.position);
        const minDistance = this.puck.radius + paddle.radius;
        
        if (distance < minDistance && distance > 0) {
            // Calculate collision normal
            const normal = this.puck.position.subtract(paddle.position).normalize();
            
            // Separate objects
            const overlap = minDistance - distance;
            this.puck.position = this.puck.position.add(normal.multiply(overlap));
            
            // Calculate relative velocity
            const relativeVelocity = this.puck.velocity.subtract(paddle.velocity);
            const velocityAlongNormal = relativeVelocity.x * normal.x + relativeVelocity.y * normal.y;
            
            // Don't resolve if velocities are separating
            if (velocityAlongNormal > 0) return;
            
            // Apply impulse
            const restitution = 0.8;
            const impulse = -(1 + restitution) * velocityAlongNormal / 2; // Simple mass assumption
            
            this.puck.velocity = this.puck.velocity.add(normal.multiply(impulse));
            paddle.velocity = paddle.velocity.subtract(normal.multiply(impulse * 0.1)); // Paddle gets slight push back
            
            // Add paddle velocity to puck for more realistic physics
            this.puck.velocity = this.puck.velocity.add(paddle.velocity.multiply(0.3));
            
            AudioManager.playSound('paddleHit');
            paddle.hit();
            this.engine.particleSystem.emit(this.puck.position.x, this.puck.position.y, 8, paddle.color);
        }
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
            this.paddle1.moveTo(rotatedX, rotatedY);
        }
        
        // Player 2 (right side) - top half of screen
        const player2Touch = touches.find(touch => 
            touch.y < canvasSize.y / 2 && touch.x > canvasSize.x / 2
        );
        
        if (player2Touch) {
            this.paddle2.moveTo(player2Touch.x, player2Touch.y);
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
        
        // Particle explosion at goal
        const canvasSize = this.engine.getCanvasSize();
        const goalX = player === 1 ? canvasSize.x : 0;
        const goalY = canvasSize.y / 2;
        this.engine.particleSystem.emit(goalX, goalY, 25, player === 1 ? '#ff6b6b' : '#4ecdc4');
        
        // Check for game over
        if (this.player1Score >= this.maxScore || this.player2Score >= this.maxScore) {
            this.gameOver = true;
            this.winner = this.player1Score >= this.maxScore ? 1 : 2;
            GameManager.gameOver(this.winner);
        } else {
            // Reset puck after a short delay
            setTimeout(() => {
                this.resetPuck();
            }, 1500);
        }
    }

    resetPuck() {
        const canvasSize = this.engine.getCanvasSize();
        const centerX = canvasSize.x / 2;
        const centerY = canvasSize.y / 2;
        
        // Start from center with random direction
        const angle = Utils.random(0, Math.PI * 2);
        const speed = this.settings.puckSpeed * GameManager.settings.gameSpeed;
        
        this.puck.reset(
            centerX, 
            centerY, 
            Vector2.fromAngle(angle, speed)
        );
    }

    restart() {
        this.player1Score = 0;
        this.player2Score = 0;
        this.gameOver = false;
        this.winner = null;
        
        GameManager.updateScore(0, 0);
        this.resetPuck();
        
        // Reset paddle positions
        const canvasSize = this.engine.getCanvasSize();
        const centerY = canvasSize.y / 2;
        this.paddle1.position = new Vector2(canvasSize.x / 4, centerY);
        this.paddle2.position = new Vector2(canvasSize.x * 3/4, centerY);
        this.paddle1.targetPosition = this.paddle1.position.clone();
        this.paddle2.targetPosition = this.paddle2.position.clone();
        this.paddle1.velocity = new Vector2(0, 0);
        this.paddle2.velocity = new Vector2(0, 0);
    }

    cleanup() {
        this.engine.removeGameObject(this.paddle1);
        this.engine.removeGameObject(this.paddle2);
        this.engine.removeGameObject(this.puck);
        this.engine.particleSystem.clear();
    }

    render() {
        const canvasSize = this.engine.getCanvasSize();
        const ctx = this.ctx;
        
        // Draw air hockey table
        this.drawTable(ctx, canvasSize);
        
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

    drawTable(ctx, canvasSize) {
        const centerX = canvasSize.x / 2;
        const centerY = canvasSize.y / 2;
        const goalTop = canvasSize.y * 0.3;
        const goalBottom = canvasSize.y * 0.7;
        
        // Draw center line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 3;
        ctx.setLineDash([15, 15]);
        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, canvasSize.y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw center circle
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 60, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw goals
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, goalTop);
        ctx.lineTo(0, goalBottom);
        ctx.stroke();
        
        ctx.strokeStyle = '#4ecdc4';
        ctx.beginPath();
        ctx.moveTo(canvasSize.x, goalTop);
        ctx.lineTo(canvasSize.x, goalBottom);
        ctx.stroke();
        
        // Draw goal areas
        ctx.strokeStyle = 'rgba(255, 107, 107, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, centerY, 80, -Math.PI/3, Math.PI/3);
        ctx.stroke();
        
        ctx.strokeStyle = 'rgba(78, 205, 196, 0.3)';
        ctx.beginPath();
        ctx.arc(canvasSize.x, centerY, 80, Math.PI*2/3, Math.PI*4/3);
        ctx.stroke();
        
        // Draw table borders (excluding goal areas)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 3;
        
        // Top border
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(canvasSize.x, 0);
        ctx.stroke();
        
        // Bottom border
        ctx.beginPath();
        ctx.moveTo(0, canvasSize.y);
        ctx.lineTo(canvasSize.x, canvasSize.y);
        ctx.stroke();
        
        // Left border (excluding goal)
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, goalTop);
        ctx.moveTo(0, goalBottom);
        ctx.lineTo(0, canvasSize.y);
        ctx.stroke();
        
        // Right border (excluding goal)
        ctx.beginPath();
        ctx.moveTo(canvasSize.x, 0);
        ctx.lineTo(canvasSize.x, goalTop);
        ctx.moveTo(canvasSize.x, goalBottom);
        ctx.lineTo(canvasSize.x, canvasSize.y);
        ctx.stroke();
    }

    updateSettings() {
        if (this.paddle1 && this.paddle2) {
            this.paddle1.radius = this.settings.paddleRadius * GameManager.settings.paddleSize;
            this.paddle2.radius = this.settings.paddleRadius * GameManager.settings.paddleSize;
        }
        
        if (this.puck) {
            const currentSpeed = this.puck.velocity.magnitude();
            if (currentSpeed > 0) {
                this.puck.velocity = this.puck.velocity.normalize().multiply(
                    this.settings.puckSpeed * GameManager.settings.gameSpeed
                );
            }
        }
    }
}

// Air Hockey specific paddle class
class AirHockeyPaddle extends GameObject {
    constructor(x, y, radius, isPlayer1 = true) {
        super(x, y);
        this.radius = radius;
        this.isPlayer1 = isPlayer1;
        this.targetPosition = new Vector2(x, y);
        this.speed = 12;
        this.color = isPlayer1 ? '#ff6b6b' : '#4ecdc4';
        this.bounds = null;
        this.glowIntensity = 0;
        this.lastPosition = new Vector2(x, y);
    }

    update(deltaTime) {
        // Store last position for velocity calculation
        this.lastPosition = this.position.clone();
        
        // Smooth movement towards target
        const diff = this.targetPosition.subtract(this.position);
        const distance = diff.magnitude();
        
        if (distance > 1) {
            const moveVector = diff.normalize().multiply(this.speed);
            this.velocity = moveVector;
        } else {
            this.velocity = new Vector2(0, 0);
        }

        // Apply bounds constraint
        if (this.bounds) {
            this.position.x = Utils.clamp(
                this.position.x, 
                this.bounds.left + this.radius, 
                this.bounds.right - this.radius
            );
            this.position.y = Utils.clamp(
                this.position.y, 
                this.bounds.top + this.radius, 
                this.bounds.bottom - this.radius
            );
            this.targetPosition.x = Utils.clamp(
                this.targetPosition.x, 
                this.bounds.left + this.radius, 
                this.bounds.right - this.radius
            );
            this.targetPosition.y = Utils.clamp(
                this.targetPosition.y, 
                this.bounds.top + this.radius, 
                this.bounds.bottom - this.radius
            );
        }

        // Calculate actual velocity from position change
        this.velocity = this.position.subtract(this.lastPosition).divide(deltaTime);

        // Update glow effect
        this.glowIntensity = Math.max(0, this.glowIntensity - deltaTime * 3);

        super.update(deltaTime);
    }

    draw(ctx) {
        // Glow effect
        if (this.glowIntensity > 0) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 30 * this.glowIntensity;
        }

        // Main paddle
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(-this.radius * 0.3, -this.radius * 0.3, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.shadowBlur = 0;
    }

    moveTo(x, y) {
        this.targetPosition.x = x;
        this.targetPosition.y = y;
    }

    hit() {
        this.glowIntensity = 1;
    }
}

// Air Hockey specific puck class
class AirHockeyPuck extends Ball {
    constructor(x, y, radius) {
        super(x, y, radius);
        this.color = '#ffffff';
        this.trailLength = 8;
    }

    draw(ctx) {
        // Draw trail
        ctx.globalAlpha = 0.4;
        for (let i = 0; i < this.trail.length; i++) {
            const alpha = i / this.trail.length;
            const radius = this.radius * alpha * 0.8;
            ctx.globalAlpha = alpha * 0.4;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.trail[i].x - this.position.x, this.trail[i].y - this.position.y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.globalAlpha = 1;
        
        // Main puck
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(-this.radius * 0.3, -this.radius * 0.3, this.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.stroke();
    }
}
