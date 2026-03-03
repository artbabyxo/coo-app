import { useState, useEffect, useRef } from 'react';
import { colors } from '../theme';
import { startTone, stopTone, getPlaylistFreqs } from '../audioEngine';

const SESSION_DURATION = 10 * 60; // 10 minutes default

export default function PlayerScreen({ playlist, onBack }) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [ripple, setRipple] = useState(0);
  const intervalRef = useRef(null);
  const rippleRef = useRef(null);

  useEffect(() => {
    return () => {
      stopTone(0.5);
      clearInterval(intervalRef.current);
      clearInterval(rippleRef.current);
    };
  }, []);

  function handleToggle() {
    if (!playing) {
      const freqs = getPlaylistFreqs(playlist);
      startTone(freqs);
      setPlaying(true);
      intervalRef.current = setInterval(() => {
        setElapsed(e => {
          if (e + 1 >= SESSION_DURATION) {
            handleStop();
            return SESSION_DURATION;
          }
          return e + 1;
        });
      }, 1000);
      rippleRef.current = setInterval(() => {
        setRipple(r => r + 1);
      }, 3000);
    } else {
      handleStop();
    }
  }

  function handleStop() {
    stopTone();
    setPlaying(false);
    clearInterval(intervalRef.current);
    clearInterval(rippleRef.current);
  }

  function handleBack() {
    handleStop();
    setElapsed(0);
    onBack();
  }

  const progress = elapsed / SESSION_DURATION;
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const circumference = 2 * Math.PI * 54;
  const strokeDash = circumference * (1 - progress);

  return (
    <div style={styles.container}>
      <button style={styles.backBtn} onClick={handleBack}>
        ← back
      </button>

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
          <circle
            cx="70" cy="70" r="54"
            fill="none"
            stroke={colors.surfaceDeep}
            strokeWidth="2"
          />
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
          ? 'breathe with your baby. you\'re already doing it.'
          : 'press play when you\'re ready.'}
      </p>

      <div style={styles.freqPill}>
        {getPlaylistFreqs(playlist).join(' · ')} hz
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
    padding: '48px 24px',
    gap: '28px',
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
  freqPill: {
    background: colors.surface,
    border: `1px solid ${colors.surfaceDeep}`,
    borderRadius: '20px',
    padding: '6px 16px',
    fontSize: '11px',
    color: colors.textMuted,
    letterSpacing: '0.1em',
  },
};
