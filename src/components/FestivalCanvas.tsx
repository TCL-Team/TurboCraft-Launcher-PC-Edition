import React, { useEffect, useRef } from 'react';
import { FestivalEffectId } from '../types/launcher';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
  color: string;
  life?: number;
  maxLife?: number;
}

export const FestivalCanvas: React.FC<{ effect: FestivalEffectId }> = ({ effect }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (effect === 'none') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    const particles: Particle[] = [];
    const count =
      effect === 'rain' ? 95 : effect === 'snow' ? 65 : effect === 'fireworks' ? 0 : 38;

    const palette =
      effect === 'fireflies'
        ? ['#8BE51B', '#C9FF66', '#9EF01A', '#FFE66D']
        : effect === 'hearts'
          ? ['#FF6B9D', '#FF8FAB', '#FB6F92', '#FFB3C6']
          : ['#FFFFFF', '#D8F3DC', '#BDE0FE'];

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * (effect === 'bats' ? 2.4 : 0.8),
        vy:
          effect === 'rain'
            ? 7 + Math.random() * 6
            : effect === 'snow'
              ? 0.8 + Math.random() * 1.5
              : effect === 'hearts'
                ? -(0.6 + Math.random() * 1.1)
                : (Math.random() - 0.5) * 0.6,
        size:
          effect === 'rain'
            ? 12 + Math.random() * 10
            : 2 + Math.random() * 3.5,
        alpha: 0.25 + Math.random() * 0.65,
        phase: Math.random() * Math.PI * 2,
        color: palette[i % palette.length],
      });
    }

    const spawnFirework = (cx: number, cy: number) => {
      const colors = ['#8BE51B', '#73D2FB', '#FE7A52', '#F9B2D2', '#FFD166'];
      const col = colors[Math.floor(Math.random() * colors.length)];
      for (let i = 0; i < 36; i++) {
        const angle = (Math.PI * 2 * i) / 36 + Math.random() * 0.15;
        const speed = 1.4 + Math.random() * 3.8;
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 2.2 + Math.random() * 2,
          alpha: 1,
          phase: 0,
          color: col,
          life: 0,
          maxLife: 55 + Math.random() * 30,
        });
      }
    };

    let autoBurstTick = 0;
    const onWindowClick = (e: MouseEvent) => {
      if (effect === 'fireworks') {
        spawnFirework(e.clientX, e.clientY);
      }
    };
    window.addEventListener('pointerdown', onWindowClick);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (effect === 'fireworks') {
        autoBurstTick++;
        if (autoBurstTick % 75 === 1) {
          spawnFirework(
            width * (0.15 + Math.random() * 0.7),
            height * (0.12 + Math.random() * 0.45)
          );
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.phase += 0.035;

        if (effect === 'fireworks') {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.045;
          p.vx *= 0.985;
          p.life = (p.life || 0) + 1;
          const ratio = 1 - (p.life || 0) / (p.maxLife || 60);
          if (ratio <= 0) {
            particles.splice(i, 1);
            continue;
          }
          ctx.globalAlpha = ratio * 0.85;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * ratio, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }

        p.x += p.vx + (effect === 'snow' || effect === 'fireflies' ? Math.sin(p.phase) * 0.35 : 0);
        p.y += p.vy + (effect === 'bats' ? Math.sin(p.phase * 2.2) * 0.9 : 0);

        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y > height + 20) p.y = -15;
        if (p.y < -20) p.y = height + 15;

        if (effect === 'rain') {
          ctx.strokeStyle = 'rgba(185, 226, 255, 0.28)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 1.5, p.y + p.size);
          ctx.stroke();
        } else if (effect === 'fireflies') {
          const glow = 0.25 + 0.65 * Math.abs(Math.sin(p.phase));
          ctx.globalAlpha = glow;
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3.4);
          grad.addColorStop(0, p.color);
          grad.addColorStop(1, 'rgba(139, 229, 27, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (effect === 'hearts') {
          ctx.globalAlpha = p.alpha * 0.7;
          ctx.fillStyle = p.color;
          const s = p.size * 1.8;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y + s / 4);
          ctx.quadraticCurveTo(p.x, p.y, p.x + s / 4, p.y);
          ctx.quadraticCurveTo(p.x + s / 2, p.y, p.x + s / 2, p.y + s / 4);
          ctx.quadraticCurveTo(p.x + s / 2, p.y, p.x + (s * 3) / 4, p.y);
          ctx.quadraticCurveTo(p.x + s, p.y, p.x + s, p.y + s / 4);
          ctx.quadraticCurveTo(p.x + s, p.y + s / 2, p.x + s / 2, p.y + (s * 3) / 4);
          ctx.quadraticCurveTo(p.x, p.y + s / 2, p.x, p.y + s / 4);
          ctx.fill();
        } else if (effect === 'bats') {
          ctx.globalAlpha = 0.45;
          ctx.strokeStyle = '#D8B4F8';
          ctx.lineWidth = 1.8;
          const flap = Math.sin(p.phase * 4) * 5;
          ctx.beginPath();
          ctx.moveTo(p.x - 8, p.y + flap);
          ctx.quadraticCurveTo(p.x - 4, p.y - 4, p.x, p.y);
          ctx.quadraticCurveTo(p.x + 4, p.y - 4, p.x + 8, p.y + flap);
          ctx.stroke();
        } else {
          // snow
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointerdown', onWindowClick);
    };
  }, [effect]);

  if (effect === 'none') return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 4,
      }}
    />
  );
};
