import { Capacitor } from '@capacitor/core';
import { NativeAudio } from '@capacitor-community/native-audio';

const IS_NATIVE = Capacitor.isNativePlatform();
const MASTER_SCALE = 0.38;

export const PLAYLIST_SOUNDS = {
  'Calm & Settle': {
    noise: 'pink', noiseGain: 0.06,
    drone: '/audio/drone-calm.wav', droneGain: 0.07,
    solfeggio: '/audio/solfeggio-528.wav', solfeggioGain: 0.015,
    melody: '/audio/calmsettle.mp3', melodyGain: 0.70,
    label: 'Pink noise · Alpha drone · 528 Hz · melody',
  },
  'Big Feelings': {
    noise: 'brown', noiseGain: 0.10,
    drone: '/audio/drone-bigfeelings.wav', droneGain: 0.05,
    solfeggio: '/audio/solfeggio-396.wav', solfeggioGain: 0.02,
    melody: '/audio/bigfeelings.mp3', melodyGain: 0.70,
    label: 'Brown noise · Alpha drone · 396 Hz · melody',
  },
  'Teething & Comfort': {
    noise: 'white', noiseGain: 0.02,
    drone: '/audio/drone-teething.wav', droneGain: 0.05,
    solfeggio: '/audio/solfeggio-174.wav', solfeggioGain: 0.02,
    melody: '/audio/teething.mp3', melodyGain: 0.70,
    label: 'White noise · Delta drone · 174 Hz · melody',
  },
  'Sleep Wind-Down': {
    noise: 'pink', noiseGain: 0.07,
    drone: '/audio/drone-sleep.wav', droneGain: 0.05,
    heartbeat: '/audio/heartbeat.wav', heartbeatGain: 0.64,
    solfeggio: '/audio/solfeggio-285.wav', solfeggioGain: 0.02,
    melody: '/audio/sleep.mp3', melodyGain: 0.70,
    label: 'Pink noise · heartbeat · Delta drone · 285 Hz · melody',
  },
  'Immune Support': {
    noise: 'pink', noiseGain: 0.06,
    drone: '/audio/drone-calm.wav', droneGain: 0.07,
    solfeggio: '/audio/solfeggio-741.wav', solfeggioGain: 0.02,
    melody: '/audio/immune.mp3', melodyGain: 0.70,
    label: 'Pink noise · Alpha drone · 741 Hz · melody',
  },
  'Bonding': {
    noise: 'pink', noiseGain: 0.06,
    drone: '/audio/drone-bonding.wav', droneGain: 0.05,
    heartbeat: '/audio/heartbeat.wav', heartbeatGain: 0.64,
    solfeggio: '/audio/solfeggio-639.wav', solfeggioGain: 0.03,
    melody: '/audio/bonding.mp3', melodyGain: 0.70,
    label: 'Heartbeat · Theta drone · 639 Hz · melody',
  },
};

// ─── NATIVE PATH ──────────────────────────────────────────────────────────────

const LAYER_IDS = {
  noise:     'coo-noise',
  drone:     'coo-drone',
  solfeggio: 'coo-solfeggio',
  heartbeat: 'coo-heartbeat',
  melody:    'coo-melody',
};

// /audio/file.wav → public/audio/file.wav (Capacitor bundle path)
function toBundlePath(src) {
  return `public${src.startsWith('/') ? src : '/' + src}`;
}

let nativeSessionId = 0;
let nativeActiveIds = new Set();
let nativeCurrentVols = {};
let nativeFadeTimers = {};
let nativeMelodyListener = null;

async function nativeUnloadAll() {
  const ids = [...nativeActiveIds];
  nativeActiveIds.clear();
  nativeCurrentVols = {};
  Object.values(nativeFadeTimers).forEach(t => clearInterval(t));
  nativeFadeTimers = {};
  for (const assetId of ids) {
    await NativeAudio.stop({ assetId }).catch(() => {});
    await NativeAudio.unload({ assetId }).catch(() => {});
  }
}

function nativeFade(assetId, toVol, durationMs, onDone) {
  if (nativeFadeTimers[assetId]) clearInterval(nativeFadeTimers[assetId]);
  const from = nativeCurrentVols[assetId] ?? 0;
  const steps = Math.max(1, Math.round(durationMs / 80));
  const intervalMs = durationMs / steps;
  let step = 0;
  nativeFadeTimers[assetId] = setInterval(() => {
    step++;
    const vol = Math.min(1, Math.max(0, from + (toVol - from) * (step / steps)));
    NativeAudio.setVolume({ assetId, volume: vol }).catch(() => {});
    nativeCurrentVols[assetId] = vol;
    if (step >= steps) {
      clearInterval(nativeFadeTimers[assetId]);
      delete nativeFadeTimers[assetId];
      if (onDone) onDone();
    }
  }, intervalMs);
}

