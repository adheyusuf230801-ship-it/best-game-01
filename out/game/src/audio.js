// All of Bloomkeeper's sound is synthesised with WebAudio: no audio files, no
// network. Short oscillator blips for the actions, and a slow pentatonic
// arpeggio that drifts under play. The context is only created on unlock()
// (a real user gesture); every method is a safe no-op before that, and on
// browsers without WebAudio.

const SCALE = [0, 2, 4, 7, 9]; // pentatonic steps over A
const BASE_HZ = 220;

function noteHz(step) {
  const octave = Math.floor(step / SCALE.length);
  const degree = SCALE[((step % SCALE.length) + SCALE.length) % SCALE.length];
  return BASE_HZ * Math.pow(2, octave) * Math.pow(2, degree / 12);
}

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicTimer = null;
  let musicStep = 0;
  let muted = false;

  function unlock() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
    }
  }

  function blip({ hz = 440, end = null, seconds = 0.12, type = 'sine', gain = 0.2, when = 0 }) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(hz, t0);
    if (end !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(30, end), t0 + seconds);
    amp.gain.setValueAtTime(0, t0);
    amp.gain.linearRampToValueAtTime(gain, t0 + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(amp).connect(master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  function musicTick() {
    if (!ctx || muted) return;
    // A gentle pattern: mostly the low pentatonic, now and then a high sparkle.
    const pattern = [0, 2, 4, 3, 1, 4, 2, 5, 0, 3, 4, 2, 1, 3, 2, 4];
    const step = pattern[musicStep % pattern.length];
    musicStep += 1;
    blip({ hz: noteHz(step), seconds: 0.5, type: 'triangle', gain: 0.05 });
    if (musicStep % 4 === 1) blip({ hz: noteHz(step + 5), seconds: 0.7, type: 'sine', gain: 0.03 });
  }

  return {
    unlock,
    shoot() {
      blip({ hz: 880, end: 320, seconds: 0.09, type: 'square', gain: 0.05 });
    },
    mothDown() {
      blip({ hz: 340, end: 70, seconds: 0.22, type: 'sawtooth', gain: 0.1 });
      blip({ hz: 1200, end: 1800, seconds: 0.1, type: 'sine', gain: 0.05, when: 0.02 });
    },
    pickup(combo) {
      const lift = Math.min(combo, 8) * 40;
      blip({ hz: 660 + lift, end: 990 + lift, seconds: 0.1, type: 'sine', gain: 0.09 });
    },
    bloom() {
      blip({ hz: 523, seconds: 0.3, type: 'triangle', gain: 0.1 });
      blip({ hz: 659, seconds: 0.3, type: 'triangle', gain: 0.1, when: 0.09 });
      blip({ hz: 784, seconds: 0.42, type: 'triangle', gain: 0.1, when: 0.18 });
    },
    keeperHit() {
      blip({ hz: 200, end: 55, seconds: 0.3, type: 'sawtooth', gain: 0.16 });
    },
    dash() {
      blip({ hz: 300, end: 900, seconds: 0.14, type: 'sine', gain: 0.06 });
    },
    waveClear() {
      blip({ hz: 587, seconds: 0.22, type: 'triangle', gain: 0.1 });
      blip({ hz: 880, seconds: 0.34, type: 'triangle', gain: 0.1, when: 0.11 });
    },
    win() {
      [523, 659, 784, 1047].forEach((hz, i) => blip({ hz, seconds: 0.4, type: 'triangle', gain: 0.11, when: i * 0.13 }));
    },
    lose() {
      [392, 330, 262, 196].forEach((hz, i) => blip({ hz, seconds: 0.4, type: 'triangle', gain: 0.11, when: i * 0.15 }));
    },
    startMusic() {
      if (!ctx || musicTimer !== null) return;
      musicTimer = window.setInterval(musicTick, 430);
    },
    stopMusic() {
      if (musicTimer !== null) {
        window.clearInterval(musicTimer);
        musicTimer = null;
      }
    },
    toggleMuted() {
      muted = !muted;
      if (master && ctx) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() {
      return muted;
    },
  };
}
