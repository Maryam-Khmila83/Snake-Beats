import { Track } from '../types';

export const TRACKS: Track[] = [
  {
    id: 'cyberpunk_grid',
    name: 'Cyberpunk Grid',
    description: 'A brooding, heavy lowpass bassline paired with glowing digital arpeggios.',
    genre: 'Synthwave',
    bpm: 115,
    primaryColor: 'cyan-400',
    secondaryColor: 'violet-600',
    shadowColor: 'shadow-cyan-500/50',
    tags: ['Heavy', 'Atmospheric', 'Mid-tempo']
  },
  {
    id: 'neon_overdrive',
    name: 'Neon Overdrive',
    description: 'An upbeat, energetic retro-futurist track perfect for high-speed snake maneuvers.',
    genre: 'Outrun / Electro',
    bpm: 132,
    primaryColor: 'pink-500',
    secondaryColor: 'indigo-500',
    shadowColor: 'shadow-pink-500/50',
    tags: ['Energetic', 'Upbeat', 'Fast-paced']
  },
  {
    id: 'acid_horizon',
    name: 'Acid Horizon',
    description: 'A relaxed, resonant ambient lofi trip with deep analog warmth and spacey delay.',
    genre: 'Chillsynth / Acid',
    bpm: 98,
    primaryColor: 'emerald-400',
    secondaryColor: 'teal-600',
    shadowColor: 'shadow-emerald-500/50',
    tags: ['Relaxed', 'Resonant', 'Spacey']
  }
];

// 16-step sequencer pattern grids for each track
const PATTERNS: Record<string, {
  kick: number[];
  hat: number[];
  bass: number[]; // MIDI notes (0 means rest)
  lead: number[]; // MIDI notes (0 means rest)
}> = {
  cyberpunk_grid: {
    kick: [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0],
    hat:  [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1],
    bass: [33, 33, 33, 33, 36, 36, 36, 36, 38, 38, 38, 38, 31, 31, 31, 31], // A1, C2, D2, G1
    lead: [57, 0, 60, 64, 0, 67, 0, 64, 57, 0, 60, 64, 69, 67, 64, 60]       // Am arpeggio
  },
  neon_overdrive: {
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], // Straight 4-on-the-floor
    hat:  [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0], // Offbeat hats
    bass: [40, 40, 47, 40, 40, 40, 45, 47, 40, 40, 47, 40, 40, 40, 43, 45], // E1, B1, A1, B1
    lead: [64, 67, 71, 74, 76, 74, 71, 67, 76, 74, 71, 67, 79, 76, 74, 71]  // Em scale run
  },
  acid_horizon: {
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0],
    hat:  [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
    bass: [38, 38, 0, 38, 41, 41, 0, 41, 43, 43, 0, 43, 36, 36, 36, 36],    // D1, F1, G1, C1
    lead: [62, 0, 65, 0, 69, 0, 65, 0, 67, 0, 70, 0, 72, 69, 67, 65]       // Resonant slide
  }
};

class ProceduralSynthEngine {
  private audioCtx: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  // State
  private activeTrackIndex = 0;
  private isPlaying = false;
  private volume = 0.5;
  private stepDuration = 0.15; // 16th note duration in seconds
  private currentStep = 0;
  private nextNoteTime = 0.0;
  private schedulerTimerId: number | null = null;
  private lookahead = 25.0; // milliseconds
  private scheduleAheadTime = 0.1; // seconds

  // Subscriptions for beat updates in React
  private onStepCallbacks: Set<(step: number, bpm: number) => void> = new Set();
  private onStateChangeCallbacks: Set<(isPlaying: boolean, trackIndex: number) => void> = new Set();

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initAudio() {
    if (this.audioCtx) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioContextClass();
    
    // Analyser Node for visualizer
    this.analyserNode = this.audioCtx.createAnalyser();
    this.analyserNode.fftSize = 256;
    
    // Master volume control
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = this.volume;

    // Echo Delay effect for melodies
    this.delayNode = this.audioCtx.createDelay(1.0);
    this.delayNode.delayTime.value = 0.28; // dotted-eighth feel
    
    const delayFeedback = this.audioCtx.createGain();
    delayFeedback.gain.value = 0.35; // feedback level

    // Build the feedback loop
    this.delayNode.connect(delayFeedback);
    delayFeedback.connect(this.delayNode);

    // Route delay and master together
    this.delayNode.connect(this.masterGain);
    this.masterGain.connect(this.analyserNode);
    this.analyserNode.connect(this.audioCtx.destination);

    // Build static white noise buffer for crisp hi-hats
    const bufferSize = this.audioCtx.sampleRate * 0.04; // 40ms snip of noise
    this.noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  public async start() {
    this.initAudio();
    if (!this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    if (this.isPlaying) return;

    this.isPlaying = true;
    this.nextNoteTime = this.audioCtx.currentTime + 0.05;
    this.currentStep = 0;
    
    // Start timing scheduler loop
    this.schedulerTimerId = window.setInterval(() => {
      this.schedulerLoop();
    }, this.lookahead);

    this.notifyState();
  }

  public pause() {
    this.isPlaying = false;
    if (this.schedulerTimerId) {
      clearInterval(this.schedulerTimerId);
      this.schedulerTimerId = null;
    }
    this.notifyState();
  }

  public togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.start().catch((err) => console.error('Audio start error:', err));
    }
  }

