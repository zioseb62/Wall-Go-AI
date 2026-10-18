
export class SoundManager {
  private static ctx: AudioContext | null = null;
  private static musicInterval: any = null;
  private static currentMusicType: 'neon' | 'guitar' | 'reggae' | null = null;
  private static masterGain: GainNode | null = null;
  private static musicGain: GainNode | null = null;
  private static sfxGain: GainNode | null = null;
  private static reverb: ConvolverNode | null = null;
  private static currentBaseFreq: number = 220;
  private static isMusicEnabled: boolean = false;
  private static reggaeAudio: HTMLAudioElement | null = null;
  private static marchGain: GainNode | null = null;
  private static marchTimeout: any = null;
  
  private static SCALES = {
    zen: [0, 2, 4, 7, 9], 
    crystal: [0, 3, 5, 7, 10], 
  };

  private static getCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
          latencyHint: 'interactive'
      });
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.masterGain);
      this.musicGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.masterGain);
      this.sfxGain.gain.setValueAtTime(0.6, this.ctx.currentTime);

      this.createReverb();

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          if (this.ctx?.state === 'running') {
            this.ctx.suspend();
          }
          if (this.reggaeAudio && !this.reggaeAudio.paused) {
            this.reggaeAudio.pause();
          }
        } else {
          if (this.ctx?.state === 'suspended') {
            this.ctx.resume();
          }
          if (this.isMusicEnabled && this.reggaeAudio && this.reggaeAudio.paused) {
            this.reggaeAudio.play().catch(e => console.warn('Could not resume mp3', e));
          }
        }
      });
    }
    return this.ctx;
  }

  static async pauseBackgroundMusic() {
    if (this.reggaeAudio) {
      this.reggaeAudio.pause();
    }
  }

  static async resumeBackgroundMusic() {
    if (this.isMusicEnabled && this.reggaeAudio) {
      await this.resume();
      this.reggaeAudio.play().catch(e => console.warn('Could not resume mp3', e));
    }
  }

  private static createReverb() {
    const ctx = this.getCtx();
    this.reverb = ctx.createConvolver();
    const length = ctx.sampleRate * 2.5;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let i = 0; i < 2; i++) {
      const channel = impulse.getChannelData(i);
      for (let j = 0; j < length; j++) {
        channel[j] = (Math.random() * 2 - 1) * Math.exp(-j / (ctx.sampleRate * 0.5));
      }
    }
    this.reverb.buffer = impulse;
    this.reverb.connect(this.musicGain!);
  }

  static async resume() {
    const ctx = this.getCtx();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  }

  static async stopBackgroundMusic() {
    this.isMusicEnabled = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
      this.currentMusicType = null;
    }
    
    if (this.reggaeAudio) {
      this.reggaeAudio.pause();
      this.reggaeAudio.currentTime = 0;
    }
    
    if (this.musicGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value || 0.001, now);
      this.musicGain.gain.linearRampToValueAtTime(0, now + 0.5);
    }
  }

  static playScream() {
    this.resume();
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc2.type = 'square';
    osc3.type = 'triangle';

    // Desperate scream frequencies
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 1.5);
    osc.frequency.linearRampToValueAtTime(50, now + 2.5);

    osc2.frequency.setValueAtTime(810, now);
    osc2.frequency.exponentialRampToValueAtTime(145, now + 1.5);
    osc2.frequency.linearRampToValueAtTime(45, now + 2.5);
    
    osc3.frequency.setValueAtTime(50, now); // Rumble

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 1.5);

    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.5, now + 0.1);
    g.gain.exponentialRampToValueAtTime(0.01, now + 2.0);
    g.gain.linearRampToValueAtTime(0, now + 2.5);

    osc.connect(filter);
    osc2.connect(filter);
    osc3.connect(filter);
    filter.connect(g);
    
    if (this.reverb) {
        g.connect(this.reverb); // give it that falling into void echo
    } else {
        g.connect(this.sfxGain!);
    }
    
    osc.start(now);
    osc2.start(now);
    osc3.start(now);
    osc.stop(now + 2.5);
    osc2.stop(now + 2.5);
    osc3.stop(now + 2.5);
  }

  static playMovePiece() {
    this.resume();
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
    
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.3, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    
    osc.connect(g);
    g.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  static playTerritoryCreated() {
    this.resume();
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    
    // A bright, ascending arpeggio to emphasize territory creation
    const notes = [0, 4, 7, 12, 16]; 
    const durations = [0.1, 0.1, 0.1, 0.1, 0.4];
    
    let time = now;
    notes.forEach((semi, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const freq = 440 * Math.pow(2, semi / 12); 
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      
      g.gain.setValueAtTime(0, time);
      g.gain.linearRampToValueAtTime(0.3, time + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, time + durations[i]);
      
      osc.connect(g);
      g.connect(this.sfxGain!);
      
      osc.start(time);
      osc.stop(time + durations[i]);
      time += durations[i] * 0.8;
    });
  }

  static playPlaceWall() {
    this.resume();
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);
    
    g.gain.setValueAtTime(0.4, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    
    osc.connect(g);
    g.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  static playBadukStone() {
    this.resume();
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    
    // Quick burst of noise and low oscillator for a "thud/clack"
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.05); // sharp drop
    
    g.gain.setValueAtTime(0.6, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08); // very short
    
    osc.connect(g);
    g.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.08);

    // add a tiny bit of "click" impact
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'square';
    clickOsc.frequency.setValueAtTime(1000, now);
    clickOsc.frequency.exponentialRampToValueAtTime(100, now + 0.02);
    clickGain.gain.setValueAtTime(0.2, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    clickOsc.connect(clickGain);
    clickGain.connect(this.sfxGain!);
    clickOsc.start(now);
    clickOsc.stop(now + 0.02);
  }

  static playBadukCapture() {
    this.resume();
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    // Suono tipo clack aspro o risucchio
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1); 
    
    g.gain.setValueAtTime(0.4, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15); 
    
    osc.connect(g);
    g.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  static playBadukTerritory() {
    this.resume();
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(880, now + 0.15);
    
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.4, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    osc.connect(g);
    g.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  static stopVictory() {
    if (this.marchTimeout) {
      clearTimeout(this.marchTimeout);
      this.marchTimeout = null;
    }
    if (this.marchGain) {
      const g = this.marchGain;
      const now = this.getCtx().currentTime;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(0, now + 1);
      setTimeout(() => {
        try { g.disconnect(); } catch (e) {}
      }, 1000);
      this.marchGain = null;
    }
  }

  static playVictory() {
    this.stopBackgroundMusic();
    this.stopVictory();
    this.resume();
    
    const ctx = this.getCtx();
    this.marchGain = ctx.createGain();
    this.marchGain.gain.value = 0.5; // overall volume
    this.marchGain.connect(this.masterGain!);

    const melody = [
      0, null, 4, null, 7, null, 12, null,
      12, 9, 7, 4, 7, null, 7, null,
      5, null, 9, null, 12, null, 9, null,
      7, null, 4, null, 0, null, 0, null,
      2, null, 5, null, 7, null, 5, null,
      4, null, 7, null, 12, null, 7, null,
      12, 14, 16, 14, 12, null, 7, null,
      12, null, null, null, null, null, null, null
    ];
    
    const bassLine = [
      -12, null, -7, null, -12, null, -7, null,
      -12, null, -7, null, -12, null, -7, null,
      -17, null, -12, null, -17, null, -12, null,
      -12, null, -7, null, -12, null, -7, null,
      -10, null, -5, null, -10, null, -5, null,
      -12, null, -7, null, -12, null, -7, null,
      -12, null, -7, null, -12, null, -7, null,
      -12, null, -12, null, -12, null, null, null
    ];
    
    let step = 0;
    const stepDuration = 0.2;
    let nextStepTime = ctx.currentTime + 0.1;

    // Try to create a white noise buffer for snare
    let noiseBuffer: AudioBuffer | null = null;
    try {
      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < output.length; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    } catch(e) {}

    const schedule = () => {
      if (!this.marchGain) return; // stopped
      
      while (nextStepTime < ctx.currentTime + 0.3) {
        // play bass drum on alternating steps
        if (step % 4 === 0) {
           const bOsc = ctx.createOscillator();
           const bGain = ctx.createGain();
           bOsc.type = 'sine';
           bOsc.frequency.setValueAtTime(100, nextStepTime);
           bOsc.frequency.exponentialRampToValueAtTime(30, nextStepTime + 0.1);
           bGain.gain.setValueAtTime(0, nextStepTime);
           bGain.gain.linearRampToValueAtTime(1.2, nextStepTime + 0.01);
           bGain.gain.exponentialRampToValueAtTime(0.01, nextStepTime + 0.2);
           bOsc.connect(bGain);
           bGain.connect(this.marchGain!);
           bOsc.start(nextStepTime);
           bOsc.stop(nextStepTime + 0.2);
        }
        
        // play snare
        if (step % 4 === 2 && noiseBuffer) {
           const nOsc = ctx.createBufferSource();
           nOsc.buffer = noiseBuffer;
           const biquad = ctx.createBiquadFilter();
           biquad.type = 'bandpass';
           biquad.frequency.value = 1000;
           const nGain = ctx.createGain();
           nGain.gain.setValueAtTime(0, nextStepTime);
           nGain.gain.linearRampToValueAtTime(0.3, nextStepTime + 0.01);
           nGain.gain.exponentialRampToValueAtTime(0.01, nextStepTime + 0.1);
           nOsc.connect(biquad);
           biquad.connect(nGain);
           nGain.connect(this.marchGain!);
           nOsc.start(nextStepTime);
        }
        
        const note = melody[step];
        if (note !== null) {
           // Flute
           const fOsc = ctx.createOscillator();
           const fGain = ctx.createGain();
           fOsc.type = 'sine';
           fOsc.frequency.value = 261.63 * Math.pow(2, (note + 24) / 12);
           fGain.gain.setValueAtTime(0, nextStepTime);
           fGain.gain.linearRampToValueAtTime(0.15, nextStepTime + 0.02);
           fGain.gain.exponentialRampToValueAtTime(0.01, nextStepTime + stepDuration - 0.02);
           fOsc.connect(fGain);
           fGain.connect(this.marchGain!);
           fOsc.start(nextStepTime);
           fOsc.stop(nextStepTime + stepDuration);
           
           // Clarinet/Trumpet
           const tOsc = ctx.createOscillator();
           const tGain = ctx.createGain();
           tOsc.type = 'square';
           tOsc.frequency.value = 261.63 * Math.pow(2, (note + 12) / 12);
           const tFilt = ctx.createBiquadFilter();
           tFilt.type = 'lowpass';
           tFilt.frequency.setValueAtTime(1500, nextStepTime);
           tFilt.frequency.exponentialRampToValueAtTime(300, nextStepTime + stepDuration);
           tGain.gain.setValueAtTime(0, nextStepTime);
           tGain.gain.linearRampToValueAtTime(0.05, nextStepTime + 0.02);
           tGain.gain.exponentialRampToValueAtTime(0.01, nextStepTime + stepDuration - 0.02);
           tOsc.connect(tFilt);
           tFilt.connect(tGain);
           tGain.connect(this.marchGain!);
           tOsc.start(nextStepTime);
           tOsc.stop(nextStepTime + stepDuration);
        }

        const bnote = bassLine[step];
        if (bnote !== null) {
           // Trombone
           const trOsc = ctx.createOscillator();
           const trGain = ctx.createGain();
           trOsc.type = 'sawtooth';
           trOsc.frequency.value = 261.63 * Math.pow(2, (bnote) / 12);
           const trFilt = ctx.createBiquadFilter();
           trFilt.type = 'lowpass';
           trFilt.frequency.setValueAtTime(800, nextStepTime);
           trFilt.frequency.exponentialRampToValueAtTime(150, nextStepTime + stepDuration);
           trGain.gain.setValueAtTime(0, nextStepTime);
           trGain.gain.linearRampToValueAtTime(0.15, nextStepTime + 0.02);
           trGain.gain.exponentialRampToValueAtTime(0.01, nextStepTime + stepDuration - 0.02);
           trOsc.connect(trFilt);
           trFilt.connect(trGain);
           trGain.connect(this.marchGain!);
           trOsc.start(nextStepTime);
           trOsc.stop(nextStepTime + stepDuration);
        }
        
        step = (step + 1) % melody.length;
        nextStepTime += stepDuration;
      }
      this.marchTimeout = setTimeout(schedule, 50);
    };
    schedule();
  }

  static playDefeat() {
    this.resume();
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    // Sad descending melody
    const notes = [0, -1, -3, -5, -7]; 
    const durations = [0.3, 0.3, 0.3, 0.3, 1.0];
    
    let time = now;
    notes.forEach((semi, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const freq = 261.63 * Math.pow(2, semi / 12); 
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);
      
      // Slight pitch bend down for extra sadness
      osc.frequency.exponentialRampToValueAtTime(freq * 0.9, time + durations[i]);
      
      g.gain.setValueAtTime(0, time);
      g.gain.linearRampToValueAtTime(0.2, time + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, time + durations[i]);
      
      // Add a lowpass filter to make it sound muffled/sad
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, time);
      filter.frequency.linearRampToValueAtTime(200, time + durations[i]);
      
      osc.connect(filter);
      filter.connect(g);
      g.connect(this.sfxGain!);
      
      osc.start(time);
      osc.stop(time + durations[i]);
      time += durations[i] * 0.9;
    });
  }

  /**
   * Synthesize realistic, procedurally randomized sword clash sounds.
   * Every strike has varied resonance, pitch jitter, harmonic ratios, and metallic scraping friction.
   */
  static playSwordClash(intensity: 'light' | 'medium' | 'heavy' = 'medium', seedVariation?: number) {
    try {
      this.resume();
      const ctx = this.getCtx();
      const now = ctx.currentTime;
      const sfx = this.sfxGain || ctx.destination;

      // Random jitter factor for pitch and frequencies so NO two sounds are identical
      const randFactor = 0.85 + Math.random() * 0.3; // 0.85 - 1.15
      const variationOffset = seedVariation ? ((seedVariation % 5) - 2) * 80 : (Math.random() - 0.5) * 150;

      // Base frequencies tailored by clash intensity
      let baseFreq = 2200;
      let harmFreq1 = 3400;
      let harmFreq2 = 5100;
      let ringDuration = 0.28;
      let gainLevel = 0.45;

      if (intensity === 'light') {
        baseFreq = 2600 + variationOffset;
        harmFreq1 = 3900 + variationOffset;
        harmFreq2 = 5800 + variationOffset;
        ringDuration = 0.20;
        gainLevel = 0.35;
      } else if (intensity === 'heavy') {
        baseFreq = 1800 + variationOffset;
        harmFreq1 = 2900 + variationOffset;
        harmFreq2 = 4400 + variationOffset;
        ringDuration = 0.45;
        gainLevel = 0.55;
      } else {
        baseFreq = 2200 + variationOffset;
        harmFreq1 = 3400 + variationOffset;
        harmFreq2 = 5100 + variationOffset;
      }

      baseFreq *= randFactor;
      harmFreq1 *= randFactor;
      harmFreq2 *= randFactor;

      // 1. Blade Impact Transient (sharp metallic click / chink using filtered noise burst)
      const bufferSize = Math.floor(ctx.sampleRate * 0.05); // 50ms buffer
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.008));
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(baseFreq * 1.5, now);
      noiseFilter.Q.setValueAtTime(6.0, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(gainLevel * 0.8, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(sfx);
      noiseSource.start(now);

      // 2. High Metallic Resonant Ringing Oscillators
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const osc3 = ctx.createOscillator();

      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc3.type = 'triangle';

      osc1.frequency.setValueAtTime(baseFreq, now);
      osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.94, now + ringDuration);

      osc2.frequency.setValueAtTime(harmFreq1, now);
      osc2.frequency.exponentialRampToValueAtTime(harmFreq1 * 0.96, now + ringDuration);

      osc3.frequency.setValueAtTime(harmFreq2, now);
      osc3.frequency.exponentialRampToValueAtTime(harmFreq2 * 0.98, now + ringDuration * 0.7);

      const toneGain = ctx.createGain();
      toneGain.gain.setValueAtTime(0.001, now);
      toneGain.gain.linearRampToValueAtTime(gainLevel, now + 0.003);
      toneGain.gain.exponentialRampToValueAtTime(0.001, now + ringDuration);

      // Optional bandpass resonance filter for bell-like metal sheen
      const metalFilter = ctx.createBiquadFilter();
      metalFilter.type = 'peaking';
      metalFilter.frequency.setValueAtTime(baseFreq, now);
      metalFilter.Q.setValueAtTime(4.0, now);
      metalFilter.gain.setValueAtTime(6.0, now);

      osc1.connect(metalFilter);
      osc2.connect(metalFilter);
      osc3.connect(metalFilter);
      metalFilter.connect(toneGain);
      toneGain.connect(sfx);

      osc1.start(now);
      osc2.start(now);
      osc3.start(now);
      osc1.stop(now + ringDuration + 0.05);
      osc2.stop(now + ringDuration + 0.05);
      osc3.stop(now + ringDuration + 0.05);
    } catch (e) {
      console.warn('Sword clash audio playback skipped:', e);
    }
  }

  /**
   * Final decisive strike audio: deep impactful thud + bright fatal cleave + reverberant blade ring
   */
  static playDecisiveStrike() {
    try {
      this.resume();
      const ctx = this.getCtx();
      const now = ctx.currentTime;
      const sfx = this.sfxGain || ctx.destination;

      // Heavy body impact punch (low sub bass thud)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(160, now);
      subOsc.frequency.exponentialRampToValueAtTime(40, now + 0.22);
      subGain.gain.setValueAtTime(0.7, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      subOsc.connect(subGain);
      subGain.connect(sfx);
      subOsc.start(now);
      subOsc.stop(now + 0.25);

      // Resonant blade cleave slice
      this.playSwordClash('heavy');
    } catch (e) {
      console.warn('Decisive strike audio skipped:', e);
    }
  }

  /**
   * Defeat & dissolution sound: crumbling ash, dissolving aura, vanquished descent
   */
  static playDefeatDissolve() {
    try {
      this.resume();
      const ctx = this.getCtx();
      const now = ctx.currentTime;
      const sfx = this.sfxGain || ctx.destination;

      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.65);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(850, now);
      filter.frequency.exponentialRampToValueAtTime(150, now + 0.65);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(sfx);

      osc.start(now);
      osc.stop(now + 0.7);
    } catch (e) {
      console.warn('Defeat dissolve audio skipped:', e);
    }
  }

  /**
   * Massive bomb detonation explosion: thunderous sub-bass blast + broadband explosion roar + rumbling debris tail
   */
  static playBombExplosion() {
    try {
      this.resume();
      const ctx = this.getCtx();
      const now = ctx.currentTime;
      const sfx = this.sfxGain || ctx.destination;

      // 1. Deep Sub-Bass Shockwave Detonation Thump
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(180, now);
      subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.45);
      subGain.gain.setValueAtTime(0.9, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      subOsc.connect(subGain);
      subGain.connect(sfx);
      subOsc.start(now);
      subOsc.stop(now + 1.25);

      // 2. Broadband Blast Noise Explosion (Roaring fireball and debris)
      const bufferSize = ctx.sampleRate * 1.5;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const blastFilter = ctx.createBiquadFilter();
      blastFilter.type = 'lowpass';
      blastFilter.frequency.setValueAtTime(2400, now);
      blastFilter.frequency.exponentialRampToValueAtTime(80, now + 1.1);
      blastFilter.Q.setValueAtTime(3.5, now);

      const blastGain = ctx.createGain();
      blastGain.gain.setValueAtTime(1.0, now);
      blastGain.gain.exponentialRampToValueAtTime(0.001, now + 1.35);

      whiteNoise.connect(blastFilter);
      blastFilter.connect(blastGain);
      blastGain.connect(sfx);
      whiteNoise.start(now);
      whiteNoise.stop(now + 1.4);

      // 3. High-Pitch Sharp Ignition Crack
      const crackOsc = ctx.createOscillator();
      const crackGain = ctx.createGain();
      crackOsc.type = 'triangle';
      crackOsc.frequency.setValueAtTime(380, now);
      crackOsc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
      crackGain.gain.setValueAtTime(0.7, now);
      crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      crackOsc.connect(crackGain);
      crackGain.connect(sfx);
      crackOsc.start(now);
      crackOsc.stop(now + 0.15);
    } catch (e) {
      console.warn('Bomb explosion audio skipped:', e);
    }
  }

  /**
   * Bomb defusal audio (Miner): metallic tool snip + satisfying disarm chime
   */
  static playBombDefused() {
    try {
      this.resume();
      const ctx = this.getCtx();
      const now = ctx.currentTime;
      const sfx = this.sfxGain || ctx.destination;

      // 1. Wire Snip Click
      const snipOsc = ctx.createOscillator();
      const snipGain = ctx.createGain();
      snipOsc.type = 'square';
      snipOsc.frequency.setValueAtTime(1600, now);
      snipOsc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
      snipGain.gain.setValueAtTime(0.3, now);
      snipGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      snipOsc.connect(snipGain);
      snipGain.connect(sfx);
      snipOsc.start(now);
      snipOsc.stop(now + 0.07);

      // 2. High-Tech Green Disarm Harmony
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + 0.06 + i * 0.07);
        gain.gain.setValueAtTime(0.001, now + 0.06 + i * 0.07);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.08 + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35 + i * 0.07);
        osc.connect(gain);
        gain.connect(sfx);
        osc.start(now + 0.06 + i * 0.07);
        osc.stop(now + 0.4 + i * 0.07);
      });
    } catch (e) {
      console.warn('Bomb defused audio skipped:', e);
    }
  }

  static setMusicVolume(volume: number) {
    const ctx = this.getCtx();
    const normalized = Math.max(0, Math.min(1, volume / 100));
    if (this.musicGain) {
      this.musicGain.gain.setValueAtTime(normalized * 0.5, ctx.currentTime);
    }
    if (this.reggaeAudio) {
      this.reggaeAudio.volume = normalized * 0.6;
      if (volume > 0 && this.isMusicEnabled && this.reggaeAudio.paused) {
        this.resume().then(() => {
          this.reggaeAudio?.play().catch(e => console.warn('Could not play mp3 on volume change', e));
        });
      } else if (volume === 0 && !this.reggaeAudio.paused) {
        this.reggaeAudio.pause();
      }
    }
  }

  static setSfxVolume(volume: number) {
    const ctx = this.getCtx();
    const normalized = Math.max(0, Math.min(1, volume / 100));
    if (this.sfxGain) {
      this.sfxGain.gain.setValueAtTime(normalized * 0.6, ctx.currentTime);
    }
  }

  static setMuted(muted: boolean) {
    if (this.reggaeAudio) {
      this.reggaeAudio.muted = muted;
      if (!muted && this.isMusicEnabled && this.reggaeAudio.paused) {
        this.reggaeAudio.play().catch(() => {});
      }
    }
    const ctx = this.getCtx();
    if (ctx && ctx.state !== 'closed') {
      if (muted) {
        ctx.suspend().catch(() => {});
      } else {
        ctx.resume().catch(() => {});
      }
    }
  }

  static mute(muted: boolean) {
    this.setMuted(muted);
  }

  private static isUnlockAttached = false;

  private static setupAutoplayUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.resume();
      if (this.isMusicEnabled && this.reggaeAudio && this.reggaeAudio.volume > 0) {
        if (this.reggaeAudio.paused) {
          this.reggaeAudio.play().then(() => {
            this.isUnlockAttached = false;
            window.removeEventListener('pointerdown', unlock, true);
            window.removeEventListener('click', unlock, true);
            window.removeEventListener('touchstart', unlock, true);
            window.removeEventListener('keydown', unlock, true);
          }).catch(e => console.warn('Unlock play failed:', e));
        }
      }
    };
    if (!this.isUnlockAttached) {
      this.isUnlockAttached = true;
      window.addEventListener('pointerdown', unlock, { passive: true, capture: true });
      window.addEventListener('click', unlock, { passive: true, capture: true });
      window.addEventListener('touchstart', unlock, { passive: true, capture: true });
      window.addEventListener('keydown', unlock, { passive: true, capture: true });
    }
  }

  static async startBackgroundMusic(targetVolume?: number) {
    this.isMusicEnabled = true;
    this.setupAutoplayUnlock();
    await this.resume();
    if (!this.isMusicEnabled) return;
    
    if (!this.reggaeAudio) {
      const audioUrl = typeof window !== 'undefined' 
        ? new URL('reggae-dub.mp3', window.location.href).href 
        : 'reggae-dub.mp3';
      this.reggaeAudio = new Audio(audioUrl);
      this.reggaeAudio.loop = true;
      this.reggaeAudio.onerror = (e) => {
        console.warn('Primary reggaeAudio error, trying fallback path', e);
        if (this.reggaeAudio) {
          this.reggaeAudio.src = '/reggae-dub.mp3';
        }
      };
    }

    const storedVolume = localStorage.getItem('wallgo_music_volume');
    const vol = targetVolume !== undefined 
      ? targetVolume 
      : (storedVolume !== null ? parseInt(storedVolume, 10) : 100);
    
    const normalized = Math.max(0, Math.min(1, vol / 100));
    this.reggaeAudio.volume = normalized * 0.6; 

    if (vol > 0) {
      if (this.reggaeAudio.paused) {
        this.reggaeAudio.play().catch(e => {
          console.warn('Could not play mp3 automatically, interaction unlock active', e);
          this.setupAutoplayUnlock();
        });
      }
    } else {
      this.reggaeAudio.pause();
    }
  }
}
