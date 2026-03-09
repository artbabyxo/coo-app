// COO Audio Engine
// Evidence-based sound foundation:
// - Pink noise (Calm, Sleep, Immune Support) — strongest adult calming evidence
// - Brown noise (Big Feelings) — deepest, most enveloping
// - White noise (Teething) — most researched for infants, womb-like
// - Heartbeat (Bonding, Sleep Wind-Down) — maternal heartbeat ~68 bpm, neural entrainment research
// - Binaural drone (all playlists) — sustained carrier tone + binaural beat tuned to each playlist's intention
//   Binaural beats require headphones for full effect; still pleasant as dual-tone drone without them

let audioCtx = null;
let masterGain = null;
let activeNodes = [];
let schedulerInterval = null;
let nextBeatTime = 0;

// Live gain node refs — updated by setLayerGain()
let noiseGainNode = null;
let droneGainNode = null;
let hbGainNode = null;
let melodyGainNode = null;
let solfeggioGainNode = null;

// --- iOS mute switch bypass ---
// A looping silent HTML audio element forces iOS into media playback mode,
// which bypasses the hardware mute/silent switch. Completely inaudible.
let silentAudio = null;

function getSilentAudio() {
  if (silentAudio) return silentAudio;
  // Minimal valid WAV: 1 sample of silence, 44100 Hz, 16-bit mono
  const wav = new Uint8Array([
    0x52,0x49,0x46,0x46,0x26,0x00,0x00,0x00,0x57,0x41,0x56,0x45,
    0x66,0x6d,0x74,0x20,0x10,0x00,0x00,0x00,0x01,0x00,0x01,0x00,
    0x44,0xac,0x00,0x00,0x88,0x58,0x01,0x00,0x02,0x00,0x10,0x00,
    0x64,0x61,0x74,0x61,0x02,0x00,0x00,0x00,0x00,0x00,
  ]);
  const blob = new Blob([wav], { type: 'audio/wav' });
  silentAudio = new Audio(URL.createObjectURL(blob));
  silentAudio.loop = true;
  return silentAudio;
}

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
    // Frequencies raised to 120→90 Hz (from 70→48) for phone speaker audibility
    const lubEnv = ctx.createGain();
    lubEnv.gain.setValueAtTime(0, time);
    lubEnv.gain.linearRampToValueAtTime(0.65, time + 0.015);
    lubEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    const lubOsc = ctx.createOscillator();
    lubOsc.type = 'sine';
    lubOsc.frequency.setValueAtTime(120, time);
    lubOsc.frequency.exponentialRampToValueAtTime(90, time + 0.15);
    lubOsc.connect(lubEnv);
    lubEnv.connect(targetGain);
    lubOsc.start(time);
    lubOsc.stop(time + 0.18);

    // DUB — softer, slightly higher, ~240ms after lub
    // Frequencies raised to 100→78 Hz (from 60→42) for phone speaker audibility
    const dubTime = time + 0.26;
    const dubEnv = ctx.createGain();
    dubEnv.gain.setValueAtTime(0, dubTime);
    dubEnv.gain.linearRampToValueAtTime(0.40, dubTime + 0.015);
    dubEnv.gain.exponentialRampToValueAtTime(0.001, dubTime + 0.12);
    const dubOsc = ctx.createOscillator();
    dubOsc.type = 'sine';
    dubOsc.frequency.setValueAtTime(100, dubTime);
    dubOsc.frequency.exponentialRampToValueAtTime(78, dubTime + 0.12);
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

// --- Binaural drone generator ---
// carrier: base frequency (Hz) — low sine tone, same both ears
// beat: binaural beat frequency (Hz) — left ear gets carrier, right gets carrier+beat
// Volume kept very low (0.07) so it sits beneath noise, felt more than heard

