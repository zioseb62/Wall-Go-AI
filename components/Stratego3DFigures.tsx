import React from "react";
import { StrategoPieceType } from "./StrategoBoard";

export interface StrategoRankColorTheme {
  name: string;
  nameIt: string;
  light: string;
  main: string;
  dark: string;
  border: string;
  glow: string;
  textColor: string;
}

// Distinct pedestal base colors for each military rank (Ranks 1-10)
// Bombs and Flag are excluded as per tactical rules
export const STRATEGO_RANK_COLORS: Record<number, StrategoRankColorTheme> = {
  10: {
    name: "Marshal",
    nameIt: "Maresciallo",
    light: "#fef08a", // Imperial Gold
    main: "#eab308",
    dark: "#a16207",
    border: "#facc15",
    glow: "rgba(234, 179, 8, 0.75)",
    textColor: "#422006",
  },
  9: {
    name: "General",
    nameIt: "Generale",
    light: "#d8b4fe", // Royal Amethyst Purple
    main: "#9333ea",
    dark: "#581c87",
    border: "#c084fc",
    glow: "rgba(147, 51, 234, 0.7)",
    textColor: "#ffffff",
  },
  8: {
    name: "Colonel",
    nameIt: "Colonnello",
    light: "#fda4af", // Crimson Ruby
    main: "#e11d48",
    dark: "#881337",
    border: "#fb7185",
    glow: "rgba(225, 29, 72, 0.7)",
    textColor: "#ffffff",
  },
  7: {
    name: "Major",
    nameIt: "Maggiore",
    light: "#fef3c7", // Warm Amber / Bronze
    main: "#d97706",
    dark: "#78350f",
    border: "#f59e0b",
    glow: "rgba(217, 119, 6, 0.7)",
    textColor: "#ffffff",
  },
  6: {
    name: "Captain",
    nameIt: "Capitano",
    light: "#6ee7b7", // Emerald Green
    main: "#059669",
    dark: "#064e3b",
    border: "#34d399",
    glow: "rgba(5, 150, 105, 0.7)",
    textColor: "#ffffff",
  },
  5: {
    name: "Lieutenant",
    nameIt: "Tenente",
    light: "#5eead4", // Sea Teal / Cyan
    main: "#0d9488",
    dark: "#134e4a",
    border: "#2dd4bf",
    glow: "rgba(13, 148, 136, 0.7)",
    textColor: "#ffffff",
  },
  4: {
    name: "Sergeant",
    nameIt: "Sergente",
    light: "#7dd3fc", // Cobalt Azure Blue
    main: "#0284c7",
    dark: "#0c4a6e",
    border: "#38bdf8",
    glow: "rgba(2, 132, 199, 0.7)",
    textColor: "#ffffff",
  },
  3: {
    name: "Miner",
    nameIt: "Geniere",
    light: "#ffedd5", // Industrial Forge Orange (Bomb Defuser Sapper)
    main: "#ea580c",
    dark: "#7c2d12",
    border: "#f97316",
    glow: "rgba(234, 88, 12, 0.75)",
    textColor: "#ffffff",
  },
  2: {
    name: "Scout",
    nameIt: "Esploratore",
    light: "#bef264", // Electric Lime / Runner Green
    main: "#65a30d",
    dark: "#365314",
    border: "#84cc16",
    glow: "rgba(101, 163, 13, 0.7)",
    textColor: "#ffffff",
  },
  1: {
    name: "Spy",
    nameIt: "Spia",
    light: "#f0abfc", // Midnight Magenta / Violet (Stealth Assassin)
    main: "#c026d3",
    dark: "#701a75",
    border: "#e879f9",
    glow: "rgba(192, 38, 211, 0.7)",
    textColor: "#ffffff",
  },
};

interface Stratego3DFigureProps {
  type: StrategoPieceType;
  player: "red" | "blue";
  rank: number;
  isRevealed: boolean;
  isAdminReveal?: boolean;
  tiltAngle?: number;
  isSelected?: boolean;
  isHovered?: boolean;
  isLocalPlayerPiece?: boolean;
}

