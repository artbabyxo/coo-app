const FREQUENCIES = {
  calm: 432,
  comfort: 528,
  safety: 396,
  transition: 417,
  bonding: 639,
  clarity: 741,
};

const PLAYLIST_FREQS = {
  'Calm & Settle': [FREQUENCIES.calm, FREQUENCIES.safety],
  'Big Feelings': [FREQUENCIES.comfort, FREQUENCIES.transition],
  'Teething & Comfort': [FREQUENCIES.comfort, FREQUENCIES.calm],
  'Sleep Wind-Down': [FREQUENCIES.safety, FREQUENCIES.calm],
  'Immune Support': [FREQUENCIES.clarity, FREQUENCIES.comfort],
  'Bonding': [FREQUENCIES.bonding, FREQUENCIES.comfort],
};

let audioCtx = null;
let oscillators = [];
let gainNode = null;
let masterGain = null;

export function getPlaylistFreqs(name) {
  return PLAYLIST_FREQS[name] || [FREQUENCIES.calm];
}

export function startTone(freqs, volume = 0.15) {
  stopTone();

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
  masterGain.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 2);
  masterGain.connect(audioCtx.destination);

  freqs.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(i === 0 ? 1 : 0.4, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    oscillators.push(osc);
  });
}

export function stopTone(fadeDuration = 2) {
  if (!audioCtx || !masterGain) return;
  const now = audioCtx.currentTime;
  masterGain.gain.linearRampToValueAtTime(0, now + fadeDuration);
  setTimeout(() => {
    oscillators.forEach(o => { try { o.stop(); } catch {} });
    oscillators = [];
    if (audioCtx) { audioCtx.close(); audioCtx = null; }
    masterGain = null;
  }, (fadeDuration + 0.1) * 1000);
}

export function resumeContext() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}