function startBinauralDrone(ctx, carrier, beat, targetGain) {
  const merger = ctx.createChannelMerger(2);
  merger.connect(targetGain);

  // Left ear — carrier frequency
  const leftOsc = ctx.createOscillator();
  leftOsc.type = 'sine';
  leftOsc.frequency.value = carrier;
  const leftGain = ctx.createGain();
  leftGain.gain.value = 1;
  leftOsc.connect(leftGain);
  leftGain.connect(merger, 0, 0);
  leftOsc.start();

  // Right ear — carrier + beat frequency
  const rightOsc = ctx.createOscillator();
  rightOsc.type = 'sine';
  rightOsc.frequency.value = carrier + beat;
  const rightGain = ctx.createGain();
  rightGain.gain.value = 1;
  rightOsc.connect(rightGain);
  rightGain.connect(merger, 0, 1);
  rightOsc.start();

  return [leftOsc, rightOsc];
}

// --- Playlist → sound config ---

// Drone config per playlist:
//   carrier — low tone that grounds the mix (Hz)
//   beat    — binaural frequency difference (Hz)
//             Alpha 8-12 Hz → relaxed alertness
//             Theta 4-8 Hz  → deep relaxation / meditative
//             Delta 0.5-4 Hz → deep sleep / restoration

export const PLAYLIST_SOUNDS = {
  'Calm & Settle':      { noise: 'pink',  heartbeat: false, drone: { carrier: 220, beat: 10 }, melody: '/audio/calm-and-settle.mp3', duration: 147, solfeggio: 528, label: 'Pink noise · Alpha drone · melody · 528 Hz' },
  'Big Feelings':       { noise: 'brown', heartbeat: false, drone: { carrier: 200, beat: 8  }, melody: '/audio/big-feelings.mp3', duration: 287, solfeggio: 396, label: 'Brown noise · Alpha drone · melody · 396 Hz' },
  'Teething & Comfort': { noise: 'white', heartbeat: false, drone: { carrier: 256, beat: 2  }, label: 'White noise · Delta drone' },
  'Sleep Wind-Down':    { noise: 'pink',  heartbeat: true,  drone: { carrier: 220, beat: 2  }, label: 'Pink noise · heartbeat · Delta drone' },
  'Immune Support':     { noise: 'pink',  heartbeat: false, drone: { carrier: 220, beat: 10 }, label: 'Pink noise · Alpha drone' },
  'Bonding':            { noise: 'pink',  heartbeat: true,  drone: { carrier: 200, beat: 6  }, label: 'Heartbeat · Theta drone' },
};

// --- Public API ---

