// COO Audio Engine
// Evidence-based sound foundation:
// - Pink noise (Calm, Sleep, Immune Support) — strongest adult calming evidence
// - Brown noise (Big Feelings) — deepest, most enveloping
// - White noise (Teething) — most researched for infants, womb-like
// - Heartbeat (Bonding, Sleep Wind-Down) — maternal heartbeat ~68 bpm, neural entrainment research

let audioCtx = null;
let masterGain = null;
let activeNodes = [];
let schedulerInterval = null;
let nextBeatTime = 0;

// --- Noise buffer generators ---

function makeWhiteBuffer(ctx) {
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buf.getChannelData(c);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }
  return buf;
}

function makePinkBuffer(ctx) {
  // Paul Kellet's IIR filter approximation — -3dB/octave spectral rolloff
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buf.getChannelData(c);
    let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886*b0 + w*0.0555179;
      b1 = 0.99332*b1 + w*0.0750759;
      b2 = 0.96900*b2 + w*0.1538520;
      b3 = 0.86650*b3 + w*0.3104856;
      b4 = 0.55000*b4 + w*0.5329522;
      b5 = -0.7616*b5 - w*0.0168980;
      data[i] = (b0+b1+b2+b3+b4+b5+b6 + w*0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  }
  return buf;
}

function makeBrownBuffer(ctx) {
  // Integrated white noise — heavily weighted toward low frequencies, warmest texture
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buf.getChannelData(c);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.5;
    }
  }
  return buf;
}

// --- Heartbeat scheduler ---
// Lub-dub pattern at ~68 bpm (resting maternal heart rate)
// Uses Web Audio clock for sample-accurate timing

function scheduleHeartbeat(ctx, targetGain) {
  const bpm = 68;
  const interval = 60 / bpm; // ~0.88s per beat
  nextBeatTime = ctx.currentTime + 0.6; // slight delay before first beat

  function schedulePulse(time) {
    // LUB — stronger, lower
    const lubEnv = ctx.createGain();
    lubEnv.gain.setValueAtTime(0, time);
    lubEnv.gain.linearRampToValueAtTime(0.38, time + 0.015);
    lubEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    const lubOsc = ctx.createOscillator();
    lubOsc.type = 'sine';
    lubOsc.frequency.setValueAtTime(70, time);
    lubOsc.frequency.exponentialRampToValueAtTime(48, time + 0.15);
    lubOsc.connect(lubEnv);
    lubEnv.connect(targetGain);
    lubOsc.start(time);
    lubOsc.stop(time + 0.18);

    // DUB — softer, slightly higher, ~240ms after lub
    const dubTime = time + 0.26;
    const dubEnv = ctx.createGain();
    dubEnv.gain.setValueAtTime(0, dubTime);
    dubEnv.gain.linearRampToValueAtTime(0.22, dubTime + 0.015);
    dubEnv.gain.exponentialRampToValueAtTime(0.001, dubTime + 0.12);
    const dubOsc = ctx.createOscillator();
    dubOsc.type = 'sine';
    dubOsc.frequency.setValueAtTime(60, dubTime);
    dubOsc.frequency.exponentialRampToValueAtTime(42, dubTime + 0.12);
    dubOsc.connect(dubEnv);
    dubEnv.connect(targetGain);
    dubOsc.start(dubTime);
    dubOsc.stop(dubTime + 0.14);
  }

  // Look-ahead scheduler — schedules beats 150ms ahead using setInterval
  return setInterval(() => {
    while (nextBeatTime < ctx.currentTime + 0.15) {
      schedulePulse(nextBeatTime);
      nextBeatTime += interval;
    }
  }, 25);
}

// --- Playlist → sound config ---

export const PLAYLIST_SOUNDS = {
  'Calm & Settle':      { noise: 'pink',  heartbeat: false, label: 'Pink noise' },
  'Big Feelings':       { noise: 'brown', heartbeat: false, label: 'Brown noise' },
  'Teething & Comfort': { noise: 'white', heartbeat: false, label: 'White noise' },
  'Sleep Wind-Down':    { noise: 'pink',  heartbeat: true,  label: 'Pink noise · heartbeat' },
  'Immune Support':     { noise: 'pink',  heartbeat: false, label: 'Pink noise' },
  'Bonding':            { noise: 'pink',  heartbeat: true,  label: 'Heartbeat · Pink noise' },
};

// --- Public API ---

export function startSession(playlistName, volume = 0.38) {
  stopSession(0);

  const config = PLAYLIST_SOUNDS[playlistName] || { noise: 'pink', heartbeat: false };

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
  masterGain.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 2.5);
  masterGain.connect(audioCtx.destination);

  // Noise layer
  const noiseBuf =
    config.noise === 'white' ? makeWhiteBuffer(audioCtx) :
    config.noise === 'brown' ? makeBrownBuffer(audioCtx) :
    makePinkBuffer(audioCtx);

  const noiseGain = audioCtx.createGain();
  noiseGain.gain.value = config.heartbeat ? 0.55 : 1.0;

  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuf;
  noiseSource.loop = true;
  noiseSource.connect(noiseGain);
  noiseGain.connect(masterGain);
  noiseSource.start();
  activeNodes.push(noiseSource);

  // Heartbeat layer
  if (config.heartbeat) {
    const hbGain = audioCtx.createGain();
    hbGain.gain.value = 0.85;
    hbGain.connect(masterGain);
    schedulerInterval = scheduleHeartbeat(audioCtx, hbGain);
  }
}

export function stopSession(fadeDuration = 2) {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
  if (!audioCtx || !masterGain) return;
  const now = audioCtx.currentTime;
  masterGain.gain.linearRampToValueAtTime(0, now + fadeDuration);
  const ctx = audioCtx;
  setTimeout(() => {
    activeNodes.forEach(n => { try { n.stop(); } catch {} });
    activeNodes = [];
    try { ctx.close(); } catch {}
    if (audioCtx === ctx) { audioCtx = null; masterGain = null; }
  }, (fadeDuration + 0.2) * 1000);
}

export function getPlaylistLabel(name) {
  return PLAYLIST_SOUNDS[name]?.label || 'Pink noise';
}

export function resumeContext() {
  if (audioCtx?.state === 'suspended') audioCtx.resume();
}
