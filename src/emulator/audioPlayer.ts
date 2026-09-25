/**
 * Reliable Web Audio driver for NES APU output
 * Uses circular ring buffer and ScriptProcessorNode for universal iframe and browser compatibility.
 */
export class AudioPlayer {
  private ctx: AudioContext | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private gainNode: GainNode | null = null;
  private sampleRate = 44100;
  private capacity = 16384;
  private bufferL = new Float32Array(16384);
  private bufferR = new Float32Array(16384);
  private readIndex = 0;
  private writeIndex = 0;
  private availableCount = 0;
  private isMuted = false;
  private volumeLevel = 0.5;

  constructor() {
    // Initialized lazily on user gesture
  }

  public getSampleRate(): number {
    return this.sampleRate;
  }

  public async init(): Promise<void> {
    if (this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('Web Audio API not supported in this browser environment');
      return;
    }

    try {
      this.ctx = new AudioContextClass({ sampleRate: this.sampleRate });
      this.sampleRate = this.ctx.sampleRate;

      // ScriptProcessorNode with buffer size 2048, 0 inputs, 2 outputs (stereo)
      this.scriptNode = this.ctx.createScriptProcessor(2048, 0, 2);
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : this.volumeLevel, this.ctx.currentTime);

      this.scriptNode.onaudioprocess = (e: AudioProcessingEvent) => {
        const outL = e.outputBuffer.getChannelData(0);
        const outR = e.outputBuffer.getChannelData(1);
        const len = outL.length;

        for (let i = 0; i < len; i++) {
          if (this.availableCount > 0) {
            outL[i] = this.bufferL[this.readIndex];
            outR[i] = this.bufferR[this.readIndex];
            this.readIndex = (this.readIndex + 1) % this.capacity;
            this.availableCount--;
          } else {
            outL[i] = 0;
            outR[i] = 0;
          }
        }
      };

      this.scriptNode.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);

      if (this.ctx.state === 'suspended') {
        const resumeAudio = () => {
          if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
          }
          window.removeEventListener('click', resumeAudio);
          window.removeEventListener('keydown', resumeAudio);
          window.removeEventListener('touchstart', resumeAudio);
        };
        window.addEventListener('click', resumeAudio);
        window.addEventListener('keydown', resumeAudio);
        window.addEventListener('touchstart', resumeAudio);
      }
    } catch (err) {
      console.error('Failed to initialize AudioContext:', err);
    }
  }

  public resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public writeSample = (left: number, right: number): void => {
    // If buffer is overflowing (> 80% capacity), advance read pointer to maintain low latency
    if (this.availableCount >= this.capacity - 1) {
      this.readIndex = (this.readIndex + 1) % this.capacity;
      this.availableCount--;
    }

    this.bufferL[this.writeIndex] = left;
    this.bufferR[this.writeIndex] = right;
    this.writeIndex = (this.writeIndex + 1) % this.capacity;
    this.availableCount++;
  };

  public setVolume(vol: number): void {
    this.volumeLevel = Math.max(0, Math.min(1, vol));
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : this.volumeLevel, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volumeLevel;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : this.volumeLevel, this.ctx.currentTime);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public clearBuffer(): void {
    this.readIndex = 0;
    this.writeIndex = 0;
    this.availableCount = 0;
  }

  public destroy(): void {
    this.clearBuffer();
    if (this.scriptNode) {
      this.scriptNode.disconnect();
      this.scriptNode.onaudioprocess = null;
      this.scriptNode = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
