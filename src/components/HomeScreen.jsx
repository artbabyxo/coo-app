import { useState, useRef, useCallback, useEffect } from 'react';
import { colors } from '../theme';
import CooLogo from './CooLogo';
import { startSession, stopSession, getPlaylistLabel, setLayerGain, PLAYLIST_SOUNDS } from '../audioEngine';

const WavesIcon = ({ color = 'white' }) => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
    <path d="M2 8.5 Q5.5 4.5 9 8.5 Q12.5 12.5 16 8.5 Q19.5 4.5 23 8.5" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M2 15.5 Q5.5 11.5 9 15.5 Q12.5 19.5 16 15.5 Q19.5 11.5 23 15.5" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
  </svg>
);

const FlameIcon = ({ color = 'white' }) => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill={color}>
    <path d="M12 2 C10 5 7 9 7 14 a5 5 0 0 0 10 0 C17 9 14 5 12 2Z"/>
  </svg>
);

const BurstIcon = ({ color = 'white' }) => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill={color}>
    <path d="M12 2 L13.5 8.5 L19.5 4.5 L16 10.5 L22 12 L16 13.5 L19.5 19.5 L13.5 15.5 L12 22 L10.5 15.5 L4.5 19.5 L8 13.5 L2 12 L8 10.5 L4.5 4.5 L10.5 8.5 Z"/>
  </svg>
);

const MoonIcon = ({ color = 'white' }) => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill={color}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const SparklesIcon = ({ color = 'white' }) => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill={color}>
    <path d="M16 3 L17.1 7.9 L22 9 L17.1 10.1 L16 15 L14.9 10.1 L10 9 L14.9 7.9 Z"/>
    <path d="M5.5 2 L6.2 4.8 L9 5.5 L6.2 6.2 L5.5 9 L4.8 6.2 L2 5.5 L4.8 4.8 Z"/>
    <path d="M6.5 15 L7.1 17.4 L9.5 18 L7.1 18.6 L6.5 21 L5.9 18.6 L3.5 18 L5.9 17.4 Z"/>
  </svg>
);

const HeartIcon = ({ color = 'white' }) => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill={color}>
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

