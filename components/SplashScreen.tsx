
import React, { useEffect, useState } from 'react';
import { Logo } from './Logo';
import packageJson from '../package.json';

export const SplashScreen: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    // Reveal animation
    setMounted(true);
    
    // Progress bar animation to simulate initial loading
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 1.5;
      setProgress(Math.min(currentProgress, 100));
      if (currentProgress >= 100) {
        clearInterval(interval);
        setTimeout(onFinish, 300);
      }
    }, 25);
    
    return () => clearInterval(interval);
  }, [onFinish]);

  return (
    <div 
      className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center text-white z-[9999] overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15)_0%,rgba(2,6,23,1)_70%)]" />
      
      <div className={`transition-all duration-1000 ease-out transform ${mounted ? 'scale-100 opacity-100' : 'scale-95 opacity-0'} flex flex-col items-center z-10 w-full px-8`}>
        <div className="mb-6 drop-shadow-[0_0_20px_rgba(59,130,246,0.4)]">
          <Logo size={160} />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-black italic text-transparent bg-clip-text bg-gradient-to-br from-white via-blue-100 to-blue-400 tracking-tighter mb-2 drop-shadow-sm">
          WALL GO <span className="text-blue-500">AI</span>
        </h1>
        
        <p className="text-blue-400/80 text-sm md:text-base font-bold tracking-[0.2em] mb-12 uppercase drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">
          Neon Battle
        </p>

        {/* Progress Bar Container */}
        <div className="w-56 h-[3px] bg-slate-800/80 rounded-full overflow-hidden relative shadow-[0_0_15px_rgba(59,130,246,0.2)]">
           <div 
             className="h-full bg-blue-500 transition-all duration-75 ease-linear shadow-[0_0_10px_rgba(59,130,246,0.8)]" 
             style={{ width: `${progress}%` }} 
           />
        </div>
      </div>

      {/* Version Number at the bottom */}
      <div className={`absolute bottom-6 left-0 right-0 flex justify-center text-[10px] font-mono font-bold tracking-[0.2em] text-slate-500/70 transition-opacity duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'} z-10`}>
        v{packageJson.version}
      </div>
    </div>
  );
};
