import { useState, useRef, useCallback, useEffect } from 'react';
import { Purchases } from '@revenuecat/purchases-capacitor';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { colors } from '../theme';
import CooLogo from './CooLogo';
import { startSession, stopSession, getPlaylistLabel, setLayerGain, PLAYLIST_SOUNDS, resumeContext } from '../audioEngine';

// ─── RevenueCat ───────────────────────────────────────────────────────────────
// Replace this with the iOS API key from your RevenueCat dashboard
// (Project → API Keys → Apple App Store → Public app-specific API key)
const REVENUECAT_API_KEY = 'appl_VVqVfuMcssMCBkMalfEZmOYWgUL';
const IAP_PRODUCT_ID     = 'com.northstarstudios.coo.premium';
const IAP_ENTITLEMENT_ID = 'COO - Baby Sound Therapy Premium';

// ─── Play All ─────────────────────────────────────────────────────────────────
const PLAY_ALL_DEFAULT = [
  'Big Feelings',
  'Bonding',
  'Calm & Settle',
  'Immune Support',
  'Teething & Comfort',
  'Sleep Wind-Down',
];

function loadQueue() {
  try {
    const raw = localStorage.getItem('coo_play_all_queue');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === PLAY_ALL_DEFAULT.length &&
          PLAY_ALL_DEFAULT.every(name => parsed.includes(name))) {
        return parsed;
      }
    }
  } catch (_) {}
  return [...PLAY_ALL_DEFAULT];
}

function saveQueue(queue) {
  try { localStorage.setItem('coo_play_all_queue', JSON.stringify(queue)); } catch (_) {}
}
// ─────────────────────────────────────────────────────────────────────────────

const PREMIUM_PLAYLISTS = ['Teething & Comfort', 'Sleep Wind-Down'];

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

const NorthStarIcon = ({ size = 18, color = colors.textMuted }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 2 L13.4 10.6 L22 12 L13.4 13.4 L12 22 L10.6 13.4 L2 12 L10.6 10.6 Z"/>
  </svg>
);

const InfoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke={colors.textMuted} strokeWidth="1.5"/>
    <path d="M12 11v5" stroke={colors.textMuted} strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="12" cy="8" r="0.5" fill={colors.textMuted} stroke={colors.textMuted} strokeWidth="1"/>
  </svg>
);

const PlayAllIcon = ({ color = 'white' }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={color}>
    <polygon points="5,3 19,12 5,21"/>
    <line x1="22" y1="4" x2="22" y2="20" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

const DragHandleIcon = ({ color }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={color}>
    <circle cx="9" cy="7"  r="1.5"/><circle cx="15" cy="7"  r="1.5"/>
    <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
    <circle cx="9" cy="17" r="1.5"/><circle cx="15" cy="17" r="1.5"/>
  </svg>
);

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

function orbitPos(index, total) {
  const angle = (-90 + (360 / total) * index) * (Math.PI / 180);
  return {
    x: Math.round(Math.cos(angle) * ORBIT_RADIUS),
    y: Math.round(Math.sin(angle) * ORBIT_RADIUS),
  };
}

function SortableChip({ id, index, isPremium, onPremiumGate }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !isPremium,
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 16px',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        background: isDragging ? colors.surfaceDeep : 'transparent',
      }}
    >
      <span
        {...(isPremium ? { ...attributes, ...listeners } : {})}
        onClick={!isPremium ? onPremiumGate : undefined}
        style={{
          color: colors.textMuted,
          cursor: isPremium ? 'grab' : 'pointer',
          userSelect: 'none',
          touchAction: 'none',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <DragHandleIcon color={colors.textMuted} />
      </span>
      <span style={{ fontSize: '10px', color: colors.textMuted, fontVariantNumeric: 'tabular-nums', width: '14px', flexShrink: 0, textAlign: 'center' }}>
        {index + 1}
      </span>
      <span style={{ fontSize: '12px', color: colors.text, letterSpacing: '0.04em', flex: 1 }}>
        {id.toLowerCase()}
      </span>
    </div>
  );
}