export const Stratego3DFigure: React.FC<Stratego3DFigureProps> = React.memo(({
  type,
  player,
  rank,
  isRevealed,
  isAdminReveal = false,
  tiltAngle = 34,
  isSelected = false,
  isHovered = false,
  isLocalPlayerPiece,
}) => {
  const isHiddenEnemy = isLocalPlayerPiece !== undefined
    ? (!isLocalPlayerPiece && !isRevealed && !isAdminReveal)
    : (player === "blue" && !isRevealed && !isAdminReveal);
  const isRed = player === "red";
  const isFlag = type === "flag";
  const isBomb = type === "bomb";

  // Discovered pieces state:
  // ONLY for the player's own pieces: a player's piece is discovered to the enemy if it has engaged in combat / was scouted (isRevealed === true)
  const isPlayerPieceDiscovered = Boolean(isLocalPlayerPiece && isRevealed);

  // Palette definitions
  const primaryColor = isRed ? "#dc2626" : "#2563eb";
  const darkColor = isRed ? "#7f1d1d" : "#1e3a8a";
  const highlightColor = isRed ? "#f87171" : "#60a5fa";
  const trimColor = isRed ? "#f59e0b" : "#93c5fd"; // Gold for Red, Silver/Cyan for Blue

  // Realistic 3D standing perspective compensation:
  // When the board is tilted at angle `tiltAngle` (from 12° to 52°), the board plane is foreshortened
  // vertically by cos(tiltAngle). In true 3D perspective, standing figurines face the camera and
  // rise upwards out of their pedestal base. At maximum tilt (52°), pieces must stand tall and prominent
  // rather than shrinking into a squashed pancake.
  const rad = (tiltAngle * Math.PI) / 180;
  const cosTilt = Math.max(0.25, Math.cos(rad));
  // tiltRatio: 0 at min tilt (12°), 1 at max tilt (52°)
  const tiltRatio = Math.max(0, Math.min(1, (tiltAngle - 12) / 40));
  // Upright visual height boost on screen: from 1.0 (top-down) to 1.60 (tall & imposing at max tilt)
  const screenHeightBoost = 1.0 + tiltRatio * 0.60;
  const verticalScale = screenHeightBoost / cosTilt;
  const horizontalScale = 1.0 + tiltRatio * 0.08;

  // Rank-specific pedestal styling (different color for each rank, except bomb and flag)
  const rankTheme = STRATEGO_RANK_COLORS[rank];

  let pedestalBackground = "";
  let pedestalBorder = "";
  let pedestalShadow = "";

  if (isHiddenEnemy) {
    pedestalBackground = "radial-gradient(ellipse at 50% 30%, #1e293b 0%, #0f172a 70%, #020617 100%)";
    pedestalBorder = "1.5px solid #475569";
    pedestalShadow = isSelected
      ? "0 0 14px #64748b, 0 6px 12px rgba(0,0,0,0.9)"
      : isHovered
      ? "0 0 10px #64748b, 0 5px 10px rgba(0,0,0,0.85)"
      : "0 4px 8px rgba(0,0,0,0.8), inset 0 1px 2px rgba(255,255,255,0.2)";
  } else if (isPlayerPieceDiscovered) {
    // DISCOVERED PLAYER PIECE:
    // Highlighted with an illuminated gold/amber tactical beacon border & aura,
    // indicating that the piece's fog of war cover is blown and enemy knows its identity!
    pedestalBackground = isRed
      ? "radial-gradient(ellipse at 50% 30%, #b45309 0%, #7f1d1d 60%, #450a0a 100%)"
      : "radial-gradient(ellipse at 50% 30%, #b45309 0%, #1e40af 60%, #172554 100%)";
    pedestalBorder = "2px solid #f59e0b";
    pedestalShadow = isSelected
      ? "0 0 18px #f59e0b, 0 6px 12px rgba(0,0,0,0.9)"
      : isHovered
      ? "0 0 14px #f59e0b, 0 5px 10px rgba(0,0,0,0.85)"
      : "0 0 10px rgba(245, 158, 11, 0.65), 0 4px 8px rgba(0,0,0,0.8), inset 0 1px 2px rgba(255,255,255,0.45)";
  } else if (isFlag) {
    // Flag pedestal styling (natural royal pedestal without glow)
    pedestalBackground = isRed
      ? "radial-gradient(ellipse at 50% 30%, #991b1b 0%, #7f1d1d 60%, #450a0a 100%)"
      : "radial-gradient(ellipse at 50% 30%, #1d4ed8 0%, #1e40af 60%, #172554 100%)";
    pedestalBorder = `1.5px solid ${isRed ? "#b91c1c" : "#1d4ed8"}`;
    pedestalShadow = "0 4px 8px rgba(0,0,0,0.8), inset 0 1px 2px rgba(255,255,255,0.2)";
  } else if (isBomb) {
    // Bomb: heavy dark iron ordnance base (charcoal / naval mine steel)
    pedestalBackground = "radial-gradient(ellipse at 50% 30%, #334155 0%, #1e293b 60%, #0f172a 100%)";
    pedestalBorder = `1.5px solid ${isRed ? "#ef4444" : "#3b82f6"}`;
    pedestalShadow = isSelected
      ? `0 0 14px ${isRed ? "#ef4444" : "#3b82f6"}, 0 6px 12px rgba(0,0,0,0.9)`
      : isHovered
      ? `0 0 10px ${isRed ? "#ef4444" : "#3b82f6"}, 0 5px 10px rgba(0,0,0,0.85)`
      : "0 4px 8px rgba(0,0,0,0.8), inset 0 1px 2px rgba(255,255,255,0.3)";
  } else if (type === "spy" || rank === 1) {
    // Spy (Rank 1 / Spia): High-contrast illuminated stealth assassin pedestal
    pedestalBackground = isRed
      ? "radial-gradient(ellipse at 50% 30%, #c026d3 0%, #86198f 50%, #4a044e 100%)"
      : "radial-gradient(ellipse at 50% 30%, #a21caf 0%, #701a75 50%, #3b0764 100%)";
    pedestalBorder = "2px solid #f0abfc";
    pedestalShadow = isSelected
      ? "0 0 18px #f0abfc, 0 6px 14px rgba(0,0,0,0.9)"
      : isHovered
      ? "0 0 14px #f0abfc, 0 5px 12px rgba(0,0,0,0.85)"
      : "0 0 12px rgba(240, 171, 252, 0.8), 0 4px 8px rgba(0,0,0,0.85), inset 0 1px 2px rgba(255,255,255,0.7)";
  } else if (rankTheme) {
    // Military soldiers: DISTINCT PEDESTAL COLOR BY RANK!
    pedestalBackground = `radial-gradient(ellipse at 50% 30%, ${rankTheme.light} 0%, ${rankTheme.main} 55%, ${rankTheme.dark} 100%)`;
    pedestalBorder = `1.5px solid ${rankTheme.border}`;
    pedestalShadow = isSelected
      ? `0 0 14px ${rankTheme.glow}, 0 6px 12px rgba(0,0,0,0.9)`
      : isHovered
      ? `0 0 10px ${rankTheme.glow}, 0 5px 10px rgba(0,0,0,0.85)`
      : `0 4px 8px rgba(0,0,0,0.8), inset 0 1px 2px rgba(255,255,255,0.45)`;
  } else {
    pedestalBackground = isRed
      ? "radial-gradient(ellipse at 50% 30%, #991b1b 0%, #7f1d1d 60%, #450a0a 100%)"
      : "radial-gradient(ellipse at 50% 30%, #1d4ed8 0%, #1e40af 60%, #172554 100%)";
    pedestalBorder = `1.5px solid ${trimColor}`;
    pedestalShadow = "0 4px 8px rgba(0,0,0,0.8), inset 0 1px 2px rgba(255,255,255,0.4)";
  }

  return (
    <div
      className={`relative w-full h-full flex flex-col items-center justify-end select-none pointer-events-none transition-transform duration-200 ${
        isSelected ? "scale-105" : isHovered ? "scale-105" : ""
      }`}
    >
      {/* 3D PEDESTAL BASE (lies on the board plane) */}
      <div
        className="absolute bottom-0 w-[84%] h-[26%] rounded-full transition-all duration-300"
        style={{
          background: pedestalBackground,
          border: pedestalBorder,
          boxShadow: pedestalShadow,
        }}
      >
        {/* Army affiliation inner rim (Red vs Blue accent) */}
        {!isHiddenEnemy && (
          <div
            className="absolute inset-[1px] rounded-full opacity-80 pointer-events-none"
            style={{
              borderTop: `1px solid ${isRed ? "#f87171" : "#60a5fa"}`,
              borderBottom: "1px solid rgba(0,0,0,0.6)",
            }}
          />
        )}

        {/* Beacon ring for discovered player piece */}
        {isPlayerPieceDiscovered && (
          <div
            className="absolute -inset-[2px] rounded-full pointer-events-none border-2 border-white shadow-[0_0_8px_rgba(255,255,255,0.9)]"
          />
        )}

        {/* Crisp Front Rank Plaque on the Pedestal (Vector & High-Definition Clarity) */}
        {!isHiddenEnemy && (
          <div
            className={`absolute -bottom-1 sm:-bottom-1.5 left-1/2 -translate-x-1/2 px-1 sm:px-1.5 rounded-md flex items-center justify-center shadow-lg z-20 whitespace-nowrap gap-0.5 select-none pointer-events-none transition-all h-[17px] sm:h-[19px] max-w-[86%] ${
              isFlag || isBomb
                ? "min-w-[28px] max-w-[35px] sm:min-w-[30px] sm:max-w-[36px]"
                : "min-w-[19px] max-w-[24px] sm:min-w-[21px] sm:max-w-[26px]"
            }`}
            style={{
              background: isPlayerPieceDiscovered
                ? "#ffffff"
                : isFlag
                ? "linear-gradient(180deg, #fef08a 0%, #eab308 50%, #ca8a04 100%)"
                : isBomb
                ? "linear-gradient(180deg, #475569 0%, #1e293b 50%, #090d16 100%)"
                : rankTheme
                ? `linear-gradient(180deg, ${rankTheme.light} 0%, ${rankTheme.main} 50%, ${rankTheme.dark} 100%)`
                : isRed
                ? "linear-gradient(180deg, #fef08a 0%, #eab308 50%, #ca8a04 100%)"
                : "linear-gradient(180deg, #e0f2fe 0%, #38bdf8 50%, #0284c7 100%)",
              color: isPlayerPieceDiscovered
                ? (isFlag
                    ? "#ca8a04"
                    : isBomb
                    ? "#1e293b"
                    : type === "spy" || rank === 1
                    ? "#a21caf"
                    : rankTheme
                    ? rankTheme.dark || rankTheme.main
                    : isRed
                    ? "#b91c1c"
                    : "#1d4ed8")
                : isBomb || (rankTheme && rankTheme.textColor === "#ffffff")
                ? "#ffffff"
                : "#0f172a",
              border: `1.5px solid ${
                isPlayerPieceDiscovered
                  ? (isFlag
                      ? "#ca8a04"
                      : isBomb
                      ? "#1e293b"
                      : type === "spy" || rank === 1
                      ? "#a21caf"
                      : rankTheme
                      ? rankTheme.dark || rankTheme.main
                      : isRed
                      ? "#b91c1c"
                      : "#1d4ed8")
                  : isFlag
                  ? "#fef9c3"
                  : isBomb
                  ? "#94a3b8"
                  : rankTheme
                  ? rankTheme.border
                  : isRed
                  ? "#fef9c3"
                  : "#bae6fd"
              }`,
              textShadow: isPlayerPieceDiscovered
                ? "none"
                : isBomb
                ? "0 1px 1.5px rgba(0,0,0,0.85)"
                : rankTheme && rankTheme.textColor === "#ffffff"
                ? rank === 10
                  ? "0 1px 0 #000000, 0 -1px 0 #000000, 1px 0 0 #000000, -1px 0 0 #000000, 0 1.5px 2px rgba(0,0,0,0.95)"
                  : "0 1px 2px rgba(0,0,0,0.95)"
                : rank === 10
                ? "0 1px 0 rgba(255,255,255,0.85), 0 -1px 0 rgba(255,255,255,0.4)"
                : "0 1px 1px rgba(255,255,255,0.7)",
              boxShadow: isPlayerPieceDiscovered
                ? "0 2px 6px rgba(0,0,0,0.85), 0 0 8px rgba(255,255,255,0.9)"
                : "0 2px 5px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.4)",
              WebkitFontSmoothing: "antialiased",
              MozOsxFontSmoothing: "grayscale",
              textRendering: "geometricPrecision",
            }}
          >
            <span
              className={
                isBomb
                  ? "text-[8px] sm:text-[8.5px] font-semibold tracking-wider leading-none"
                  : isFlag
                  ? "text-[8px] sm:text-[9px] font-black tracking-normal leading-none"
                  : rank === 10
                  ? "text-[10.5px] sm:text-[11.5px] font-black tracking-tight leading-none"
                  : "text-[11px] sm:text-[12px] font-semibold tracking-normal leading-none"
              }
              style={{
                fontFamily:
                  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              }}
            >
              {isFlag ? "FLAG" : isBomb ? "BOMB" : rank}
            </span>
          </div>
        )}
      </div>

      {/* 3D STANDING FIGURINE (Billboarding upright with razor-sharp vector precision) */}
      <div
        className="relative w-full h-[96%] flex items-end justify-center transition-transform duration-300"
        style={{
          transform: `scaleY(${verticalScale.toFixed(3)}) scaleX(${horizontalScale.toFixed(3)}) translateY(-2px)`,
          transformOrigin: "bottom center",
          filter: isSelected
            ? `drop-shadow(0 0 6px ${trimColor})`
            : isHovered
            ? `drop-shadow(0 0 4px ${trimColor})`
            : type === "spy" && !isHiddenEnemy
            ? "drop-shadow(0 0 3px #f0abfc) drop-shadow(0 0 7px rgba(192, 38, 211, 0.8)) drop-shadow(0 4px 6px rgba(0,0,0,0.95))"
            : undefined,
        }}
      >

        {isHiddenEnemy ? (
          /* HIDDEN ENEMY TACTICAL TOWER SHIELD */
          <HiddenShieldFigure />
        ) : type === "flag" ? (
          /* FORTRESS CITADEL & IMPERIAL BANNER STRUCTURE WITH RADIANT GLOW */
          <FlagStructureFigure isRed={isRed} />
        ) : type === "bomb" ? (
          /* SPHERICAL HEAVY NAVAL CONTACT MINE & DYNAMITE STRUCTURE */
          <BombStructureFigure />
        ) : (
          /* DETAILED 3D MILITARY SOLDIER MINIATURES */
          <SoldierFigure
            type={type}
            rank={rank}
            isRed={isRed}
            primaryColor={primaryColor}
            darkColor={darkColor}
            highlightColor={highlightColor}
            trimColor={trimColor}
          />
        )}
      </div>
    </div>
  );
});

/* =========================================================================
   1. HIDDEN ENEMY FIGURE (Heavy 3D Tactical Shield with Mystery Seal)
   ========================================================================= */