  public nextTrack() {
    this.activeTrackIndex = (this.activeTrackIndex + 1) % TRACKS.length;
    this.currentStep = 0;
    if (this.audioCtx) {
      this.nextNoteTime = this.audioCtx.currentTime + 0.05;
    }
    this.notifyState();
  }

  public prevTrack() {
    this.activeTrackIndex = (this.activeTrackIndex - 1 + TRACKS.length) % TRACKS.length;
    this.currentStep = 0;
    if (this.audioCtx) {
      this.nextNoteTime = this.audioCtx.currentTime + 0.05;
    }
    this.notifyState();
  }

  public setTrackIndex(index: number) {
    if (index >= 0 && index < TRACKS.length) {
      this.activeTrackIndex = index;
      this.currentStep = 0;
      if (this.audioCtx) {
        this.nextNoteTime = this.audioCtx.currentTime + 0.05;
      }
      this.notifyState();
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain) {
      // Smooth volume transitions
      this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx?.currentTime || 0);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public getActiveTrack(): Track {
    return TRACKS[this.activeTrackIndex];
  }

  public getActiveTrackIndex(): number {
    return this.activeTrackIndex;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  // Sequencer scheduler logic
  private schedulerLoop() {
    if (!this.audioCtx) return;
    
    // While there are notes to play before the next interval
    while (this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.currentStep, this.nextNoteTime);
      this.advanceNote();
    }
  }

  private advanceNote() {
    if (!this.audioCtx) return;
    const activeTrack = TRACKS[this.activeTrackIndex];
    // A step is a 16th note, so stepDuration is (60 / BPM) / 4
    this.stepDuration = 60.0 / activeTrack.bpm / 4.0;
    
    this.nextNoteTime += this.stepDuration;
    
    // Callbacks to React to pulse visuals on steps
    const stepPassed = this.currentStep;
    setTimeout(() => {
      this.onStepCallbacks.forEach((cb) => cb(stepPassed, activeTrack.bpm));
    }, 0);

    this.currentStep = (this.currentStep + 1) % 16;
  }

  private scheduleNote(step: number, time: number) {
    if (!this.audioCtx) return;
    const track = TRACKS[this.activeTrackIndex];
    const pattern = PATTERNS[track.id];

    if (!pattern) return;

    // 1. Kick Drum
    if (pattern.kick[step] === 1) {
      this.synthesizeKick(time, step % 4 === 0);
    }

    // 2. Hi-hat
    if (pattern.hat[step] === 1) {
      this.synthesizeHat(time, step % 2 !== 0);
    }

    // 3. Resonant sweeps on Bass notes
    const bassNote = pattern.bass[step];
    if (bassNote > 0) {
      this.synthesizeBass(time, bassNote, this.stepDuration * 0.85);
    }

    // 4. Melodic Arps routed through delay
    const leadNote = pattern.lead[step];
    if (leadNote > 0 && step % 2 === 0) {
      this.synthesizeLead(time, leadNote, this.stepDuration * 1.5);
    }
  }

  // Synthesizers
  private synthesizeKick(time: number, isAccent: boolean) {
    if (!this.audioCtx || !this.masterGain) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.type = 'sine';
    
    // Punchy downward frequency sweep
    const startFreq = isAccent ? 160 : 130;
    const endFreq = 45;
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + 0.12);

    // Fast exponential volume decay
    const startGain = isAccent ? 1.1 : 0.8;
    gain.gain.setValueAtTime(startGain, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    osc.start(time);
    osc.stop(time + 0.15);
  }

  private synthesizeHat(time: number, isOffbeat: boolean) {
    if (!this.audioCtx || !this.masterGain || !this.noiseBuffer) return;

    // Use noise buffer for realistic analog hats
    const source = this.audioCtx.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(8000, time);

    const gain = this.audioCtx.createGain();

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    // Fast decay
    const volume = isOffbeat ? 0.18 : 0.08;
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    source.start(time);
    source.stop(time + 0.05);
  }

  private synthesizeBass(time: number, midiNote: number, duration: number) {
    if (!this.audioCtx || !this.masterGain) return;

    const osc1 = this.audioCtx.createOscillator();
    const osc2 = this.audioCtx.createOscillator();
    const filter = this.audioCtx.createBiquadFilter();
    const gain = this.audioCtx.createGain();

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    const freq = this.midiToFreq(midiNote);
    
    // Detuned sawtooth oscillators for thick analog style
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 0.995, time); // slight detune

    // Biquad filter lowpass sweep (classic acid/synthwave bass)
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, time);
    filter.frequency.exponentialRampToValueAtTime(220, time + duration);
    filter.Q.setValueAtTime(3, time);