export default function HomeScreen({ selectedPlaylist, onSelectPlaylist }) {
  const [aboutOpen,        setAboutOpen]        = useState(false);
  const [upgradeOpen,      setUpgradeOpen]       = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen]  = useState(false);
  const [isPremium,        setIsPremium]         = useState(false);
  const [sessionMode,      setSessionMode]       = useState('melody'); // 'melody' | 15 | 30
  const [playing,          setPlaying]           = useState(false);
  const [elapsed,          setElapsed]           = useState(0);
  const [ratingOpen,       setRatingOpen]        = useState(false);
  const [ratingPlaylist,   setRatingPlaylist]    = useState('');
  const intervalRef  = useRef(null);
  const wakeLockRef  = useRef(null);
  const playingRef   = useRef(false);

  // ─── Play All state ──────────────────────────────────────────────────────────
  const [playAllActive, setPlayAllActive] = useState(false);
  const [playAllOpen,   setPlayAllOpen]   = useState(false);
  const [playAllQueue,  setPlayAllQueue]  = useState(() => loadQueue());
  const [playAllIndex,  setPlayAllIndex]  = useState(0);
  const playAllActiveRef = useRef(false);
  const playAllIndexRef  = useRef(0);
  const playAllQueueRef  = useRef(playAllQueue);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function handleDragEnd(event) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = playAllQueueRef.current.indexOf(active.id);
      const newIndex = playAllQueueRef.current.indexOf(over.id);
      updateQueue(arrayMove(playAllQueueRef.current, oldIndex, newIndex));
    }
  }

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return;
    try { wakeLockRef.current = await navigator.wakeLock.request('screen'); } catch (_) {}
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) { wakeLockRef.current.release(); wakeLockRef.current = null; }
  }, []);

  const handleShare = useCallback(async () => {
    const url = 'https://apps.apple.com/app/id6764710380';
    try {
      await Share.share({ title: 'COO', text: 'COO — a sound companion for babies and parents. 🕊️', url, dialogTitle: 'Share COO' });
    } catch {
      if (navigator.share) { navigator.share({ title: 'COO', text: 'COO — a sound companion for babies and parents. 🕊️', url }); }
    }
  }, []);

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible' && playingRef.current) {
        requestWakeLock();
        resumeContext();
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);

    let appListener;
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive && playingRef.current) resumeContext();
    }).then(l => { appListener = l; });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      appListener?.remove();
    };
  }, [requestWakeLock]);

  // ─── IAP: configure RevenueCat + restore entitlement on mount ──────────────
  useEffect(() => {
    // Fast path: localStorage lets us avoid a network round-trip on every launch
    if (localStorage.getItem('coo_premium') === 'true') {
      setIsPremium(true);
    }

    async function initRevenueCat() {
      try {
        await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
        const { customerInfo } = await Purchases.getCustomerInfo();
        if (customerInfo.entitlements.active[IAP_ENTITLEMENT_ID]) {
          setIsPremium(true);
          localStorage.setItem('coo_premium', 'true');
        }
      } catch (err) {
        // RevenueCat not available in browser/web preview — safe to ignore
        console.warn('[IAP] RevenueCat init skipped:', err?.message);
      }
    }

    initRevenueCat();
  }, []); // eslint-disable-line
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (playing) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: selectedPlaylist,
        artist: 'COO',
        album: 'Co-regulation companion',
      });
      navigator.mediaSession.playbackState = 'playing';
      navigator.mediaSession.setActionHandler('play', () => {});
      navigator.mediaSession.setActionHandler('pause', () => handleStop());
      navigator.mediaSession.setActionHandler('stop', () => handleStop());
    } else {
      navigator.mediaSession.playbackState = 'none';
    }
  }, [playing, selectedPlaylist]); // eslint-disable-line

  const config = PLAYLIST_SOUNDS[selectedPlaylist] || {};
  const noiseName = config.noise === 'brown' ? 'brown noise' : config.noise === 'white' ? 'white noise' : 'pink noise';

  const [mixerOpen,     setMixerOpen]     = useState(false);
  const [noiseVol,      setNoiseVol]      = useState(Math.round((config.noiseGain ?? 0.10) * 100));
  const [droneVol,      setDroneVol]      = useState(Math.round((config.droneGain ?? 0.05) * 100));
  const [heartbeatVol,  setHeartbeatVol]  = useState(Math.round((config.heartbeatGain ?? 1.0) * 100));
  const [melodyVol,     setMelodyVol]     = useState(Math.round((config.melodyGain ?? 0.70) * 100));
  const [ambientPadVol, setAmbientPadVol] = useState(Math.round((config.ambientPadGain ?? 0.35) * 100));
  const [solfeggioVol,  setSolfeggioVol]  = useState(Math.round((config.solfeggioGain ?? 0.04) * 100));

  useEffect(() => {
    const c = PLAYLIST_SOUNDS[selectedPlaylist] || {};
    setNoiseVol(Math.round((c.noiseGain ?? 0.10) * 100));
    setDroneVol(Math.round((c.droneGain ?? 0.05) * 100));
    setHeartbeatVol(Math.round((c.heartbeatGain ?? 1.0) * 100));
    setMelodyVol(Math.round((c.melodyGain ?? 0.70) * 100));
    setAmbientPadVol(Math.round((c.ambientPadGain ?? 0.35) * 100));
    setSolfeggioVol(Math.round((c.solfeggioGain ?? 0.04) * 100));
    setMixerOpen(false);
  }, [selectedPlaylist]);

  // Keep queue ref in sync with state
  function updateQueue(newQueue) {
    playAllQueueRef.current = newQueue;
    setPlayAllQueue(newQueue);
    saveQueue(newQueue);
  }

  // ─── Session rating helpers ───────────────────────────────────────────────
  function isRatingOff() {
    try { return localStorage.getItem('coo_session_rating_off') === 'true'; } catch (_) { return false; }
  }

  function saveRating(playlist, rating) {
    try {
      const existing = JSON.parse(localStorage.getItem('coo_session_ratings') || '[]');
      existing.push({ ts: Date.now(), playlist, rating });
      localStorage.setItem('coo_session_ratings', JSON.stringify(existing));
    } catch (_) {}
  }
  // ─────────────────────────────────────────────────────────────────────────

  function fullStop(fadeDuration = 3, natural = false) {
    const currentPlaylist = selectedPlaylist;
    stopSession(fadeDuration);
    setPlaying(false);
    playingRef.current = false;
    clearInterval(intervalRef.current);
    setElapsed(0);
    releaseWakeLock();
    // Clear Play All state
    playAllActiveRef.current = false;
    playAllIndexRef.current = 0;
    setPlayAllActive(false);
    setPlayAllIndex(0);
    // Show rating sheet if this was a natural session end
    if (natural && !isRatingOff()) {
      setRatingPlaylist(currentPlaylist);
      setRatingOpen(true);
    }
  }

  // Advance Play All to a specific index (or stop if past the end)
  function advancePlayAll(index, mode) {
    const queue = playAllQueueRef.current;
    if (index >= queue.length) {
      // Last playlist done - fade out and stop (natural end)
      fullStop(3, true);
      return;
    }

    const playlistName = queue[index];
    playAllIndexRef.current = index;
    setPlayAllIndex(index);
    onSelectPlaylist(playlistName);

    const loopMelody = mode !== 'melody';
    const limitSecs  = loopMelody ? mode * 60 : null;

    stopSession(0.5); // 0.5s fade out before next playlist

    setTimeout(() => {
      startSession(
        playlistName,
        0.38,
        loopMelody ? null : (_fadeDuration) => {
          if (playAllActiveRef.current) {
            advancePlayAll(playAllIndexRef.current + 1, mode);
          }
        },
        loopMelody,
      );

      setElapsed(0);
      clearInterval(intervalRef.current);

      intervalRef.current = setInterval(() => {
        setElapsed(e => {
          if (limitSecs && e + 1 >= limitSecs) {
            clearInterval(intervalRef.current);
            if (playAllActiveRef.current) {
              advancePlayAll(playAllIndexRef.current + 1, mode);
            } else {
              fullStop(3);
            }
            return 0;
          }
          return e + 1;
        });
      }, 1000);
    }, 500);
  }

  function handlePlayAll() {
    if (!isPremium) {
      setUpgradeModalOpen(true);
      return;
    }

    const queue = playAllQueueRef.current;
    const firstPlaylist = queue[0];
    const mode = sessionMode;
    const loopMelody = mode !== 'melody';
    const limitSecs  = loopMelody ? mode * 60 : null;

    onSelectPlaylist(firstPlaylist);
    playAllActiveRef.current = true;
    playAllIndexRef.current = 0;
    setPlayAllActive(true);
    setPlayAllIndex(0);

    stopSession(0);
    startSession(
      firstPlaylist,
      0.38,
      loopMelody ? null : (_fadeDuration) => {
        if (playAllActiveRef.current) {
          advancePlayAll(playAllIndexRef.current + 1, mode);
        }
      },
      loopMelody,
    );

    setPlaying(true);
    playingRef.current = true;
    setElapsed(0);
    requestWakeLock();

    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setElapsed(e => {
        if (limitSecs && e + 1 >= limitSecs) {
          clearInterval(intervalRef.current);
          if (playAllActiveRef.current) {
            advancePlayAll(playAllIndexRef.current + 1, mode);
          } else {
            fullStop(3);
          }
          return 0;
        }
        return e + 1;
      });
    }, 1000);
  }

  function fadeStop(fadeDuration = 3) {
    fullStop(fadeDuration);
  }

  function handlePlayPause() {
    if (!playing) {
      const loopMelody = sessionMode !== 'melody';
      const limitSecs  = loopMelody ? sessionMode * 60 : null;

      startSession(
        selectedPlaylist,
        0.38,
        loopMelody ? null : (fadeDuration) => fullStop(fadeDuration, true),
        loopMelody,
      );

      setPlaying(true);
      playingRef.current = true;
      setElapsed(0);
      requestWakeLock();

      intervalRef.current = setInterval(() => {
        setElapsed(e => {
          if (limitSecs && e + 1 >= limitSecs) {
            fullStop(3, true);
            return limitSecs;
          }
          return e + 1;
        });
      }, 1000);
    } else {
      handleStop();
    }
  }

  function handleStop() {
    fullStop(2, false); // manual stop - no rating
  }

  function handleSelect(name) {
    if (PREMIUM_PLAYLISTS.includes(name) && !isPremium) {
      setUpgradeModalOpen(true);
      return;
    }
    if (playing) handleStop();
    onSelectPlaylist(name);
  }

  function handleDurationSelect(mode) {
    if (mode !== 'melody' && !isPremium) {
      setUpgradeModalOpen(true);
      return;
    }
    setSessionMode(mode);
  }

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr  = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div style={styles.container}>

      {/* Upgrade screen — full overlay */}
      {upgradeOpen && (
        <div style={styles.upgradeOverlay} onClick={() => setUpgradeOpen(false)}>
          <div style={styles.upgradeCard} onClick={e => e.stopPropagation()}>
            <button onClick={() => setUpgradeOpen(false)} style={{ ...styles.closeBtn, alignSelf: 'flex-end' }}>✕</button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
              <NorthStarIcon size={36} color={colors.sageDeep} />
              <p style={styles.upgradeTitle}>coo premium</p>
              <p style={styles.upgradeSubtitle}>everything you need for the long nights</p>
            </div>
            <div style={styles.upgradeFeatures}>
              {[
                ['all 6 playlists', 'including Teething & Comfort and Sleep Wind-Down'],
                ['sound mix controls', 'fine-tune every layer to your baby'],
                ['15 & 30 min sessions', 'looped for the long haul'],
                ['play all playlists', 'one tap, the full sequence while you rest'],
                ['custom queue order', 'arrange the playlists your way'],
              ].map(([title, desc]) => (
                <div key={title} style={styles.upgradeFeatureRow}>
                  <NorthStarIcon size={11} color={colors.sageMid} />
                  <div>
                    <p style={styles.upgradeFeatureTitle}>{title}</p>
                    <p style={styles.upgradeFeatureDesc}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              style={styles.purchaseBtn}
              onClick={async () => {
                if (!Capacitor.isNativePlatform()) {
                  setUpgradeOpen(false);
                  return;
                }
                try {
                  const { offerings } = await Purchases.getOfferings();
                  console.log('[IAP] offerings.current:', JSON.stringify(offerings.current));
                  const pkg = offerings.current?.availablePackages.find(
                    p => p.storeProduct.productIdentifier === IAP_PRODUCT_ID
                  );
                  console.log('[IAP] pkg found:', !!pkg, '| looking for:', IAP_PRODUCT_ID);
                  console.log('[IAP] available packages:', offerings.current?.availablePackages?.map(p => p.storeProduct.productIdentifier));
                  if (!pkg) throw new Error('Product not found in offerings');
                  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
                  if (customerInfo.entitlements.active[IAP_ENTITLEMENT_ID]) {
                    localStorage.setItem('coo_premium', 'true');
                    setIsPremium(true);
                    setUpgradeOpen(false);
                  }
                } catch (err) {
                  if (err?.code !== 1) {
                    console.error('[IAP] Purchase error:', err?.message, '| code:', err?.code, '| full:', JSON.stringify(err));
                  }
                }
              }}
            >
              unlock · $3.99
            </button>
            <p
              style={{ ...styles.restoreLink, cursor: 'pointer' }}
              onClick={async () => {
                try {
                  const { customerInfo } = await Purchases.restorePurchases();
                  if (customerInfo.entitlements.active[IAP_ENTITLEMENT_ID]) {
                    localStorage.setItem('coo_premium', 'true');
                    setIsPremium(true);
                    setUpgradeOpen(false);
                  }
                } catch (err) {
                  console.warn('[IAP] Restore failed:', err?.message);
                }
              }}
            >
              restore purchase
            </p>
          </div>
        </div>
      )}

      {/* Upgrade modal — bottom sheet teaser */}
      {upgradeModalOpen && (
        <div style={styles.aboutOverlay} onClick={() => setUpgradeModalOpen(false)}>
          <div style={{ ...styles.aboutCard, maxHeight: 'auto', padding: '28px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <NorthStarIcon size={16} color={colors.sageDeep} />
                <p style={{ ...styles.upgradeTitle, fontSize: '13px', margin: 0 }}>coo premium</p>
              </div>
              <button onClick={() => setUpgradeModalOpen(false)} style={styles.closeBtn}>✕</button>
            </div>
            <p style={{ ...styles.aboutBody, color: colors.textMuted, marginBottom: '20px' }}>
              this is part of COO Premium — unlock all playlists, the sound mixer, and extended sessions.
            </p>
            <button
              style={styles.purchaseBtn}
              onClick={() => { setUpgradeModalOpen(false); setUpgradeOpen(true); }}
            >
              see what's included
            </button>
          </div>
        </div>
      )}

      {/* About overlay */}
      {aboutOpen && (
        <div style={styles.aboutOverlay} onClick={() => setAboutOpen(false)}>
          <div style={styles.aboutCard} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexShrink: 0 }}>
              <CooLogo height={32} color={colors.sageDeep} />
              <button onClick={() => setAboutOpen(false)} style={styles.closeBtn}>✕</button>
            </div>
            <div style={styles.aboutScroll}>
              <p style={styles.aboutSection}>about</p>
              <p style={styles.aboutBody}>
                COO is a co-regulation companion for parents and caregivers,
                grounded in neuroscience and built on the science of how one
                nervous system soothes another.
              </p>
              <p style={{ ...styles.aboutSection, marginTop: '24px' }}>how it works</p>
              <p style={styles.aboutBody}>
                When you're calm, your baby feels it. This is co-regulation - the neurophysiological
                process by which a caregiver's settled nervous system helps an infant's undeveloped
                one find equilibrium. Infants are born without the capacity to self-regulate. Their
                autonomic nervous systems need an external scaffold, a regulated adult in close
                proximity. Heart rate variability, cortisol levels, and breathing rhythms synchronize
                between caregiver and child. The vagus nerve, which governs the parasympathetic
                "rest and digest" response, is still maturing in the first months of life. What you
                feel, your baby's body is learning to feel.
              </p>
              <p style={{ ...styles.aboutBody, marginTop: '14px' }}>
                COO is built around this science. Each layer is chosen to support your nervous system
                first, so that support can move outward.
              </p>
              <p style={{ ...styles.aboutSubhead, marginTop: '16px' }}>pink and brown noise</p>
              <p style={styles.aboutBody}>
                The womb registers around 85 decibels — a constant low rumble of blood flow and heartbeat.
                Pink and brown noise mirror this spectral shape, masking the sudden sounds that trigger
                a newborn's startle reflex. A predictable sound field tells the nervous system: nothing to brace against.
              </p>
              <p style={{ ...styles.aboutSubhead, marginTop: '16px' }}>heartbeat</p>
              <p style={styles.aboutBody}>
                Pulsed at 68 bpm — a resting maternal heart rate. For a newborn, the heartbeat was
                the first sound, steady before they had any other point of reference. The brain
                learns to associate this rhythm with safety before it learns anything else.
              </p>
              <p style={{ ...styles.aboutSubhead, marginTop: '16px' }}>solfeggio frequencies</p>
              <p style={styles.aboutBody}>
                An ancient tonal scale, each frequency paired with a specific physiological state.
                COO assigns one solfeggio tone to each playlist: 528 Hz for bonding and repair,
                396 Hz for releasing fear, 285 Hz for deep rest, 174 Hz for grounding,
                639 Hz for connection, 741 Hz for immune support.
              </p>
              <p style={{ ...styles.aboutSubhead, marginTop: '16px' }}>binaural tones</p>
              <p style={styles.aboutBody}>
                Two slightly different frequencies played simultaneously — the brain perceives a third
                tone equal to the difference and synchronizes toward that state. Delta for deep sleep,
                theta for drowsy calm, alpha for relaxed alertness.
              </p>
              <p style={{ ...styles.aboutBody, marginTop: '16px', fontStyle: 'italic', color: colors.textMuted }}>
                The goal is not silence. It's a sound environment that says: you are safe, you are held.
              </p>
              <p style={{ ...styles.aboutSection, marginTop: '28px' }}>dedication</p>
              <p style={styles.aboutBody}>
                This app was made with love for the Stark and Falsitta family,
                and in loving memory of Rocky Falsitta Jr.
              </p>
              <p style={{ ...styles.aboutBody, marginTop: '10px', fontStyle: 'italic' }}>
                Co-regulation is the science of showing up, of letting your calm
                become someone else's calm. What began as a gift for a grieving
                family became something for all of us.
              </p>
              <p style={styles.aboutFooter}>coo · north star studios · 2026</p>
            </div>
          </div>
        </div>
      )}

      {/* How'd it go? — post-session rating sheet */}
      {ratingOpen && (
        <div style={styles.ratingOverlay}>
          <div style={styles.ratingCard}>
            <p style={styles.ratingQuestion}>how'd it go?</p>
            <div style={styles.ratingOptions}>
              {[
                { label: 'it helped 🕊️', value: 'helped' },
                { label: 'a little ✨',              value: 'little' },
                { label: 'not tonight 🌙',     value: 'not-tonight' },
              ].map(({ label, value }) => (
                <button
                  key={value}
                  style={styles.ratingOption}
                  onClick={() => {
                    saveRating(ratingPlaylist, value);
                    setRatingOpen(false);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              style={styles.ratingDismiss}
              onClick={() => {
                try { localStorage.setItem('coo_session_rating_off', 'true'); } catch (_) {}
                setRatingOpen(false);
              }}
            >
              turn this off
            </button>
          </div>
        </div>
      )}

      {/* North star — top left — upgrade */}
      <button style={styles.starBtn} onClick={() => setUpgradeOpen(true)}>
        <NorthStarIcon />
      </button>

      {/* Info + Share — top right */}
      <button style={styles.infoBtn} onClick={() => setAboutOpen(true)}>
        <InfoIcon />
      </button>
      <button style={styles.shareBtn} onClick={handleShare}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <polyline points="16 6 12 2 8 6"/>
          <line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
      </button>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginTop: '-48px' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '240px', height: '80px', background: 'radial-gradient(ellipse, rgba(136,173,120,0.25) 0%, transparent 70%)', filter: 'blur(12px)', pointerEvents: 'none' }} />
        <CooLogo height={52} color={colors.text} />
        <p style={styles.tagline}>a co-regulation companion</p>
      </div>

      {/* Radial layout */}
      <div style={{ position: 'relative', width: CONTAINER, height: CONTAINER, flexShrink: 0, marginTop: '28px' }}>
        {/* Orbit ring */}
        <svg style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }} width={CONTAINER} height={CONTAINER}>
          <defs>
            <filter id="orbit-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="14" />
            </filter>
            <radialGradient id="inner-mask" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#F4F1EC" stopOpacity="1" />
              <stop offset="82%"  stopColor="#F4F1EC" stopOpacity="1" />
              <stop offset="100%" stopColor="#F4F1EC" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx={CENTER} cy={CENTER} r={175} fill="none" stroke="rgba(136,173,120,0.35)" strokeWidth="10" filter="url(#orbit-glow)" />
          <circle cx={CENTER} cy={CENTER} r={175} fill="url(#inner-mask)" stroke="none" />
        </svg>

        {playing && [0, 1, 2].map(i => (
          <div key={i} style={{ ...styles.ripple, left: CENTER, top: CENTER, animationDelay: `${i}s` }} />
        ))}

        {PLAYLISTS.map((p, i) => {
          const pos      = orbitPos(i, PLAYLISTS.length);
          const selected = selectedPlaylist === p.name;
          const locked   = PREMIUM_PLAYLISTS.includes(p.name) && !isPremium;
          return (
            <button
              key={p.name}
              onClick={() => handleSelect(p.name)}
              style={{
                ...styles.bubble,
                left: CENTER + pos.x - BUBBLE / 2,
                top:  CENTER + pos.y - BUBBLE / 2,
                background: selected
                  ? `linear-gradient(145deg, ${colors.sageLight}, ${colors.sageMid})`
                  : colors.surface,
                border: `1.5px solid ${selected ? colors.sageMid : colors.surfaceDeep}`,
                boxShadow: selected ? `0 4px 16px ${colors.sageMid}44` : 'none',
                opacity: locked ? 0.55 : 1,
              }}
            >
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p.Icon color={selected ? 'white' : colors.text} />
                {locked && (
                  <span style={{ position: 'absolute', bottom: -4, right: -6, lineHeight: 0 }}>
                    <NorthStarIcon size={9} color={colors.textMuted} />
                  </span>
                )}
              </div>
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
        <p style={styles.playlistLabel}>
          {playAllActive
            ? `${selectedPlaylist.toLowerCase()} · ${playAllIndex + 1} / ${playAllQueue.length}`
            : selectedPlaylist.toLowerCase()}
        </p>
      )}

      {/* Timer */}
      <div style={{ ...styles.timer, opacity: playing ? 1 : 0 }}>{timeStr}</div>

      {/* Mixer — collapsible, only while playing */}
      {playing && (
        <div style={styles.mixerCard}>
          <button
            style={styles.mixerHeader}
            onClick={() => isPremium ? setMixerOpen(o => !o) : setUpgradeModalOpen(true)}
          >
            <div style={{ textAlign: 'left' }}>
              <p style={styles.mixerTitle}>sound mix</p>
              {!mixerOpen && (
                <p style={styles.mixerSublabel}>
                  {isPremium ? config.label : 'unlock to customize · coo premium'}
                </p>
              )}
            </div>
            {isPremium
              ? <ChevronIcon open={mixerOpen} />
              : <NorthStarIcon size={14} color={colors.textMuted} />
            }
          </button>
          {isPremium && (
            <div style={{
              ...styles.mixerBody,
              maxHeight: mixerOpen ? '400px' : '0px',
              opacity:   mixerOpen ? 1 : 0,
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
                  <MixerSlider label={`${config.solfeggio.match(/\d+/)?.[0] ?? ''} hz`} value={solfeggioVol} onChange={v => { setSolfeggioVol(v); setLayerGain('solfeggio', v / 100); }} />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Breath cue */}
      <p style={styles.breathCue}>
        {playing
          ? "breathe with your baby.\nyou're already doing it."
          : 'choose a moment, then press play.'}
      </p>

      {/* Duration picker — shown when not playing */}
      {!playing && (
        <div style={styles.durationRow}>
          {[
            { label: '3 min', mode: 'melody' },
            { label: '15 min', mode: 15 },
            { label: '30 min', mode: 30 },
          ].map(({ label, mode }) => {
            const locked   = mode !== 'melody' && !isPremium;
            const selected = sessionMode === mode;
            return (
              <button
                key={mode}
                onClick={() => handleDurationSelect(mode)}
                style={{
                  ...styles.durationPill,
                  background:   selected ? colors.sageMid : colors.surface,
                  color:        selected ? 'white' : colors.textMuted,
                  border:       `1px solid ${selected ? colors.sageMid : colors.surfaceDeep}`,
                  opacity:      locked ? 0.6 : 1,
                  gap:          locked ? '4px' : '0',
                  display:      'flex',
                  alignItems:   'center',
                  justifyContent: 'center',
                }}
              >
                {locked && <NorthStarIcon size={9} color={selected ? 'white' : colors.textMuted} />}
                {label}
              </button>
            );
          })}
        </div>
      )}

      {!playing && (
        <div style={styles.soundPill}>{getPlaylistLabel(selectedPlaylist)}</div>
      )}

      {/* Unified Play All section — collapsible, shown when not playing */}
      {!playing && (
        <div style={styles.playAllSection}>
          <div style={styles.playAllHeader}>
            <button onClick={() => setPlayAllOpen(o => !o)} style={styles.playAllToggle}>
              <p style={styles.playAllTitle}>play all</p>
              {!isPremium && <p style={styles.playAllSublabel}>coo premium</p>}
              <ChevronIcon open={playAllOpen} />
            </button>
            <button onClick={handlePlayAll} style={styles.playAllStartBtn}>
              <PlayAllIcon color={isPremium ? colors.sageDeep : colors.textMuted} />
            </button>
          </div>
          <div style={{
            overflow: 'hidden',
            maxHeight: playAllOpen ? '400px' : '0px',
            opacity: playAllOpen ? 1 : 0,
            transition: 'max-height 0.35s ease, opacity 0.2s ease',
          }}>
            <div style={styles.playAllDivider} />
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={playAllQueue} strategy={verticalListSortingStrategy}>
                {playAllQueue.map((name, idx) => (
                  <SortableChip
                    key={name}
                    id={name}
                    index={idx}
                    isPremium={isPremium}
                    onPremiumGate={() => setUpgradeModalOpen(true)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>
      )}

      <p style={styles.volumeNote}>keep volume comfortable · device away from baby</p>
    </div>
  );
}

const styles = {
  container: {
    position: 'relative',
    minHeight: '100dvh',
    background: colors.bg,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'calc(env(safe-area-inset-top) + 72px) 24px calc(env(safe-area-inset-bottom) + 40px)',
    gap: '16px',
    boxSizing: 'border-box',
    overflowY: 'auto',
  },
  starBtn: {
    position: 'absolute',
    top: 'calc(env(safe-area-inset-top) + 16px)',
    left: '20px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
  },
  infoBtn: {
    position: 'absolute',
    top: 'calc(env(safe-area-inset-top) + 16px)',
    right: '54px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
  },
  shareBtn: {
    position: 'absolute',
    top: 'calc(env(safe-area-inset-top) + 16px)',
    right: '20px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
  },
  aboutOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(30, 42, 53, 0.4)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingBottom: '24px',
  },
  aboutCard: {
    background: colors.bg,
    width: '100%',
    maxWidth: '480px',
    borderRadius: '24px',
    padding: '28px 28px 0',
    boxSizing: 'border-box',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
  },
  aboutScroll: {
    overflowY: 'auto',
    paddingBottom: '36px',
    WebkitOverflowScrolling: 'touch',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    color: colors.textMuted,
    padding: '4px 8px',
    lineHeight: 1,
  },
  aboutSection: {
    fontSize: '9px',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: colors.sageDeep,
    margin: '0 0 8px 0',
  },
  aboutSubhead: {
    fontSize: '9px',
    letterSpacing: '0.12em',
    textTransform: 'lowercase',
    color: colors.sageMid,
    margin: '0 0 6px 0',
    fontStyle: 'italic',
  },
  aboutBody: {
    fontSize: '13px',
    color: colors.text,
    lineHeight: 1.7,
    margin: 0,
  },
  aboutFooter: {
    fontSize: '10px',
    color: colors.textMuted,
    letterSpacing: '0.08em',
    marginTop: '28px',
    textAlign: 'center',
  },
  upgradeOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(30, 42, 53, 0.5)',
    zIndex: 300,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingBottom: '24px',
  },
  upgradeCard: {
    background: colors.bg,
    width: '100%',
    maxWidth: '480px',
    borderRadius: '24px',
    padding: '28px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  upgradeTitle: {
    fontSize: '15px',
    letterSpacing: '0.12em',
    color: colors.text,
    margin: 0,
    fontFamily: 'Georgia, serif',
    fontStyle: 'italic',
  },
  upgradeSubtitle: {
    fontSize: '11px',
    color: colors.textMuted,
    letterSpacing: '0.06em',
    margin: 0,
    fontStyle: 'italic',
  },
  upgradeFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    marginBottom: '28px',
  },
  upgradeFeatureRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    paddingTop: '2px',
  },
  upgradeFeatureTitle: {
    fontSize: '13px',
    color: colors.text,
    margin: '0 0 2px 0',
    letterSpacing: '0.04em',
  },
  upgradeFeatureDesc: {
    fontSize: '11px',
    color: colors.textMuted,
    margin: 0,
    fontStyle: 'italic',
  },
  purchaseBtn: {
    background: `linear-gradient(145deg, ${colors.sageLight}, ${colors.sageMid})`,
    border: 'none',
    borderRadius: '14px',
    padding: '14px',
    fontSize: '13px',
    color: 'white',
    letterSpacing: '0.10em',
    cursor: 'pointer',
    width: '100%',
    fontFamily: 'Georgia, serif',
    fontStyle: 'italic',
  },
  restoreLink: {
    fontSize: '10px',
    color: colors.textMuted,
    letterSpacing: '0.06em',
    textAlign: 'center',
    marginTop: '12px',
    cursor: 'pointer',
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
    boxShadow: `0 8px 32px ${colors.sageMid}55, 0 0 28px rgba(136,173,120,0.28), 0 0 56px rgba(136,173,120,0.12)`,
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
  durationRow: {
    display: 'flex',
    gap: '8px',
  },
  durationPill: {
    borderRadius: '20px',
    padding: '4px 12px',
    fontSize: '10px',
    letterSpacing: '0.08em',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
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
    color: colors.text,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    margin: 0,
  },
  mixerSublabel: {
    fontSize: '9px',
    color: colors.sageDeep,
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
    margin: '10px 0',
    whiteSpace: 'pre-line',
  },
  soundPill: {
    background: colors.surface,
    border: `1px solid rgba(136,173,120,0.35)`,
    borderRadius: '20px',
    padding: '6px 16px',
    fontSize: '11px',
    color: colors.text,
    letterSpacing: '0.08em',
    boxShadow: '0 0 12px rgba(136,173,120,0.15)',
  },
  volumeNote: {
    fontSize: '10px',
    color: colors.textMuted,
    letterSpacing: '0.08em',
    textAlign: 'center',
    margin: 0,
    marginTop: 'auto',
  },
  playAllSection: {
    width: '100%',
    maxWidth: '320px',
    background: 'rgba(205, 218, 187, 0.28)',
    borderRadius: '20px',
    border: '1px solid rgba(136, 173, 120, 0.25)',
    overflow: 'hidden',
  },
  playAllHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 8px 4px 4px',
    gap: '4px',
  },
  playAllToggle: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px 8px 8px 12px',
    textAlign: 'left',
  },
  playAllTitle: {
    fontSize: '11px',
    color: colors.text,
    letterSpacing: '0.10em',
    margin: 0,
    fontFamily: 'Georgia, serif',
    fontStyle: 'italic',
    flex: 1,
  },
  playAllSublabel: {
    fontSize: '9px',
    color: colors.textMuted,
    letterSpacing: '0.08em',
    margin: 0,
  },
  playAllStartBtn: {
    background: 'none',
    border: 'none',
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  playAllDivider: {
    height: '1px',
    background: 'rgba(136, 173, 120, 0.2)',
    margin: '0 16px',
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
  ratingOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(30, 42, 53, 0.28)',
    zIndex: 400,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
  },
  ratingCard: {
    background: colors.bg,
    width: '100%',
    maxWidth: '480px',
    borderRadius: '24px',
    padding: '28px 28px 24px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  ratingQuestion: {
    fontSize: '16px',
    fontFamily: 'Georgia, serif',
    fontStyle: 'italic',
    color: colors.text,
    letterSpacing: '0.06em',
    margin: 0,
  },
  ratingOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%',
  },
  ratingOption: {
    background: colors.surface,
    border: `1px solid ${colors.surfaceDeep}`,
    borderRadius: '14px',
    padding: '13px 16px',
    fontSize: '14px',
    color: colors.text,
    letterSpacing: '0.04em',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'center',
    fontFamily: 'Georgia, serif',
    fontStyle: 'italic',
    transition: 'background 0.15s ease',
  },
  ratingDismiss: {
    background: 'none',
    border: 'none',
    fontSize: '11px',
    color: colors.textMuted,
    letterSpacing: '0.06em',
    cursor: 'pointer',
    padding: '4px 8px',
    marginTop: '2px',
    opacity: 0.7,
  },
};