const HiddenShieldFigure: React.FC = () => (
  <svg
    viewBox="0 0 100 120"
    className="w-full h-full max-h-[110%] overflow-visible"
    shapeRendering="geometricPrecision"
    textRendering="geometricPrecision"
  >
    <defs>
      <linearGradient id="shieldMetal" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="35%" stopColor="#1d4ed8" />
        <stop offset="70%" stopColor="#1e3a8a" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>
      <linearGradient id="shieldRim" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#93c5fd" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1e293b" />
      </linearGradient>
      <radialGradient id="shieldGlow" cx="50%" cy="45%" r="40%">
        <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.8" />
        <stop offset="60%" stopColor="#2563eb" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
      </radialGradient>
    </defs>

    {/* Tower Shield Outer Shadow & Rim */}
    <path
      d="M20,18 C20,18 50,10 50,10 C50,10 80,18 80,18 C82,55 78,85 50,110 C22,85 18,55 20,18 Z"
      fill="url(#shieldRim)"
      stroke="#1e293b"
      strokeWidth="2"
    />

    {/* Shield Inner Face */}
    <path
      d="M25,23 C25,23 50,16 50,16 C50,16 75,23 75,23 C77,53 73,80 50,102 C27,80 23,53 25,23 Z"
      fill="url(#shieldMetal)"
    />

    {/* Central Shield Glow */}
    <ellipse cx="50" cy="54" rx="22" ry="32" fill="url(#shieldGlow)" />

    {/* Rivets around shield edge */}
    <circle cx="28" cy="27" r="2" fill="#cbd5e1" stroke="#0f172a" strokeWidth="0.8" />
    <circle cx="72" cy="27" r="2" fill="#cbd5e1" stroke="#0f172a" strokeWidth="0.8" />
    <circle cx="24" cy="52" r="2" fill="#cbd5e1" stroke="#0f172a" strokeWidth="0.8" />
    <circle cx="76" cy="52" r="2" fill="#cbd5e1" stroke="#0f172a" strokeWidth="0.8" />
    <circle cx="33" cy="80" r="2" fill="#cbd5e1" stroke="#0f172a" strokeWidth="0.8" />
    <circle cx="67" cy="80" r="2" fill="#cbd5e1" stroke="#0f172a" strokeWidth="0.8" />
    <circle cx="50" cy="98" r="2" fill="#cbd5e1" stroke="#0f172a" strokeWidth="0.8" />

    {/* Heraldic Crossed Chevron Band */}
    <path
      d="M32,38 L50,52 L68,38 L68,46 L50,60 L32,46 Z"
      fill="#60a5fa"
      opacity="0.4"
    />

    {/* Glowing Mysterious Tactical Seal */}
    <circle
      cx="50"
      cy="55"
      r="17"
      fill="#0f172a"
      stroke="#60a5fa"
      strokeWidth="2"
      strokeDasharray="3 1.5"
    />

    {/* Question Mark */}
    <text
      x="50"
      y="63"
      textAnchor="middle"
      fill="#93c5fd"
      fontSize="26"
      fontWeight="900"
      fontFamily="sans-serif"
      style={{ filter: "drop-shadow(0 0 6px #60a5fa)" }}
    >
      ?
    </text>

    {/* Tactical Chevron Crest on Top */}
    <polygon
      points="50,14 42,22 58,22"
      fill="#93c5fd"
      stroke="#1e3a8a"
      strokeWidth="1"
    />
  </svg>
);

/* =========================================================================
   2. FLAG STRUCTURE FIGURE (Fluttering Royal Banner in the Wind - Zero Glow)
   ========================================================================= */
const FlagStructureFigure: React.FC<{ isRed: boolean }> = ({ isRed }) => {
  const flagColor1 = isRed ? "#ef4444" : "#3b82f6";
  const flagColor2 = isRed ? "#b91c1c" : "#1d4ed8";
  const flagColor3 = isRed ? "#7f1d1d" : "#172554";
  const goldColor = "#f59e0b";
  const goldLight = "#fef08a";

  return (
    <svg
      viewBox="0 0 100 120"
      className="w-full h-full max-h-[110%] overflow-visible"
      shapeRendering="geometricPrecision"
      textRendering="geometricPrecision"
    >
      <defs>
        <style>{`
          @keyframes flagClothWaveMotion {
            0% {
              transform: skewY(0deg) scaleY(1);
            }
            25% {
              transform: skewY(1.8deg) scaleY(0.985);
            }
            50% {
              transform: skewY(-1.4deg) scaleY(1.02);
            }
            75% {
              transform: skewY(1.2deg) scaleY(0.99);
            }
            100% {
              transform: skewY(0deg) scaleY(1);
            }
          }
          @keyframes streamerFlutter {
            0%, 100% {
              transform: rotate(0deg) scaleX(1);
            }
            50% {
              transform: rotate(-5deg) scaleX(1.06);
            }
          }
          .flag-silk-cloth {
            transform-origin: 29px 36px;
            animation: flagClothWaveMotion 1.8s ease-in-out infinite;
          }
          .streamer-cloth {
            transform-origin: 29px 12px;
            animation: streamerFlutter 1.4s ease-in-out infinite;
          }
        `}</style>
        <linearGradient id="flagWoodPedestal" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#292524" />
          <stop offset="30%" stopColor="#44403c" />
          <stop offset="70%" stopColor="#292524" />
          <stop offset="100%" stopColor="#1c1917" />
        </linearGradient>
        <linearGradient id="flagBrassPole" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="35%" stopColor="#f59e0b" />
          <stop offset="75%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <linearGradient id="flagBannerSilk" x1="0%" y1="0%" x2="100%" y2="20%">
          <stop offset="0%" stopColor={flagColor1}>
            <animate attributeName="stopColor" dur="1.8s" repeatCount="indefinite" values={`${flagColor1};${flagColor2};${flagColor1}`} />
          </stop>
          <stop offset="35%" stopColor={flagColor2}>
            <animate attributeName="offset" dur="1.8s" repeatCount="indefinite" values="0.25;0.45;0.22;0.25" />
          </stop>
          <stop offset="70%" stopColor={flagColor1}>
            <animate attributeName="offset" dur="1.8s" repeatCount="indefinite" values="0.65;0.80;0.58;0.65" />
          </stop>
          <stop offset="100%" stopColor={flagColor3} />
        </linearGradient>
      </defs>

      {/* NATURAL CEREMONIAL PEDESTAL MOUNT AT THE BASE (Clean Wood & Brass, Zero Glow) */}
      {/* Tiered circular mount platform */}
      <path
        d="M20,104 C20,99 80,99 80,104 L76,113 C76,116 24,116 24,113 Z"
        fill="url(#flagWoodPedestal)"
        stroke="#1c1917"
        strokeWidth="1.2"
        style={{ filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.7))" }}
      />
      {/* Brass decorative rim ring on base */}
      <ellipse cx="50" cy="104" rx="28" ry="4" fill="#78350f" stroke="#d97706" strokeWidth="0.8" />
      <ellipse cx="50" cy="103" rx="26" ry="3.2" fill="#92400e" />
      {/* Brass pole socket cylinder */}
      <path d="M25,97 L33,97 L33,104 L25,104 Z" fill="url(#flagBrassPole)" stroke="#78350f" strokeWidth="0.8" />

      {/* POLISHED BRASS FLAGPOLE */}
      <rect
        x="27"
        y="6"
        width="4"
        height="98"
        rx="2"
        fill="url(#flagBrassPole)"
        stroke="#78350f"
        strokeWidth="0.8"
      />

      {/* Golden Spearhead Finial on top of flagpole */}
      <path
        d="M29,1 L34,7 L29,9 L24,7 Z"
        fill="#fef08a"
        stroke="#ca8a04"
        strokeWidth="0.8"
      />
      <circle cx="29" cy="8" r="2.5" fill="#f59e0b" stroke="#78350f" strokeWidth="0.6" />

      {/* Fluttering Golden Silk Streamers / Ribbon Tails from the top finial */}
      <g className="streamer-cloth">
        <path
          d="M28,10 C24,16 22,26 25,36 C27,33 26,24 29,14 Z"
          fill="#fef08a"
          stroke="#ca8a04"
          strokeWidth="0.6"
        >
          <animate
            attributeName="d"
            dur="1.4s"
            repeatCount="indefinite"
            values="
              M28,10 C24,16 22,26 25,36 C27,33 26,24 29,14 Z;
              M28,10 C23,17 25,28 22,38 C25,34 25,25 29,14 Z;
              M28,10 C25,15 21,25 24,35 C26,32 26,23 29,14 Z;
              M28,10 C24,16 22,26 25,36 C27,33 26,24 29,14 Z
            "
          />
        </path>
      </g>

      {/* Pole Mounting Brass Rings */}
      <circle cx="29" cy="14" r="2.8" fill="#eab308" stroke="#78350f" strokeWidth="0.6" />
      <circle cx="29" cy="42" r="2.8" fill="#eab308" stroke="#78350f" strokeWidth="0.6" />
      <circle cx="29" cy="72" r="2.8" fill="#eab308" stroke="#78350f" strokeWidth="0.6" />

      {/* =========================================================================
          FLUTTERING ROYAL SILK MILITARY BANNER (WAVING FLUIDLY IN THE WIND)
          ========================================================================= */}
      <g className="flag-silk-cloth">
        {/* Main Royal Silk Banner Cloth with Aerodynamic Sinusoidal Wave Coordinates */}
        <path
          d="M31,12 C44,8 57,17 71,11 C81,8 89,14 93,12 L87,32 C92,44 86,58 92,68 C79,64 68,74 54,69 C43,65 31,73 31,73 Z"
          fill="url(#flagBannerSilk)"
          stroke="#fef08a"
          strokeWidth="1.2"
          style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.65))" }}
        >
          <animate
            attributeName="d"
            dur="1.8s"
            repeatCount="indefinite"
            values="
              M31,12 C44,8 57,17 71,11 C81,8 89,14 93,12 L87,32 C92,44 86,58 92,68 C79,64 68,74 54,69 C43,65 31,73 31,73 Z;
              M31,12 C44,14 58,9 72,16 C82,17 88,10 94,16 L88,36 C94,48 87,55 91,72 C80,68 67,62 55,71 C44,70 31,73 31,73 Z;
              M31,12 C44,16 57,7 70,8 C81,12 90,16 91,10 L86,30 C91,42 88,60 93,66 C81,62 69,72 56,66 C43,64 31,73 31,73 Z;
              M31,12 C44,10 58,15 72,13 C82,8 89,12 93,15 L87,35 C92,46 86,56 92,70 C79,66 68,66 54,72 C44,68 31,73 31,73 Z;
              M31,12 C44,8 57,17 71,11 C81,8 89,14 93,12 L87,32 C92,44 86,58 92,68 C79,64 68,74 54,69 C43,65 31,73 31,73 Z
            "
          />
        </path>

        {/* Dynamic Deep Shadow Ripple Creases (Wind fold shadows traveling across silk) */}
        <path
          d="M48,11 C54,22 51,48 46,67"
          stroke={flagColor3}
          strokeWidth="3.2"
          strokeOpacity="0.45"
          fill="none"
          strokeLinecap="round"
        >
          <animate
            attributeName="d"
            dur="1.8s"
            repeatCount="indefinite"
            values="
              M48,11 C54,22 51,48 46,67;
              M52,12 C57,25 55,52 50,71;
              M45,10 C50,21 47,46 44,66;
              M50,11 C55,24 53,50 48,69;
              M48,11 C54,22 51,48 46,67
            "
          />
        </path>

        {/* Dynamic Highlight Ripple Creases (Wind fold specular gleam) */}
        <path
          d="M68,11 C74,22 71,49 67,68"
          stroke="#fef08a"
          strokeWidth="2.2"
          strokeOpacity="0.4"
          fill="none"
          strokeLinecap="round"
        >
          <animate
            attributeName="d"
            dur="1.8s"
            repeatCount="indefinite"
            values="
              M68,11 C74,22 71,49 67,68;
              M65,14 C71,26 68,52 64,70;
              M71,9 C76,20 73,47 69,65;
              M67,12 C73,24 70,50 66,68;
              M68,11 C74,22 71,49 67,68
            "
          />
        </path>

        {/* Secondary Shadow Ripple near fly edge */}
        <path
          d="M80,12 C84,24 82,48 80,66"
          stroke={flagColor3}
          strokeWidth="2.5"
          strokeOpacity="0.35"
          fill="none"
          strokeLinecap="round"
        >
          <animate
            attributeName="d"
            dur="1.8s"
            repeatCount="indefinite"
            values="
              M80,12 C84,24 82,48 80,66;
              M82,14 C86,28 84,52 81,68;
              M78,11 C82,22 80,45 78,63;
              M81,13 C85,26 83,50 80,66;
              M80,12 C84,24 82,48 80,66
            "
          />
        </path>

        {/* Golden Fringe along the waving bottom and fly hem */}
        <path
          d="M31,73 C43,65 54,69 68,74 C79,64 86,58 92,68"
          fill="none"
          stroke={goldColor}
          strokeWidth="2"
          strokeDasharray="2 1.2"
        >
          <animate
            attributeName="d"
            dur="1.8s"
            repeatCount="indefinite"
            values="
              M31,73 C43,65 54,69 68,74 C79,64 86,58 92,68;
              M31,73 C44,70 55,71 67,62 C80,68 87,55 91,72;
              M31,73 C43,64 56,66 69,72 C81,62 88,60 93,66;
              M31,73 C44,68 54,72 68,66 C79,66 86,56 92,70;
              M31,73 C43,65 54,69 68,74 C79,64 86,58 92,68
            "
          />
        </path>

        {/* Royal Imperial Heraldic Crest on the Flag (Swaying naturally with the silk) */}
        <g>
          <animateTransform
            attributeName="transform"
            type="translate"
            dur="1.8s"
            repeatCount="indefinite"
            values="58,38; 60,40; 56,36; 59,39; 58,38"
          />
          <g transform="scale(0.85)">
            {/* Imperial Crown */}
            <path
              d="M-9,-12 L-11,-5 L-4,-7 L0,-13 L4,-7 L11,-5 L9,-12 Z"
              fill={goldLight}
              stroke="#ca8a04"
              strokeWidth="0.8"
            />
            {/* Majestic Eagle Crest Wings */}
            <path
              d="M0,-3 C-9,-10 -18,-5 -15,7 C-11,5 -5,5 0,9 C5,5 11,5 15,7 C18,-5 9,-10 0,-3 Z"
              fill={goldLight}
              stroke="#ca8a04"
              strokeWidth="0.9"
            />
            {/* Center Royal Seal Sunburst */}
            <circle cx="0" cy="2" r="3.2" fill="#f59e0b" stroke="#78350f" strokeWidth="0.6" />
            <polygon points="0,-1.5 1,1 3,1 1.5,2.5 2,4.5 0,3.2 -2,4.5 -1.5,2.5 -3,1 -1,1" fill="#fef08a" />
          </g>
        </g>
      </g>

      {/* Clean Front Name Plaque "BANDIERA" (No glow, crisp and elegant) */}
      <rect
        x="28"
        y="107"
        width="44"
        height="10"
        rx="2"
        fill="#0f172a"
        stroke="#ca8a04"
        strokeWidth="1"
      />
      <text
        x="50"
        y="114.5"
        textAnchor="middle"
        fill="#fef08a"
        fontSize="7"
        fontWeight="900"
        fontFamily="sans-serif"
        letterSpacing="1"
      >
        BANDIERA
      </text>
    </svg>
  );
};

