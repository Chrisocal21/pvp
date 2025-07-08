// Input Manager for handling touch and mouse input

class InputManager {
    constructor() {
        this.touches = new Map();
        this.isMouseDown = false;
        this.mousePosition = new Vector2(0, 0);
        this.canvas = null;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Prevent default touch behaviors
        document.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
        document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
        document.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });
        
        // Prevent context menu on long press
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Prevent zoom on double tap
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    }

    setCanvas(canvas) {
        this.canvas = canvas;
        this.bindCanvasEvents();
    }

    bindCanvasEvents() {
        if (!this.canvas) return;

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        this.canvas.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), { passive: false });

        // Mouse events (for desktop testing)
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));
    }

    handleTouchStart(event) {
        event.preventDefault();
        
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const position = Utils.getCanvasCoordinates(touch, this.canvas);
            
            this.touches.set(touch.identifier, {
                id: touch.identifier,
                x: position.x,
                y: position.y,
                startX: position.x,
                startY: position.y,
                startTime: performance.now()
            });
        }
    }

    handleTouchMove(event) {
        event.preventDefault();
        
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const touchData = this.touches.get(touch.identifier);
            
            if (touchData) {
                const position = Utils.getCanvasCoordinates(touch, this.canvas);
                touchData.x = position.x;
                touchData.y = position.y;
            }
        }
    }

    handleTouchEnd(event) {
        event.preventDefault();
        
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            this.touches.delete(touch.identifier);
        }
    }

    handleMouseDown(event) {
        this.isMouseDown = true;
        const position = Utils.getCanvasCoordinates(event, this.canvas);
        this.mousePosition = position;
        
        // Simulate touch for mouse
        this.touches.set('mouse', {
            id: 'mouse',
            x: position.x,
            y: position.y,
            startX: position.x,
            startY: position.y,
            startTime: performance.now()
        });
    }

    handleMouseMove(event) {
        const position = Utils.getCanvasCoordinates(event, this.canvas);
        this.mousePosition = position;
        
        if (this.isMouseDown) {
            const touchData = this.touches.get('mouse');
            if (touchData) {
                touchData.x = position.x;
                touchData.y = position.y;
            }
        }
    }

    handleMouseUp(event) {
        this.isMouseDown = false;
        this.touches.delete('mouse');
    }

    // Public methods for getting input state
    getTouches() {
        return Array.from(this.touches.values());
    }

    getTouch(id) {
        return this.touches.get(id);
    }

    getTouchCount() {
        return this.touches.size;
    }

    getMousePosition() {
        return this.mousePosition.clone();
    }

    isMousePressed() {
        return this.isMouseDown;
    }

    // Check if there's a touch in a specific area
    getTouchInArea(x, y, width, height) {
        const touches = this.getTouches();
        return touches.find(touch => 
            touch.x >= x && 
            touch.x <= x + width && 
            touch.y >= y && 
            touch.y <= y + height
        );
    }

    // Check if there's a touch in a circular area
    getTouchInCircle(centerX, centerY, radius) {
        const touches = this.getTouches();
        return touches.find(touch => 
            Utils.distance(touch.x, touch.y, centerX, centerY) <= radius
        );
    }

    // Get the primary touch (first touch or mouse)
    getPrimaryTouch() {
        const touches = this.getTouches();
        if (touches.length > 0) {
            return touches[0];
        }
        return null;
    }

    // Get touch duration
    getTouchDuration(id) {
        const touch = this.touches.get(id);
        if (touch) {
            return performance.now() - touch.startTime;
        }
        return 0;
    }

    // Get touch distance from start
    getTouchDistance(id) {
        const touch = this.touches.get(id);
        if (touch) {
            return Utils.distance(touch.x, touch.y, touch.startX, touch.startY);
        }
        return 0;
    }

    // Clear all touches (useful for game state transitions)
    clearTouches() {
        this.touches.clear();
        this.isMouseDown = false;
    }

    // Get touches for specific player areas (for dual player games)
    getPlayer1Touches() {
        if (!this.canvas) return [];
        
        const canvasWidth = this.canvas.width / window.devicePixelRatio;
        const canvasHeight = this.canvas.height / window.devicePixelRatio;
        
        return this.getTouches().filter(touch => {
            // Player 1 area: bottom half when phone is flat
            return touch.y > canvasHeight / 2;
        });
    }

    getPlayer2Touches() {
        if (!this.canvas) return [];
        
        const canvasHeight = this.canvas.height / window.devicePixelRatio;
        
        return this.getTouches().filter(touch => {
            // Player 2 area: top half when phone is flat
            return touch.y < canvasHeight / 2;
        });
    }

    // Utility method to check for tap gestures
    isTap(id, maxDistance = 10, maxDuration = 300) {
        const touch = this.touches.get(id);
        if (!touch) return false;
        
        const distance = this.getTouchDistance(id);
        const duration = this.getTouchDuration(id);
        
        return distance <= maxDistance && duration <= maxDuration;
    }

    // Method to handle orientation changes
    handleOrientationChange() {
        // Clear all touches on orientation change to prevent stuck inputs
        this.clearTouches();
        
        // Rebind events after orientation change
        setTimeout(() => {
            if (this.canvas) {
                this.bindCanvasEvents();
            }
        }, 100);
    }

    // Debug method to visualize touches
    debugRender(ctx) {
        if (!ctx) return;
        
        const touches = this.getTouches();
        
        touches.forEach((touch, index) => {
            // Draw touch point
            ctx.fillStyle = `hsl(${index * 60}, 100%, 50%)`;
            ctx.beginPath();
            ctx.arc(touch.x, touch.y, 20, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw touch ID
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(touch.id.toString(), touch.x, touch.y + 4);
            
            // Draw line from start to current position
            ctx.strokeStyle = `hsl(${index * 60}, 100%, 50%)`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(touch.startX, touch.startY);
            ctx.lineTo(touch.x, touch.y);
            ctx.stroke();
        });
    }
}

// Create global instance
const InputManager = new InputManager();

// Handle orientation changes
window.addEventListener('orientationchange', () => {
    InputManager.handleOrientationChange();
});

window.addEventListener('resize', () => {
    InputManager.handleOrientationChange();
});
