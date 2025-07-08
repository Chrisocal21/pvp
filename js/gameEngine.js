// Core game engine for handling rendering, game loops, and base game objects

class GameObject {
    constructor(x = 0, y = 0) {
        this.position = new Vector2(x, y);
        this.velocity = new Vector2(0, 0);
        this.acceleration = new Vector2(0, 0);
        this.rotation = 0;
        this.scale = new Vector2(1, 1);
        this.active = true;
        this.visible = true;
    }

    update(deltaTime) {
        if (!this.active) return;
        
        // Apply acceleration to velocity
        this.velocity = this.velocity.add(this.acceleration.multiply(deltaTime));
        
        // Apply velocity to position
        this.position = this.position.add(this.velocity.multiply(deltaTime));
    }

    render(ctx) {
        if (!this.visible) return;
        
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale.x, this.scale.y);
        
        this.draw(ctx);
        
        ctx.restore();
    }

    draw(ctx) {
        // Override in subclasses
    }

    destroy() {
        this.active = false;
    }
}

class Paddle extends GameObject {
    constructor(x, y, width, height, isPlayer1 = true) {
        super(x, y);
        this.width = width;
        this.height = height;
        this.isPlayer1 = isPlayer1;
        this.targetPosition = new Vector2(x, y);
        this.speed = 8;
        this.color = isPlayer1 ? '#ff6b6b' : '#4ecdc4';
        this.bounds = null; // Set by game
        this.glowIntensity = 0;
    }

    update(deltaTime) {
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
            this.position.x = Utils.clamp(this.position.x, this.bounds.left, this.bounds.right - this.width);
            this.position.y = Utils.clamp(this.position.y, this.bounds.top, this.bounds.bottom - this.height);
            this.targetPosition.x = Utils.clamp(this.targetPosition.x, this.bounds.left, this.bounds.right - this.width);
            this.targetPosition.y = Utils.clamp(this.targetPosition.y, this.bounds.top, this.bounds.bottom - this.height);
        }

        // Update glow effect
        this.glowIntensity = Math.max(0, this.glowIntensity - deltaTime * 3);

