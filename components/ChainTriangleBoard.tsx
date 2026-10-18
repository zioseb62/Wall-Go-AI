import React from 'react';
import { generateTriggleBoard, getLineOfPegs, getEdgeId } from '../utils/chainTriangleLogic';
import { Peg, ChainTriangleState } from '../types';
import { PLAYER_COLORS } from '../constants';

interface ChainTriangleBoardProps {
  chainState: ChainTriangleState | undefined;
  onPegClick: (peg: Peg) => void;
}

const SIZE = 9;
const getPegPos = (peg: Peg) => {
  // Pointy-topped hex grid:
  const xOffset = Math.sqrt(3) * (peg.q + peg.r / 2);
  const yOffset = 3/2 * peg.r;
  return {
    left: 50 + (xOffset * SIZE),
    top: 50 + (yOffset * SIZE)
  };
};

const ChainTriangleBoard: React.FC<ChainTriangleBoardProps> = ({ chainState, onPegClick }) => {
  const pegs = React.useMemo(() => generateTriggleBoard(), []);

  const validPaths = React.useMemo(() => {
    if (!chainState?.selectedPeg) return [];
    
    const paths: { p1: Peg, p2: Peg }[] = [];
    
    pegs.forEach(targetPeg => {
      // Need to cast targetPeg since getLineOfPegs uses Peg interface, which it is
      const line = getLineOfPegs(chainState.selectedPeg!, targetPeg);
      if (line) {
        const rubberBandId = getEdgeId(line[0], line[3]);
        const exists = chainState.rubberBands.find(rb => rb.id === rubberBandId);
        if (!exists) {
           paths.push({ p1: chainState.selectedPeg!, p2: targetPeg });
        }
      }
    });

    return paths;
  }, [chainState?.selectedPeg, chainState?.rubberBands, pegs]);

  return (
    <div className="relative w-full max-w-md aspect-square bg-slate-900 rounded-[2rem] border-4 border-slate-700/80 shadow-2xl overflow-hidden p-6 z-0">
      <div className="w-full h-full relative flex items-center justify-center pointer-events-none">
        
        {/* Render Triangles */}
        {chainState?.triangles.filter(t => t.ownerId !== null).map(triangle => {
          const p1 = getPegPos(triangle.pegs[0]);
          const p2 = getPegPos(triangle.pegs[1]);
          const p3 = getPegPos(triangle.pegs[2]);
          const color = PLAYER_COLORS[triangle.ownerId as 1|2|3|4] || '#ffffff';
          
          return (
            <svg 
              key={triangle.id} 
              className="absolute inset-0 w-full h-full pointer-events-none" 
              style={{ zIndex: 1 }}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <polygon
                points={`${p1.left},${p1.top} ${p2.left},${p2.top} ${p3.left},${p3.top}`}
                fill={color}
                fillOpacity={0.4}
              />
            </svg>
          );
        })}

        {/* Render Valid Paths (Double parallel flashing line) */}
        {validPaths.map((path, i) => {
          const p1 = getPegPos(path.p1);
          const p2 = getPegPos(path.p2);
          
          // To draw two parallel lines, we can use a single svg line with a double stroke (via filter or just two lines)
          // Actually, rendering a thicker transparent line with stroke-dasharray? No, the user asked for a double line.
          // We can just calculate the normal angle and offset both lines.
          // But a simpler CSS way to do a "double line" is an SVG group with two lines offset horizontally/vertically or a single line with `stroke, fill`?
          // Line doesn't have double stroke easily. 
          // Let's use two lines offset manually, or simply a thick white/yellow base line with a thin black line on top of it, creating a "double line" effect!
          // Actually, let's just make one line with stroke width 4 and a darker overlay stroke width 2, or just two separate lines offset by perpendicular vector.
          const dx = p2.left - p1.left;
          const dy = p2.top - p1.top;
          const len = Math.sqrt(dx*dx + dy*dy);
          const nx = -dy / len * 1.5; // perpendicular offset X (%)
          const ny = dx / len * 1.5;  // perpendicular offset Y (%)

          return (
            <svg key={`path-${i}`} className="absolute inset-0 w-full h-full pointer-events-none animate-pulse opacity-60" style={{ zIndex: 2 }}>
              <line
                x1={`${p1.left + nx}%`}
                y1={`${p1.top + ny}%`}
                x2={`${p2.left + nx}%`}
                y2={`${p2.top + ny}%`}
                stroke="#fbbf24"
                strokeWidth="2"
                strokeDasharray="4 4"
                strokeLinecap="round"
              />
              <line
                x1={`${p1.left - nx}%`}
                y1={`${p1.top - ny}%`}
                x2={`${p2.left - nx}%`}
                y2={`${p2.top - ny}%`}
                stroke="#fbbf24"
                strokeWidth="2"
                strokeDasharray="4 4"
                strokeLinecap="round"
              />
            </svg>
          );
        })}

        {/* Render Rubber Bands */}
        {chainState?.rubberBands.map((rb, i) => {
          const p1 = getPegPos(rb.pegs[0]);
          const p2 = getPegPos(rb.pegs[3]);
          const color = PLAYER_COLORS[rb.ownerId as 1|2|3|4] || '#ffffff';
          
          return (
            <svg key={rb.id} className="absolute inset-0 w-full h-full drop-shadow-md pointer-events-none" style={{ zIndex: 2 }}>
              <line
                x1={`${p1.left}%`}
                y1={`${p1.top}%`}
                x2={`${p2.left}%`}
                y2={`${p2.top}%`}
                stroke={color}
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          );
        })}

        {/* Render Pegs */}
        <div className="absolute inset-0 w-full h-full pointer-events-auto" style={{ zIndex: 3 }}>
          {pegs.map((peg) => {
            const pos = getPegPos(peg);
            const isSelected = chainState?.selectedPeg?.q === peg.q && chainState?.selectedPeg?.r === peg.r && chainState?.selectedPeg?.s === peg.s;
            
            // Check if this peg is a valid target
            const isValidTarget = validPaths.some(p => p.p2.q === peg.q && p.p2.r === peg.r && p.p2.s === peg.s);

            // Ring effect class
            const baseRing = isValidTarget ? "ring-2 ring-yellow-400/50 ring-offset-2 ring-offset-slate-900 bg-yellow-400" : "bg-slate-600 border-slate-500 group-hover:bg-yellow-400/50";

            return (
              <div
                key={`peg-${peg.q}-${peg.r}`}
                className="absolute w-14 h-14 md:w-16 md:h-16 rounded-full transform -translate-x-1/2 -translate-y-1/2 cursor-pointer flex items-center justify-center group z-10"
                style={{
                  left: `${pos.left}%`,
                  top: `${pos.top}%`,
                }}
                onClick={() => onPegClick(peg)}
              >
                <div
                  className={`w-4 h-4 md:w-5 md:h-5 rounded-full border shadow-md transition-all ${isSelected ? 'bg-yellow-400 border-yellow-200 scale-125' : baseRing}`}
                ></div>
              </div>
            );
          })}
        </div>
        
      </div>
    </div>
  );
};

export default ChainTriangleBoard;

