
import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = "", size = 120 }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {/* Glow di sfondo */}
      <div className="absolute inset-0 bg-blue-500/25 blur-[45px] rounded-full animate-pulse" />
      
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]"
      >
        <defs>
          <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          
          <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <radialGradient id="inner-light" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="white" stopOpacity="0.4" />
            <stop offset="100%" stopColor="black" stopOpacity="0.1" />
          </radialGradient>
        </defs>

        {/* Base della tile */}
        <rect
          x="10" y="10" width="80" height="80"
          rx="22" fill="#020617"
          stroke="url(#logo-grad)" strokeWidth="1.8"
        />
        
        {/* Griglia sbiadita interna */}
        <path d="M10 40H90M10 70H90M40 10V90M70 10V90" stroke="white" strokeOpacity="0.08" strokeWidth="0.5" />

        {/* Mura Neon (Formano una W stilizzata) */}
        <g filter="url(#neon-glow)" className="animate-[neon-flicker_5s_infinite]">
          {/* Muro Sinistro */}
          <path
            d="M25 30V70"
            stroke="#3b82f6" strokeWidth="6.5" strokeLinecap="round"
          />
          {/* Diagonale 1 */}
          <path
            d="M25 70L50 45"
            stroke="#3b82f6" strokeWidth="6.5" strokeLinecap="round"
          />
          {/* Diagonale 2 */}
          <path
            d="M50 45L75 70"
            stroke="#10b981" strokeWidth="6.5" strokeLinecap="round"
          />
          {/* Muro Destro */}
          <path
            d="M75 70V30"
            stroke="#10b981" strokeWidth="6.5" strokeLinecap="round"
          />
        </g>

        {/* La Pedina (Cilindro centrale) */}
        <circle cx="50" cy="45" r="9" fill="#ef4444" className="animate-pulse" />
        <circle cx="50" cy="45" r="9" fill="url(#inner-light)" />
        <circle cx="47" cy="42" r="2.5" fill="white" fillOpacity="0.6" />

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes neon-flicker {
            0%, 18%, 22%, 25%, 53%, 57%, 100% { opacity: 1; filter: drop-shadow(0 0 10px #3b82f6); }
            20%, 24%, 55% { opacity: 0.6; filter: none; }
          }
        `}} />
      </svg>
    </div>
  );
};
