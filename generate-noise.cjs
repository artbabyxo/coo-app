const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const DURATION    = 30;
const NUM_SAMPLES = SAMPLE_RATE * DURATION;
const OUT         = path.join(__dirname, 'public/audio');

function writeWAV(filename, samples) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);           // PCM
  buf.writeUInt16LE(1, 22);           // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  fs.writeFileSync(path.join(OUT, filename), buf);
  console.log(`${filename}  ${(buf.length / 1024 / 1024).toFixed(1)} MB`);
}

function normalize(samples, peak = 0.85) {
  let max = 0;
  for (let i = 0; i < samples.length; i++) if (Math.abs(samples[i]) > max) max = Math.abs(samples[i]);
  const scale = peak / max;
  for (let i = 0; i < samples.length; i++) samples[i] *= scale;
  return samples;
}

function pink() {
  const s = new Float32Array(NUM_SAMPLES);
  let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
  for (let i = 0; i < NUM_SAMPLES; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886*b0 + w*0.0555179;
    b1 = 0.99332*b1 + w*0.0750759;
    b2 = 0.96900*b2 + w*0.1538520;
    b3 = 0.86650*b3 + w*0.3104856;
    b4 = 0.55000*b4 + w*0.5329522;
    b5 = -0.7616*b5 - w*0.0168980;
    s[i] = (b0+b1+b2+b3+b4+b5+b6 + w*0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return normalize(s);
}

function white() {
  const s = new Float32Array(NUM_SAMPLES);
  for (let i = 0; i < NUM_SAMPLES; i++) s[i] = Math.random() * 2 - 1;
  return normalize(s);
}

function brown() {
  const s = new Float32Array(NUM_SAMPLES);
  let last = 0;
  for (let i = 0; i < NUM_SAMPLES; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    s[i] = last * 3.5;
  }
  return normalize(s);
}

console.log('Generating noise files...');
writeWAV('pink-noise.wav', pink());
writeWAV('white-noise.wav', white());
writeWAV('brown-noise.wav', brown());
console.log('Done.');