async function nativeLoad(assetId, src, targetVol, loop) {
  try {
    await NativeAudio.preload({
      assetId,
      assetPath: toBundlePath(src),
      volume: 0,
      audioChannelNum: 1,
      isLooping: loop,
    });
    nativeActiveIds.add(assetId);
    nativeCurrentVols[assetId] = 0;
    await NativeAudio.play({ assetId });
    nativeFade(assetId, targetVol, 2500);
  } catch (e) {
    console.warn(`[NativeAudio] load failed: ${assetId}`, e);
  }
}

async function nativeStart(playlistName, onMelodyEnd, loopMelody) {
  const thisId = ++nativeSessionId;

  if (nativeMelodyListener) {
    nativeMelodyListener.remove();
    nativeMelodyListener = null;
  }

  await nativeUnloadAll();

  const config = PLAYLIST_SOUNDS[playlistName] || {};

  if (!loopMelody && onMelodyEnd) {
    NativeAudio.addListener('complete', ({ assetId }) => {
      if (assetId === LAYER_IDS.melody && nativeSessionId === thisId) {
        onMelodyEnd(3);
      }
    }).then(l => { nativeMelodyListener = l; });
  }

  const noiseType = config.noise || 'pink';
  await nativeLoad(
    LAYER_IDS.noise,
    `/audio/${noiseType}-noise.wav`,
    Math.min(1, (config.noiseGain ?? 0.10) * MASTER_SCALE),
    true,
  );

  if (config.drone) {
    await nativeLoad(
      LAYER_IDS.drone,
      config.drone,
      Math.min(1, (config.droneGain ?? 0.05) * MASTER_SCALE),
      true,
    );
  }

  if (config.solfeggio) {
    await nativeLoad(
      LAYER_IDS.solfeggio,
      config.solfeggio,
      Math.min(1, (config.solfeggioGain ?? 0.02) * MASTER_SCALE),
      true,
    );
  }

  if (config.heartbeat) {
    await nativeLoad(
      LAYER_IDS.heartbeat,
      config.heartbeat,
      Math.min(1, (config.heartbeatGain ?? 0.64) * MASTER_SCALE),
      true,
    );
  }

  if (config.melody) {
    await nativeLoad(
      LAYER_IDS.melody,
      config.melody,
      Math.min(1, (config.melodyGain ?? 0.70) * MASTER_SCALE),
      loopMelody,
    );
  }
}

async function nativeStop(fadeDuration = 2) {
  const ids = [...nativeActiveIds];

  if (fadeDuration <= 0) {
    await nativeUnloadAll();
    return;
  }

  // Fade out all active layers, then unload
  let pending = ids.length;
  if (pending === 0) return;

  const done = async () => {
    pending--;
    if (pending === 0) {
      for (const assetId of ids) {
        await NativeAudio.stop({ assetId }).catch(() => {});
        await NativeAudio.unload({ assetId }).catch(() => {});
      }
      nativeActiveIds.clear();
      nativeCurrentVols = {};
    }
  };

  ids.forEach(assetId => {
    nativeFade(assetId, 0, fadeDuration * 1000, done);
  });
}

function nativeSetLayerGain(layer, value) {
  const assetId = LAYER_IDS[layer];
  if (!assetId || !nativeActiveIds.has(assetId)) return;
  const vol = Math.min(1, value * MASTER_SCALE);
  if (nativeFadeTimers[assetId]) clearInterval(nativeFadeTimers[assetId]);
  NativeAudio.setVolume({ assetId, volume: vol }).catch(() => {});
  nativeCurrentVols[assetId] = vol;
}

// ─── WEB PATH ─────────────────────────────────────────────────────────────────

let audioCtx = null;
let silentAudio = null;
let keepAliveStarted = false;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  if (!keepAliveStarted && audioCtx.state !== 'closed') {
    keepAliveStarted = true;
    const buf = audioCtx.createBuffer(1, Math.ceil(audioCtx.sampleRate * 0.5), audioCtx.sampleRate);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(audioCtx.destination);
    src.start();
  }
  return audioCtx;
}

window.__cooKeepAudioAlive = () => {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
};

function getSilentAudio() {
  if (!silentAudio) {
    silentAudio = new Audio('/audio/silent.mp3');
    silentAudio.loop = true;
  }
  return silentAudio;
}

const noiseCache = {};
function getNoiseEntry(type) {
  if (!noiseCache[type]) {
    const ctx = getAudioCtx();
    const el = new Audio(`/audio/${type}-noise.wav`);
    el.loop = true;
    const srcNode = ctx.createMediaElementSource(el);
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0;
    srcNode.connect(gainNode);
    gainNode.connect(ctx.destination);
    noiseCache[type] = { el, gainNode };
  }
  return noiseCache[type];
}