/* =========================================================================
   3. BOMB STRUCTURE FIGURE (Heavy Naval Spiked Contact Mine & Powder Barrels)
   ========================================================================= */
const BombStructureFigure: React.FC = () => (
  <svg
    viewBox="0 0 100 120"
    className="w-full h-full max-h-[110%] overflow-visible"
    shapeRendering="geometricPrecision"
    textRendering="geometricPrecision"
  >
    <defs>
      <radialGradient id="bombSphere" cx="40%" cy="35%" r="60%">
        <stop offset="0%" stopColor="#64748b" />
        <stop offset="25%" stopColor="#334155" />
        <stop offset="65%" stopColor="#0f172a" />
        <stop offset="100%" stopColor="#020617" />
      </radialGradient>
      <linearGradient id="metalRim" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="50%" stopColor="#b45309" />
        <stop offset="100%" stopColor="#78350f" />
      </linearGradient>
      <linearGradient id="fuseBurn" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#ea580c" />
        <stop offset="60%" stopColor="#facc15" />
        <stop offset="100%" stopColor="#ffffff" />
      </linearGradient>
    </defs>

    {/* Mooring Iron Chains at the Base */}
    <ellipse cx="50" cy="106" rx="28" ry="8" fill="#020617" opacity="0.6" />
    <path
      d="M32,104 C36,98 42,94 50,94 C58,94 64,98 68,104"
      fill="none"
      stroke="#475569"
      strokeWidth="3"
      strokeDasharray="4 2"
    />

    {/* DETONATOR CONTACT HORNS (6 radial spikes with brass tips) */}
    {/* Top-left Horn */}
    <path d="M28,40 L12,24 L18,22 L32,36 Z" fill="#475569" stroke="#0f172a" strokeWidth="1" />
    <circle cx="14" cy="23" r="3.5" fill="#f59e0b" stroke="#78350f" strokeWidth="0.8" />
    {/* Top-right Horn */}
    <path d="M72,40 L88,24 L82,22 L68,36 Z" fill="#475569" stroke="#0f172a" strokeWidth="1" />
    <circle cx="86" cy="23" r="3.5" fill="#f59e0b" stroke="#78350f" strokeWidth="0.8" />
    {/* Far-left Horn */}
    <path d="M22,62 L4,60 L4,66 L22,68 Z" fill="#475569" stroke="#0f172a" strokeWidth="1" />
    <circle cx="4" cy="63" r="3.5" fill="#f59e0b" stroke="#78350f" strokeWidth="0.8" />
    {/* Far-right Horn */}
    <path d="M78,62 L96,60 L96,66 L78,68 Z" fill="#475569" stroke="#0f172a" strokeWidth="1" />
    <circle cx="96" cy="63" r="3.5" fill="#f59e0b" stroke="#78350f" strokeWidth="0.8" />
    {/* Bottom-left Horn */}
    <path d="M30,82 L16,94 L13,88 L26,78 Z" fill="#475569" stroke="#0f172a" strokeWidth="1" />
    <circle cx="14" cy="91" r="3.5" fill="#f59e0b" stroke="#78350f" strokeWidth="0.8" />
    {/* Bottom-right Horn */}
    <path d="M70,82 L84,94 L87,88 L74,78 Z" fill="#475569" stroke="#0f172a" strokeWidth="1" />
    <circle cx="86" cy="91" r="3.5" fill="#f59e0b" stroke="#78350f" strokeWidth="0.8" />

    {/* HEAVY CAST IRON MAIN SPHERE */}
    <circle
      cx="50"
      cy="62"
      r="32"
      fill="url(#bombSphere)"
      stroke="#0f172a"
      strokeWidth="2"
      style={{ filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.8))" }}
    />

    {/* Reinforcement Steel Belt Bands */}
    <ellipse cx="50" cy="62" rx="31" ry="12" fill="none" stroke="#64748b" strokeWidth="2.5" />
    <ellipse cx="50" cy="62" rx="12" ry="31" fill="none" stroke="#475569" strokeWidth="2.5" />

    {/* Steel Rivets on the Band */}
    <circle cx="20" cy="62" r="1.8" fill="#cbd5e1" />
    <circle cx="32" cy="68" r="1.8" fill="#cbd5e1" />
    <circle cx="50" cy="74" r="1.8" fill="#cbd5e1" />
    <circle cx="68" cy="68" r="1.8" fill="#cbd5e1" />
    <circle cx="80" cy="62" r="1.8" fill="#cbd5e1" />
    <circle cx="32" cy="56" r="1.8" fill="#cbd5e1" />
    <circle cx="50" cy="50" r="1.8" fill="#cbd5e1" />
    <circle cx="68" cy="56" r="1.8" fill="#cbd5e1" />

    {/* Central Hazard Warning Plate (Brass Octagon) */}
    <polygon
      points="42,52 58,52 64,58 64,66 58,72 42,72 36,66 36,58"
      fill="url(#metalRim)"
      stroke="#451a03"
      strokeWidth="1"
    />
    {/* Skull / Danger Emblem */}
    <g transform="translate(50, 62) scale(0.8)">
      {/* Skull */}
      <circle cx="0" cy="-3" r="5" fill="#fef08a" />
      <rect x="-3" y="1" width="6" height="4" rx="1" fill="#fef08a" />
      <circle cx="-2" cy="-3" r="1.2" fill="#451a03" />
      <circle cx="2" cy="-3" r="1.2" fill="#451a03" />
      {/* Crossed Bones */}
      <line x1="-7" y1="4" x2="7" y2="-4" stroke="#fef08a" strokeWidth="1.2" />
      <line x1="-7" y1="-4" x2="7" y2="4" stroke="#fef08a" strokeWidth="1.2" />
    </g>

    {/* Top Fuse Cap (Heavy brass connector) */}
    <rect x="44" y="27" width="12" height="6" rx="2" fill="#b45309" stroke="#78350f" strokeWidth="1" />

    {/* Burning Braided Rope Fuse */}
    <path
      d="M50,27 C50,20 62,18 58,10 C56,6 52,4 54,1"
      fill="none"
      stroke="#a16207"
      strokeWidth="2.5"
      strokeLinecap="round"
    />

    {/* Sizzling Burning Sparks and Flame at Fuse Tip */}
    <circle cx="54" cy="1" r="5" fill="url(#fuseBurn)" style={{ filter: "drop-shadow(0 0 6px #f59e0b)" }} />
    <polygon points="54,-3 57,1 54,5 51,1" fill="#ffffff" />
    {/* Flying Sparks */}
    <circle cx="60" cy="-1" r="1.2" fill="#fef08a" />
    <circle cx="58" cy="6" r="1" fill="#f97316" />
    <circle cx="48" cy="0" r="1.2" fill="#ef4444" />

    {/* Bottom Danger Plaque "BOMBA" */}
    <rect x="28" y="108" width="44" height="10" rx="2" fill="#450a0a" stroke="#ef4444" strokeWidth="1" />
    <text
      x="50"
      y="115.5"
      textAnchor="middle"
      fill="#fca5a5"
      fontSize="7"
      fontWeight="600"
      fontFamily="sans-serif"
      letterSpacing="1"
    >
      BOMBA
    </text>
  </svg>
);

