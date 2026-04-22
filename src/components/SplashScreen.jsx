import { useState, useEffect, useRef } from 'react';
import { colors } from '../theme';
import CooLogo from './CooLogo';

// NOTE (future): Only show splash on first launch.
// Implementation: check localStorage.getItem('coo_launched') on mount.
// If set, call onComplete() immediately. If not, show splash and set the flag after.
// Not implemented yet — show every time for now.

export default function SplashScreen({ onComplete }) {
  const [exiting, setExiting] = useState(false);
  const orbRef = useRef(null);

  useEffect(() => {
    // tagline 2 fully visible ~2.9s + 1s pause = 3.9s
    // Switch animation imperatively — no state change, no re-render flicker
    const orbTimer  = setTimeout(() => {
      if (orbRef.current) {
        orbRef.current.style.animation = 'splashBloom 3.5s ease-out forwards';
      }
    }, 3900);
    const exitTimer = setTimeout(() => setExiting(true), 5700);
    const doneTimer = setTimeout(() => onComplete(),     9000);
    return () => { clearTimeout(orbTimer); clearTimeout(exitTimer); clearTimeout(doneTimer); };
  }, [onComplete]);

  function handleSkip() {
    if (orbRef.current) {
      orbRef.current.style.animation = 'splashBloom 3.5s ease-out forwards';
    }
    setExiting(true);
    setTimeout(() => onComplete(), 600);
  }

  return (
    <div
      className={exiting ? 'splash-container splash-exit' : 'splash-container'}
      onClick={handleSkip}
    >
      <div ref={orbRef} className="splash-orb" />
      <div className="splash-logo">
        <CooLogo height={60} color={colors.sageDeep} />
      </div>
      <p className="splash-line splash-line-1">grounded in neuroscience</p>
      <p className="splash-line splash-line-2">built on the science of co-regulation</p>
    </div>
  );
}
