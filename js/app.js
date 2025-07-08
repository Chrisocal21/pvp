// Main application initialization

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Force landscape orientation message for mobile
    showLandscapeMessage();
    
    // Initialize PWA features
    initializePWA();
    
    // Handle install prompt
    handleInstallPrompt();
    
    // Prevent zoom on iOS Safari
    preventZoom();
    
    // Handle device orientation
    handleOrientation();
    
    // Initialize wake lock to prevent screen from sleeping
    initializeWakeLock();
    
    console.log('Mobile Arcade - Multi-Game App Initialized');
});

function showLandscapeMessage() {
    // Check if device is mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // Create orientation message
        const orientationDiv = document.createElement('div');
        orientationDiv.id = 'orientationMessage';
        orientationDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 20000;
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 20px;
            transition: opacity 0.5s ease;
        `;
        
        orientationDiv.innerHTML = `
            <div style="font-size: 4rem; margin-bottom: 30px; animation: bounce 2s infinite;">📱➡️📱</div>
            <h1 style="font-size: 2.5rem; margin-bottom: 20px;">Welcome to Mobile Arcade!</h1>
            <h2 style="font-size: 1.5rem; margin-bottom: 30px; opacity: 0.9;">Please rotate your device to landscape</h2>
            <div style="background: rgba(255,255,255,0.1); border-radius: 15px; padding: 20px; margin: 20px 0; backdrop-filter: blur(10px);">
                <p style="font-size: 1.1rem; line-height: 1.6; margin-bottom: 15px;">
                    🎮 <strong>For the best experience:</strong>
                </p>
                <p style="font-size: 1rem; line-height: 1.5; opacity: 0.9;">
                    1. Rotate your phone to landscape mode<br>
                    2. Place it flat on a table<br>
                    3. Each player sits on opposite sides<br>
                    4. Enjoy head-to-head gaming!
                </p>
            </div>
            <p style="font-size: 0.9rem; opacity: 0.7; margin-top: 30px;">
                This message will disappear when you rotate your device
            </p>
        `;
        
        // Add bounce animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-10px); }
                60% { transform: translateY(-5px); }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(orientationDiv);
        
        // Check orientation and hide message when in landscape
        function checkOrientation() {
            const isLandscape = window.innerWidth > window.innerHeight;
            if (isLandscape) {
                orientationDiv.style.opacity = '0';
                setTimeout(() => {
                    if (orientationDiv.parentNode) {
                        orientationDiv.parentNode.removeChild(orientationDiv);
                    }
                }, 500);
            } else {
                orientationDiv.style.opacity = '1';
            }
        }
        
        // Check on load and orientation change
        checkOrientation();
        window.addEventListener('orientationchange', () => {
            setTimeout(checkOrientation, 100);
        });
        window.addEventListener('resize', checkOrientation);
    }
}

function initializePWA() {
    // Register service worker for PWA functionality
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    console.log('ServiceWorker registration successful');
                })
                .catch((error) => {
                    console.log('ServiceWorker registration failed');
                });
        });
    }
}

function handleInstallPrompt() {
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later
        deferredPrompt = e;
        
        // Show install button (you can add this to your UI)
        showInstallButton(deferredPrompt);
    });
}

function showInstallButton(deferredPrompt) {
    // Create install button
    const installButton = document.createElement('button');
    installButton.id = 'installButton';
    installButton.innerHTML = '📱 Install App';
    installButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(255,255,255,0.9);
        border: none;
        border-radius: 25px;
        padding: 12px 20px;
        font-size: 14px;
        cursor: pointer;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
    `;
    
    installButton.addEventListener('click', () => {
        // Show the prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            }
            deferredPrompt = null;
            installButton.remove();
        });
    });
    
    document.body.appendChild(installButton);
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
        if (installButton.parentNode) {
            installButton.style.opacity = '0';
            setTimeout(() => {
                if (installButton.parentNode) {
                    installButton.remove();
                }
            }, 300);
        }
    }, 10000);
}

function preventZoom() {
    // Prevent zoom on iOS Safari
    document.addEventListener('gesturestart', (e) => {
        e.preventDefault();
        // Special hack to prevent zoom-to-tabs gesture in Safari
        document.body.style.zoom = 0.99;
    });
    
    document.addEventListener('gesturechange', (e) => {
        e.preventDefault();
        // Special hack to prevent zoom-to-tabs gesture in Safari
        document.body.style.zoom = 0.99;
    });
    
    document.addEventListener('gestureend', (e) => {
        e.preventDefault();
        // Special hack to prevent zoom-to-tabs gesture in Safari
        document.body.style.zoom = 1;
    });
}

function handleOrientation() {
    // Lock orientation to landscape when possible
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {
            // Orientation lock not supported or failed
            console.log('Orientation lock not supported');
        });
    }
}

function initializeWakeLock() {
    // Keep screen awake during gameplay
    let wakeLock = null;
    
    async function requestWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                wakeLock = await navigator.wakeLock.request('screen');
                console.log('Wake Lock activated');
                
                wakeLock.addEventListener('release', () => {
                    console.log('Wake Lock released');
                });
            }
        } catch (err) {
            console.log('Wake Lock not supported');
        }
    }
    
    // Request wake lock when game starts
    document.addEventListener('gamestart', requestWakeLock);
    
    // Re-request wake lock when page becomes visible
    document.addEventListener('visibilitychange', () => {
        if (wakeLock !== null && document.visibilityState === 'visible') {
            requestWakeLock();
        }
    });
    
    // Request wake lock on first user interaction
    document.addEventListener('touchstart', requestWakeLock, { once: true });
    document.addEventListener('mousedown', requestWakeLock, { once: true });
}

// Global error handling
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    // You could show a user-friendly error message here
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    e.preventDefault();
});

// Performance monitoring
let performanceData = {
    loadTime: 0,
    gameStartTime: 0
};

window.addEventListener('load', () => {
    performanceData.loadTime = performance.now();
    console.log(`App loaded in ${performanceData.loadTime.toFixed(2)}ms`);
});

// Add some debug helpers for development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Development mode helpers
    window.DEBUG = {
        showTouches: function() {
            // Add visual debug for touches
            let debugMode = false;
            return function() {
                debugMode = !debugMode;
                if (debugMode) {
                    // Override render to show touch debug
                    const originalRender = GameManager.engine.render;
                    GameManager.engine.render = function() {
                        originalRender.call(this);
                        InputManager.debugRender(this.ctx);
                    };
                } else {
                    // Restore original render
                    GameManager.engine.render = originalRender;
                }
            };
        }(),
        
        getStats: function() {
            return {
                performance: performanceData,
                gameState: GameManager.gameState,
                currentGame: GameManager.currentGameType,
                settings: GameManager.settings,
                touches: InputManager.getTouches().length
            };
        }
    };
    
    console.log('Debug mode enabled. Use DEBUG.showTouches() to toggle touch visualization.');
}