/* =========================================================================
   4. DETAILED 3D MILITARY SOLDIER FIGURES
   ========================================================================= */
interface SoldierFigureProps {
  type: StrategoPieceType;
  rank: number;
  isRed: boolean;
  primaryColor: string;
  darkColor: string;
  highlightColor: string;
  trimColor: string;
}

const SoldierFigure: React.FC<SoldierFigureProps> = ({
  type,
  rank,
  isRed,
  primaryColor,
  darkColor,
  highlightColor,
  trimColor,
}) => {
  return (
    <svg
      viewBox="0 0 100 120"
      className="w-full h-full max-h-[110%] overflow-visible"
      shapeRendering="geometricPrecision"
      textRendering="geometricPrecision"
    >
      <defs>
        {/* Uniform Main Gradient */}
        <linearGradient id={`uniform_${type}_${isRed}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={highlightColor} />
          <stop offset="40%" stopColor={primaryColor} />
          <stop offset="85%" stopColor={darkColor} />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>

        {/* Gold Trim Gradient */}
        <linearGradient id="goldTrim" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>

        {/* Steel Blade Gradient */}
        <linearGradient id="steelBlade" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>

      {/* RENDER SPECIFIC SOLDIER TYPE */}
      {type === "marshal" && (
        <MarshalFigure isRed={isRed} uniformId={`uniform_${type}_${isRed}`} />
      )}
      {type === "general" && (
        <GeneralFigure isRed={isRed} uniformId={`uniform_${type}_${isRed}`} />
      )}
      {type === "colonel" && (
        <ColonelFigure isRed={isRed} uniformId={`uniform_${type}_${isRed}`} />
      )}
      {type === "major" && (
        <MajorFigure isRed={isRed} uniformId={`uniform_${type}_${isRed}`} />
      )}
      {type === "captain" && (
        <CaptainFigure isRed={isRed} uniformId={`uniform_${type}_${isRed}`} />
      )}
      {type === "lieutenant" && (
        <LieutenantFigure isRed={isRed} uniformId={`uniform_${type}_${isRed}`} />
      )}
      {type === "sergeant" && (
        <SergeantFigure isRed={isRed} uniformId={`uniform_${type}_${isRed}`} />
      )}
      {type === "miner" && (
        <MinerFigure isRed={isRed} uniformId={`uniform_${type}_${isRed}`} />
      )}
      {type === "scout" && (
        <ScoutFigure isRed={isRed} uniformId={`uniform_${type}_${isRed}`} />
      )}
      {type === "spy" && (
        <SpyFigure isRed={isRed} uniformId={`uniform_${type}_${isRed}`} />
      )}

      {/* Rank Shield Plaque at the Bottom of Figurine */}
      <g transform="translate(50, 110)">
        <polygon
          points="0,-12 12,-6 10,8 0,14 -10,8 -12,-6"
          fill={type === "spy" ? "url(#goldTrim)" : "url(#goldTrim)"}
          stroke={type === "spy" ? "#f0abfc" : "#451a03"}
          strokeWidth={type === "spy" ? "2" : "1"}
          style={{
            filter: type === "spy"
              ? "drop-shadow(0 0 6px #e879f9) drop-shadow(0 2px 4px rgba(0,0,0,0.9))"
              : "drop-shadow(0 2px 4px rgba(0,0,0,0.7))",
          }}
        />
        <text
          x="0"
          y="4.5"
          textAnchor="middle"
          fill={type === "spy" ? "#3b0764" : "#1c1917"}
          fontSize={rank === 10 ? "11.5" : "12"}
          fontWeight={rank === 10 ? "900" : "600"}
          fontFamily='system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        >
          {rank}
        </text>
      </g>
    </svg>
  );
};

/* --- MARSHAL (Rank 10) --- Supreme Commander in Grand Bicorne with Plumes, Golden Batons & Arms */
const MarshalFigure: React.FC<{ isRed: boolean; uniformId: string }> = ({ uniformId }) => (
  <g id="marshal_soldier">
    {/* LEFT ARM & SLEEVE (Gloved hand on golden saber scabbard) */}
    <path
      d="M32,56 C22,62 16,74 20,86 C22,90 26,90 28,84 C28,76 34,68 36,60 Z"
      fill={`url(#${uniformId})`}
      stroke="#1e293b"
      strokeWidth="1.2"
    />
    {/* Left Gold Cuff */}
    <path d="M19,83 L27,81 L29,86 L21,88 Z" fill="url(#goldTrim)" stroke="#78350f" strokeWidth="0.5" />
    {/* Left White Glove Hand */}
    <ellipse cx="23" cy="90" rx="4" ry="4.5" fill="#f8fafc" stroke="#64748b" strokeWidth="0.7" />

    {/* RIGHT ARM & SLEEVE (Bent forward, holding Commander Baton) */}
    <path
      d="M68,56 C78,62 84,72 80,82 C78,86 74,86 72,80 C70,72 66,66 64,60 Z"
      fill={`url(#${uniformId})`}
      stroke="#1e293b"
      strokeWidth="1.2"
    />
    {/* Right Gold Cuff */}
    <path d="M73,80 L81,82 L79,87 L71,85 Z" fill="url(#goldTrim)" stroke="#78350f" strokeWidth="0.5" />
    {/* Right White Glove Hand */}
    <ellipse cx="77" cy="88" rx="4" ry="4.5" fill="#f8fafc" stroke="#64748b" strokeWidth="0.7" />

    {/* Main Body / Double-Breasted Coat */}
    <path
      d="M30,55 L24,104 L76,104 L70,55 C65,48 35,48 30,55 Z"
      fill={`url(#${uniformId})`}
      stroke="#1e293b"
      strokeWidth="1.5"
    />

    {/* Grand Red/Gold Commander Sash across chest */}
    <path
      d="M32,54 L74,96 L68,102 L26,60 Z"
      fill="#b91c1c"
      stroke="#f59e0b"
      strokeWidth="0.8"
    />

    {/* Rows of Golden Buttons */}
    <circle cx="45" cy="62" r="1.5" fill="#fef08a" />
    <circle cx="55" cy="62" r="1.5" fill="#fef08a" />
    <circle cx="45" cy="70" r="1.5" fill="#fef08a" />
    <circle cx="55" cy="70" r="1.5" fill="#fef08a" />
    <circle cx="45" cy="78" r="1.5" fill="#fef08a" />
    <circle cx="55" cy="78" r="1.5" fill="#fef08a" />

    {/* Golden Bullion Epaulets with Fringe */}
    <path d="M22,54 C20,48 32,50 34,56 Z" fill="url(#goldTrim)" stroke="#78350f" strokeWidth="0.5" />
    <line x1="20" y1="55" x2="18" y2="62" stroke="#fef08a" strokeWidth="1" />
    <line x1="23" y1="56" x2="22" y2="63" stroke="#fef08a" strokeWidth="1" />
    <path d="M78,54 C80,48 68,50 66,56 Z" fill="url(#goldTrim)" stroke="#78350f" strokeWidth="0.5" />
    <line x1="80" y1="55" x2="82" y2="62" stroke="#fef08a" strokeWidth="1" />
    <line x1="77" y1="56" x2="78" y2="63" stroke="#fef08a" strokeWidth="1" />

    {/* Officer Waist Belt & Gold Buckle */}
    <rect x="25" y="94" width="50" height="5" fill="#451a03" stroke="#ca8a04" strokeWidth="0.8" />
    <rect x="46" y="93" width="8" height="7" rx="1.5" fill="url(#goldTrim)" stroke="#78350f" strokeWidth="0.8" />

    {/* Head & Facial Details */}
    <circle cx="50" cy="40" r="10" fill="#fed7aa" stroke="#78350f" strokeWidth="0.8" />
    {/* Eyes & Eyebrows */}
    <ellipse cx="46" cy="38" rx="1.5" ry="1" fill="#0f172a" />
    <ellipse cx="54" cy="38" rx="1.5" ry="1" fill="#0f172a" />
    <path d="M44,35 Q46,33 48,35" stroke="#78350f" strokeWidth="0.8" fill="none" />
    <path d="M52,35 Q54,33 56,35" stroke="#78350f" strokeWidth="0.8" fill="none" />
    {/* Distinguished White/Grey Officer Mustache */}
    <path d="M44,43 Q47,45 50,43 Q53,45 56,43 Q50,47 44,43 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.4" />

    {/* High Embroidered Gold Officer Collar */}
    <path d="M42,47 L58,47 L56,53 L44,53 Z" fill="url(#goldTrim)" stroke="#78350f" strokeWidth="0.5" />

    {/* Grand Napoleonic Bicorne Hat */}
    <path
      d="M20,38 C28,26 50,22 80,38 C72,20 28,20 20,38 Z"
      fill="#0f172a"
      stroke="#ca8a04"
      strokeWidth="1.5"
    />
    <path d="M30,30 L70,30" stroke="#fef08a" strokeWidth="1.5" />

    {/* Majestic Red & Gold Feather Plume */}
    <path
      d="M48,22 C46,10 52,4 58,2 C62,8 58,16 54,22 Z"
      fill="#dc2626"
      stroke="#fef08a"
      strokeWidth="0.8"
      style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}
    />

    {/* Golden Baton held by Right Hand */}
    <line x1="74" y1="98" x2="86" y2="68" stroke="url(#goldTrim)" strokeWidth="3" strokeLinecap="round" />
    <circle cx="86" cy="68" r="2.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.6" />
    <circle cx="74" cy="98" r="2" fill="#ca8a04" />

    {/* Crossed Golden Marshals' Batons Emblem on Chest */}
    <g transform="translate(50, 78)">
      <line x1="-12" y1="-10" x2="12" y2="10" stroke="#fef08a" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="12" y1="-10" x2="-12" y2="10" stroke="#fef08a" strokeWidth="2.5" strokeLinecap="round" />
      <polygon
        points="0,-4 1.2,-1.2 4,-1.2 1.6,0.8 2.8,3.6 0,2 -2.8,3.6 -1.6,0.8 -4,-1.2 -1.2,-1.2"
        fill="#fef08a"
        stroke="#ca8a04"
        strokeWidth="0.4"
      />
    </g>
  </g>
);

/* --- GENERAL (Rank 9) --- 4-Star General with Military Visor Cap & Drawn Saber with Arms */
const GeneralFigure: React.FC<{ isRed: boolean; uniformId: string }> = ({ uniformId }) => (
  <g id="general_soldier">
    {/* LEFT ARM & SLEEVE (Resting on sword scabbard) */}
    <path
      d="M32,55 C22,62 18,74 22,86 C24,90 28,90 30,84 C30,76 34,68 36,60 Z"
      fill={`url(#${uniformId})`}
      stroke="#1e293b"
      strokeWidth="1.2"
    />
    <path d="M21,83 L29,81 L31,86 L23,88 Z" fill="url(#goldTrim)" stroke="#78350f" strokeWidth="0.5" />
    <ellipse cx="25" cy="90" rx="4" ry="4.5" fill="#f8fafc" stroke="#64748b" strokeWidth="0.7" />

    {/* RIGHT ARM & SLEEVE (Raised with drawn cavalry saber) */}
    <path
      d="M68,55 C80,58 88,68 86,80 C84,84 80,84 76,78 C74,70 68,64 64,58 Z"
      fill={`url(#${uniformId})`}
      stroke="#1e293b"
      strokeWidth="1.2"
    />
    <path d="M80,78 L87,81 L84,86 L77,83 Z" fill="url(#goldTrim)" stroke="#78350f" strokeWidth="0.5" />
    <ellipse cx="83" cy="85" rx="4" ry="4.5" fill="#f8fafc" stroke="#64748b" strokeWidth="0.7" />

    {/* Drawn Officer Saber in Right Hand */}
    <path
      d="M83,85 C86,70 88,50 82,34"
      fill="none"
      stroke="url(#steelBlade)"
      strokeWidth="2.8"
      strokeLinecap="round"
      style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.8))" }}
    />
    {/* Gold Saber Basket Hilt & Pommel */}
    <circle cx="83" cy="85" r="3.5" fill="url(#goldTrim)" stroke="#78350f" strokeWidth="0.7" />
    <path d="M81,82 C86,81 87,88 83,90" fill="none" stroke="#eab308" strokeWidth="1.2" />

    {/* Body / Officer Coat */}
    <path
      d="M32,54 L26,104 L74,104 L68,54 C64,48 36,48 32,54 Z"
      fill={`url(#${uniformId})`}
      stroke="#1e293b"
      strokeWidth="1.5"
    />

    {/* Shoulder Boards with 4 Stars */}
    <rect x="22" y="52" width="12" height="6" rx="2" fill="url(#goldTrim)" stroke="#78350f" strokeWidth="0.5" />
    <rect x="66" y="52" width="12" height="6" rx="2" fill="url(#goldTrim)" stroke="#78350f" strokeWidth="0.5" />

    {/* Head & Face */}
    <circle cx="50" cy="40" r="10" fill="#fed7aa" stroke="#78350f" strokeWidth="0.8" />
    <ellipse cx="46" cy="38" rx="1.5" ry="1" fill="#0f172a" />
    <ellipse cx="54" cy="38" rx="1.5" ry="1" fill="#0f172a" />
    <path d="M44,35 L48,35" stroke="#78350f" strokeWidth="0.8" />
    <path d="M52,35 L56,35" stroke="#78350f" strokeWidth="0.8" />
    {/* General's Mustache */}
    <path d="M44,43 C47,45 53,45 56,43 C53,46 47,46 44,43 Z" fill="#475569" />

    {/* Military Peaked Visor Cap with Golden Oak Leaves */}
    <path d="M30,36 C34,26 66,26 70,36 Z" fill="#0f172a" stroke="#ca8a04" strokeWidth="1" />
    <ellipse cx="50" cy="36" rx="21" ry="3.5" fill="#1e293b" stroke="#fef08a" strokeWidth="1" />
    <path d="M32,37 C42,41 58,41 68,37 L70,39 C58,44 42,44 30,39 Z" fill="#020617" />
    <polygon points="50,28 47,32 53,32" fill="#fef08a" />

    {/* General's Chest Medals */}
    <rect x="38" y="60" width="8" height="4" fill="#ef4444" stroke="#ca8a04" strokeWidth="0.5" />
    <rect x="48" y="60" width="8" height="4" fill="#3b82f6" stroke="#ca8a04" strokeWidth="0.5" />
    <circle cx="42" cy="67" r="2.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.5" />
    <circle cx="52" cy="67" r="2.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.5" />

    {/* Belt */}
    <rect x="27" y="94" width="46" height="5" fill="#451a03" stroke="#ca8a04" strokeWidth="0.8" />
    <circle cx="50" cy="96.5" r="3" fill="url(#goldTrim)" />
  </g>
);

