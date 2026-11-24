import React, { useEffect, useRef, useState } from 'react';
import * as skinview3d from 'skinview3d';

interface SkinViewer3DProps {
  skinUrl?: string;
  capeUrl?: string;
  slim?: boolean;
  width?: number;
  height?: number;
  interactiveControls?: boolean;
  initialPose?: 'idle' | 'walk' | 'run' | 'fly';
}

/**
 * Port of TurboCraft Launcher's `PetModelView` / `PetLib` + `skinview3d`:
 * - Live 3D Minecraft Player + Cape rendering
 * - Cursor Gaze Router (head gently tracks mouse cursor!)
 * - Tap reaction (click player to trigger energetic wave/jump spin!)
 * - Graceful 2D pixel-art fallback if headless browser lacks WebGL
 */
export const SkinViewer3D: React.FC<SkinViewer3DProps> = ({
  skinUrl = './assets/skin/steve.png',
  capeUrl,
  slim = false,
  width = 230,
  height = 290,
  interactiveControls = true,
  initialPose = 'idle',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerRef = useRef<skinview3d.SkinViewer | null>(null);
  const [pose, setPose] = useState<'idle' | 'walk' | 'run' | 'fly'>(initialPose);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const [tapBounce, setTapBounce] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let viewer: skinview3d.SkinViewer | null = null;
    try {
      viewer = new skinview3d.SkinViewer({
        canvas,
        width,
        height,
        skin: skinUrl || './assets/skin/steve.png',
        model: slim ? 'slim' : 'default',
      });
      viewer.fov = 48;
      viewer.zoom = 0.88;
      viewer.controls.enableZoom = false;
      viewer.controls.enablePan = false;
      viewer.playerObject.rotation.y = 0.35;

      if (capeUrl) {
        void viewer.loadCape(capeUrl).catch(() => undefined);
      }

      viewerRef.current = viewer;
    } catch {
      setWebglUnavailable(true);
      return;
    }

    // Gaze router: head follows pointer subtly like PetGazeRouter.kt
    const onPointerMove = (e: MouseEvent) => {
      if (!viewer || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height * 0.32;
      const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / 360));
      const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / 320));
      viewer.playerObject.skin.head.rotation.y = dx * 0.45;
      viewer.playerObject.skin.head.rotation.x = dy * 0.32;
    };
    window.addEventListener('mousemove', onPointerMove);

    return () => {
      window.removeEventListener('mousemove', onPointerMove);
      viewer?.dispose();
      viewerRef.current = null;
    };
  }, [width, height]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    void viewer
      .loadSkin(skinUrl || './assets/skin/steve.png', { model: slim ? 'slim' : 'default' })
      .catch(() => {
        void viewer.loadSkin('./assets/skin/steve.png');
      });
  }, [skinUrl, slim]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (capeUrl) {
      void viewer.loadCape(capeUrl).catch(() => undefined);
    } else {
      viewer.loadCape(null);
    }
  }, [capeUrl]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (pose === 'idle') viewer.animation = new skinview3d.IdleAnimation();
    else if (pose === 'walk') viewer.animation = new skinview3d.WalkingAnimation();
    else if (pose === 'run') viewer.animation = new skinview3d.RunningAnimation();
    else if (pose === 'fly') viewer.animation = new skinview3d.FlyingAnimation();
  }, [pose]);

  const handleTapReaction = () => {
    setTapBounce(true);
    setTimeout(() => setTapBounce(false), 520);
    const viewer = viewerRef.current;
    if (viewer) {
      const startRot = viewer.playerObject.rotation.y;
      const started = performance.now();
      const spin = (now: number) => {
        const t = Math.min(1, (now - started) / 480);
        const ease = 1 - Math.pow(1 - t, 3);
        viewer.playerObject.rotation.y = startRot + Math.PI * 2 * ease;
        if (t < 1) requestAnimationFrame(spin);
      };
      requestAnimationFrame(spin);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      <div
        onClick={handleTapReaction}
        title="Click to interact • Drag to rotate 3D Player Model"
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'grab',
          transform: tapBounce ? 'translateY(-10px) scale(1.04)' : 'translateY(0) scale(1)',
          transition: 'transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)',
          filter: 'drop-shadow(0 18px 28px rgba(0,0,0,0.45))',
        }}
      >
        {webglUnavailable ? (
          <div style={{ textAlign: 'center' }}>
            <img
              src={skinUrl || './assets/skin/steve.png'}
              alt="Player Skin"
              style={{ width: 96, height: 96, imageRendering: 'pixelated', borderRadius: 14 }}
            />
          </div>
        ) : (
          <canvas ref={canvasRef} width={width} height={height} />
        )}
      </div>

      {interactiveControls && (
        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: '3px 5px',
            borderRadius: 999,
            background: 'rgba(0,0,0,0.34)',
            border: '1px solid rgba(255,255,255,0.09)',
            marginTop: -6,
          }}
        >
          {(['idle', 'walk', 'run', 'fly'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPose(p)}
              style={{
                border: 'none',
                borderRadius: 999,
                padding: '3px 9px',
                fontSize: 10.5,
                fontWeight: 600,
                textTransform: 'capitalize',
                cursor: 'pointer',
                background: pose === p ? 'var(--primary)' : 'transparent',
                color: pose === p ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                transition: 'all 0.18s ease',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
