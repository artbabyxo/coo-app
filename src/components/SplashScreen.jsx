import { useState, useEffect } from 'react';
import { colors } from '../theme';
import CooLogo from './CooLogo';

// NOTE (future): Only show splash on first launch.
// Implementation: check localStorage.getItem('coo_launched') on mount.
// If set, call onComplete() immediately. If not, show splash and set the flag after.
// Not implemented yet — show every time for now.

export default function SplashScreen({ onComplete }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), 4000);
    const doneTimer = setTimeout(() => onComplete(), 4900);
    return () => { clearTimeout(exitTimer); clearTimeout(doneTimer); };
  }, [onComplete]);

  function handleSkip() {
    setExiting(true);
    setTimeout(() => onComplete(), 600);
  }

  return (
    <div
      className={exiting ? 'splash-container splash-exit' : 'splash-container'}
      onClick={handleSkip}
    >
      <div className="splash-logo">
        <CooLogo height={60} color={colors.text} />
      </div>
      <p className="splash-line splash-line-1">grounded in neuroscience</p>
      <p className="splash-line splash-line-2">built on the science of co-regulation</p>
      {exiting && <div className="splash-bloom" />}
    </div>
  );
}