const ChevronIcon = ({ open }) => (
  <svg
    width="12" height="12" viewBox="0 0 12 12"
    style={{ transition: 'transform 0.3s ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
  >
    <path d="M2 4 L6 8 L10 4" stroke={colors.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

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
      <span style={mixerStyles.pct}>{value}</span>
    </div>
  );
}

const mixerStyles = {
  row: { display: 'flex', alignItems: 'center', gap: '10px', width: '100%' },
  label: { fontSize: '10px', color: colors.textMuted, letterSpacing: '0.06em', width: '80px', flexShrink: 0, textAlign: 'right' },
  slider: { flex: 1, accentColor: colors.sageMid, cursor: 'pointer', height: '2px' },
  pct: { fontSize: '10px', color: colors.textMuted, width: '24px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
};

export default function HomeScreen({ selectedPlaylist, onSelectPlaylist }) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);
  const wakeLockRef = useRef(null);
  const playingRef = useRef(false);

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return;
    try { wakeLockRef.current = await navigator.wakeLock.request('screen'); } catch (_) {}
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) { wakeLockRef.current.release(); wakeLockRef.current = null; }
  }, []);

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible' && playingRef.current) requestWakeLock();
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [requestWakeLock]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (playing) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: selectedPlaylist,
        artist: 'COO',
        album: 'Co-regulation companion',
      });
      navigator.mediaSession.playbackState = 'playing';
      navigator.mediaSession.setActionHandler('play', () => { /* already playing */ });
      navigator.mediaSession.setActionHandler('pause', () => handleStop());
      navigator.mediaSession.setActionHandler('stop', () => handleStop());
    } else {
      navigator.mediaSession.playbackState = 'none';
    }
  }, [playing, selectedPlaylist]); // eslint-disable-line

  const config = PLAYLIST_SOUNDS[selectedPlaylist] || {};
  const noiseName = config.noise === 'brown' ? 'brown noise' : config.noise === 'white' ? 'white noise' : 'pink noise';

  const [mixerOpen,     setMixerOpen]     = useState(false);
  const [noiseVol,      setNoiseVol]      = useState(10);
  const [droneVol,      setDroneVol]      = useState(5);
  const [heartbeatVol,  setHeartbeatVol]  = useState(100);
  const [melodyVol,     setMelodyVol]     = useState(Math.round((config.melodyGain ?? 0.50) * 100));
  const [ambientPadVol, setAmbientPadVol] = useState(Math.round((config.ambientPadGain ?? 0.35) * 100));
  const [solfeggioVol,  setSolfeggioVol]  = useState(4);

  useEffect(() => {
    const c = PLAYLIST_SOUNDS[selectedPlaylist] || {};
    setNoiseVol(10);
    setDroneVol(5);
    setHeartbeatVol(100);
    setMelodyVol(Math.round((c.melodyGain ?? 0.50) * 100));
    setAmbientPadVol(Math.round((c.ambientPadGain ?? 0.35) * 100));
    setSolfeggioVol(4);
    setMixerOpen(false);
  }, [selectedPlaylist]);

  function handlePlayPause() {
    if (!playing) {
      startSession(selectedPlaylist);
      setPlaying(true);
      playingRef.current = true;
      setElapsed(0);
      requestWakeLock();
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
    playingRef.current = false;
    clearInterval(intervalRef.current);
    setElapsed(0);
    releaseWakeLock();
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
        <CooLogo height={52} color={colors.text} />
        <p style={styles.tagline}>a co-regulation companion</p>
      </div>

      {/* Radial layout */}
      <div style={{ position: 'relative', width: CONTAINER, height: CONTAINER, flexShrink: 0 }}>
        {playing && [0, 1, 2].map(i => (
          <div key={i} style={{
            ...styles.ripple,
            left: CENTER,
            top: CENTER,
            animationDelay: `${i}s`,
          }} />
        ))}

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
                  ? `linear-gradient(145deg, ${colors.sageLight}, ${colors.sageMid})`
                  : colors.surface,
                border: `1.5px solid ${selected ? colors.sageMid : colors.surfaceDeep}`,
                boxShadow: selected ? `0 4px 16px ${colors.sageMid}44` : 'none',
              }}
            >
              <p.Icon color={selected ? 'white' : colors.text} />
              <span style={{ ...styles.bubbleLabel, color: selected ? colors.white : colors.text }}>
                {p.short}
              </span>
            </button>
          );
        })}

        <button
          onClick={handlePlayPause}
          style={{ ...styles.centerBtn, left: CENTER - 54, top: CENTER - 54 }}
        >
          <span style={styles.centerLabel}>{playing ? 'pause' : 'play'}</span>
        </button>
      </div>

      {/* Playlist name — shown while playing */}
      {playing && (
        <p style={styles.playlistLabel}>{selectedPlaylist.toLowerCase()}</p>
      )}

      {/* Timer */}
      <div style={{ ...styles.timer, opacity: playing ? 1 : 0 }}>{timeStr}</div>

      {/* Mixer — collapsible card, only while playing */}
      {playing && (
        <div style={styles.mixerCard}>
          <button style={styles.mixerHeader} onClick={() => setMixerOpen(o => !o)}>
            <div style={{ textAlign: 'left' }}>
              <p style={styles.mixerTitle}>sound mix</p>
              {!mixerOpen && (
                <p style={styles.mixerSublabel}>{config.label}</p>
              )}
            </div>
            <ChevronIcon open={mixerOpen} />
          </button>
          <div style={{
            ...styles.mixerBody,
            maxHeight: mixerOpen ? '400px' : '0px',
            opacity: mixerOpen ? 1 : 0,
          }}>
            <div style={styles.mixerSliders}>
              <MixerSlider label={noiseName} value={noiseVol} onChange={v => { setNoiseVol(v); setLayerGain('noise', v / 100); }} />
              <MixerSlider label="drone" value={droneVol} onChange={v => { setDroneVol(v); setLayerGain('drone', v / 100); }} />
              {config.heartbeat && (
                <MixerSlider label="heartbeat" value={heartbeatVol} onChange={v => { setHeartbeatVol(v); setLayerGain('heartbeat', v / 100); }} />
              )}
              {config.ambientPad && (
                <MixerSlider label="ambient pad" value={ambientPadVol} onChange={v => { setAmbientPadVol(v); setLayerGain('ambientPad', v / 100); }} />
              )}
              {config.melody && (
                <MixerSlider label="melody" value={melodyVol} onChange={v => { setMelodyVol(v); setLayerGain('melody', v / 100); }} />
              )}
              {config.solfeggio && (
                <MixerSlider label={`${config.solfeggio} hz`} value={solfeggioVol} onChange={v => { setSolfeggioVol(v); setLayerGain('solfeggio', v / 100); }} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Breath cue */}
      <p style={styles.breathCue}>
        {playing
          ? "breathe with your baby. you're already doing it."
          : 'choose a moment, then press play.'}
      </p>

      {!playing && (
        <div style={styles.soundPill}>{getPlaylistLabel(selectedPlaylist)}</div>
      )}

      <p style={styles.volumeNote}>keep volume comfortable · device away from baby</p>
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
    padding: '32px 24px 40px',
    gap: '16px',
    boxSizing: 'border-box',
    overflowY: 'auto',
  },
  ripple: {
    position: 'absolute',
    width: '108px',
    height: '108px',
    borderRadius: '50%',
    border: `1px solid ${colors.sageMid}`,
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
    background: `linear-gradient(145deg, ${colors.sageLight}, ${colors.sageMid})`,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 8px 32px ${colors.sageMid}55`,
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
  mixerCard: {
    width: '100%',
    maxWidth: '320px',
    background: colors.surface,
    borderRadius: '16px',
    border: `1px solid ${colors.surfaceDeep}`,
    overflow: 'hidden',
  },
  mixerHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '13px 16px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    gap: '12px',
  },
  mixerTitle: {
    fontSize: '9px',
    color: colors.textMuted,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    margin: 0,
  },
  mixerSublabel: {
    fontSize: '9px',
    color: colors.surfaceDeep,
    letterSpacing: '0.05em',
    margin: '3px 0 0 0',
    fontStyle: 'italic',
  },
  mixerBody: {
    overflow: 'hidden',
    transition: 'max-height 0.35s ease, opacity 0.2s ease',
  },
  mixerSliders: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '0 16px 16px',
    width: '100%',
    boxSizing: 'border-box',
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
    border: `1px solid ${colors.sageMid}`,
    borderRadius: '20px',
    padding: '6px 16px',
    fontSize: '11px',
    color: colors.text,
    letterSpacing: '0.08em',
  },
  volumeNote: {
    fontSize: '10px',
    color: colors.textMuted,
    letterSpacing: '0.08em',
    textAlign: 'center',
    margin: 0,
  },
  playlistLabel: {
    fontSize: '13px',
    color: colors.textMuted,
    letterSpacing: '0.12em',
    textTransform: 'lowercase',
    margin: 0,
  },
  tagline: {
    fontSize: '13px',
    color: colors.textMuted,
    letterSpacing: '0.10em',
    fontStyle: 'italic',
    margin: 0,
  },
};