/* --- COLONEL (Rank 8) --- Cavalry Shako Helmet with Plume, Crossbelts & Broadsword with Arms */
const ColonelFigure: React.FC<{ isRed: boolean; uniformId: string }> = ({ uniformId }) => (
  <g id="colonel_soldier">
    {/* LEFT ARM */}
    <path
      d="M32,56 C22,64 18,76 22,88 C25,91 29,90 31,84 C31,76 35,68 36,60 Z"
      fill={`url(#${uniformId})`}
      stroke="#1e293b"
      strokeWidth="1.2"
    />
    <path d="M21,85 L29,83 L31,88 L23,90 Z" fill="url(#goldTrim)" />
    <ellipse cx="25" cy="92" rx="4" ry="4" fill="#fed7aa" stroke="#78350f" strokeWidth="0.6" />

    {/* RIGHT ARM (Gripping sword hilt) */}
    <path
      d="M68,56 C78,64 84,76 80,88 C78,92 73,91 71,85 C71,76 67,68 64,60 Z"
      fill={`url(#${uniformId})`}
      stroke="#1e293b"
      strokeWidth="1.2"
    />
    <path d="M73,85 L81,83 L83,88 L75,90 Z" fill="url(#goldTrim)" />
    <ellipse cx="79" cy="91" rx="4" ry="4" fill="#fed7aa" stroke="#78350f" strokeWidth="0.6" />

    {/* Cavalry Broadsword held by Right Hand */}
    <line x1="79" y1="91" x2="88" y2="44" stroke="url(#steelBlade)" strokeWidth="2.8" strokeLinecap="round" />
    <circle cx="79" cy="91" r="3.2" fill="url(#goldTrim)" stroke="#78350f" strokeWidth="0.6" />

    {/* Body */}
    <path
      d="M32,56 L26,104 L74,104 L68,56 Z"
      fill={`url(#${uniformId})`}
      stroke="#1e293b"
      strokeWidth="1.5"
    />
    {/* White Crossbelts */}
    <line x1="32" y1="56" x2="72" y2="102" stroke="#f8fafc" strokeWidth="3" />
    <line x1="68" y1="56" x2="28" y2="102" stroke="#f8fafc" strokeWidth="3" />
    <circle cx="50" cy="78" r="3.5" fill="url(#goldTrim)" />

    {/* Head */}
    <circle cx="50" cy="44" r="9" fill="#fed7aa" stroke="#78350f" strokeWidth="0.8" />
    <ellipse cx="46" cy="42" rx="1.5" ry="1" fill="#0f172a" />
    <ellipse cx="54" cy="42" rx="1.5" ry="1" fill="#0f172a" />
    <path d="M44,46 C47,48 53,48 56,46 Z" fill="#78350f" />

    {/* Tall Cavalry Shako Helmet */}
    <path d="M34,40 L36,18 L64,18 L66,40 Z" fill="#0f172a" stroke="#ca8a04" strokeWidth="1.2" />
    <ellipse cx="50" cy="18" rx="14" ry="2" fill="#ca8a04" />
    <path d="M32,40 C44,43 56,43 68,40 Z" fill="#020617" />
    <circle cx="50" cy="28" r="4" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.8" />
    <path d="M38,18 C36,8 40,2 44,0 C46,6 42,12 40,18 Z" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.6" />
  </g>
);

