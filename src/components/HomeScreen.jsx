import { useState, useEffect, useRef } from 'react';
import { colors } from '../theme';
import CooLogo from './CooLogo';
import { startSession, stopSession, getPlaylistLabel, setLayerGain, PLAYLIST_SOUNDS } from '../audioEngine';

const WavesIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
    <path d="M2 8.5 Q5.5 4.5 9 8.5 Q12.5 12.5 16 8.5 Q19.5 4.5 23 8.5" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M2 15.5 Q5.5 11.5 9 15.5 Q12.5 19.5 16 15.5 Q19.5 11.5 23 15.5" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
  </svg>
);

const FlameIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="white">
    <path d="M12 2 C10 5 7 9 7 14 a5 5 0 0 0 10 0 C17 9 14 5 12 2Z"/>
  </svg>
);

const BurstIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="white">
    <path d="M12 2 L13.5 8.5 L19.5 4.5 L16 10.5 L22 12 L16 13.5 L19.5 19.5 L13.5 15.5 L12 22 L10.5 15.5 L4.5 19.5 L8 13.5 L2 12 L8 10.5 L4.5 4.5 L10.5 8.5 Z"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="white">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const SparklesIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="white">
    <path d="M16 3 L17.1 7.9 L22 9 L17.1 10.1 L16 15 L14.9 10.1 L10 9 L14.9 7.9 Z"/>
    <path d="M5.5 2 L6.2 4.8 L9 5.5 L6.2 6.2 L5.5 9 L4.8 6.2 L2 5.5 L4.8 4.8 Z"/>
    <path d="M6.5 15 L7.1 17.4 L9.5 18 L7.1 18.6 L6.5 21 L5.9 18.6 L3.5 18 L5.9 17.4 Z"/>
  </svg>
);

const HeartIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="white">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const PLAYLISTS = [
  { name: 'Calm & Settle',      short: 'Calm',     Icon: WavesIcon   },
  { name: 'Big Feelings',       short: 'Feelings', Icon: FlameIcon   },
  { name: 'Teething & Comfort', short: 'Teething', Icon: BurstIcon   },
  { name: 'Sleep Wind-Down',    short: 'Sleep',    Icon: MoonIcon    },
  { name: 'Immune Support',     short: 'Immune',   Icon: SparklesIcon},
  { name: 'Bonding',            short: 'Bonding',  Icon: HeartIcon   },
];

const ORBIT_RADIUS = 138;
const CONTAINER = 360;
const CENTER = CONTAINER / 2;
const BUBBLE = 68;
const SESSION_DURATION = 10 * 60;

function orbitPos(index, total) {
  const angle = (-90 + (360 / total) * index) * (Math.PI / 180);
  return {
    x: Math.round(Math.cos(angle) * ORBIT_RADIUS),
    y: Math.round(Math.sin(angle) * ORBIT_RADIUS),
  };
}

function MixerSlider({ label, value, onChange }) {
  return (
    <div style={mixerStyles.row}>
      <span style={mixerStyles.label}>{label}</span>
      <input
        type="range" min={0} max={100} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={mixerStyles.slider}
      />
      <span style={mixerStyles.pct}>{value}%</span>
    </div>
  );
}