export function startSession(playlistName, volume = 0.38) {
  stopSession(0);

  const config = PLAYLIST_SOUNDS[playlistName] || { noise: 'pink', heartbeat: false };

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // iOS unlock: silent Web Audio buffer transitions context suspended → running.
  // Silent HTML audio element bypasses the hardware mute/silent switch.
  // Both must be called synchronously within the user gesture.
  const silentBuf = audioCtx.createBuffer(1, 1, audioCtx.sampleRate);
  const silentSrc = audioCtx.createBufferSource();
  silentSrc.buffer = silentBuf;
  silentSrc.connect(audioCtx.destination);
  silentSrc.start(0);
  audioCtx.resume();
  getSilentAudio().play().catch(() => {});

  masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
  masterGain.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 2.5);
  masterGain.connect(audioCtx.destination);

  // Noise layer
  const noiseBuf =
    config.noise === 'white' ? makeWhiteBuffer(audioCtx) :
    config.noise === 'brown' ? makeBrownBuffer(audioCtx) :
    makePinkBuffer(audioCtx);

  noiseGainNode = audioCtx.createGain();
  noiseGainNode.gain.value = 0.20;

  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuf;
  noiseSource.loop = true;
  noiseSource.connect(noiseGainNode);
  noiseGainNode.connect(masterGain);
  noiseSource.start();
  activeNodes.push(noiseSource);

  // Heartbeat layer
  hbGainNode = null;
  if (config.heartbeat) {
    hbGainNode = audioCtx.createGain();
    hbGainNode.gain.value = 1.0;
    hbGainNode.connect(masterGain);
    schedulerInterval = scheduleHeartbeat(audioCtx, hbGainNode);
  }

  // Binaural drone layer
  droneGainNode = null;
  if (config.drone) {
    droneGainNode = audioCtx.createGain();
    droneGainNode.gain.value = 0.05;
    droneGainNode.connect(masterGain);
    const droneNodes = startBinauralDrone(audioCtx, config.drone.carrier, config.drone.beat, droneGainNode);
    activeNodes.push(...droneNodes);
  }

  // Melody overlay layer (async — loads MP3 and plays once over the top)
  melodyGainNode = null;
  if (config.melody) {
    const capturedCtx = audioCtx;
    melodyGainNode = audioCtx.createGain();
    melodyGainNode.gain.value = 0.50;
    melodyGainNode.connect(masterGain);
    fetch(config.melody)
      .then(r => r.arrayBuffer())
      .then(buf => capturedCtx.decodeAudioData(buf))
      .then(decoded => {
        if (!audioCtx || audioCtx !== capturedCtx) return; // session stopped before melody loaded
        const melodySource = capturedCtx.createBufferSource();
        melodySource.buffer = decoded;
        melodySource.loop = false;
        melodySource.connect(melodyGainNode);
        melodySource.start();
        activeNodes.push(melodySource);
      })
      .catch(() => {}); // silently skip melody if load fails
  }

  // Solfeggio tone layer — pure sine at the target Hz, very soft, sustained
  solfeggioGainNode = null;
  if (config.solfeggio) {
    solfeggioGainNode = audioCtx.createGain();
    solfeggioGainNode.gain.value = 0.04;
    solfeggioGainNode.connect(masterGain);
    const solfeggioOsc = audioCtx.createOscillator();
    solfeggioOsc.type = 'sine';
    solfeggioOsc.frequency.value = config.solfeggio;
    solfeggioOsc.connect(solfeggioGainNode);
    solfeggioOsc.start();
    activeNodes.push(solfeggioOsc);
  }
}

export function stopSession(fadeDuration = 2) {
  silentAudio?.pause();
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
  if (!audioCtx || !masterGain) return;

  // Snapshot and clear state immediately so a new session starting right after
  // this call doesn't have its nodes caught by the delayed cleanup timeout.
  const nodesToStop = [...activeNodes];
  activeNodes = [];
  noiseGainNode = null;
  droneGainNode = null;
  hbGainNode = null;
  melodyGainNode = null;
  solfeggioGainNode = null;

  const now = audioCtx.currentTime;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setValueAtTime(masterGain.gain.value, now);
  masterGain.gain.linearRampToValueAtTime(0, now + fadeDuration);

  const ctx = audioCtx;
  audioCtx = null;
  masterGain = null;

  setTimeout(() => {
    nodesToStop.forEach(n => { try { n.stop(); } catch {} });
    try { ctx.close(); } catch {}
  }, (fadeDuration + 0.2) * 1000);
}

export function getPlaylistLabel(name) {
  return PLAYLIST_SOUNDS[name]?.label || 'Pink noise';
}

export function resumeContext() {
  if (audioCtx?.state === 'suspended') audioCtx.resume();
}

// layer: 'noise' | 'drone' | 'heartbeat'
// value: 0.0 – 1.0
export function setLayerGain(layer, value) {
  if (layer === 'noise' && noiseGainNode) noiseGainNode.gain.value = value;
  if (layer === 'drone' && droneGainNode) droneGainNode.gain.value = value;
  if (layer === 'heartbeat' && hbGainNode) hbGainNode.gain.value = value;
  if (layer === 'melody' && melodyGainNode) melodyGainNode.gain.value = value;
  if (layer === 'solfeggio' && solfeggioGainNode) solfeggioGainNode.gain.value = value;
}