    // Envelope
    gain.gain.setValueAtTime(0.24, time);
    gain.gain.linearRampToValueAtTime(0.18, time + duration * 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration);
    osc2.stop(time + duration);
  }

  private synthesizeLead(time: number, midiNote: number, duration: number) {
    if (!this.audioCtx || !this.delayNode) return;

    const osc = this.audioCtx.createOscillator();
    const filter = this.audioCtx.createBiquadFilter();
    const gain = this.audioCtx.createGain();

    osc.connect(filter);
    filter.connect(gain);
    // Connect lead melodies to BOTH direct master and the delay line for spacious stereo width
    gain.connect(this.masterGain!);
    gain.connect(this.delayNode);

    const freq = this.midiToFreq(midiNote);
    osc.type = 'triangle'; // Warm, vintage lead
    osc.frequency.setValueAtTime(freq, time);

    // Dynamic vibrato (frequency modulation)
    const vibrato = this.audioCtx.createOscillator();
    const vibratoGain = this.audioCtx.createGain();
    vibrato.frequency.value = 6; // 6Hz vibrato
    vibratoGain.gain.value = freq * 0.008; // intensity
    
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    vibrato.start(time);
    vibrato.stop(time + duration);

    // Warm high-cut filter
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2500, time);
    filter.frequency.linearRampToValueAtTime(1500, time + duration);

    // Envelope with slow attack
    gain.gain.setValueAtTime(0.0, time);
    gain.gain.linearRampToValueAtTime(0.14, time + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.start(time);
    osc.stop(time + duration);
  }

  // Retro sound effects (play instantly on demand)
  public playSfx(type: 'eat' | 'crash' | 'click' | 'highscore') {
    this.initAudio();
    if (!this.audioCtx || this.volume === 0) return;

    // Resume context if suspended
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const now = this.audioCtx.currentTime;

    if (type === 'eat') {
      // Upward arpeggio chord (perfect bite chime)
      const notes = [64, 67, 71, 76]; // E5, G5, B5, E6
      notes.forEach((note, index) => {
        const time = now + index * 0.04;
        const osc = this.audioCtx!.createOscillator();
        const gain = this.audioCtx!.createGain();
        
        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(this.midiToFreq(note), time);

        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

        osc.start(time);
        osc.stop(time + 0.14);
      });
    } 
    else if (type === 'crash') {
      // Heavy sliding bass noise explosion
      const osc = this.audioCtx.createOscillator();
      const noise = this.audioCtx.createBufferSource();
      const filter = this.audioCtx.createBiquadFilter();
      const gain = this.audioCtx.createGain();

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      // Low frequency downward sweep
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.45);

      // Play crash noise buffer if available
      if (this.noiseBuffer) {
        noise.buffer = this.noiseBuffer;
        const noiseGain = this.audioCtx.createGain();
        const noiseFilter = this.audioCtx.createBiquadFilter();
        
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(400, now);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain!);

        noiseGain.gain.setValueAtTime(0.3, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        noise.start(now);
        noise.stop(now + 0.4);
      }

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + 0.45);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.start(now);
      osc.stop(now + 0.5);
    } 
    else if (type === 'click') {
      // Soft navigation click
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

      osc.start(now);
      osc.stop(now + 0.03);
    }
    else if (type === 'highscore') {
      // Victory fanfare
      const notes = [60, 64, 67, 72, 76, 79, 84]; // Ascending major chord
      notes.forEach((note, index) => {
        const time = now + index * 0.07;
        const osc = this.audioCtx!.createOscillator();
        const gain = this.audioCtx!.createGain();
        
        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(this.midiToFreq(note), time);

        gain.gain.setValueAtTime(0.12, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

        osc.start(time);
        osc.stop(time + 0.35);
      });
    }
  }

  // MIDI number helper
  private midiToFreq(note: number): number {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  // React Subscription Handlers
  public subscribeToStep(cb: (step: number, bpm: number) => void) {
    this.onStepCallbacks.add(cb);
    return () => this.onStepCallbacks.delete(cb);
  }

  public subscribeToStateChange(cb: (isPlaying: boolean, trackIndex: number) => void) {
    this.onStateChangeCallbacks.add(cb);
    cb(this.isPlaying, this.activeTrackIndex); // immediate trigger
    return () => this.onStateChangeCallbacks.delete(cb);
  }

  private notifyState() {
    this.onStateChangeCallbacks.forEach((cb) => cb(this.isPlaying, this.activeTrackIndex));
  }
}

// Single globally managed synthesis engine
export const synthEngine = new ProceduralSynthEngine();