let webSessionId  = 0;
let allEntries    = [];
let noiseEntry    = null;
let droneEntry    = null;
let solfeggioEntry = null;
let heartbeatEntry = null;
let melodyEntry   = null;

function webMakeEntry(src, gain, loop = true) {
  const ctx = getAudioCtx();
  const el = new Audio(src);
  el.loop = loop;
  const srcNode = ctx.createMediaElementSource(el);
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0;
  srcNode.connect(gainNode);
  gainNode.connect(ctx.destination);
  return { el, gainNode, target: Math.min(1, gain * MASTER_SCALE) };
}

function webStart(playlistName, onMelodyEnd, loopMelody) {
  webStop(0);

  const config = PLAYLIST_SOUNDS[playlistName] || {};
  const thisId = ++webSessionId;
  const ctx = getAudioCtx();

  getSilentAudio().play().catch(() => {});

  allEntries = [];

  function addEntry(src, gain, loop = true) {
    const entry = webMakeEntry(src, gain, loop);
    allEntries.push(entry);
    entry.el.play().catch(() => {});
    return entry;
  }

  noiseEntry = getNoiseEntry(config.noise || 'pink');
  noiseEntry.el.currentTime = 0;
  const noiseTarget = Math.min(1, (config.noiseGain ?? 0.10) * MASTER_SCALE);
  allEntries.push({ el: noiseEntry.el, gainNode: noiseEntry.gainNode, target: noiseTarget });
  noiseEntry.el.play().catch(() => {});

  droneEntry     = config.drone     ? addEntry(config.drone,     config.droneGain     ?? 0.05)        : null;
  solfeggioEntry = config.solfeggio ? addEntry(config.solfeggio, config.solfeggioGain ?? 0.02)        : null;
  heartbeatEntry = config.heartbeat ? addEntry(config.heartbeat, config.heartbeatGain ?? 0.64)        : null;
  melodyEntry    = config.melody    ? addEntry(config.melody,    config.melodyGain    ?? 0.70, loopMelody) : null;

  if (melodyEntry && !loopMelody && onMelodyEnd) {
    melodyEntry.el.onended = () => { if (webSessionId === thisId) onMelodyEnd(3); };
  }

  const now = ctx.currentTime;
  allEntries.forEach(({ gainNode, target }) => {
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(target, now + 2.5);
  });
}

function webStop(fadeDuration = 2) {
  const entries = [...allEntries];
  allEntries = [];
  noiseEntry = droneEntry = solfeggioEntry = heartbeatEntry = melodyEntry = null;

  if (entries.length === 0) return;

  if (!audioCtx || fadeDuration <= 0) {
    entries.forEach(({ el, gainNode }) => {
      if (gainNode) { gainNode.gain.cancelScheduledValues(0); gainNode.gain.value = 0; }
      el.pause();
      el.currentTime = 0;
    });
    return;
  }

  const now = audioCtx.currentTime;
  entries.forEach(({ el, gainNode }) => {
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(0, now + fadeDuration);
  });
  setTimeout(() => {
    entries.forEach(({ el }) => { el.pause(); el.currentTime = 0; });
  }, (fadeDuration + 0.1) * 1000);
}

function webSetLayerGain(layer, value) {
  if (!audioCtx) return;
  const vol = Math.min(1, value * MASTER_SCALE);
  const map = { noise: noiseEntry, drone: droneEntry, solfeggio: solfeggioEntry, heartbeat: heartbeatEntry, melody: melodyEntry };
  const entry = map[layer];
  if (!entry?.gainNode) return;
  const now = audioCtx.currentTime;
  entry.gainNode.gain.cancelScheduledValues(now);
  entry.gainNode.gain.setValueAtTime(vol, now);
  const allEntry = allEntries.find(e => e.gainNode === entry.gainNode);
  if (allEntry) allEntry.target = vol;
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

export function startSession(playlistName, _volume = 0.38, onMelodyEnd, loopMelody = false) {
  if (IS_NATIVE) {
    nativeStart(playlistName, onMelodyEnd, loopMelody);
    return;
  }
  webStart(playlistName, onMelodyEnd, loopMelody);
}

export function stopSession(fadeDuration = 2) {
  if (IS_NATIVE) {
    nativeStop(fadeDuration);
    return;
  }
  webStop(fadeDuration);
}

export function setLayerGain(layer, value) {
  if (IS_NATIVE) {
    nativeSetLayerGain(layer, value);
    return;
  }
  webSetLayerGain(layer, value);
}

export function resumeContext() {
  if (IS_NATIVE) return; // native audio handles background on its own
  if (audioCtx?.state === 'suspended') audioCtx.resume();
  getSilentAudio().play().catch(() => {});
}

export function getPlaylistLabel(name) {
  return PLAYLIST_SOUNDS[name]?.label || 'Pink noise · melody';
}