const mixerStyles = {
  row: { display: 'flex', alignItems: 'center', gap: '8px', width: '100%' },
  label: { fontSize: '10px', color: colors.textMuted, letterSpacing: '0.06em', width: '90px', flexShrink: 0, textAlign: 'right' },
  slider: { flex: 1, accentColor: colors.blueMid, cursor: 'pointer' },
  pct: { fontSize: '10px', color: colors.textMuted, width: '28px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
};

export default function HomeScreen({ selectedPlaylist, onSelectPlaylist }) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [mixerOpen, setMixerOpen] = useState(false);
  const intervalRef = useRef(null);

  const config = PLAYLIST_SOUNDS[selectedPlaylist] || {};
  const hasHeartbeat = !!config.heartbeat;
  const noiseName = config.noise === 'brown' ? 'brown noise' : config.noise === 'white' ? 'white noise' : 'pink noise';

  const [noiseVol, setNoiseVol] = useState(hasHeartbeat ? 55 : 100);
  const [droneVol, setDroneVol] = useState(10);
  const [heartbeatVol, setHeartbeatVol] = useState(100);

  useEffect(() => {
    return () => { stopSession(0.5); clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    const cfg = PLAYLIST_SOUNDS[selectedPlaylist] || {};
    setNoiseVol(cfg.heartbeat ? 55 : 100);
    setDroneVol(10);
    setHeartbeatVol(100);
  }, [selectedPlaylist]);

  function handlePlayPause() {
    if (!playing) {
      startSession(selectedPlaylist);
      setPlaying(true);
      setElapsed(0);
      intervalRef.current = setInterval(() => {
        setElapsed(e => {
          if (e + 1 >= SESSION_DURATION) { handleStop(); return SESSION_DURATION; }
          return e + 1;
        });
      }, 1000);
    } else {
      handleStop();
    }
  }

  function handleStop() {
    stopSession();
    setPlaying(false);
    clearInterval(intervalRef.current);
    setElapsed(0);
  }

  function handleSelect(name) {
    if (playing) handleStop();
    onSelectPlaylist(name);
  }

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div style={styles.container}>
      <CooLogo height={36} color={colors.textMuted} />

      {/* Radial layout */}
      <div style={{ position: 'relative', width: CONTAINER, height: CONTAINER, flexShrink: 0 }}>

        {/* Ripples from center */}
        {playing && [0, 1, 2].map(i => (
          <div key={i} style={{
            ...styles.ripple,
            left: CENTER,
            top: CENTER,
            animationDelay: `${i}s`,
          }} />
        ))}

        {/* Orbit bubbles */}
        {PLAYLISTS.map((p, i) => {
          const pos = orbitPos(i, PLAYLISTS.length);
          const selected = selectedPlaylist === p.name;
          return (
            <button
              key={p.name}
              onClick={() => handleSelect(p.name)}
              style={{
                ...styles.bubble,
                left: CENTER + pos.x - BUBBLE / 2,
                top: CENTER + pos.y - BUBBLE / 2,
                background: selected
                  ? `linear-gradient(145deg, ${colors.blueLight}, ${colors.blueMid})`
                  : colors.surface,
                border: `1.5px solid ${selected ? colors.blueMid : 'transparent'}`,
                boxShadow: selected ? `0 4px 16px ${colors.blueMid}44` : 'none',
              }}
            >
              <p.Icon />
              <span style={{ ...styles.bubbleLabel, color: selected ? colors.text : colors.textMuted }}>
                {p.short}
              </span>
            </button>
          );
        })}

        {/* Center play/pause button */}
        <button
          onClick={handlePlayPause}
          style={{
            ...styles.centerBtn,
            left: CENTER - 54,
            top: CENTER - 54,
          }}
        >
          <span style={styles.centerLabel}>{playing ? 'pause' : 'play'}</span>
        </button>
      </div>

      {/* Timer */}
      <div style={{ ...styles.timer, opacity: playing ? 1 : 0 }}>{timeStr}</div>

      {/* Breath cue */}
      <p style={styles.breathCue}>
        {playing
          ? "breathe with your baby. you're already doing it."
          : 'choose a moment, then press play.'}
      </p>

      {/* Sound label */}
      {playing && (
        <div style={styles.soundPill}>{getPlaylistLabel(selectedPlaylist)}</div>
      )}

      <p style={styles.volumeNote}>keep volume comfortable · device away from baby</p>

      {/* Mixer */}
      <div style={styles.mixerWrap}>
        <button style={styles.mixerToggle} onClick={() => setMixerOpen(o => !o)}>
          {mixerOpen ? '✕' : 'mixer'}
        </button>
        {mixerOpen && (
          <div style={styles.mixerPanel}>
            <MixerSlider label={noiseName} value={noiseVol} onChange={v => { setNoiseVol(v); setLayerGain('noise', v / 100); }} />
            <MixerSlider label="binaural drone" value={droneVol} onChange={v => { setDroneVol(v); setLayerGain('drone', v / 100); }} />
            {hasHeartbeat && (
              <MixerSlider label="heartbeat" value={heartbeatVol} onChange={v => { setHeartbeatVol(v); setLayerGain('heartbeat', v / 100); }} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100dvh',
    background: colors.bg,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 16px',
    gap: '16px',
    boxSizing: 'border-box',
    position: 'relative',
  },
  ripple: {
    position: 'absolute',
    width: '108px',
    height: '108px',
    borderRadius: '50%',
    border: `1px solid ${colors.blueMid}`,
    opacity: 0,
    transform: 'translate(-50%, -50%)',
    animation: 'rippleOut 3s ease-out infinite',
    pointerEvents: 'none',
  },
  bubble: {
    position: 'absolute',
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: '50%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    padding: 0,
  },
  bubbleIcon: {
    fontSize: '18px',
    lineHeight: 1,
  },
  bubbleLabel: {
    fontSize: '9px',
    letterSpacing: '0.05em',
    textTransform: 'lowercase',
    lineHeight: 1,
  },
  centerBtn: {
    position: 'absolute',
    width: '108px',
    height: '108px',
    borderRadius: '50%',
    background: `linear-gradient(145deg, ${colors.blueLight}, ${colors.blueMid})`,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 8px 32px ${colors.blueMid}55`,
    zIndex: 2,
    transition: 'transform 0.2s ease',
  },
  centerLabel: {
    fontSize: '16px',
    fontWeight: '200',
    letterSpacing: '0.15em',
    color: colors.white,
    fontFamily: 'Georgia, serif',
  },
  timer: {
    fontSize: '22px',
    fontWeight: '200',
    letterSpacing: '0.12em',
    color: colors.text,
    fontFamily: 'Georgia, serif',
    fontVariantNumeric: 'tabular-nums',
    transition: 'opacity 0.4s ease',
    height: '28px',
  },
  breathCue: {
    fontSize: '12px',
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: '260px',
    lineHeight: 1.8,
    fontStyle: 'italic',
    margin: 0,
  },
  soundPill: {
    background: colors.surface,
    border: `1px solid ${colors.surfaceDeep}`,
    borderRadius: '20px',
    padding: '5px 14px',
    fontSize: '10px',
    color: colors.textMuted,
    letterSpacing: '0.1em',
  },
  volumeNote: {
    fontSize: '10px',
    color: colors.surfaceDeep,
    letterSpacing: '0.08em',
    textAlign: 'center',
    margin: 0,
  },
  mixerWrap: {
    position: 'absolute',
    bottom: '24px',
    right: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '8px',
  },
  mixerToggle: {
    background: 'none',
    border: `1px solid ${colors.surfaceDeep}`,
    borderRadius: '12px',
    padding: '4px 10px',
    fontSize: '10px',
    color: colors.textMuted,
    letterSpacing: '0.08em',
    cursor: 'pointer',
  },
  mixerPanel: {
    background: colors.surface,
    border: `1px solid ${colors.surfaceDeep}`,
    borderRadius: '12px',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '240px',
  },
};