/* --- MAJOR (Rank 7) --- Field Officer with Arms, Epaulets & Officer Rapier */
const MajorFigure: React.FC<{ isRed: boolean; uniformId: string }> = ({ uniformId }) => (
  <g id="major_soldier">
    {/* LEFT ARM */}
    <path
      d="M32,54 C24,62 18,74 22,86 C25,89 29,88 30,82 C30,74 34,66 36,58 Z"
      fill={`url(#${uniformId})`}
      stroke="#1e293b"
      strokeWidth="1.2"
    />
    <ellipse cx="25" cy="89" rx="3.8" ry="4" fill="#fed7aa" stroke="#78350f" strokeWidth="0.6" />

    {/* RIGHT ARM (Thrusting officer rapier) */}
    <path
      d="M68,54 C78,60 84,72 82,84 C80,88 75,87 73,81 C72,73 68,66 64,58 Z"
      fill={`url(#${uniformId})`}
      stroke="#1e293b"
      strokeWidth="1.2"
    />
    <ellipse cx="80" cy="86" rx="3.8" ry="4" fill="#fed7aa" stroke="#78350f" strokeWidth="0.6" />

    {/* Officer Rapier Blade */}
    <line x1="80" y1="86" x2="88" y2="40" stroke="url(#steelBlade)" strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="80" cy="86" r="3" fill="url(#goldTrim)" />

    <path d="M32,54 L26,104 L74,104 L68,54 Z" fill={`url(#${uniformId})`} stroke="#1e293b" strokeWidth="1.5" />
    <rect x="24" y="52" width="10" height="5" rx="1.5" fill="url(#goldTrim)" />
    <rect x="66" y="52" width="10" height="5" rx="1.5" fill="url(#goldTrim)" />
    <rect x="27" y="90" width="46" height="5" fill="#451a03" stroke="#ca8a04" strokeWidth="0.8" />

    <circle cx="50" cy="40" r="9" fill="#fed7aa" stroke="#78350f" strokeWidth="0.8" />
    <ellipse cx="46" cy="38" rx="1.4" ry="1" fill="#0f172a" />
    <ellipse cx="54" cy="38" rx="1.4" ry="1" fill="#0f172a" />
    <path d="M44,42 C47,44 53,44 56,42 Z" fill="#78350f" />

    <path d="M32,36 C36,28 64,28 68,36 Z" fill="#0f172a" stroke="#ca8a04" strokeWidth="1" />
    <path d="M30,37 C42,40 58,40 70,37 Z" fill="#020617" />
    <g transform="translate(50, 72) scale(0.7)">
      <line x1="-14" y1="-14" x2="14" y2="14" stroke="url(#steelBlade)" strokeWidth="2.5" />
      <line x1="14" y1="-14" x2="-14" y2="14" stroke="url(#steelBlade)" strokeWidth="2.5" />
      <circle cx="0" cy="0" r="3" fill="url(#goldTrim)" />
    </g>
  </g>
);

/* --- CAPTAIN (Rank 6) --- Company Commander with Tricorne, Arms & Steel Saber */
const CaptainFigure: React.FC<{ isRed: boolean; uniformId: string }> = ({ uniformId }) => (
  <g id="captain_soldier">
    {/* LEFT ARM */}
    <path
      d="M32,54 C22,62 18,74 22,86 C25,89 29,88 30,82 C30,74 34,66 36,58 Z"
      fill={`url(#${uniformId})`}
      stroke="#1e293b"
      strokeWidth="1.2"
    />
    <ellipse cx="25" cy="89" rx="3.8" ry="4" fill="#fed7aa" stroke="#78350f" strokeWidth="0.6" />

    {/* RIGHT ARM (Holding upright rapier) */}
    <path
      d="M68,54 C78,60 84,72 82,84 C80,88 75,87 73,81 C72,73 68,66 64,58 Z"
      fill={`url(#${uniformId})`}
      stroke="#1e293b"
      strokeWidth="1.2"
    />
    <ellipse cx="80" cy="86" rx="3.8" ry="4" fill="#fed7aa" stroke="#78350f" strokeWidth="0.6" />

    {/* Steel Blade held upright */}
    <line x1="80" y1="36" x2="80" y2="92" stroke="url(#steelBlade)" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="80" cy="82" r="3.5" fill="url(#goldTrim)" />

    <path d="M32,54 L26,104 L74,104 L68,54 Z" fill={`url(#${uniformId})`} stroke="#1e293b" strokeWidth="1.5" />
    <rect x="27" y="82" width="46" height="5" fill="#451a03" stroke="#f59e0b" strokeWidth="0.8" />
    <circle cx="50" cy="40" r="9" fill="#fed7aa" stroke="#78350f" strokeWidth="0.8" />
    <ellipse cx="46" cy="38" rx="1.4" ry="1" fill="#0f172a" />
    <ellipse cx="54" cy="38" rx="1.4" ry="1" fill="#0f172a" />
    <path d="M44,43 C47,45 53,45 56,43 Z" fill="#78350f" />
    <path d="M26,38 L50,24 L74,38 C60,34 40,34 26,38 Z" fill="#0f172a" stroke="#fef08a" strokeWidth="1.2" />
  </g>
);

/* --- LIEUTENANT (Rank 5) --- Junior Officer with Arms & Flintlock Pistol */
const LieutenantFigure: React.FC<{ isRed: boolean; uniformId: string }> = ({ uniformId }) => (
  <g id="lieutenant_soldier">
    {/* LEFT ARM */}
    <path
      d="M32,54 C24,62 18,74 22,86 C25,89 29,88 30,82 C30,74 34,66 36,58 Z"
      fill={`url(#${uniformId})`}
      stroke="#1e293b"
      strokeWidth="1.2"
    />
    <ellipse cx="25" cy="89" rx="3.8" ry="4" fill="#fed7aa" stroke="#78350f" strokeWidth="0.6" />

    {/* RIGHT ARM (Outstretched aiming pistol) */}
    <path
      d="M68,54 C78,58 86,64 88,72 C88,76 84,76 80,72 C76,68 70,62 66,58 Z"
      fill={`url(#${uniformId})`}
      stroke="#1e293b"
      strokeWidth="1.2"
    />
    <ellipse cx="88" cy="73" rx="3.8" ry="4" fill="#fed7aa" stroke="#78350f" strokeWidth="0.6" />

    {/* Sidearm Pistol in Right Hand */}
    <rect x="88" y="70" width="12" height="3.5" rx="1" fill="#475569" stroke="#1e293b" strokeWidth="0.5" />
    <rect x="87" y="73.5" width="4" height="6" rx="1" fill="#78350f" />

    <path d="M32,54 L26,104 L74,104 L68,54 Z" fill={`url(#${uniformId})`} stroke="#1e293b" strokeWidth="1.5" />
    <path d="M30,56 L70,98 L66,102 L26,60 Z" fill="#78350f" stroke="#ca8a04" strokeWidth="0.8" />
    <circle cx="50" cy="40" r="9" fill="#fed7aa" stroke="#78350f" strokeWidth="0.8" />
    <ellipse cx="46" cy="38" rx="1.4" ry="1" fill="#0f172a" />
    <ellipse cx="54" cy="38" rx="1.4" ry="1" fill="#0f172a" />
    <path d="M34,36 L40,24 L64,26 L66,36 Z" fill="#0f172a" stroke="#ca8a04" strokeWidth="1" />
    <path d="M32,36 C42,39 58,39 68,36 Z" fill="#020617" />
  </g>
);

/* --- SERGEANT (Rank 4) --- Veteran NCO with Arms holding Rifled Musket & Chevrons */
const SergeantFigure: React.FC<{ isRed: boolean; uniformId: string }> = ({ uniformId }) => (
  <g id="sergeant_soldier">
    {/* LEFT ARM (Up gripping musket barrel) */}
    <path
      d="M32,54 C24,62 20,72 26,82 C28,85 32,84 32,78 C32,72 36,64 38,58 Z"
      fill={`url(#${uniformId})`}
      stroke="#1e293b"
      strokeWidth="1.2"
    />
    <ellipse cx="28" cy="84" rx="3.8" ry="4" fill="#fed7aa" stroke="#78350f" strokeWidth="0.6" />

    {/* RIGHT ARM (Holding musket stock) */}
    <path
      d="M68,54 C76,60 82,70 80,82 C78,86 74,86 72,80 C70,72 66,66 64,58 Z"
      fill={`url(#${uniformId})`}
      stroke="#1e293b"
      strokeWidth="1.2"
    />
    <ellipse cx="78" cy="84" rx="3.8" ry="4" fill="#fed7aa" stroke="#78350f" strokeWidth="0.6" />

    {/* Long Musket with Fixed Bayonet */}
    <line x1="80" y1="16" x2="80" y2="102" stroke="#78350f" strokeWidth="2.8" />
    <line x1="80" y1="6" x2="80" y2="22" stroke="url(#steelBlade)" strokeWidth="2" strokeLinecap="round" />
    <rect x="78" y="20" width="4" height="6" fill="#cbd5e1" />

    <path d="M32,54 L26,104 L74,104 L68,54 Z" fill={`url(#${uniformId})`} stroke="#1e293b" strokeWidth="1.5" />
    {/* 3 Golden Chevrons (V-Stripes) on Sleeve */}
    <path d="M25,66 L29,70 L33,66" fill="none" stroke="#fef08a" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M25,72 L29,76 L33,72" fill="none" stroke="#fef08a" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M25,78 L29,82 L33,78" fill="none" stroke="#fef08a" strokeWidth="1.5" strokeLinecap="round" />

    <circle cx="50" cy="40" r="9" fill="#fed7aa" stroke="#78350f" strokeWidth="0.8" />
    <ellipse cx="46" cy="38" rx="1.4" ry="1" fill="#0f172a" />
    <ellipse cx="54" cy="38" rx="1.4" ry="1" fill="#0f172a" />
    <path d="M43,44 C46,47 54,47 57,44 Z" fill="#334155" />

    <ellipse cx="50" cy="34" rx="18" ry="4" fill="#78350f" stroke="#ca8a04" strokeWidth="0.8" />
    <path d="M38,34 C42,22 58,22 62,34 Z" fill="#451a03" />
  </g>
);

