import { useState, useEffect, useRef } from 'react';
import { colors } from '../theme';
import CooLogo from './CooLogo';
import { startSession, stopSession, getPlaylistLabel, setLayerGain, PLAYLIST_SOUNDS } from '../audioEngine';

const DEFAULT_DURATION = 10 * 60; // 10 minutes fallback

export default function PlayerScreen({ playlist, onBack }) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);
  const [mixerOpen, setMixerOpen] = useState(false);

  const config = PLAYLIST_SOUNDS[playlist] || {};
  const hasHeartbeat = !!config.heartbeat;
  const hasMelody = !!config.melody;
  const sessionDuration = config.duration || DEFAULT_DURATION;
  const noiseName = config.noise === 'brown' ? 'brown noise' : config.noise === 'white' ? 'white noise' : 'pink noise';

  const [noiseVol, setNoiseVol] = useState(hasHeartbeat ? 55 : 100);
  const [droneVol, setDroneVol] = useState(10);
  const [heartbeatVol, setHeartbeatVol] = useState(85);
  const [melodyVol, setMelodyVol] = useState(55);

  function handleNoiseChange(val) {
    setNoiseVol(val);
    setLayerGain('noise', val / 100);
  }
  function handleDroneChange(val) {
    setDroneVol(val);
    setLayerGain('drone', val / 100);
  }
  function handleHeartbeatChange(val) {
    setHeartbeatVol(val);
    setLayerGain('heartbeat', val / 100);
  }
  function handleMelodyChange(val) {
    setMelodyVol(val);
    setLayerGain('melody', val / 100);
  }

  useEffect(() => {
    return () => {
      stopSession(0.5);
      clearInterval(intervalRef.current);
    };
  }, []);

  function handleToggle() {
    if (!playing) {
      startSession(playlist);
      setPlaying(true);
      intervalRef.current = setInterval(() => {
        setElapsed(e => {
          if (e + 1 >= sessionDuration) {
            handleStop();
            return sessionDuration;
          }
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
  }

  function handleBack() {
    handleStop();
    setElapsed(0);
    onBack();
  }

  const progress = elapsed / sessionDuration;
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const circumference = 2 * Math.PI * 54;
  const strokeDash = circumference * (1 - progress);

  return (
    <div style={styles.container}>
      <button style={styles.backBtn} onClick={handleBack}>← back</button>

      <CooLogo height={36} color={colors.textMuted} />
      <div style={styles.playlistName}>{playlist}</div>

      <div style={styles.orbContainer}>
        {playing && (
          <>
            <div style={{ ...styles.ripple, animationDelay: '0s' }} />
            <div style={{ ...styles.ripple, animationDelay: '1s' }} />
            <div style={{ ...styles.ripple, animationDelay: '2s' }} />
          </>
        )}
        <svg width="140" height="140" style={styles.progressRing}>
          <circle cx="70" cy="70" r="54" fill="none" stroke={colors.surfaceDeep} strokeWidth="2" />
          <circle
            cx="70" cy="70" r="54"
            fill="none"
            stroke={colors.blueMid}
            strokeWidth="2"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDash}
            strokeLinecap="round"
            transform="rotate(-90 70 70)"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <button style={styles.orb} onClick={handleToggle}>
          <span style={styles.orbLabel}>{playing ? 'pause' : 'play'}</span>
        </button>
      </div>

      <div style={styles.timer}>{timeStr}</div>

      <p style={styles.breathCue}>
        {playing
          ? "breathe with your baby. you're already doing it."
          : "press play when you're ready."}
      </p>

      <div style={styles.soundPill}>{getPlaylistLabel(playlist)}</div>

      <p style={styles.volumeNote}>keep volume comfortable · device away from baby</p>

      {/* Mixer panel — bottom right corner */}
      <div style={styles.mixerWrap}>
        <button style={styles.mixerToggle} onClick={() => setMixerOpen(o => !o)}>
          {mixerOpen ? '✕' : 'mixer'}
        </button>
        {mixerOpen && (
          <div style={styles.mixerPanel}>
            {hasMelody && (
              <MixerSlider label="melody" value={melodyVol} onChange={handleMelodyChange} />
            )}
            <MixerSlider label={noiseName} value={noiseVol} onChange={handleNoiseChange} />
            <MixerSlider label="binaural drone" value={droneVol} onChange={handleDroneChange} />
            {hasHeartbeat && (
              <MixerSlider label="heartbeat" value={heartbeatVol} onChange={handleHeartbeatChange} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MixerSlider({ label, value, onChange }) {
  return (
    <div style={mixerStyles.row}>
      <span style={mixerStyles.label}>{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={mixerStyles.slider}
      />
      <span style={mixerStyles.pct}>{value}%</span>
    </div>
  );
}

const mixerStyles = {
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
  },
  label: {
    fontSize: '10px',
    color: colors.textMuted,
    letterSpacing: '0.06em',
    width: '90px',
    flexShrink: 0,
    textAlign: 'right',
  },
  slider: {
    flex: 1,
    accentColor: colors.blueMid,
    cursor: 'pointer',
  },
  pct: {
    fontSize: '10px',
    color: colors.textMuted,
    width: '28px',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  },
};

const styles = {
  container: {
    minHeight: '100dvh',
    background: colors.bg,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    gap: '24px',
    boxSizing: 'border-box',
    position: 'relative',
  },
  backBtn: {
    position: 'absolute',
    top: '24px',
    left: '24px',
    background: 'none',
    border: 'none',
    color: colors.textMuted,
    fontSize: '13px',
    letterSpacing: '0.08em',
    cursor: 'pointer',
    padding: '4px 0',
  },
  playlistName: {
    fontSize: '15px',
    color: colors.textMuted,
    letterSpacing: '0.1em',
    textTransform: 'lowercase',
  },
  orbContainer: {
    position: 'relative',
    width: '140px',
    height: '140px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRing: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  ripple: {
    position: 'absolute',
    width: '140px',
    height: '140px',
    borderRadius: '50%',
    border: `1px solid ${colors.blueMid}`,
    opacity: 0,
    animation: 'rippleOut 3s ease-out infinite',
  },
  orb: {
    width: '110px',
    height: '110px',
    borderRadius: '50%',
    background: `linear-gradient(145deg, ${colors.blueLight}, ${colors.blueMid})`,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 8px 32px ${colors.blueMid}44`,
    zIndex: 1,
    transition: 'transform 0.2s ease',
  },
  orbLabel: {
    fontSize: '16px',
    fontWeight: '200',
    letterSpacing: '0.15em',
    color: colors.white,
    fontFamily: 'Georgia, serif',
  },
  timer: {
    fontSize: '28px',
    fontWeight: '200',
    letterSpacing: '0.12em',
    color: colors.text,
    fontFamily: 'Georgia, serif',
    fontVariantNumeric: 'tabular-nums',
  },
  breathCue: {
    fontSize: '13px',
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: '260px',
    lineHeight: 1.8,
    fontStyle: 'italic',
  },
  soundPill: {
    background: colors.surface,
    border: `1px solid ${colors.surfaceDeep}`,
    borderRadius: '20px',
    padding: '6px 16px',
    fontSize: '11px',
    color: colors.textMuted,
    letterSpacing: '0.1em',
  },
  volumeNote: {
    fontSize: '10px',
    color: colors.surfaceDeep,
    letterSpacing: '0.08em',
    textAlign: 'center',
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
