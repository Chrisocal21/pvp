// Game Manager - Coordinates all game systems and manages game states

class GameManager {
    constructor() {
        this.currentGame = null;
        this.engine = null;
        this.gameState = 'menu'; // 'menu', 'playing', 'paused', 'gameOver'
        this.currentGameType = null;
        
        // Game settings
        this.settings = {
            gameSpeed: 1.0,
            paddleSize: 1.0,
            soundFX: true,
            vibration: true
        };
        
        // UI elements
        this.elements = {};
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.bindUIEvents();
        this.loadSettings();
        this.showScreen('mainMenu');
        
        // Set up input manager
        InputManager.setCanvas(this.engine.canvas);
        
        // Force landscape orientation on mobile
        this.handleOrientationChange();
    }

    setupCanvas() {
        const canvas = document.getElementById('gameCanvas');
        this.engine = new GameEngine(canvas);
        
        // Start the engine but don't start any game yet
        this.engine.start();
        
        // Add render hook for current game
        const originalRender = this.engine.render.bind(this.engine);
        this.engine.render = () => {
            originalRender();
            if (this.currentGame && this.currentGame.render) {
                this.currentGame.render();
            }
        };
        
        // Add update hook for current game
        const originalUpdate = this.engine.update.bind(this.engine);
        this.engine.update = (deltaTime) => {
            originalUpdate(deltaTime);
            if (this.currentGame && this.currentGame.update) {
                this.currentGame.update(deltaTime);
            }
        };
    }

