// Audio Manager for handling sound effects and music

class AudioManager {
    constructor() {
        this.sounds = new Map();
        this.enabled = true;
        this.volume = 1.0;
        
        // Audio context for better mobile support
        this.audioContext = null;
        this.setupAudioContext();
        
        this.loadSounds();
    }

    setupAudioContext() {
        try {
            // Create audio context on first user interaction
            const createAudioContext = () => {
                if (!this.audioContext) {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                }
                
                // Resume context if suspended
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
                
                // Remove listeners after first interaction
                document.removeEventListener('touchstart', createAudioContext);
                document.removeEventListener('mousedown', createAudioContext);
            };
            
            document.addEventListener('touchstart', createAudioContext, { once: true });
            document.addEventListener('mousedown', createAudioContext, { once: true });
        } catch (e) {
            console.warn('Audio context not supported:', e);
        }
    }

    loadSounds() {
        // Create synthetic sounds since we don't have audio files
        this.createSyntheticSounds();
    }

    createSyntheticSounds() {
        // Paddle hit sound
        this.sounds.set('paddleHit', {
            type: 'synthetic',
            create: () => this.createBeepSound(800, 0.1, 'square')
        });

        // Wall hit sound
        this.sounds.set('wallHit', {
            type: 'synthetic',
            create: () => this.createBeepSound(400, 0.1, 'sawtooth')
        });

        // Score sound
        this.sounds.set('score', {
            type: 'synthetic',
            create: () => this.createScoreSound()
        });

        // Game over sound
        this.sounds.set('gameOver', {
            type: 'synthetic',
            create: () => this.createGameOverSound()
        });

        // Menu select sound
        this.sounds.set('menuSelect', {
            type: 'synthetic',
            create: () => this.createBeepSound(600, 0.05, 'sine')
        });

        // Tank shot sound
        this.sounds.set('tankShot', {
            type: 'synthetic',
            create: () => this.createNoiseSound(0.1)
        });

        // Explosion sound
        this.sounds.set('explosion', {
            type: 'synthetic',
            create: () => this.createExplosionSound()
        });
    }

    createBeepSound(frequency, duration, waveType = 'sine') {
        if (!this.audioContext) return null;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = waveType;

        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);

        return { oscillator, gainNode };
    }

    createScoreSound() {
        if (!this.audioContext) return null;

        // Create a ascending melody
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        let delay = 0;

        notes.forEach((frequency, index) => {
            setTimeout(() => {
                this.createBeepSound(frequency, 0.2, 'sine');
            }, delay);
            delay += 100;
        });

        return null;
    }

    createGameOverSound() {
        if (!this.audioContext) return null;

        // Create a descending melody
        const notes = [783.99, 659.25, 523.25, 392.00]; // G5, E5, C5, G4
        let delay = 0;

        notes.forEach((frequency, index) => {
            setTimeout(() => {
                this.createBeepSound(frequency, 0.3, 'sine');
            }, delay);
            delay += 200;
        });

        return null;
    }

    createNoiseSound(duration) {
        if (!this.audioContext) return null;

        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        // Generate white noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.1;
        }

        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        
        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        gainNode.gain.setValueAtTime(this.volume * 0.2, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

        source.start(this.audioContext.currentTime);
        source.stop(this.audioContext.currentTime + duration);

        return { source, gainNode };
    }

    createExplosionSound() {
        if (!this.audioContext) return null;

        // Combine noise with a low frequency oscillator for explosion effect
        const duration = 0.5;
        
        // Noise component
        setTimeout(() => this.createNoiseSound(duration), 0);
        
        // Low frequency rumble
        setTimeout(() => this.createBeepSound(80, duration * 0.8, 'sawtooth'), 0);
        
        // High frequency crack
        setTimeout(() => this.createBeepSound(2000, 0.1, 'square'), 50);

        return null;
    }

    playSound(soundName) {
        if (!this.enabled || !this.audioContext) return;

        const sound = this.sounds.get(soundName);
        if (!sound) {
            console.warn(`Sound '${soundName}' not found`);
            return;
        }

        try {
            if (sound.type === 'synthetic') {
                sound.create();
            } else {
                // For actual audio files (future implementation)
                const audio = new Audio(sound.src);
                audio.volume = this.volume;
                audio.play().catch(e => console.warn('Audio play failed:', e));
            }
        } catch (e) {
            console.warn('Failed to play sound:', e);
        }
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    isEnabled() {
        return this.enabled;
    }

    getVolume() {
        return this.volume;
    }

    // Resume audio context (call on user interaction)
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // Mute all sounds
    mute() {
        this.setEnabled(false);
    }

    // Unmute all sounds
    unmute() {
        this.setEnabled(true);
    }

    // Toggle sound on/off
    toggle() {
        this.setEnabled(!this.enabled);
    }

    // Get available sound names
    getSoundNames() {
        return Array.from(this.sounds.keys());
    }

    // Pre-load a sound (for future file-based audio)
    loadSound(name, src) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.addEventListener('canplaythrough', () => {
                this.sounds.set(name, {
                    type: 'file',
                    src: src,
                    audio: audio
                });
                resolve();
            });
            audio.addEventListener('error', reject);
            audio.src = src;
        });
    }

    // Load multiple sounds
    loadSoundsFromFiles(soundFiles) {
        const promises = soundFiles.map(({ name, src }) => this.loadSound(name, src));
        return Promise.all(promises);
    }

    // Clean up resources
    dispose() {
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.sounds.clear();
    }

    // Handle page visibility changes (pause/resume)
    handleVisibilityChange() {
        if (document.hidden) {
            // Page is hidden, pause audio context
            if (this.audioContext && this.audioContext.state === 'running') {
                this.audioContext.suspend();
            }
        } else {
            // Page is visible, resume audio context
            this.resume();
        }
    }
}

// Create global instance
const AudioManager = new AudioManager();

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    AudioManager.handleVisibilityChange();
});

// Resume audio on any user interaction
document.addEventListener('touchstart', () => AudioManager.resume(), { once: true });
document.addEventListener('mousedown', () => AudioManager.resume(), { once: true });
