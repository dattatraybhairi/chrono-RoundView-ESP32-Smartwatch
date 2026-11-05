/**
 * Speech Synthesis & Simulated ESP32 I2S Audio Chime Helper
 * Provides realistic audio feedback for object detection voice output and hardware chimes.
 */

class SmartwatchAudioEngine {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private voiceRate: number = 0.88;
  private onSpeakingChangeCallbacks: Set<(speaking: boolean) => void> = new Set();
  private currentlySpeaking: boolean = false;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.setSpeaking(false);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setRate(rate: number) {
    this.voiceRate = Math.max(0.6, Math.min(2.0, rate));
  }

  public getRate(): number {
    return this.voiceRate;
  }

  public onSpeakingChange(cb: (speaking: boolean) => void): () => void {
    this.onSpeakingChangeCallbacks.add(cb);
    return () => this.onSpeakingChangeCallbacks.delete(cb);
  }

  private setSpeaking(val: boolean) {
    this.currentlySpeaking = val;
    this.onSpeakingChangeCallbacks.forEach((cb) => cb(val));
  }

  public isSpeaking(): boolean {
    return this.currentlySpeaking;
  }

  /**
   * Plays a hardware audio alert tone mimicking ESP32 I2S DAC / Piezo Buzzer
   */
  public playAlertTone(type: 'SCAN_START' | 'DETECT_SUCCESS' | 'CLICK') {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'CLICK') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.03);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.045);
      } else if (type === 'SCAN_START') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.16);
      } else if (type === 'DETECT_SUCCESS') {
        // High-tech affirmative dual-tone chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.setValueAtTime(880, now + 0.08); // A5
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.setValueAtTime(0.09, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.26);
      }
    } catch {
      // AudioContext could fail on un-interacted policy
    }
  }

  /**
   * Speak out the identified object phrase using Web Speech API
   */
  public speak(text: string): Promise<void> {
    if (this.isMuted || typeof window === 'undefined' || !window.speechSynthesis) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      try {
        window.speechSynthesis.cancel();
        this.playAlertTone('DETECT_SUCCESS');

        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = this.voiceRate;
          utterance.pitch = 1.05;

          // Attempt to choose an articulate English voice if available
          const voices = window.speechSynthesis.getVoices();
          const preferredVoice = voices.find(
            (v) =>
              (v.lang.startsWith('en') && v.name.includes('Google') ||
                v.name.includes('Natural') ||
                v.name.includes('Samantha') ||
                v.name.includes('Daniel'))
          ) || voices.find((v) => v.lang.startsWith('en'));

          if (preferredVoice) {
            utterance.voice = preferredVoice;
          }

          utterance.onstart = () => {
            this.setSpeaking(true);
          };

          utterance.onend = () => {
            this.setSpeaking(false);
            resolve();
          };

          utterance.onerror = () => {
            this.setSpeaking(false);
            resolve();
          };

          window.speechSynthesis.speak(utterance);
        }, 150);
      } catch (err) {
        this.setSpeaking(false);
        resolve();
      }
    });
  }

  public stop() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.setSpeaking(false);
    }
  }

  // ==========================================================================
  // WEB-AUDIO 4-CHANNEL POLYPHONIC MUSIC PLAYER (Mirrors ESP32-S3 music_player.h)
  // ==========================================================================
  private musicTimer: number | null = null;
  private musicStepIdx: number = 0;
  private musicTrackIdx: number = 0;
  private musicVolumePct: number = 75;
  private musicEqPreset: string = 'BASS_BOOST';
  private customAudioUrl: string | undefined = undefined;
  private htmlAudioEl: HTMLAudioElement | null = null;
  private mediaSourceNode: MediaElementAudioSourceNode | null = null;
  private fileFilterNode: BiquadFilterNode | null = null;
  private fileGainNode: GainNode | null = null;

  private static readonly LEAD_NOTES: number[][] = [
    [62, 0, 65, 69, 67, 65, 62, 60, 62, 65, 69, 72, 74, 72, 69, 65],
    [69, 72, 76, 72, 67, 71, 74, 71, 65, 69, 72, 76, 64, 67, 71, 67],
    [72, 76, 79, 84, 79, 76, 72, 0, 74, 77, 81, 86, 84, 79, 76, 74],
    [64, 67, 71, 74, 76, 74, 71, 67, 60, 64, 67, 71, 62, 66, 69, 74],
    [65, 69, 72, 77, 76, 72, 69, 65, 67, 70, 74, 79, 77, 74, 72, 69],
  ];

  private static readonly BASS_NOTES: number[][] = [
    [38, 38, 50, 38, 41, 41, 53, 41, 43, 43, 55, 43, 36, 36, 48, 36],
    [45, 45, 45, 57, 43, 43, 43, 55, 41, 41, 41, 53, 40, 40, 52, 40],
    [36, 48, 43, 48, 38, 50, 45, 50, 40, 52, 47, 52, 43, 55, 50, 43],
    [40, 40, 52, 40, 40, 40, 52, 40, 36, 36, 48, 36, 38, 38, 50, 38],
    [41, 41, 53, 41, 45, 45, 57, 45, 38, 38, 50, 38, 36, 36, 48, 36],
  ];

  private static readonly TRACK_BPMS: number[] = [124, 126, 108, 132, 118, 96, 120];

  private midiToHz(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  public syncMusicState(
    playing: boolean,
    trackIndex: number,
    volumePct: number,
    eqPreset: string,
    customAudioUrl?: string
  ) {
    const trackChanged =
      this.musicTrackIdx !== trackIndex ||
      this.customAudioUrl !== customAudioUrl;
    this.musicTrackIdx = trackIndex;
    this.musicVolumePct = volumePct;
    this.musicEqPreset = eqPreset;
    this.customAudioUrl = customAudioUrl;

    // Update live HTMLAudioElement if playing a user-uploaded .MP3/.WAV file
    if (customAudioUrl && typeof window !== 'undefined') {
      if (this.musicTimer !== null) {
        window.clearInterval(this.musicTimer);
        this.musicTimer = null;
      }

      if (!this.htmlAudioEl) {
        this.htmlAudioEl = new Audio();
        this.htmlAudioEl.loop = true;
      }

      const ctx = this.getAudioContext();
      if (ctx && !this.mediaSourceNode) {
        try {
          this.mediaSourceNode = ctx.createMediaElementSource(this.htmlAudioEl);
          this.fileFilterNode = ctx.createBiquadFilter();
          this.fileGainNode = ctx.createGain();
          this.mediaSourceNode.connect(this.fileFilterNode);
          this.fileFilterNode.connect(this.fileGainNode);
          this.fileGainNode.connect(ctx.destination);
        } catch {
          // Fallback to direct HTMLAudioElement output
        }
      }

      if (this.fileFilterNode && ctx) {
        if (eqPreset === 'BASS_BOOST') {
          this.fileFilterNode.type = 'lowshelf';
          this.fileFilterNode.frequency.setValueAtTime(180, ctx.currentTime);
          this.fileFilterNode.gain.setValueAtTime(7, ctx.currentTime);
        } else if (eqPreset === 'WARM_LOFI') {
          this.fileFilterNode.type = 'lowpass';
          this.fileFilterNode.frequency.setValueAtTime(1600, ctx.currentTime);
        } else if (eqPreset === 'CHIPTUNE') {
          this.fileFilterNode.type = 'highpass';
          this.fileFilterNode.frequency.setValueAtTime(420, ctx.currentTime);
        } else {
          this.fileFilterNode.type = 'allpass';
        }
      }

      if (this.fileGainNode && ctx) {
        this.fileGainNode.gain.setValueAtTime(
          this.isMuted ? 0 : volumePct / 100,
          ctx.currentTime
        );
      } else if (this.htmlAudioEl) {
        this.htmlAudioEl.volume = this.isMuted ? 0 : volumePct / 100;
      }

      if (this.htmlAudioEl.src !== customAudioUrl) {
        this.htmlAudioEl.src = customAudioUrl;
      }

      if (playing && !this.isMuted) {
        this.htmlAudioEl.play().catch(() => {});
      } else {
        this.htmlAudioEl.pause();
      }
      return;
    }

    // Stop HTMLAudioElement if switched back to built-in track
    if (this.htmlAudioEl && !this.htmlAudioEl.paused) {
      this.htmlAudioEl.pause();
    }

    if (!playing || this.isMuted) {
      if (this.musicTimer !== null) {
        window.clearInterval(this.musicTimer);
        this.musicTimer = null;
      }
      return;
    }

    if (trackChanged && this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
      this.musicStepIdx = 0;
    }

    if (this.musicTimer === null && typeof window !== 'undefined') {
      const bpm =
        SmartwatchAudioEngine.TRACK_BPMS[
          this.musicTrackIdx % SmartwatchAudioEngine.TRACK_BPMS.length
        ] || 120;
      const stepMs = Math.round((60 / bpm / 4) * 1000);
      this.triggerMusicStep();
      this.musicTimer = window.setInterval(() => {
        this.triggerMusicStep();
      }, stepMs);
    }
  }

  private triggerMusicStep() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const pat = this.musicTrackIdx % 5;
      const step = this.musicStepIdx % 16;
      const barShift = Math.floor(this.musicStepIdx / 32) % 2 === 1 ? 2 : 0;
      this.musicStepIdx++;

      const vol = (this.musicVolumePct / 100) * 0.14;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(
        this.musicEqPreset === 'WARM_LOFI'
          ? 1400
          : this.musicEqPreset === 'CHIPTUNE'
          ? 4800
          : 2600,
        now
      );
      filter.connect(ctx.destination);

      // 1. Lead Synth Note
      const leadMidi = SmartwatchAudioEngine.LEAD_NOTES[pat][step];
      if (leadMidi > 0) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = this.musicEqPreset === 'CHIPTUNE' ? 'square' : 'sawtooth';
        osc.frequency.setValueAtTime(this.midiToHz(leadMidi + barShift), now);
        gain.gain.setValueAtTime(vol * 0.65, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.connect(gain);
        gain.connect(filter);
        osc.start(now);
        osc.stop(now + 0.15);
      }

      // 2. Sub-Bass Note
      const bassMidi = SmartwatchAudioEngine.BASS_NOTES[pat][step];
      if (bassMidi > 0) {
        const bOsc = ctx.createOscillator();
        const bGain = ctx.createGain();
        bOsc.type = 'triangle';
        bOsc.frequency.setValueAtTime(this.midiToHz(bassMidi + barShift), now);
        const bassBoost = this.musicEqPreset === 'BASS_BOOST' ? 1.35 : 0.95;
        bGain.gain.setValueAtTime(vol * bassBoost, now);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
        bOsc.connect(bGain);
        bGain.connect(filter);
        bOsc.start(now);
        bOsc.stop(now + 0.14);
      }

      // 3. Kick Drum on 0, 4, 8, 12
      if (step % 4 === 0) {
        const kOsc = ctx.createOscillator();
        const kGain = ctx.createGain();
        kOsc.type = 'sine';
        kOsc.frequency.setValueAtTime(135, now);
        kOsc.frequency.exponentialRampToValueAtTime(38, now + 0.09);
        kGain.gain.setValueAtTime(vol * 1.2, now);
        kGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        kOsc.connect(kGain);
        kGain.connect(ctx.destination);
        kOsc.start(now);
        kOsc.stop(now + 0.11);
      }
    } catch {
      // Ignore AudioContext policy errors prior to user gesture
    }
  }
}

export const watchAudio = new SmartwatchAudioEngine();
