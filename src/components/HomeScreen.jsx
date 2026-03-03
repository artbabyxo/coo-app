import { colors } from '../theme';
import CooLogo from './CooLogo';

const PLAYLISTS = [
  { name: 'Calm & Settle',      icon: '🌊', desc: 'Pink noise · nervous system downshift' },
  { name: 'Big Feelings',       icon: '🌿', desc: 'Brown noise · deep enveloping calm' },
  { name: 'Teething & Comfort', icon: '☁️', desc: 'White noise · womb-like soothing' },
  { name: 'Sleep Wind-Down',    icon: '🌙', desc: 'Pink noise · heartbeat · bedtime' },
  { name: 'Immune Support',     icon: '✨', desc: 'Pink noise · gentle wellness ambience' },
  { name: 'Bonding',            icon: '🤍', desc: 'Heartbeat · pink noise · connection' },
];

export default function HomeScreen({ onPlay, selectedPlaylist, onSelectPlaylist }) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <CooLogo height={64} color={colors.text} />
        <p style={styles.tagline}>a gentle sound companion</p>
      </div>

      <div style={styles.playlistSection}>
        <p style={styles.sectionLabel}>choose a moment</p>
        <div style={styles.playlistGrid}>
          {PLAYLISTS.map((p) => (
            <button
              key={p.name}
              style={{
                ...styles.playlistCard,
                ...(selectedPlaylist === p.name ? styles.playlistCardSelected : {}),
              }}
              onClick={() => onSelectPlaylist(p.name)}
            >
              <span style={styles.cardIcon}>{p.icon}</span>
              <span style={styles.cardName}>{p.name}</span>
              <span style={styles.cardDesc}>{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <button style={styles.playButton} onClick={() => onPlay(selectedPlaylist)}>
        <span style={styles.playButtonInner}>play</span>
      </button>

      <p style={styles.footnote}>
        You don't have to figure it out. Just press play.
      </p>
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
    padding: '48px 24px 40px',
    gap: '36px',
    boxSizing: 'border-box',
  },
  header: {
    textAlign: 'center',
  },
  logo: {
    fontSize: '52px',
    fontWeight: '200',
    letterSpacing: '0.18em',
    color: colors.text,
    margin: 0,
    fontFamily: 'Georgia, serif',
  },
  tagline: {
    fontSize: '13px',
    color: colors.textMuted,
    letterSpacing: '0.12em',
    margin: '8px 0 0',
    textTransform: 'lowercase',
  },
  playlistSection: {
    width: '100%',
    maxWidth: '420px',
  },
  sectionLabel: {
    fontSize: '11px',
    color: colors.textMuted,
    letterSpacing: '0.14em',
    textTransform: 'lowercase',
    marginBottom: '14px',
    textAlign: 'center',
  },
  playlistGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  playlistCard: {
    background: colors.surface,
    border: `1.5px solid transparent`,
    borderRadius: '16px',
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '4px',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    textAlign: 'left',
  },
  playlistCardSelected: {
    background: colors.blueLight,
    border: `1.5px solid ${colors.blueMid}`,
  },
  cardIcon: {
    fontSize: '20px',
    marginBottom: '4px',
  },
  cardName: {
    fontSize: '13px',
    fontWeight: '500',
    color: colors.text,
    lineHeight: 1.3,
  },
  cardDesc: {
    fontSize: '11px',
    color: colors.textMuted,
    lineHeight: 1.4,
  },
  playButton: {
    width: '140px',
    height: '140px',
    borderRadius: '50%',
    background: `linear-gradient(145deg, ${colors.blueMid}, ${colors.blueDeep})`,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 8px 32px ${colors.blueMid}55`,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  playButtonInner: {
    fontSize: '22px',
    fontWeight: '200',
    letterSpacing: '0.18em',
    color: colors.white,
    fontFamily: 'Georgia, serif',
  },
  footnote: {
    fontSize: '12px',
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: '240px',
    lineHeight: 1.7,
    fontStyle: 'italic',
  },
};
