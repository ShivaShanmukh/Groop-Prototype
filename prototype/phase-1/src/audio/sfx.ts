/** Synthesised sound effects (Web Audio). No audio files. Starts after the first click. */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private siren: { osc: OscillatorNode; lfo: OscillatorNode; gain: GainNode } | null = null;
  private hum: { osc: OscillatorNode; gain: GainNode } | null = null;
  muted = false;

  start(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.setHum(true);
    } catch {
      this.ctx = null; // audio unavailable: play silently
    }
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0): void {
    const c = this.ctx;
    if (!c || !this.master) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slide) o.frequency.linearRampToValueAtTime(freq + slide, c.currentTime + dur);
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g).connect(this.master);
    o.start();
    o.stop(c.currentTime + dur);
  }

  private noise(dur: number, vol: number, freq: number): void {
    const c = this.ctx;
    if (!c || !this.master) return;
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = freq;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master);
    src.start();
  }

  step(loud: boolean): void {
    this.noise(0.07, loud ? 0.35 : 0.12, loud ? 900 : 500);
  }
  door(): void {
    this.noise(0.35, 0.15, 1800);
  }
  pickup(): void {
    this.tone(660, 0.12, "sine", 0.25);
    setTimeout(() => this.tone(990, 0.2, "sine", 0.25), 90);
  }
  beep(): void {
    this.tone(880, 0.08, "square", 0.08);
  }
  spotted(): void {
    this.tone(220, 0.35, "sawtooth", 0.18, 180);
  }
  clunk(): void {
    this.tone(70, 0.6, "square", 0.3, -40);
    this.noise(0.4, 0.3, 300);
  }
  end(won: boolean): void {
    const notes = won ? [523, 659, 784, 1046] : [392, 330, 262, 196];
    notes.forEach((n, i) => setTimeout(() => this.tone(n, 0.3, "triangle", 0.25), i * 160));
  }

  setHum(on: boolean): void {
    const c = this.ctx;
    if (!c || !this.master) return;
    if (on && !this.hum) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sawtooth";
      osc.frequency.value = 55;
      gain.gain.value = 0.025;
      osc.connect(gain).connect(this.master);
      osc.start();
      this.hum = { osc, gain };
    } else if (!on && this.hum) {
      this.hum.osc.stop();
      this.hum = null;
    }
  }

  setAlarm(on: boolean): void {
    const c = this.ctx;
    if (!c || !this.master) return;
    if (on && !this.siren) {
      const osc = c.createOscillator();
      const lfo = c.createOscillator();
      const lfoGain = c.createGain();
      const gain = c.createGain();
      osc.type = "square";
      osc.frequency.value = 700;
      lfo.frequency.value = 1.6;
      lfoGain.gain.value = 220;
      lfo.connect(lfoGain).connect(osc.frequency);
      gain.gain.value = 0.05;
      osc.connect(gain).connect(this.master);
      osc.start();
      lfo.start();
      this.siren = { osc, lfo, gain };
    } else if (!on && this.siren) {
      this.siren.osc.stop();
      this.siren.lfo.stop();
      this.siren = null;
    }
  }

  stopAll(): void {
    this.setAlarm(false);
  }
}