        super.update(deltaTime);
    }

    draw(ctx) {
        // Glow effect
        if (this.glowIntensity > 0) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 20 * this.glowIntensity;
        }

        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // Border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.width/2, -this.height/2, this.width, this.height);
        
        ctx.shadowBlur = 0;
    }

    moveTo(x, y) {
        this.targetPosition.x = x;
        this.targetPosition.y = y;
    }

    hit() {
        this.glowIntensity = 1;
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

class Ball extends GameObject {
    constructor(x, y, radius) {
        super(x, y);
        this.radius = radius;
        this.speed = 300;
        this.maxSpeed = 600;
        this.color = '#ffffff';
        this.trail = [];
        this.trailLength = 10;
        this.bounceCount = 0;
        this.lastPaddleHit = null;
    }

    update(deltaTime) {
        // Add current position to trail
        this.trail.push(this.position.clone());
        if (this.trail.length > this.trailLength) {
            this.trail.shift();
        }

        // Limit speed
        const currentSpeed = this.velocity.magnitude();
        if (currentSpeed > this.maxSpeed) {
            this.velocity = this.velocity.normalize().multiply(this.maxSpeed);
        }

        super.update(deltaTime);
    }

    draw(ctx) {
        // Draw trail
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < this.trail.length; i++) {
            const alpha = i / this.trail.length;
            const radius = this.radius * alpha;
            ctx.globalAlpha = alpha * 0.3;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.trail[i].x - this.position.x, this.trail[i].y - this.position.y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.globalAlpha = 1;
        
        // Draw ball
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Ball glow
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    reset(x, y, direction = null) {
        this.position = new Vector2(x, y);
        this.trail = [];
        this.bounceCount = 0;
        this.lastPaddleHit = null;
        
        if (direction) {
            this.velocity = direction.normalize().multiply(this.speed);
        } else {
            // Random direction
            const angle = Utils.random(-Math.PI/4, Math.PI/4);
            const dir = Math.random() > 0.5 ? 1 : -1;
            this.velocity = new Vector2(Math.cos(angle) * dir, Math.sin(angle)).normalize().multiply(this.speed);
        }
    }

    bounceOffWall(normal) {
        this.velocity = Utils.reflect(this.velocity, normal);
        this.bounceCount++;
        
        // Slightly increase speed with each bounce
        const speedIncrease = 1.02;
        this.velocity = this.velocity.multiply(speedIncrease);
    }

    bounceOffPaddle(paddle, contactPoint) {
        // Calculate bounce angle based on where ball hit paddle
        const paddleCenter = paddle.position;
        const relativeIntersectY = contactPoint.y - paddleCenter.y;
        const normalizedIntersectY = relativeIntersectY / (paddle.height / 2);
        
        // Calculate bounce angle (max 45 degrees)
        const bounceAngle = normalizedIntersectY * Math.PI / 4;
        
        // Determine direction based on which paddle was hit
        const direction = paddle.isPlayer1 ? 1 : -1;
        
        this.velocity = new Vector2(
            Math.cos(bounceAngle) * direction,
            Math.sin(bounceAngle)
        ).normalize().multiply(this.speed);
        
        // Increase speed slightly
        this.speed = Math.min(this.speed * 1.05, this.maxSpeed);
        this.velocity = this.velocity.normalize().multiply(this.speed);
        
        this.bounceCount++;
        this.lastPaddleHit = paddle;
        paddle.hit();
    }

    getBounds() {
        return new Circle(this.position.x, this.position.y, this.radius);
    }
}

class Particle extends GameObject {
    constructor(x, y, velocity, life, color) {
        super(x, y);
        this.velocity = velocity;
        this.life = life;
        this.maxLife = life;
        this.color = color;
        this.size = Utils.random(2, 6);
    }

    update(deltaTime) {
        this.life -= deltaTime;
        if (this.life <= 0) {
            this.destroy();
        }
        
        // Fade out
        this.alpha = this.life / this.maxLife;
        
        // Apply gravity
        this.acceleration.y = 200;
        
        super.update(deltaTime);
    }

    draw(ctx) {
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    emit(x, y, count, color = '#ffffff') {
        for (let i = 0; i < count; i++) {
            const angle = Utils.random(0, Math.PI * 2);
            const speed = Utils.random(50, 200);
            const velocity = Vector2.fromAngle(angle, speed);
            const life = Utils.random(0.5, 1.5);
            
            this.particles.push(new Particle(x, y, velocity, life, color));
        }
    }

    update(deltaTime) {
        this.particles = this.particles.filter(particle => {
            particle.update(deltaTime);
            return particle.active;
        });
    }

    render(ctx) {
        this.particles.forEach(particle => {
            particle.render(ctx);
        });
    }

    clear() {
        this.particles = [];
    }
}

class GameEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.lastFrameTime = 0;
        this.running = false;
        this.gameObjects = [];
        this.particleSystem = new ParticleSystem();
        
        // Performance monitoring
        this.fps = 60;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        
        this.setupCanvas();
    }

    setupCanvas() {
        // Set canvas size to window size
        this.resize();
        
        // Handle canvas resize
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.resize(), 100);
        });
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        // Update canvas style
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
    }

    start() {
        this.running = true;
        this.lastFrameTime = performance.now();
        this.gameLoop();
    }

    stop() {
        this.running = false;
    }

    gameLoop(currentTime = performance.now()) {
        if (!this.running) return;

        const deltaTime = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;

        // Cap delta time to prevent large jumps
        const cappedDeltaTime = Math.min(deltaTime, 1/30);

        this.update(cappedDeltaTime);
        this.render();

        // Update FPS counter
        this.frameCount++;
        if (currentTime - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
        }

        requestAnimationFrame((time) => this.gameLoop(time));
    }

    update(deltaTime) {
        // Update all game objects
        this.gameObjects.forEach(obj => obj.update(deltaTime));
        
        // Remove destroyed objects
        this.gameObjects = this.gameObjects.filter(obj => obj.active);
        
        // Update particle system
        this.particleSystem.update(deltaTime);
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render all game objects
        this.gameObjects.forEach(obj => obj.render(this.ctx));
        
        // Render particle system
        this.particleSystem.render(this.ctx);
    }

    addGameObject(obj) {
        this.gameObjects.push(obj);
    }

    removeGameObject(obj) {
        const index = this.gameObjects.indexOf(obj);
        if (index > -1) {
            this.gameObjects.splice(index, 1);
        }
    }

    clear() {
        this.gameObjects = [];
        this.particleSystem.clear();
    }

    getCanvasSize() {
        return new Vector2(
            this.canvas.width / window.devicePixelRatio,
            this.canvas.height / window.devicePixelRatio
        );
    }
}