    bindUIEvents() {
        // Cache UI elements
        this.elements = {
            mainMenu: document.getElementById('mainMenu'),
            gameScreen: document.getElementById('gameScreen'),
            pauseMenu: document.getElementById('pauseMenu'),
            settingsMenu: document.getElementById('settingsMenu'),
            howToPlayMenu: document.getElementById('howToPlayMenu'),
            player1Score: document.getElementById('player1Score'),
            player2Score: document.getElementById('player2Score')
        };

        // Game selection buttons
        document.querySelectorAll('.game-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const gameType = e.currentTarget.getAttribute('data-game');
                this.startGame(gameType);
                AudioManager.playSound('menuSelect');
            });
        });

        // Menu buttons
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.showScreen('settingsMenu');
            AudioManager.playSound('menuSelect');
        });

        document.getElementById('howToPlayBtn').addEventListener('click', () => {
            this.showScreen('howToPlayMenu');
            AudioManager.playSound('menuSelect');
        });

        // Game UI buttons
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.pauseGame();
            AudioManager.playSound('menuSelect');
        });

        document.getElementById('backToMenuBtn').addEventListener('click', () => {
            this.endGame();
            AudioManager.playSound('menuSelect');
        });

        // Pause menu buttons
        document.getElementById('resumeBtn').addEventListener('click', () => {
            this.resumeGame();
            AudioManager.playSound('menuSelect');
        });

        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restartGame();
            AudioManager.playSound('menuSelect');
        });

        document.getElementById('mainMenuBtn').addEventListener('click', () => {
            this.endGame();
            AudioManager.playSound('menuSelect');
        });

        // Settings controls
        this.bindSettingsEvents();

        // Close menu buttons
        document.getElementById('closeSettingsBtn').addEventListener('click', () => {
            this.showScreen('mainMenu');
            this.saveSettings();
            AudioManager.playSound('menuSelect');
        });

        document.getElementById('closeHowToBtn').addEventListener('click', () => {
            this.showScreen('mainMenu');
            AudioManager.playSound('menuSelect');
        });

        // Handle back button / escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.handleBackAction();
            }
        });

        // Handle game over click to continue
        this.engine.canvas.addEventListener('click', () => {
            if (this.gameState === 'gameOver') {
                this.endGame();
            }
        });

        // Handle orientation change
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleOrientationChange(), 100);
        });
    }

    bindSettingsEvents() {
        const gameSpeedSlider = document.getElementById('gameSpeed');
        const paddleSizeSlider = document.getElementById('paddleSize');
        const soundFXCheckbox = document.getElementById('soundFX');
        const vibrationCheckbox = document.getElementById('vibration');

        // Game speed
        gameSpeedSlider.addEventListener('input', (e) => {
            this.settings.gameSpeed = parseFloat(e.target.value);
            document.getElementById('speedValue').textContent = this.settings.gameSpeed.toFixed(1) + 'x';
            this.updateGameSettings();
        });

        // Paddle size
        paddleSizeSlider.addEventListener('input', (e) => {
            this.settings.paddleSize = parseFloat(e.target.value);
            document.getElementById('paddleSizeValue').textContent = this.settings.paddleSize.toFixed(1) + 'x';
            this.updateGameSettings();
        });

        // Sound FX
        soundFXCheckbox.addEventListener('change', (e) => {
            this.settings.soundFX = e.target.checked;
            AudioManager.setEnabled(this.settings.soundFX);
        });

        // Vibration
        vibrationCheckbox.addEventListener('change', (e) => {
            this.settings.vibration = e.target.checked;
        });
    }

    handleOrientationChange() {
        // Force landscape orientation warning if in portrait
        const orientation = Utils.getOrientation();
        if (Math.abs(orientation) !== 90 && Math.abs(orientation) !== 270) {
            // In portrait mode, show orientation warning
            this.showOrientationWarning();
        } else {
            this.hideOrientationWarning();
        }
    }

    showOrientationWarning() {
        let warning = document.getElementById('orientationWarning');
        if (!warning) {
            warning = document.createElement('div');
            warning.id = 'orientationWarning';
            warning.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.9);
                color: white;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 20px;
            `;
            warning.innerHTML = `
                <div style="font-size: 2rem; margin-bottom: 20px;">📱</div>
                <h2>Please Rotate Your Device</h2>
                <p>This game is designed for landscape mode</p>
                <p>Turn your phone sideways and place it flat on a table</p>
            `;
            document.body.appendChild(warning);
        }
        warning.style.display = 'flex';
    }

    hideOrientationWarning() {
        const warning = document.getElementById('orientationWarning');
        if (warning) {
            warning.style.display = 'none';
        }
    }

    startGame(gameType) {
        console.log('Starting game:', gameType);
        console.log('GameManager settings:', this.settings);
        
        this.currentGameType = gameType;
        this.gameState = 'playing';
        
        // Clear any existing game
        if (this.currentGame) {
            this.currentGame.cleanup();
        }
        this.engine.clear();
        
        // Create new game based on type
        try {
            switch (gameType) {
                case 'pong':
                    this.currentGame = new PongGame(this.engine);
                    break;
                case 'airhockey':
                    this.currentGame = new AirHockeyGame(this.engine);
                    break;
                case 'breakout':
                    this.currentGame = new BreakoutGame(this.engine);
                    break;
                case 'tanks':
                    this.currentGame = new TankGame(this.engine);
                    break;
                default:
                    console.error('Unknown game type:', gameType);
                    return;
            }
            
            this.showScreen('gameScreen');
            this.updateScore(0, 0);
            
            // Apply current settings
            this.updateGameSettings();
            
            console.log('Game started successfully:', this.currentGame);
        } catch (error) {
            console.error('Error starting game:', error);
            this.showScreen('mainMenu');
        }
    }

    pauseGame() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.showScreen('pauseMenu');
        }
    }

    resumeGame() {
        if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.showScreen('gameScreen');
        }
    }

    restartGame() {
        if (this.currentGame && this.currentGame.restart) {
            this.currentGame.restart();
        }
        this.gameState = 'playing';
        this.showScreen('gameScreen');
    }

    endGame() {
        this.gameState = 'menu';
        
        if (this.currentGame) {
            this.currentGame.cleanup();
            this.currentGame = null;
        }
        
        this.engine.clear();
        this.showScreen('mainMenu');
        this.currentGameType = null;
    }

    gameOver(winner) {
        this.gameState = 'gameOver';
        AudioManager.playSound('gameOver');
        
        if (this.settings.vibration) {
            Utils.vibrate([200, 100, 200]);
        }
    }

    updateScore(player1Score, player2Score) {
        this.elements.player1Score.textContent = player1Score;
        this.elements.player2Score.textContent = player2Score;
    }

    showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.add('active');
        }
    }

    handleBackAction() {
        switch (this.gameState) {
            case 'playing':
                this.pauseGame();
                break;
            case 'paused':
                this.resumeGame();
                break;
            case 'gameOver':
                this.endGame();
                break;
            default:
                // Close any open menus
                this.showScreen('mainMenu');
                break;
        }
    }

    updateGameSettings() {
        if (this.currentGame && this.currentGame.updateSettings) {
            this.currentGame.updateSettings();
        }
    }

    loadSettings() {
        try {
            const saved = Utils.loadFromStorage('gameSettings', this.settings);
            this.settings = { ...this.settings, ...saved };
            
            console.log('Loaded settings:', this.settings);
            
            // Apply loaded settings to UI
            const gameSpeedEl = document.getElementById('gameSpeed');
            const speedValueEl = document.getElementById('speedValue');
            const paddleSizeEl = document.getElementById('paddleSize');
            const paddleSizeValueEl = document.getElementById('paddleSizeValue');
            const soundFXEl = document.getElementById('soundFX');
            const vibrationEl = document.getElementById('vibration');
            
            if (gameSpeedEl) {
                gameSpeedEl.value = this.settings.gameSpeed;
            }
            if (speedValueEl) {
                speedValueEl.textContent = this.settings.gameSpeed.toFixed(1) + 'x';
            }
            
            if (paddleSizeEl) {
                paddleSizeEl.value = this.settings.paddleSize;
            }
            if (paddleSizeValueEl) {
                paddleSizeValueEl.textContent = this.settings.paddleSize.toFixed(1) + 'x';
            }
            
            if (soundFXEl) {
                soundFXEl.checked = this.settings.soundFX;
            }
            if (vibrationEl) {
                vibrationEl.checked = this.settings.vibration;
            }
            
            // Apply to managers
            AudioManager.setEnabled(this.settings.soundFX);
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    saveSettings() {
        Utils.saveToStorage('gameSettings', this.settings);
    }

    // Get game statistics (for future features)
    getStats() {
        return Utils.loadFromStorage('gameStats', {
            gamesPlayed: 0,
            totalPlayTime: 0,
            highScores: {}
        });
    }

    updateStats(gameType, duration, score) {
        const stats = this.getStats();
        stats.gamesPlayed++;
        stats.totalPlayTime += duration;
        
        if (!stats.highScores[gameType]) {
            stats.highScores[gameType] = 0;
        }
        
        if (score > stats.highScores[gameType]) {
            stats.highScores[gameType] = score;
        }
        
        Utils.saveToStorage('gameStats', stats);
    }
}

// Create global instance
const GameManager = new GameManager();
