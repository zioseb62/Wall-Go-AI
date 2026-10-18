import React, { useMemo } from 'react';
import { YinshPoint, YinshState } from '../types';
import { getYinshValidPoints } from '../utils/yinshLogic';
import { PLAYER_COLORS } from '../constants';

import { getValidYinshMoves } from '../utils/yinshLogic';

interface YinshBoardProps {
  gameState: YinshState;
  onPointClick: (p: YinshPoint) => void;
  currentPlayerId?: number;
  width?: number | string;
  height?: number | string;
}

const YinshBoard: React.FC<YinshBoardProps> = ({ gameState, onPointClick, currentPlayerId, width = '100%', height = '100%' }) => {
  const points = useMemo(() => getYinshValidPoints(), []);
  
  const validMoves = useMemo(() => {
    if (gameState.phase === 'move_ring' && gameState.selectedRing) {
       return getValidYinshMoves(gameState, gameState.selectedRing);
    }
    return [];
  }, [gameState]);
  
  // Coordinate conversion (pointy-topped hex grid)
  const hexSize = 50;
  const getXY = (q: number, r: number) => {
    // Standard pointy-topped
    const x = hexSize * Math.sqrt(3) * (q + r / 2);
    const y = hexSize * 1.5 * r;
    return { x, y };
  };

  // Compute connections (lines between points)
  const lines = useMemo(() => {
    const linesArr: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const pointsSet = new Set(points.map(p => `${p.q},${p.r}`));
    
    points.forEach(p => {
      const { x: x1, y: y1 } = getXY(p.q, p.r);
      // Connect to neighbors: (q+1, r), (q, r+1), (q-1, r+1)
      const neighbors = [
        { q: p.q + 1, r: p.r },
        { q: p.q, r: p.r + 1 },
        { q: p.q - 1, r: p.r + 1 }
      ];
      
      neighbors.forEach(n => {
        if (pointsSet.has(`${n.q},${n.r}`)) {
          const { x: x2, y: y2 } = getXY(n.q, n.r);
          linesArr.push({ x1, y1, x2, y2 });
        }
      });
    });
    return linesArr;
  }, [points]);

  // Compute bounding box
  const viewBox = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(p => {
      const { x, y } = getXY(p.q, p.r);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });
    const padding = hexSize;
    return `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`;
  }, [points]);

  return (
    <svg width={width} height={height} viewBox={viewBox} className="select-none">
      <defs>
        <filter id="shadow">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.5" />
        </filter>
        <filter id="ring-shadow">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodOpacity="0.6" />
        </filter>
        {[1, 2, 3, 4].map(id => (
          <linearGradient key={`grad-${id}`} id={`markerGrad-${id}`} x1="0" y1="0" x2="1" y2="1">
             {/* @ts-ignore */}
             <stop offset="0%" stopColor={PLAYER_COLORS[id]} stopOpacity="0.9" />
             {/* @ts-ignore */}
             <stop offset="100%" stopColor={PLAYER_COLORS[id]} stopOpacity="0.5" />
          </linearGradient>
        ))}
      </defs>
      
      {/* Draw lines */}
      <g stroke="#ffffff" strokeOpacity="0.2" strokeWidth="2">
        {lines.map((l, i) => (
          <line key={`line-${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
        ))}
      </g>
      
      {/* Draw points/intersections (click targets) */}
      <g>
        {points.map(p => {
          const { x, y } = getXY(p.q, p.r);
          const key = `${p.q},${p.r}`;
          
          return (
            <circle
              key={`target-${key}`}
              cx={x}
              cy={y}
              r={22}
              fill="transparent"
              className="cursor-pointer hover:fill-white/10 transition-colors"
              onClick={() => onPointClick(p)}
            />
          );
        })}
      </g>
      
      {/* Draw markers */}
      <g>
        {Object.entries(gameState.markers).map(([key, playerId]) => {
          const [q, r] = key.split(',').map(Number);
          const { x, y } = getXY(q, r);
          // @ts-ignore
          const fill = `url(#markerGrad-${playerId})`;
          // @ts-ignore
          const stroke = PLAYER_COLORS[playerId] || '#ffffff';
          
          // Is this marker part of an active row?
          const isActive = gameState.activeRows.some(row => row.points.some(p => p.q === q && p.r === r));
          const radius = 22;
          const d = radius * 2;
          // @ts-ignore
          const color = PLAYER_COLORS[playerId] || '#fff';
          
          let colorTransitionDelay = '0ms';
          if (gameState.lastMove) {
            const timeSince = Date.now() - gameState.lastMove.timestamp;
            if (timeSince < 4000) {
              const { from, to } = gameState.lastMove;
              const dist = (p1: YinshPoint, p2: YinshPoint) => Math.max(Math.abs(p1.q - p2.q), Math.abs(p1.r - p2.r), Math.abs(-p1.q - p1.r - (-p2.q - p2.r)));
              const dTotal = dist(from, to);
              const dStart = dist(from, { q, r });
              const dEnd = dist({ q, r }, to);
              // Check if marker is STRICTLY on the path between from and to (jumped marker)
              if (dTotal > 0 && dStart + dEnd === dTotal && dStart > 0 && dStart < dTotal) {
                 // Find the moving ring to know its animation duration
                 const movingRing = gameState.rings.find(r => r.q === to.q && r.r === to.r);
                 const ringDuration = movingRing?.playerId === 1 ? 2500 : 3000;
                 // Delay starts slightly before it arrives for a smoother morphing look
                 const delay = (dStart / dTotal) * ringDuration - 200;
                 colorTransitionDelay = `${Math.max(0, delay)}ms`;
              }
            }
          }
          
          return (
            <foreignObject
               key={`marker-${key}`}
               x={x - radius}
               y={y - radius}
               width={d}
               height={d}
               style={{ pointerEvents: 'none', overflow: 'visible' }}
               className={`transition-all duration-1000 ${isActive ? 'z-50' : 'z-10'}`}
            >
               <div
                  className={`w-full h-full rounded-full transition-all duration-1000 origin-center ${isActive ? 'scale-110 animate-pulse ring-4 ring-emerald-400' : ''}`}
                  style={{
                    backgroundColor: color,
                    boxShadow: isActive ? `0 0 35px ${color}, 0 0 15px white, inset -2px -2px 8px rgba(0,0,0,0.5)` : `0 10px 20px rgba(0,0,0,0.5), 0 0 12px ${color}44, inset -2px -2px 6px rgba(0,0,0,0.4)`,
                    transitionDelay: colorTransitionDelay
                  }}
               >
                  <div 
                     className="absolute inset-0 rounded-full pointer-events-none" 
                     style={{
                        background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.2) 20%, transparent 50%), radial-gradient(circle at 50% 50%, transparent 0%, transparent 70%, rgba(0,0,0,0.4) 100%)'
                     }} 
                  />
                  <div className="absolute inset-0 rounded-full border border-white/30 pointer-events-none" />
                  <div className="absolute top-[12%] left-[12%] w-[25%] h-[25%] bg-white/30 rounded-full blur-[1px] pointer-events-none" />
               </div>
            </foreignObject>
          );
        })}
      </g>
      
      {/* Draw rings */}
      <g>
        {gameState.rings.map((ring, i) => {
          const { x, y } = getXY(ring.q, ring.r);
          const isSelected = gameState.selectedRing?.q === ring.q && gameState.selectedRing?.r === ring.r;
          const isToRemove = gameState.phase === 'remove_ring' && ring.playerId === currentPlayerId; // Highlight ONLY current player's rings during remove ring phase
          // @ts-ignore
          const color = PLAYER_COLORS[ring.playerId] || '#ffffff';
          const ringRadius = 31;
          const rd = ringRadius * 2;
          const transformDuration = ring.playerId === 1 ? '2.5s' : '3s';
          
          return (
            <g 
              key={ring.id || `ring-${i}`} 
              className="ease-in-out"
              style={{ pointerEvents: 'none', transform: `translate(${x}px, ${y}px)`, transition: `transform ${transformDuration} ease-in-out` }}
            >
               <foreignObject
                  x={-ringRadius}
                  y={-ringRadius}
                  width={rd}
                  height={rd}
                  style={{ overflow: 'visible' }}
               >
                  <div 
                    className={`w-full h-full rounded-full transition-all duration-300 ${isToRemove || isSelected ? 'animate-pulse ring-4 ' + (isToRemove ? 'ring-emerald-400' : 'ring-white/80') : ''}`}
                    style={{
                       border: `8px solid ${color}`,
                       boxShadow: `0 10px 20px rgba(0,0,0,0.5), inset 0 5px 15px rgba(255,255,255,0.4), inset 0 -5px 15px rgba(0,0,0,0.4)`,
                       background: 'transparent',
                       position: 'relative'
                    }}
                  >
                     <div className="absolute inset-[-8px] rounded-full border border-white/40 pointer-events-none" />
                     <div className="absolute inset-[0px] rounded-full border-t-[3px] border-t-white/60 border-b-[3px] border-b-black/30 pointer-events-none" />
                  </div>
               </foreignObject>
            </g>
          );
        })}
      </g>
      
      {/* Draw valid moves */}
      <g>
        {validMoves.map(m => {
          const { x, y } = getXY(m.q, m.r);
          return (
            <circle
              key={`valid-${m.q},${m.r}`}
              cx={x}
              cy={y}
              r={8}
              fill="#3b82f6"
              className="animate-pulse"
              style={{ pointerEvents: 'none' }}
            />
          );
        })}
      </g>
    </svg>
  );
};

export default YinshBoard;