/* --- MINER / GENIERE (Rank 3) --- Combat Sapper with Arms swinging Heavy Pickaxe */
const MinerFigure: React.FC<{ isRed: boolean; uniformId: string }> = ({ uniformId }) => (
  <g id="miner_soldier">
    {/* LEFT ARM (Bracing in heavy leather gauntlet) */}
    <path
      d="M32,54 C20,62 16,76 22,88 C25,92 30,90 32,84 C32,74 36,66 38,58 Z"
      fill="#78350f"
      stroke="#451a03"
      strokeWidth="1.2"
    />
    <ellipse cx="26" cy="90" rx="4.5" ry="4.5" fill="#451a03" stroke="#292524" strokeWidth="0.8" />

    {/* RIGHT ARM (Swinging heavy pickaxe) */}
    <path
      d="M68,54 C78,58 84,66 84,76 C84,82 80,82 78,76 C76,68 70,62 66,58 Z"
      fill="#78350f"
      stroke="#451a03"
      strokeWidth="1.2"
    />
    <ellipse cx="80" cy="78" rx="4.5" ry="4.5" fill="#451a03" stroke="#292524" strokeWidth="0.8" />

    {/* Heavy Steel Pickaxe across shoulder and hands */}
    <line x1="20" y1="40" x2="82" y2="92" stroke="#78350f" strokeWidth="3.2" strokeLinecap="round" />
    <path d="M12,32 C20,36 28,42 32,50 L26,54 C22,46 16,40 8,38 Z" fill="url(#steelBlade)" stroke="#1e293b" strokeWidth="1" />

    <path d="M32,54 L26,104 L74,104 L68,54 Z" fill={`url(#${uniformId})`} stroke="#1e293b" strokeWidth="1.5" />
    <path d="M38,62 L36,102 L64,102 L62,62 Z" fill="#78350f" stroke="#451a03" strokeWidth="1" />
    <circle cx="50" cy="40" r="9" fill="#fed7aa" stroke="#78350f" strokeWidth="0.8" />
    <ellipse cx="46" cy="38" rx="1.4" ry="1" fill="#0f172a" />
    <ellipse cx="54" cy="38" rx="1.4" ry="1" fill="#0f172a" />
    <path d="M32,38 C32,24 68,24 68,38 Z" fill="#475569" stroke="#cbd5e1" strokeWidth="1.5" />
    <circle cx="50" cy="30" r="2.5" fill="#f59e0b" />
  </g>
);

/* --- SCOUT / ESPLORATORE (Rank 2) --- Swift Scout with Both Arms holding Spyglass */
const ScoutFigure: React.FC<{ isRed: boolean; uniformId: string }> = ({ uniformId }) => (
  <g id="scout_soldier">
    {/* Body */}
    <path d="M32,54 L26,104 L74,104 L68,54 Z" fill={`url(#${uniformId})`} stroke="#1e293b" strokeWidth="1.5" />
    <path d="M30,54 C22,70 20,94 22,104 L28,104 Z" fill="#0f172a" opacity="0.6" />

    {/* Head */}
    <circle cx="50" cy="40" r="9" fill="#fed7aa" stroke="#78350f" strokeWidth="0.8" />
    <ellipse cx="46" cy="38" rx="1.4" ry="1" fill="#0f172a" />
    <ellipse cx="54" cy="38" rx="1.4" ry="1" fill="#0f172a" />

    {/* Scout Cap */}
    <path d="M34,36 C42,26 58,26 66,36 Z" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />

    {/* BOTH ARMS BENT UP TO EYE LEVEL HOLDING BINOCULARS/SPYGLASS */}
    {/* Left Arm */}
    <path
      d="M32,56 C26,58 32,46 48,44 L46,49 C38,50 34,58 32,56 Z"
      fill={`url(#${uniformId})`}
      stroke="#1e293b"
      strokeWidth="1.2"
    />
    <ellipse cx="48" cy="45" rx="3" ry="3.5" fill="#fed7aa" stroke="#78350f" strokeWidth="0.5" />

    {/* Right Arm */}
    <path
      d="M68,56 C74,58 68,46 54,44 L56,49 C64,50 68,58 68,56 Z"
      fill={`url(#${uniformId})`}
      stroke="#1e293b"
      strokeWidth="1.2"
    />
    <ellipse cx="56" cy="45" rx="3" ry="3.5" fill="#fed7aa" stroke="#78350f" strokeWidth="0.5" />

    {/* Brass Twin-Barrel Spyglass at Eye Level */}
    <rect x="52" y="38" width="28" height="5.5" rx="1.5" fill="url(#goldTrim)" stroke="#78350f" strokeWidth="0.8" />
    <rect x="76" y="36" width="6" height="9.5" rx="1.5" fill="#ca8a04" stroke="#78350f" strokeWidth="0.5" />
    <circle cx="82" cy="40.5" r="3" fill="#38bdf8" style={{ filter: "drop-shadow(0 0 3px #38bdf8)" }} />

    {/* Winged Boots Emblem on Chest */}
    <path d="M46,64 C42,60 40,64 44,68 C48,68 52,66 54,62 Z" fill="#38bdf8" />
  </g>
);

/* --- SPY / SPIA (Rank 1) --- High-Contrast Shadowy Master Assassin with Luminous Contour & Poisoned Stiletto */
const SpyFigure: React.FC<{ isRed: boolean; uniformId: string }> = ({ isRed }) => (
  <g id="spy_soldier">
    {/* Outer Luminous Contrast Contour Silhouette (Guarantees crisp visibility on any board square) */}
    <path
      d="M30,44 C20,58 16,84 18,105 L82,105 C84,84 80,58 70,44 C72,28 66,16 50,16 C34,16 28,28 30,44 Z"
      fill="none"
      stroke="#f0abfc"
      strokeWidth="2.8"
      strokeLinejoin="round"
      style={{ filter: "drop-shadow(0 0 5px #e879f9)" }}
    />

    {/* Swirling Stealth Cloak (Deep Midnight Violet with contrasting folds) */}
    <path
      d="M32,46 C22,60 18,84 20,104 L80,104 C82,84 78,60 68,46 Z"
      fill="#1e1b4b"
      stroke="#c084fc"
      strokeWidth="1.5"
    />
    {/* Inner Cloak Folds with high contrast */}
    <path d="M36,54 L32,102 L68,102 L64,54 Z" fill="#2e1065" stroke="#a855f7" strokeWidth="1" />
    <path d="M42,56 L38,102 L62,102 L58,56 Z" fill="#3b0764" />

    {/* Contrasting Team Affiliation Sash & Cross-Belts */}
    <path
      d="M36,66 L64,88 L60,94 L32,72 Z"
      fill={isRed ? "#dc2626" : "#2563eb"}
      stroke={isRed ? "#f87171" : "#60a5fa"}
      strokeWidth="1.2"
    />
    <circle cx="48" cy="80" r="3" fill="#facc15" stroke="#78350f" strokeWidth="0.8" />

    {/* Assassin Crossed Daggers Emblem on Chest */}
    <line x1="43" y1="58" x2="57" y2="70" stroke="#fef08a" strokeWidth="1.4" strokeLinecap="round" />
    <line x1="57" y1="58" x2="43" y2="70" stroke="#fef08a" strokeWidth="1.4" strokeLinecap="round" />
    <polygon points="50,61 52,65 48,65" fill="#facc15" />

    {/* LEFT ARM (Poised stealth balance in cloak with parrying dagger) */}
    <path
      d="M32,54 C24,62 20,74 24,84 C27,87 31,86 31,80 C31,72 34,64 36,56 Z"
      fill="#2e1065"
      stroke="#c084fc"
      strokeWidth="1.3"
    />
    <ellipse cx="27" cy="86" rx="3.5" ry="4" fill="#3b0764" stroke="#e879f9" strokeWidth="1" />
    {/* Left parrying dagger */}
    <line x1="27" y1="86" x2="20" y2="98" stroke="url(#steelBlade)" strokeWidth="2" strokeLinecap="round" />
    <circle cx="20" cy="98" r="1.5" fill="#38bdf8" />

    {/* RIGHT ARM (Lunging forward with gleaming poisoned stiletto) */}
    <path
      d="M66,54 C76,58 84,68 84,78 C84,82 80,82 78,76 C76,68 70,62 66,56 Z"
      fill="#2e1065"
      stroke="#c084fc"
      strokeWidth="1.3"
    />
    <ellipse cx="80" cy="79" rx="3.5" ry="4" fill="#3b0764" stroke="#e879f9" strokeWidth="1" />

    {/* Gleaming Razor-Sharp Poisoned Stiletto */}
    <line x1="80" y1="79" x2="94" y2="48" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
    <line x1="80" y1="79" x2="94" y2="48" stroke="url(#steelBlade)" strokeWidth="2" strokeLinecap="round" />
    {/* Golden Stiletto Crossguard */}
    <line x1="76" y1="77" x2="86" y2="74" stroke="#facc15" strokeWidth="2" strokeLinecap="round" />
    {/* Glowing Lethal Poison Droplet */}
    <circle cx="94" cy="48" r="2.8" fill="#10b981" style={{ filter: "drop-shadow(0 0 6px #10b981) drop-shadow(0 0 10px #34d399)" }} />
    <circle cx="96" cy="54" r="1.2" fill="#34d399" className="animate-pulse" />

    {/* Assassin High-Contrast Sculpted Hood */}
    <path
      d="M30,42 C28,18 72,18 70,42 C70,52 64,56 50,56 C36,56 30,52 30,42 Z"
      fill="#2e1065"
      stroke="#f0abfc"
      strokeWidth="1.6"
    />
    <path
      d="M34,44 C34,26 66,26 66,44 C66,50 60,53 50,53 C40,53 34,50 34,44 Z"
      fill="#1e1b4b"
      stroke="#c084fc"
      strokeWidth="1"
    />

    {/* Stealth Face Cowl / Mask */}
    <path d="M40,46 C45,49 55,49 60,46 L58,54 L42,54 Z" fill="#0f172a" stroke="#a855f7" strokeWidth="0.8" />

    {/* Radiant Piercing Assassin Eyes (High contrast glowing cyan) */}
    <ellipse cx="44" cy="41" rx="3.2" ry="1.6" fill="#22d3ee" style={{ filter: "drop-shadow(0 0 5px #22d3ee)" }} />
    <circle cx="44" cy="41" r="1.2" fill="#ffffff" />
    <ellipse cx="56" cy="41" rx="3.2" ry="1.6" fill="#22d3ee" style={{ filter: "drop-shadow(0 0 5px #22d3ee)" }} />
    <circle cx="56" cy="41" r="1.2" fill="#ffffff" />
  </g>
);

export default Stratego3DFigure;
