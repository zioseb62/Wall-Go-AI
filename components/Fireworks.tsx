import React, { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  speedY: number;
  speedX: number;
  life: number;
  maxLife: number;
}

const COLORS = [
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#3b82f6",
  "#ffffff",
];

export const Fireworks: React.FC = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    let pArray: Particle[] = [];
    let particleId = 0;

    const createExplosion = (x: number, y: number) => {
      const pColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 2 + 1;
        pArray.push({
          id: particleId++,
          x,
          y,
          size: Math.random() * 4 + 2,
          color: pColor,
          speedX: Math.cos(angle) * velocity,
          speedY: Math.sin(angle) * velocity,
          life: 0,
          maxLife: Math.random() * 30 + 40,
        });
      }
    };

    // Initial explosions
    createExplosion(30, 40);
    createExplosion(70, 30);
    createExplosion(50, 60);

    let animationFrame: number;
    let frames = 0;

    const update = () => {
      frames++;
      if (frames % 40 === 0 && Math.random() > 0.3) {
        createExplosion(Math.random() * 80 + 10, Math.random() * 60 + 10);
      }

      setParticles([...pArray]);

      pArray = pArray
        .filter((p) => p.life < p.maxLife)
        .map((p) => ({
          ...p,
          x: p.x + p.speedX * 0.5,
          y: p.y + p.speedY * 0.5 + 0.05, // simple gravity
          life: p.life + 1,
          speedX: p.speedX * 0.98,
          speedY: p.speedY * 0.98,
        }));

      if (pArray.length > 300) {
        pArray.splice(0, pArray.length - 300);
      }

      animationFrame = requestAnimationFrame(update);
    };

    animationFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[2000] overflow-hidden">
      {particles.map((p) => {
        const opacity = Math.max(0, 1 - p.life / p.maxLife);
        return (
          <div
            key={p.id}
            className="absolute rounded-full"
            style={{
              top: `${p.y}%`,
              left: `${p.x}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              opacity: opacity,
              transform: "translate(-50%, -50%)",
              boxShadow: `0 0 ${p.size * 2}px ${p.color}, 0 0 ${p.size * 4}px ${p.color}`,
            }}
          />
        );
      })}
    </div>
  );
};
