
import React, { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
  speedY: number;
  speedX: number;
  spin: number;
  type: 'confetti' | 'streamer';
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ffffff', '#fbbf24'];

export const Confetti: React.FC = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const p: Particle[] = Array.from({ length: 150 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 100,
      size: Math.random() * 10 + 5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 360,
      speedY: Math.random() * 1.5 + 1.5,
      speedX: Math.random() * 2 - 1,
      spin: Math.random() * 12 - 6,
      type: Math.random() > 0.7 ? 'streamer' : 'confetti'
    }));
    setParticles(p);

    let animationFrame: number;
    const update = () => {
      setParticles(prev => prev.map(pt => ({
        ...pt,
        y: pt.y > 110 ? -20 : pt.y + pt.speedY,
        x: (pt.x + Math.sin(pt.y / 8) * 0.3 + pt.speedX * 0.2 + 100) % 100,
        rotation: pt.rotation + pt.spin
      })));
      animationFrame = requestAnimationFrame(update);
    };

    animationFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[2000] overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute"
          style={{
            top: `${p.y}%`,
            left: `${p.x}%`,
            width: p.type === 'confetti' ? `${p.size}px` : `${p.size * 4}px`,
            height: p.type === 'confetti' ? `${p.size}px` : `5px`,
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg)`,
            borderRadius: p.type === 'confetti' ? '2px' : '10px',
            opacity: 0.9,
            boxShadow: `0 0 10px ${p.color}66`
          }}
        />
      ))}
    </div>
  );
};
