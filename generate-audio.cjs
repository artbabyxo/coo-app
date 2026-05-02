const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, 'public/audio');

// ── WAV writers ──────────────────────────────────────────────────────────────

function writeMonoWAV(filename, samples, sr) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  }
  fs.writeFileSync(path.join(OUT, filename), buf);
  console.log(`  ${filename}  (${(buf.length/1024/1024).toFixed(1)} MB)`);
}

function writeStereoWAV(filename, left, right, sr) {
  const n = Math.min(left.length, right.length);
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4);
  buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i])) * 32767), 44 + i * 4 + 2);
  }
  fs.writeFileSync(path.join(OUT, filename), buf);
  console.log(`  ${filename}  (${(buf.length/1024/1024).toFixed(1)} MB)`);
}

// ── Solfeggio tones ──────────────────────────────────────────────────────────
// Pure sine, 30s, 8000 Hz sample rate, amplitude 0.35

function solfeggio(hz) {
  const sr = 8000, dur = 30, n = sr * dur;
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) s[i] = 0.9 * Math.sin(2 * Math.PI * hz * i / sr);
  return { samples: s, sr };
}

// ── Binaural drones ──────────────────────────────────────────────────────────
// Stereo: left = carrier, right = carrier + beat. 30s, 8000 Hz, amp 0.25

function drone(carrierHz, beatHz) {
  const sr = 8000, dur = 30, n = sr * dur;
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    L[i] = 0.9 * Math.sin(2 * Math.PI * carrierHz * i / sr);
    R[i] = 0.9 * Math.sin(2 * Math.PI * (carrierHz + beatHz) * i / sr);
  }
  return { L, R, sr };
}

// ── Heartbeat ────────────────────────────────────────────────────────────────
// 68 BPM lub-dub pattern, 10 beats, 22050 Hz sample rate

function heartbeat() {
  const sr = 22050;
  const bpm = 68, beatPeriod = 60 / bpm;
  const nBeats = 10;
  const totalSamples = Math.round(nBeats * beatPeriod * sr);
  const s = new Float32Array(totalSamples);

  function addPulse(beatStart, timeOffset, freq, amp, dur) {
    const start = Math.round((beatStart + timeOffset) * sr);
    const len   = Math.round(dur * sr);
    const rise  = Math.round(0.012 * sr);
    for (let i = 0; i < len && start + i < totalSamples; i++) {
      const env = i < rise
        ? (i / rise) * amp
        : amp * Math.exp(-7 * (i - rise) / (len - rise));
      s[start + i] += Math.sin(2 * Math.PI * freq * i / sr) * env;
    }
  }

  for (let b = 0; b < nBeats; b++) {
    const t = b * beatPeriod;
    addPulse(t, 0.00, 110, 0.65, 0.14);   // lub — lower, stronger
    addPulse(t, 0.25, 90,  0.38, 0.11);   // dub — higher, softer
  }

  // Normalize to 0.75
  let peak = 0;
  for (let i = 0; i < totalSamples; i++) if (Math.abs(s[i]) > peak) peak = Math.abs(s[i]);
  if (peak > 0) for (let i = 0; i < totalSamples; i++) s[i] = s[i] / peak * 0.75;

  return { samples: s, sr };
}

// ── Generate everything ──────────────────────────────────────────────────────

console.log('\nGenerating solfeggio tones...');
for (const [hz] of [[528],[396],[174],[285],[639],[741]]) {
  const { samples, sr } = solfeggio(hz);
  writeMonoWAV(`solfeggio-${hz}.wav`, samples, sr);
}

console.log('\nGenerating binaural drones...');
const droneConfigs = [
  ['drone-calm',        220, 10],
  ['drone-bigfeelings', 200, 8 ],
  ['drone-teething',    256, 2 ],
  ['drone-sleep',       220, 2 ],
  ['drone-bonding',     200, 6 ],
];
for (const [name, carrier, beat] of droneConfigs) {
  const { L, R, sr } = drone(carrier, beat);
  writeStereoWAV(`${name}.wav`, L, R, sr);
}

console.log('\nGenerating heartbeat...');
const hb = heartbeat();
writeMonoWAV('heartbeat.wav', hb.samples, hb.sr);

console.log('\nDone.\n');
