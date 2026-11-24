import React, { useEffect, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { BuildKeys } from '../generated/buildConfig';

interface WelcomeScreenProps {
  username?: string;
  onEnter: () => void;
}

/**
 * Exact visual port of `ui/screens/welcome/WelcomeScreen.kt`:
 * Signature TurboGreen (#8BE51B) + Pure Black (#090E0A), glowing orbital rings,
 * scaling emblem, user greeting, linear progress bar, and instant Enter button.
 */
export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ username, onEnter }) => {
  const [progress, setProgress] = useState(0);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const start = performance.now();
    const duration = 3400;
    let raf = 0;

    const tick = (now: number) => {
      const pct = Math.min(100, ((now - start) / duration) * 100);
      setProgress(pct);
      if (pct < 100) {
        raf = requestAnimationFrame(tick);
      } else {
        setEntered((prev) => {
          if (!prev) onEnter();
          return true;
        });
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onEnter]);

  const triggerEnter = () => {
    if (entered) return;
    setEntered(true);
    onEnter();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        background:
          'radial-gradient(circle at 50% 38%, rgba(47, 122, 11, 0.32) 0%, rgba(9, 14, 10, 0.98) 62%, #050806 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#F2F7F0',
        userSelect: 'none',
      }}
    >
      {/* Animated glowing orbital ring */}
      <div style={{ position: 'relative', width: 158, height: 158, marginBottom: 24 }}>
        <div
          className="tcl-spin-slow"
          style={{
            position: 'absolute',
            inset: -12,
            borderRadius: '50%',
            border: '1.5px dashed rgba(139, 229, 27, 0.45)',
            boxShadow: '0 0 48px rgba(139, 229, 27, 0.28)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 36,
            background: 'linear-gradient(145deg, rgba(139,229,27,0.22), rgba(15,28,14,0.9))',
            border: '1.5px solid rgba(139, 229, 27, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 22px 50px rgba(0,0,0,0.65)',
          }}
        >
          <img
            src="./assets/turbocraft-icon.png"
            alt="TurboCraft Launcher"
            style={{ width: 108, height: 108, borderRadius: 24 }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 12px',
          borderRadius: 999,
          background: 'rgba(139, 229, 27, 0.14)',
          border: '1px solid rgba(139, 229, 27, 0.38)',
          color: '#8BE51B',
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: 1.2,
          marginBottom: 12,
        }}
      >
        <Sparkles size={13} /> PC EDITION • V{BuildKeys.LAUNCHER_VERSION_NAME}
      </div>

      <h1
        style={{
          margin: 0,
          fontSize: 36,
          fontWeight: 800,
          letterSpacing: -0.6,
          background: 'linear-gradient(90deg, #FFFFFF 15%, #8BE51B 95%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {BuildKeys.LAUNCHER_NAME}
      </h1>

      <p style={{ margin: '8px 0 26px', fontSize: 14.5, color: 'rgba(230,240,228,0.72)' }}>
        {username
          ? `Welcome back, ${username} — One Core, Endless Worlds.`
          : 'One Core, Endless Worlds — Built for Desktop Gamers.'}
      </p>

      <button
        type="button"
        onClick={triggerEnter}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 28px',
          borderRadius: 999,
          border: 'none',
          background: 'linear-gradient(135deg, #8BE51B 0%, #58A70B 100%)',
          color: '#071204',
          fontSize: 14.5,
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: '0 10px 30px rgba(139, 229, 27, 0.35)',
        }}
      >
        Enter Launcher <ArrowRight size={17} />
      </button>

      {/* Bottom progress bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 36,
          width: 280,
          height: 4,
          borderRadius: 999,
          background: 'rgba(255,255,255,0.12)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: '#8BE51B',
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
};
