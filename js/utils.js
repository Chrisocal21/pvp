// Utility functions for the game engine

class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(vector) {
        return new Vector2(this.x + vector.x, this.y + vector.y);
    }

    subtract(vector) {
        return new Vector2(this.x - vector.x, this.y - vector.y);
    }

    multiply(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }

    divide(scalar) {
        return new Vector2(this.x / scalar, this.y / scalar);
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return new Vector2(0, 0);
        return this.divide(mag);
    }

    distance(vector) {
        return this.subtract(vector).magnitude();
    }

    angle() {
        return Math.atan2(this.y, this.x);
    }

    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector2(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        );
    }

    clone() {
        return new Vector2(this.x, this.y);
    }

    static fromAngle(angle, magnitude = 1) {
        return new Vector2(
            Math.cos(angle) * magnitude,
            Math.sin(angle) * magnitude
        );
    }
}

class Rectangle {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    get left() { return this.x; }
    get right() { return this.x + this.width; }
    get top() { return this.y; }
    get bottom() { return this.y + this.height; }
    get centerX() { return this.x + this.width / 2; }
    get centerY() { return this.y + this.height / 2; }
    get center() { return new Vector2(this.centerX, this.centerY); }

    contains(point) {
        return point.x >= this.left && 
               point.x <= this.right && 
               point.y >= this.top && 
               point.y <= this.bottom;
    }

    intersects(other) {
        return !(this.right < other.left || 
                 this.left > other.right || 
                 this.bottom < other.top || 
                 this.top > other.bottom);
    }

    clone() {
        return new Rectangle(this.x, this.y, this.width, this.height);
    }
}

class Circle {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
    }

    get center() { return new Vector2(this.x, this.y); }

    contains(point) {
        return this.center.distance(point) <= this.radius;
    }

    intersects(other) {
        if (other instanceof Circle) {
            return this.center.distance(other.center) <= (this.radius + other.radius);
        }
        if (other instanceof Rectangle) {
            // Find closest point on rectangle to circle center
            const closestX = Math.max(other.left, Math.min(this.x, other.right));
            const closestY = Math.max(other.top, Math.min(this.y, other.bottom));
            const distance = new Vector2(closestX, closestY).distance(this.center);
            return distance <= this.radius;
        }
        return false;
    }

    clone() {
        return new Circle(this.x, this.y, this.radius);
    }
}

// Utility functions
const Utils = {
    // Clamp a value between min and max
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    // Linear interpolation
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    },

    // Map a value from one range to another
    map(value, start1, stop1, start2, stop2) {
        return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
    },

    // Random number between min and max
    random(min, max) {
        return Math.random() * (max - min) + min;
    },

    // Random integer between min and max (inclusive)
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // Degrees to radians
    toRadians(degrees) {
        return degrees * Math.PI / 180;
    },

    // Radians to degrees
    toDegrees(radians) {
        return radians * 180 / Math.PI;
    },

    // Distance between two points
    distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    },

    // Angle between two points
    angle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    },

    // Check if point is in circle
    pointInCircle(px, py, cx, cy, radius) {
        return this.distance(px, py, cx, cy) <= radius;
    },

    // Check if point is in rectangle
    pointInRect(px, py, rx, ry, rw, rh) {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    },

    // Collision detection between circle and rectangle
    circleRectCollision(cx, cy, radius, rx, ry, rw, rh) {
        const closestX = this.clamp(cx, rx, rx + rw);
        const closestY = this.clamp(cy, ry, ry + rh);
        const distance = this.distance(cx, cy, closestX, closestY);
        return distance <= radius;
    },

    // Reflect a vector off a normal
    reflect(velocity, normal) {
        // velocity - 2 * (velocity · normal) * normal
        const dot = velocity.x * normal.x + velocity.y * normal.y;
        return new Vector2(
            velocity.x - 2 * dot * normal.x,
            velocity.y - 2 * dot * normal.y
        );
    },

    // Normalize angle to 0-2π range
    normalizeAngle(angle) {
        while (angle < 0) angle += 2 * Math.PI;
        while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
        return angle;
    },

    // Format time (milliseconds to MM:SS)
    formatTime(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Get device orientation
    getOrientation() {
        if (screen.orientation) {
            return screen.orientation.angle;
        } else if (window.orientation !== undefined) {
            return window.orientation;
        }
        return 0;
    },

    // Vibrate device (if supported)
    vibrate(pattern = 100) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    },

    // Check if device supports touch
    isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    },

    // Get canvas-relative coordinates from touch/mouse event
    getCanvasCoordinates(event, canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        let clientX, clientY;
        
        if (event.touches && event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }
        
        return new Vector2(
            (clientX - rect.left) * scaleX,
            (clientY - rect.top) * scaleY
        );
    },

    // Storage utilities
    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.warn('Failed to save to localStorage:', e);
            return false;
        }
    },

    loadFromStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.warn('Failed to load from localStorage:', e);
            return defaultValue;
        }
    }
};

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Vector2, Rectangle, Circle, Utils };
}
