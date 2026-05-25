import { Audio } from "expo-av";

type SoundType = "default" | "crisp" | "gentle" | "urgent";

/**
 * Generate a simple beep sound using Web Audio API
 * This creates different tones based on the sound type
 */
export async function generateToneSound(
  soundType: SoundType = "default"
): Promise<Audio.Sound> {
  try {
    // Define tone parameters for each sound type
    const toneParams: Record<SoundType, { frequency: number; duration: number; volume: number }> = {
      default: { frequency: 800, duration: 200, volume: 0.5 },      // 800Hz, 200ms
      crisp: { frequency: 1200, duration: 150, volume: 0.7 },       // 1200Hz, 150ms (higher and shorter)
      gentle: { frequency: 600, duration: 250, volume: 0.3 },       // 600Hz, 250ms (lower and longer)
      urgent: { frequency: 1000, duration: 100, volume: 0.8 },      // 1000Hz, 100ms (short and loud)
    };

    const params = toneParams[soundType];

    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const totalSamples = Math.floor((params.duration / 1000) * sampleRate);

    // Create audio buffer
    const audioBuffer = audioContext.createBuffer(1, totalSamples, sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    // Generate sine wave
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      // Sine wave with fade in/out envelope
      const envelope = Math.min(1, t * 10, Math.max(0, 1 - (t - params.duration / 1000 + 0.1) * 10));
      channelData[i] = Math.sin(2 * Math.PI * params.frequency * t) * params.volume * envelope;
    }

    // Create audio source from buffer
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;

    // Create gain node for volume control
    const gainNode = audioContext.createGain();
    gainNode.gain.value = params.volume;

    // Connect nodes
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Play the sound
    source.start(0);

    // Create a mock Sound object that matches the expo-av API
    const mockSound = {
      playAsync: async () => {
        // Sound is already playing
        return;
      },
      pauseAsync: async () => {
        source.stop();
      },
      stopAsync: async () => {
        source.stop();
      },
      unloadAsync: async () => {
        // Cleanup
      },
      setOnPlaybackStatusUpdate: (callback: any) => {
        // Mock callback after duration
        setTimeout(() => {
          callback({ isLoaded: true, didJustFinish: true });
        }, params.duration);
      },
    };

    return mockSound as any;
  } catch (err) {
    console.error("Failed to generate tone sound:", err);
    throw err;
  }
}

/**
 * Alternative: Generate sound using oscillator (more reliable)
 */
export async function generateOscillatorSound(
  soundType: SoundType = "default"
): Promise<Audio.Sound> {
  try {
    // Define oscillator parameters for each sound type
    const oscParams: Record<SoundType, { frequency: number; duration: number; type: OscillatorType }> = {
      default: { frequency: 800, duration: 200, type: "sine" },
      crisp: { frequency: 1200, duration: 150, type: "square" },
      gentle: { frequency: 600, duration: 250, type: "sine" },
      urgent: { frequency: 1000, duration: 100, type: "triangle" },
    };

    const params = oscParams[soundType];

    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Create oscillator
    const oscillator = audioContext.createOscillator();
    oscillator.frequency.value = params.frequency;
    oscillator.type = params.type;

    // Create gain node for envelope
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + params.duration / 1000);

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Start and stop
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + params.duration / 1000);

    // Create a mock Sound object
    const mockSound = {
      playAsync: async () => {
        // Sound is already playing
        return;
      },
      pauseAsync: async () => {
        oscillator.stop();
      },
      stopAsync: async () => {
        oscillator.stop();
      },
      unloadAsync: async () => {
        // Cleanup
      },
      setOnPlaybackStatusUpdate: (callback: any) => {
        // Mock callback after duration
        setTimeout(() => {
          callback({ isLoaded: true, didJustFinish: true });
        }, params.duration);
      },
    };

    return mockSound as any;
  } catch (err) {
    console.error("Failed to generate oscillator sound:", err);
    throw err;
  }
}
