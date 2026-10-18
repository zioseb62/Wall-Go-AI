import React, { useEffect, useState, useMemo, useRef } from "react";
import { StrategoPiece, StrategoBattleResult } from "./StrategoBoard";
import { SoundManager } from "../utils/soundManager";

export interface SwordDuelArenaProps {
  attacker: StrategoPiece;
  defender: StrategoPiece;
  battleResult: StrategoBattleResult;
  fromPos?: { r: number; c: number };
  targetPos?: { r: number; c: number };
  tiltAngle: number;
  isBoardFlipped?: boolean;
  onComplete: () => void;
  language?: string;
}

interface SparkParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}

export const SwordDuelArena: React.FC<SwordDuelArenaProps> = ({
  attacker,
  defender,
  battleResult,
  fromPos,
  targetPos,
  tiltAngle,
  isBoardFlipped = false,
  onComplete,
  language = "it",
}) => {
  // Direction vector from defender cell (targetPos: 0,0) to attacker cell (fromPos: unitX, unitY)
  // When board is flipped 180° for Blue player, delta coordinates on screen are negated
  const diffC = fromPos && targetPos ? fromPos.c - targetPos.c : -1;
  const diffR = fromPos && targetPos ? fromPos.r - targetPos.r : 0;
  const rawDx = isBoardFlipped ? -diffC : diffC;
  const rawDy = isBoardFlipped ? -diffR : diffR;

  // Single-grid unit step: attacker is strictly in (unitX, unitY) adjacent square
  const unitX = rawDx !== 0 ? Math.sign(rawDx) : 0;
  const unitY = rawDy !== 0 ? Math.sign(rawDy) : 0;

  // Unique random seed per combat to vary choreography
  const seed = useMemo(() => Math.floor(Math.random() * 1000000), []);

  // Duel progress in milliseconds (0 to 2400ms)
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [shake, setShake] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeSparks, setActiveSparks] = useState<SparkParticle[]>([]);
  const playedAudioRef = useRef<Record<string, boolean>>({});
  const completeFiredRef = useRef<boolean>(false);

  // Dynamic combat timings:
  // Clash 1 (~520ms): Overhead strike met with steel parry
  // Clash 2 (~1020ms): Riposte thrust deflected
  // Clash 3 (~1480ms): Blade bind & struggle
  // Decisive (~1800ms): Lethal finishing blow, disarm, and fall
  const clashTimings = useMemo(() => {
    return [
      { time: 520, intensity: "heavy" as const },
      { time: 1020, intensity: "medium" as const },
      { time: 1480, intensity: "light" as const },
      { time: 1800, intensity: "heavy" as const },
    ];
  }, []);

  // Helper to spawn dynamic sparks on sword-to-sword contact at the clash line
  const triggerSparksAt = (xPercent: number, yPercent: number, count: number, isDecisive = false) => {
    const sparkColors = isDecisive
      ? ["#fef08a", "#f59e0b", "#ef4444", "#ffffff", "#f97316", "#fbbf24"]
      : ["#fef08a", "#fbbf24", "#ffffff", "#60a5fa", "#38bdf8", "#e2e8f0"];

    const newParticles: SparkParticle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (isDecisive ? 5.0 : 3.0) + Math.random() * (isDecisive ? 7.0 : 4.0);
      newParticles.push({
        id: Math.random(),
        x: xPercent + (Math.random() - 0.5) * 10,
        y: yPercent + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * (isDecisive ? 4.5 : 2.5),
        color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
        alpha: 1,
      });
    }

    setActiveSparks((prev) => [...prev.slice(-40), ...newParticles]);

    // Cell micro-shake on impact strictly confined
    const shakeMag = isDecisive ? 6 : 2.5;
    setShake({
      x: (Math.random() - 0.5) * shakeMag,
      y: (Math.random() - 0.5) * shakeMag,
    });
    setTimeout(() => setShake({ x: 0, y: 0 }), 90);
  };

  const isAttackerLoser = battleResult.winner === "defender" || battleResult.winner === "draw";
  const isDefenderLoser = battleResult.winner === "attacker" || battleResult.winner === "draw";
  const isDefenderBomb = defender.type === "bomb";
  const isDefenderFlag = defender.type === "flag";
  const isAttackerMiner = attacker.type === "miner";
  // For bombs, decisive moment is at 1350ms (detonation or disarm); for sword duels at 1800ms
  const isDecisiveHitLanded = elapsedMs >= (isDefenderBomb ? 1350 : 1800);

  // Main 2400ms duel timer & audio dispatch loop
  useEffect(() => {
    let animId: number;
    const startTime = performance.now();

    const tick = (now: number) => {
      const current = Math.min(2400, now - startTime);
      setElapsedMs(current);

      // Contact point between swords (located at ~35% along the line to attacker)
      const contactX = 50 + unitX * 35;
      const contactY = 50 + unitY * 35;

      if (isDefenderBomb) {
        // SPECIAL BOMB CLASH SOUND & VFX SEQUENCE:
        // 1. Initial approach & clink at ~380ms
        if (current >= 380 && !playedAudioRef.current["bomb_approach"]) {
          playedAudioRef.current["bomb_approach"] = true;
          SoundManager.playSwordClash("light", seed);
          triggerSparksAt(contactX, contactY, 12, false);
        }

        // 2. Detonation or Defusal at 1350ms
        if (current >= 1350 && !playedAudioRef.current["bomb_event"]) {
          playedAudioRef.current["bomb_event"] = true;
          if (isAttackerMiner && battleResult.winner === "attacker") {
            // Sapper disarms bomb safely
            SoundManager.playBombDefused();
            triggerSparksAt(50, 50, 24, true);
          } else {
            // Massive Bomb Explosion!
            SoundManager.playBombExplosion();
            triggerSparksAt(50, 50, 45, true);
            // Multi-stage violent explosion rumble shake
            setShake({ x: (Math.random() - 0.5) * 18, y: (Math.random() - 0.5) * 18 });
            setTimeout(() => setShake({ x: (Math.random() - 0.5) * 15, y: (Math.random() - 0.5) * 15 }), 60);
            setTimeout(() => setShake({ x: (Math.random() - 0.5) * 12, y: (Math.random() - 0.5) * 12 }), 130);
            setTimeout(() => setShake({ x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8 }), 210);
            setTimeout(() => setShake({ x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4 }), 300);
            setTimeout(() => setShake({ x: 0, y: 0 }), 400);
          }
        }
      } else {
        // STANDARD SOLDIER-TO-SOLDIER CLASH SEQUENCE
        clashTimings.forEach((c, idx) => {
          const key = `clash_${idx}`;
          if (current >= c.time && !playedAudioRef.current[key]) {
            playedAudioRef.current[key] = true;
            if (idx === 3) {
              // Decisive hit
              SoundManager.playDecisiveStrike();
              triggerSparksAt(contactX, contactY, 28, true);
            } else if (idx === 0) {
              SoundManager.playSwordClash(c.intensity, seed);
              triggerSparksAt(contactX, contactY, 16, false);
            } else if (idx === 1) {
              SoundManager.playSwordClash(c.intensity, seed + 2);
              triggerSparksAt(contactX, contactY, 14, false);
            } else {
              SoundManager.playSwordClash(c.intensity, seed + 4);
              triggerSparksAt(contactX, contactY, 10, false);
            }
          }
        });
      }

      // Defeat dissolution sound at ~2050ms
      if (current >= 2050 && !playedAudioRef.current["defeat_sound"]) {
        playedAudioRef.current["defeat_sound"] = true;
        SoundManager.playDefeatDissolve();
      }

      // Complete duel after 2400ms
      if (current >= 2400) {
        if (!completeFiredRef.current) {
          completeFiredRef.current = true;
          onComplete();
        }
        return;
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [clashTimings, isAttackerMiner, isDefenderBomb, onComplete, seed, unitX, unitY, battleResult.winner]);

  // Update spark physics
  useEffect(() => {
    if (activeSparks.length === 0) return;
    const timer = setTimeout(() => {
      setActiveSparks((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx * 0.45,
            y: p.y + p.vy * 0.45,
            alpha: p.alpha - 0.08,
          }))
          .filter((p) => p.alpha > 0.05)
      );
    }, 25);
    return () => clearTimeout(timer);
  }, [activeSparks]);

  return (
    <div
      className="absolute inset-0 z-[65] flex items-center justify-center pointer-events-none select-none overflow-visible"
      style={{
        transform: `translate3d(${shake.x}px, ${shake.y}px, 30px)`,
        transformStyle: "preserve-3d",
      }}
    >
      {/* Dynamic Battle Ring on the Ground strictly relegated to the 2 combat squares */}
      <div
        className="absolute rounded-full border border-amber-400/40 bg-radial from-amber-500/15 via-red-950/15 to-transparent shadow-[0_0_20px_rgba(245,158,11,0.35)] pointer-events-none"
        style={{
          width: unitX !== 0 ? "190%" : "110%",
          height: unitY !== 0 ? "190%" : "110%",
          left: `${50 + unitX * 50}%`,
          top: `${50 + unitY * 50}%`,
          transform: "translate(-50%, -50%) rotateX(55deg) translateZ(-6px)",
        }}
      />

      {/* COMBAT ARENA CONTENT */}
      {/* 1. ATTACKER: HUMAN ANIMATED SWORDSMAN */}
      <HumanCombatant
        piece={attacker}
        role="attacker"
        elapsedMs={elapsedMs}
        unitX={unitX}
        unitY={unitY}
        isWinner={battleResult.winner === "attacker"}
        isLoser={isAttackerLoser}
        isDraw={battleResult.winner === "draw"}
        isDecisiveHitLanded={isDecisiveHitLanded}
        targetIsBomb={isDefenderBomb}
        targetIsFlag={isDefenderFlag}
        isMiner={isAttackerMiner}
        seed={seed}
      />

      {/* 2. DEFENDER: HUMAN ANIMATED SWORDSMAN OR SPECIAL OBJECT */}
      {isDefenderBomb ? (
        <BombDefender
          isRed={defender.player === "red"}
          elapsedMs={elapsedMs}
          isDefused={isAttackerMiner && battleResult.winner === "attacker"}
          isDecisiveHitLanded={isDecisiveHitLanded}
        />
      ) : isDefenderFlag ? (
        <FlagDefender
          isRed={defender.player === "red"}
          elapsedMs={elapsedMs}
          isCaptured={battleResult.winner === "attacker"}
          isDecisiveHitLanded={isDecisiveHitLanded}
        />
      ) : (
        <HumanCombatant
          piece={defender}
          role="defender"
          elapsedMs={elapsedMs}
          unitX={unitX}
          unitY={unitY}
          isWinner={battleResult.winner === "defender"}
          isLoser={isDefenderLoser}
          isDraw={battleResult.winner === "draw"}
          isDecisiveHitLanded={isDecisiveHitLanded}
          targetIsBomb={false}
          targetIsFlag={false}
          isMiner={false}
          seed={seed}
        />
      )}

      {/* DYNAMIC COMBAT SPARKS ON SWORD IMPACT */}
      {activeSparks.map((spark) => (
        <div
          key={spark.id}
          className="absolute rounded-full pointer-events-none z-40"
          style={{
            left: `${spark.x}%`,
            top: `${spark.y}%`,
            width: `${spark.size}px`,
            height: `${spark.size}px`,
            backgroundColor: spark.color,
            opacity: spark.alpha,
            boxShadow: `0 0 8px ${spark.color}, 0 0 14px ${spark.color}`,
            transform: "translate(-50%, -50%) translateZ(40px)",
          }}
        />
      ))}

      {/* IMPACT SHOCKWAVE RING ON FATAL STRIKE */}
      {isDecisiveHitLanded && (
        <div
          className="absolute rounded-full border-2 border-amber-300 pointer-events-none z-30 animate-ping"
          style={{
            left: "50%",
            top: "50%",
            width: "90px",
            height: "90px",
            transform: "translate(-50%, -50%) translateZ(20px)",
            boxShadow: "0 0 25px rgba(251,191,36,0.9)",
          }}
        />
      )}
    </div>
  );
};

/* =========================================================================
   ARTICULATED HUMAN COMBATANT COMPONENT
   Simulates full human anatomy: Head, Torso, Shoulders, Arms, Legs, and
   gleaming Swords in their hands with realistic swordplay motion!
   ========================================================================= */

interface HumanCombatantProps {
  piece: StrategoPiece;
  role: "attacker" | "defender";
  elapsedMs: number;
  unitX: number;
  unitY: number;
  isWinner: boolean;
  isLoser: boolean;
  isDraw: boolean;
  isDecisiveHitLanded: boolean;
  targetIsBomb: boolean;
  targetIsFlag: boolean;
  isMiner: boolean;
  seed: number;
}

const HumanCombatant: React.FC<HumanCombatantProps> = ({
  piece,
  role,
  elapsedMs,
  unitX,
  unitY,
  isWinner,
  isLoser,
  isDraw,
  isDecisiveHitLanded,
  targetIsBomb,
  targetIsFlag,
  isMiner,
  seed,
}) => {
  const isRed = piece.player === "red";
  const isAttacker = role === "attacker";
  const t = elapsedMs;

  // Facing direction: Attacker charges towards Defender.
  // Standard setup: Attacker faces defender, defender faces attacker.
  const baseFacing = unitX > 0 ? -1 : (unitX < 0 ? 1 : 1);
  const facing = isAttacker ? baseFacing : -baseFacing;

  // Compute full human body kinematic articulation across duel phases
  // Strictly relegated to the 2 combat squares with zero back-and-forth oscillation!
  const kinematics = useMemo(() => {
    // Spatial positioning (X, Y in % of grid cell)
    let posX = 0;
    let posY = 0;
    let bodyLean = 0; // Torso forward/back lean angle
    let headTilt = 0; // Head nodding/tracking angle
    let frontKneeBend = 15; // Degrees of front knee flexion
    let rearLegStretch = 10;
    let swordArmAngle = 0; // Rotation of right sword arm
    let swordBladeAngle = 0; // Angle of blade relative to arm
    let offArmAngle = -20; // Off-hand guard/counterbalance angle
    let bodyBob = 0; // Vertical step/bounce
    let slashActive = false;
    let disarmed = false;
    let flyingSwordX = 0;
    let flyingSwordY = 0;
    let flyingSwordRot = 0;
    let dissolveOpacity = 1;
    let scale = 1.25; // Slightly enlarged pieces during clash (as requested by user)

    if (isAttacker) {
      // ATTACKER KINEMATICS:
      // Starts in attacker cell (unitX * 80, unitY * 80).
      // Smoothly steps forward ONCE to clash line (unitX * 35, unitY * 35).
      if (targetIsBomb && isLoser) {
        // Attacker against Bomb (detonation victim)
        if (t < 400) {
          const p = t / 400;
          posX = unitX * (80 - p * 45);
          posY = unitY * (80 - p * 45);
          bodyLean = facing * 14;
          frontKneeBend = 15 + p * 15;
          swordArmAngle = -40 + p * 35;
        } else if (t < 1350) {
          // Attacker approaches and prepares strike against bomb
          posX = unitX * 35;
          posY = unitY * 35;
          bodyLean = facing * 20;
          swordArmAngle = 25;
          swordBladeAngle = 45;
          frontKneeBend = 30;
        } else {
          // 💣 DETONATION: Attacker is violently thrown backwards by explosive blast wave!
          const bp = Math.min(1, (t - 1350) / 750);
          posX = unitX * (35 + bp * 50);
          posY = unitY * (35 + bp * 35) - Math.sin(bp * Math.PI) * 25;
          bodyLean = -facing * (20 + bp * 45);
          headTilt = -facing * 25;
          frontKneeBend = 30 + bp * 35;
          disarmed = true;
          flyingSwordX = unitX * bp * 45;
          flyingSwordY = unitY * bp * 45 - Math.sin(bp * Math.PI) * 35;
          flyingSwordRot = bp * 720;
          swordArmAngle = -20 + bp * 50;
          dissolveOpacity = Math.max(0, 1 - bp * 1.4);
          scale = 1.25 * (1 - bp * 0.15);
        }
      } else if (targetIsBomb && isMiner && isWinner) {
        // Miner safely defuses bomb
        if (t < 400) {
          const p = t / 400;
          posX = unitX * (80 - p * 45);
          posY = unitY * (80 - p * 45);
          bodyLean = facing * 12;
        } else if (t < 1350) {
          // Miner kneels at bomb with defusing cutters
          posX = unitX * 35;
          posY = unitY * 35;
          bodyLean = facing * 28;
          frontKneeBend = 45;
          swordArmAngle = 50;
          swordBladeAngle = 75;
        } else {
          // Wire cut! Miner stands in triumph
          const p = Math.min(1, (t - 1350) / 650);
          posX = unitX * 35 * (1 - p * 0.4);
          posY = unitY * 35 * (1 - p * 0.4);
          bodyLean = facing * (28 - p * 24);
          frontKneeBend = 45 - p * 30;
          swordArmAngle = 70 - p * 120;
          scale = 1.25 + p * 0.12;
        }
      } else if (t < 350) {
        // Phase 1: Clean single forward advance to engagement line
        const p = t / 350;
        posX = unitX * (80 - p * 45);
        posY = unitY * (80 - p * 45);
        const runCycle = Math.sin(p * Math.PI * 2);
        bodyBob = Math.abs(runCycle) * -4;
        bodyLean = facing * 14;
        headTilt = facing * 6;
        frontKneeBend = 15 + p * 15;
        rearLegStretch = 15;
        swordArmAngle = -40 + p * 25;
        swordBladeAngle = -35 + p * 15;
        offArmAngle = -35;
      } else if (t < 800) {
        // Phase 2: Overhead Slash & Steel Parry (anchored at engagement line)
        const p = (t - 350) / 450;
        posX = unitX * 35;
        posY = unitY * 35;
        if (p < 0.38) {
          const sp = p / 0.38;
          bodyLean = facing * (12 + sp * 14);
          frontKneeBend = 20 + sp * 25;
          swordArmAngle = -75 + sp * 120;
          swordBladeAngle = 20 + sp * 35;
          slashActive = true;
          bodyBob = sp * 2;
        } else {
          const rp = (p - 0.38) / 0.62;
          const recoil = Math.sin(rp * Math.PI);
          bodyLean = facing * (26 - recoil * 16);
          headTilt = -facing * recoil * 10;
          frontKneeBend = 45 - recoil * 10;
          swordArmAngle = 45 - recoil * 45;
          swordBladeAngle = 55 - recoil * 30;
          bodyBob = -recoil * 2;
        }
      } else if (t < 1300) {
        // Phase 3: Defender Riposte & Attacker Low Deflection (anchored at engagement line)
        const p = (t - 800) / 500;
        posX = unitX * 35;
        posY = unitY * 35;
        if (p < 0.5) {
          const dp = p / 0.5;
          bodyLean = -facing * dp * 12;
          headTilt = -facing * dp * 8;
          frontKneeBend = 30 - dp * 5;
          rearLegStretch = 20;
          swordArmAngle = -10 + dp * 35;
          swordBladeAngle = 60 + dp * 20;
        } else {
          const rec = (p - 0.5) / 0.5;
          bodyLean = -facing * 12 * (1 - rec);
          headTilt = 0;
          frontKneeBend = 25 + rec * 5;
          swordArmAngle = 25 - rec * 15;
          swordBladeAngle = 80 - rec * 35;
        }
      } else if (t < 1750) {
        // Phase 4: Blade Bind (anchored at engagement line)
        posX = unitX * 35;
        posY = unitY * 35;
        bodyLean = facing * 16;
        headTilt = facing * 4;
        frontKneeBend = 30;
        swordArmAngle = 20;
        swordBladeAngle = 45;
        offArmAngle = 10;
      } else {
        // Phase 5: Decisive Outcome
        const p = Math.min(1, (t - 1750) / 600);
        if (isWinner) {
          // Attacker wins: smooth single forward step to occupy defender cell (0, 0)
          posX = unitX * 35 * (1 - p);
          posY = unitY * 35 * (1 - p);
          if (p < 0.3) {
            const fp = p / 0.3;
            bodyLean = facing * (16 + fp * 14);
            swordArmAngle = -45 + fp * 110;
            swordBladeAngle = 30 + fp * 40;
            slashActive = true;
          } else {
            const vp = (p - 0.3) / 0.7;
            bodyLean = facing * (30 - vp * 26);
            headTilt = -facing * 4;
            frontKneeBend = 30 - vp * 15;
            rearLegStretch = 10;
            swordArmAngle = 65 - vp * 115;
            swordBladeAngle = 70 - vp * 85;
            offArmAngle = -35;
            scale = 1.25 + vp * 0.12;
          }
        } else {
          // Attacker defeated: drops to knee in attacker square area and dissolves cleanly
          posX = unitX * (35 + p * 30);
          posY = unitY * (35 + p * 30);
          bodyLean = -facing * (14 + p * 35);
          headTilt = -facing * p * 20;
          frontKneeBend = 30 + p * 40;
          disarmed = true;
          flyingSwordX = unitX * p * 35;
          flyingSwordY = unitY * p * 35 - Math.sin(p * Math.PI) * 30;
          flyingSwordRot = p * 540;
          swordArmAngle = -10 + p * 40;
          offArmAngle = 20;
          dissolveOpacity = Math.max(0, 1 - Math.max(0, p - 0.35) * 1.6);
        }
      }
    } else {
      // DEFENDER KINEMATICS:
      // Stationed firmly in defender cell (0, 0) throughout the entire duel!
      posX = 0;
      posY = 0;

      if (t < 350) {
        // Phase 1: Firm defensive guard in own cell
        const p = t / 350;
        bodyLean = facing * (p * 10);
        headTilt = facing * (p * 5);
        frontKneeBend = 15 + p * 10;
        swordArmAngle = -15 - p * 20;
        swordBladeAngle = -20 - p * 15;
        offArmAngle = -30;
      } else if (t < 800) {
        // Phase 2: Overhead Parry in own cell
        const p = (t - 350) / 450;
        if (p < 0.38) {
          const pp = p / 0.38;
          bodyLean = facing * (10 + pp * 8);
          frontKneeBend = 25 + pp * 10;
          swordArmAngle = -35 - pp * 25;
          swordBladeAngle = -35 - pp * 20;
        } else {
          const rp = (p - 0.38) / 0.62;
          const recoil = Math.sin(rp * Math.PI);
          bodyLean = facing * (18 - recoil * 12);
          frontKneeBend = 35 - recoil * 8;
          swordArmAngle = -60 + recoil * 18;
          bodyBob = recoil * 2;
        }
      } else if (t < 1300) {
        // Phase 3: Fencing Riposte thrust (fencing extension without leaving cell)
        const p = (t - 800) / 500;
        if (p < 0.45) {
          const tp = p / 0.45;
          bodyLean = facing * (6 + tp * 18);
          frontKneeBend = 27 + tp * 20;
          swordArmAngle = -45 + tp * 75;
          swordBladeAngle = -15 + tp * 35;
          slashActive = true;
        } else {
          const rp = (p - 0.45) / 0.55;
          bodyLean = facing * (24 - rp * 14);
          frontKneeBend = 47 - rp * 15;
          swordArmAngle = 30 - rp * 15;
          swordBladeAngle = 20 - rp * 10;
        }
      } else if (t < 1750) {
        // Phase 4: Blade Bind in own cell
        bodyLean = facing * 14;
        frontKneeBend = 30;
        swordArmAngle = 15;
        swordBladeAngle = 45;
        offArmAngle = 10;
      } else {
        // Phase 5: Outcome in own cell
        const p = Math.min(1, (t - 1750) / 600);
        if (isWinner) {
          // Defender holds ground and raises weapon in victory
          if (p < 0.3) {
            const fp = p / 0.3;
            bodyLean = facing * (14 + fp * 15);
            swordArmAngle = 15 + fp * 55;
            swordBladeAngle = 45 + fp * 25;
            slashActive = true;
          } else {
            const vp = (p - 0.3) / 0.7;
            bodyLean = facing * (29 - vp * 25);
            frontKneeBend = 30 - vp * 15;
            swordArmAngle = 70 - vp * 120;
            swordBladeAngle = 70 - vp * 85;
            offArmAngle = -35;
            scale = 1.25 + vp * 0.12;
          }
        } else {
          // Defender defeated in cell: disarmed, collapses in place, dissolves cleanly
          bodyLean = -facing * (14 + p * 35);
          headTilt = -facing * p * 20;
          frontKneeBend = 30 + p * 40;
          disarmed = true;
          flyingSwordX = -facing * p * 30;
          flyingSwordY = -Math.sin(p * Math.PI) * 30 + p * 20;
          flyingSwordRot = -p * 540;
          swordArmAngle = -10 + p * 35;
          offArmAngle = 15;
          dissolveOpacity = Math.max(0, 1 - Math.max(0, p - 0.35) * 1.6);
        }
      }
    }

    return {
      posX,
      posY,
      bodyLean,
      headTilt,
      frontKneeBend,
      rearLegStretch,
      swordArmAngle,
      swordBladeAngle,
      offArmAngle,
      bodyBob,
      slashActive,
      disarmed,
      flyingSwordX,
      flyingSwordY,
      flyingSwordRot,
      dissolveOpacity,
      scale,
    };
  }, [t, isAttacker, unitX, unitY, facing, isWinner]);

  // Primary uniform colors
  const primaryColor = isRed ? "#dc2626" : "#2563eb";
  const darkColor = isRed ? "#7f1d1d" : "#1e3a8a";
  const trimColor = isRed ? "#f59e0b" : "#93c5fd";

  return (
    <div
      className="absolute w-[114%] h-[114%] flex items-center justify-center pointer-events-none z-20"
      style={{
        transform: `translate3d(${kinematics.posX}%, ${kinematics.posY + kinematics.bodyBob}%, ${isAttacker ? 22 : 18}px) scale(${kinematics.scale})`,
        opacity: kinematics.dissolveOpacity,
        filter: (piece.type === "spy" || piece.rank === 1)
          ? `drop-shadow(0 0 5px #f0abfc) drop-shadow(0 0 10px rgba(192, 38, 211, 0.85)) ${kinematics.dissolveOpacity < 0.9 ? `blur(${(1 - kinematics.dissolveOpacity) * 4}px)` : ""}`
          : kinematics.dissolveOpacity < 0.9
          ? `blur(${(1 - kinematics.dissolveOpacity) * 4}px)`
          : undefined,
        transformStyle: "preserve-3d",
      }}
    >
      {/* Winner Champion Aura */}
      {isWinner && isDecisiveHitLanded && (
        <div className="absolute -inset-4 rounded-full border-2 border-amber-400 shadow-[0_0_25px_rgba(250,204,21,0.95)] animate-pulse pointer-events-none" />
      )}

      {/* FLYING DISARMED SWORD (When defeated) */}
      {kinematics.disarmed && (
        <div
          className="absolute pointer-events-none z-50"
          style={{
            transform: `translate3d(${kinematics.flyingSwordX}px, ${kinematics.flyingSwordY}px, 35px) rotate(${kinematics.flyingSwordRot}deg)`,
          }}
        >
          <svg viewBox="0 0 40 80" className="w-8 h-16 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
            <defs>
              <linearGradient id="flyingSteel" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="50%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>
            </defs>
            {/* Blade */}
            <polygon points="19,5 21,5 22,50 18,50" fill="url(#flyingSteel)" stroke="#334155" strokeWidth="0.8" />
            {/* Crossguard */}
            <rect x="12" y="50" width="16" height="3" rx="1.5" fill="#facc15" stroke="#78350f" strokeWidth="0.6" />
            {/* Grip */}
            <rect x="18" y="53" width="4" height="10" rx="1" fill="#451a03" />
            {/* Pommel */}
            <circle cx="20" cy="65" r="3" fill="#facc15" stroke="#78350f" strokeWidth="0.6" />
          </svg>
        </div>
      )}

      {/* DETAILED ARTICULATED HUMAN SOLDIER SVG */}
      <svg
        viewBox="0 0 120 140"
        className="w-full h-full max-h-[125%] overflow-visible drop-shadow-[0_12px_12px_rgba(0,0,0,0.8)]"
        shapeRendering="geometricPrecision"
        textRendering="geometricPrecision"
      >
        <defs>
          {/* Steel Blade Gradient */}
          <linearGradient id={`bladeSteel_${piece.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#e2e8f0" />
            <stop offset="85%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>

          {/* Gold Hilt Gradient */}
          <linearGradient id={`goldHilt_${piece.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#854d0e" />
          </linearGradient>

          {/* Regimental Coat Gradient */}
          <linearGradient id={`regimentCoat_${piece.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isRed ? "#f87171" : "#60a5fa"} />
            <stop offset="40%" stopColor={primaryColor} />
            <stop offset="85%" stopColor={darkColor} />
            <stop offset="100%" stopColor="#090d16" />
          </linearGradient>

          {/* White Lapel & Belt Gradient */}
          <linearGradient id="whiteLeather" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="80%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>

          {/* Black Boot Leather Gradient */}
          <linearGradient id="bootLeather" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="60%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* Sword Slash Trail Gradient */}
          <radialGradient id={`slashGlow_${piece.id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#67e8f9" stopOpacity="0.6" />
            <stop offset="80%" stopColor="#38bdf8" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* HUMAN FIGURE ROOT GROUP: Centered and flipped based on facing */}
        {/* HUMAN FIGURE ROOT GROUP: Centered and flipped based on facing */}
        <g
          transform={`translate(60, 70) scale(${facing}, 1) translate(-60, -70)`}
        >
          {/* DYNAMIC SWORD SLASH ARC (When swinging) */}
          {kinematics.slashActive && (
            <path
              d="M 65 30 C 95 20, 115 50, 95 85"
              fill="none"
              stroke={`url(#slashGlow_${piece.id})`}
              strokeWidth="10"
              strokeLinecap="round"
              className="animate-pulse"
              style={{ filter: "drop-shadow(0 0 8px rgba(56,189,248,0.9))" }}
            />
          )}

          {/* --- 1. REAR LEG & BOOT (Back leg supports fencing stance) --- */}
          <g transform={`rotate(${-kinematics.rearLegStretch}, 52, 85)`}>
            {/* Thigh (trousers) */}
            <path d="M46,85 L58,85 L56,107 L47,107 Z" fill="#f8fafc" stroke="#64748b" strokeWidth="0.8" />
            {/* Tall Black Riding Boot */}
            <path
              d="M47,105 L57,105 L58,123 C58,127 54,129 44,129 L44,123 L48,121 Z"
              fill="url(#bootLeather)"
              stroke="#0f172a"
              strokeWidth="0.8"
            />
            {/* Gold spur */}
            <circle cx="45" cy="125" r="1.5" fill="#facc15" />
          </g>

          {/* --- 2. FRONT LEG & BOOT (Front leg bends dynamically into lunge) --- */}
          <g transform={`rotate(${kinematics.frontKneeBend * 0.7}, 68, 85)`}>
            {/* Thigh (white breeches / trousers) */}
            <path d="M63,85 L75,85 L77,107 L65,107 Z" fill="#f8fafc" stroke="#64748b" strokeWidth="0.8" />
            {/* Knee & Calf */}
            <g transform="rotate(15, 71, 107)">
              <path
                d="M65,107 L77,107 L79,131 C79,135 85,136 87,137 L87,139 L67,139 C64,139 64,135 65,129 Z"
                fill="url(#bootLeather)"
                stroke="#0f172a"
                strokeWidth="0.8"
              />
              {/* Boot top gold/red rim */}
              <rect x="65" y="107" width="12" height="3" fill="url(#whiteLeather)" />
            </g>
          </g>

          {/* --- 3. TORSO, SHOULDERS & MILITARY COAT --- */}
          <g
            transform={`translate(60, 85) rotate(${kinematics.bodyLean}) translate(-60, -85)`}
          >
            {/* Waist Sash (Silk Crimson or Gold) */}
            <path
              d="M48,82 L72,82 L74,88 L46,88 Z"
              fill={isRed ? "#991b1b" : "#d97706"}
              stroke="#451a03"
              strokeWidth="0.6"
            />

            {/* Regimental Tailored Jacket Coat */}
            <path
              d="M45,46 C45,46 52,44 60,44 C68,44 75,46 75,46 L73,83 L47,83 Z"
              fill={`url(#regimentCoat_${piece.id})`}
              stroke="#0f172a"
              strokeWidth="1.2"
            />

            {/* White Double-Breasted Lapels */}
            <polygon
              points="52,45 68,45 66,78 54,78"
              fill="url(#whiteLeather)"
              stroke="#64748b"
              strokeWidth="0.8"
            />

            {/* Cross-Belt Harness with Central Golden Buckle */}
            <line x1="49" y1="46" x2="71" y2="82" stroke="#ffffff" strokeWidth="2.5" />
            <line x1="71" y1="46" x2="49" y2="82" stroke="#ffffff" strokeWidth="2.5" />
            <circle cx="60" cy="64" r="3.5" fill={`url(#goldHilt_${piece.id})`} stroke="#78350f" strokeWidth="0.7" />

            {/* Brass Buttons on Lapel */}
            {[50, 56, 62, 68].map((y) => (
              <React.Fragment key={y}>
                <circle cx="56" cy={y} r="1.3" fill="#facc15" stroke="#78350f" strokeWidth="0.4" />
                <circle cx="64" cy={y} r="1.3" fill="#facc15" stroke="#78350f" strokeWidth="0.4" />
              </React.Fragment>
            ))}

            {/* Golden Epaulets on Shoulders */}
            <ellipse cx="46" cy="46" rx="4.5" ry="3" fill={`url(#goldHilt_${piece.id})`} stroke="#78350f" strokeWidth="0.6" />
            <ellipse cx="74" cy="46" rx="4.5" ry="3" fill={`url(#goldHilt_${piece.id})`} stroke="#78350f" strokeWidth="0.6" />

            {/* --- 4. OFF-HAND / BALANCE ARM (Left Arm) --- */}
            <g transform={`rotate(${kinematics.offArmAngle}, 46, 46)`}>
              {/* Sleeve */}
              <path d="M43,46 L49,46 L51,66 L44,66 Z" fill={`url(#regimentCoat_${piece.id})`} stroke="#0f172a" strokeWidth="0.8" />
              {/* Cuff */}
              <rect x="44" y="64" width="7" height="3" fill={`url(#goldHilt_${piece.id})`} stroke="#78350f" strokeWidth="0.4" />
              {/* White Gloved Hand */}
              <ellipse cx="47" cy="70" rx="3.5" ry="4" fill="#f8fafc" stroke="#64748b" strokeWidth="0.6" />
            </g>

            {/* --- 5. HEAD & RANK-SPECIFIC HEADWEAR --- */}
            <g
              transform={`translate(60, 42) rotate(${kinematics.headTilt}) translate(-60, -42)`}
            >
              {/* Neck */}
              <rect x="56" y="38" width="8" height="6" fill="#fbcfe8" />
              <rect x="55" y="42" width="10" height="2.5" fill="#ffffff" /> {/* High White Cravat */}

              {/* Head / Face */}
              <ellipse cx="60" cy="30" rx="7.5" ry="9" fill="#fde047" stroke="#ca8a04" strokeWidth="0.7" />
              {/* Eye focused forward */}
              <circle cx="64" cy="28" r="1.2" fill="#0f172a" />
              {/* Eyebrow angled in combat determination */}
              <line x1="62" y1="26" x2="66" y2="27" stroke="#451a03" strokeWidth="0.9" />

              {/* Rank Headwear: Bicorne, Shako, Helmet or Hood */}
              <RankHeadwear type={piece.type} rank={piece.rank} isRed={isRed} />
            </g>

            {/* --- 6. SWORD ARM & THE GLEAMING STEEL SWORD --- */}
            {!kinematics.disarmed && (
              <g transform={`rotate(${kinematics.swordArmAngle}, 74, 46)`}>
                {/* Upper Arm & Sleeve */}
                <path d="M71,46 L77,46 L79,64 L72,64 Z" fill={`url(#regimentCoat_${piece.id})`} stroke="#0f172a" strokeWidth="0.8" />
                {/* Gold Cuff */}
                <rect x="72" y="62" width="7" height="3" fill={`url(#goldHilt_${piece.id})`} stroke="#78350f" strokeWidth="0.4" />

                {/* Forearm & White Gloved Hand Grasping Sword */}
                <g transform="translate(74, 64)">
                  <ellipse cx="1" cy="3" rx="3.5" ry="4" fill="#f8fafc" stroke="#64748b" strokeWidth="0.7" />

                  {/* REAL STEEL SWORD IN THE SOLDIER'S HAND */}
                  <g transform={`rotate(${kinematics.swordBladeAngle}, 1, 3)`}>
                    {/* Golden Crossguard (Quillons) */}
                    <rect
                      x="-8"
                      y="-2"
                      width="16"
                      height="3"
                      rx="1.5"
                      fill={`url(#goldHilt_${piece.id})`}
                      stroke="#78350f"
                      strokeWidth="0.7"
                    />

                    {/* Grip wrapped in wire */}
                    <rect x="-2" y="1" width="4" height="8" rx="1" fill="#451a03" stroke="#78350f" strokeWidth="0.5" />
                    <line x1="-2" y1="3" x2="2" y2="3" stroke="#facc15" strokeWidth="0.5" />
                    <line x1="-2" y1="5" x2="2" y2="5" stroke="#facc15" strokeWidth="0.5" />
                    <line x1="-2" y1="7" x2="2" y2="7" stroke="#facc15" strokeWidth="0.5" />

                    {/* Golden Pommel */}
                    <circle cx="0" cy="11" r="2.8" fill={`url(#goldHilt_${piece.id})`} stroke="#78350f" strokeWidth="0.6" />

                    {/* THE STEEL BLADE (Razor-sharp, gleaming with specular highlight) */}
                    {(piece.type === "spy" || piece.rank === 1) ? (
                      <g id="spy_blade">
                        <polygon
                          points="0,-36 3,-30 2,-2 -2,-2 -3,-30"
                          fill={`url(#bladeSteel_${piece.id})`}
                          stroke="#f0abfc"
                          strokeWidth="0.8"
                          style={{ filter: "drop-shadow(0 0 4px #e879f9)" }}
                        />
                        <line x1="0" y1="-2" x2="0" y2="-34" stroke="#ffffff" strokeWidth="0.8" />
                        <circle cx="0" cy="-36" r="2.6" fill="#10b981" style={{ filter: "drop-shadow(0 0 5px #10b981)" }} />
                      </g>
                    ) : (
                      <g id="soldier_sabre">
                        <polygon
                          points="0,-48 3.5,-42 3,-2 -3,-2 -3.5,-42"
                          fill={`url(#bladeSteel_${piece.id})`}
                          stroke="#475569"
                          strokeWidth="0.6"
                          style={{ filter: "drop-shadow(0 0 3px rgba(255,255,255,0.7))" }}
                        />
                        <line x1="0" y1="-4" x2="0" y2="-40" stroke="#334155" strokeWidth="0.8" />
                        <line x1="2.2" y1="-4" x2="0" y2="-46" stroke="#ffffff" strokeWidth="0.8" />
                      </g>
                    )}
                  </g>
                </g>
              </g>
            )}
          </g>
        </g>
      </svg>
    </div>
  );
};

/* =========================================================================
   RANK HEADWEAR COMPONENT
   Authentic 19th century military headwear corresponding to officer rank
   ========================================================================= */

const RankHeadwear: React.FC<{ type: string; rank: number; isRed: boolean }> = ({
  type,
  rank,
  isRed,
}) => {
  if (type === "marshal" || rank === 10) {
    // Marshal Grand Bicorne Hat with Lavish Feather Plumes
    return (
      <g id="marshal_hat">
        {/* Bicorne curved black felt hat */}
        <path
          d="M44,24 C44,14 52,10 60,11 C68,10 76,14 76,24 C72,21 68,20 60,20 C52,20 48,21 44,24 Z"
          fill="#0f172a"
          stroke="#475569"
          strokeWidth="1"
        />
        {/* Golden Braid Cockade */}
        <circle cx="60" cy="16" r="3" fill="#facc15" stroke="#78350f" strokeWidth="0.6" />
        <circle cx="60" cy="16" r="1.5" fill={isRed ? "#dc2626" : "#2563eb"} />
        {/* White and Crimson Plumes */}
        <path
          d="M58,11 C56,4 62,2 65,4 C68,6 64,11 60,11 Z"
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth="0.5"
        />
        <path d="M60,10 C59,5 63,3 65,5 Z" fill={isRed ? "#dc2626" : "#3b82f6"} />
      </g>
    );
  }

  if (type === "general" || rank === 9) {
    // General Bicorne with Golden Tassels
    return (
      <g id="general_hat">
        <path
          d="M46,24 C47,15 53,12 60,13 C67,12 73,15 74,24 C70,22 66,21 60,21 C54,21 50,22 46,24 Z"
          fill="#1e293b"
          stroke="#c084fc"
          strokeWidth="0.9"
        />
        <circle cx="60" cy="17" r="2.5" fill="#facc15" />
      </g>
    );
  }

  if (type === "colonel" || type === "major" || rank >= 7) {
    // Field Officer Shako with Tall Plume and Brass Plate
    return (
      <g id="officer_shako">
        <polygon points="53,24 67,24 66,13 54,13" fill="#0f172a" stroke="#334155" strokeWidth="0.8" />
        {/* Shako visor */}
        <path d="M52,24 C56,26 64,26 68,24 Z" fill="#020617" />
        {/* Brass Emblem Plate */}
        <polygon points="60,16 63,19 60,22 57,19" fill="#facc15" stroke="#78350f" strokeWidth="0.5" />
        {/* Plume */}
        <ellipse cx="55" cy="10" rx="2.5" ry="4.5" fill={isRed ? "#ef4444" : "#38bdf8"} />
      </g>
    );
  }

  if (type === "miner" || rank === 3) {
    // Sapper / Miner Combat Helmet with Heavy Brim
    return (
      <g id="miner_helmet">
        <path
          d="M52,23 C52,14 55,12 60,12 C65,12 68,14 68,23 Z"
          fill="#475569"
          stroke="#1e293b"
          strokeWidth="1"
        />
        <rect x="50" y="22" width="20" height="2.5" rx="1" fill="#ea580c" />
        {/* Crossed axes emblem */}
        <circle cx="60" cy="17" r="2" fill="#facc15" />
      </g>
    );
  }

  if (type === "spy" || rank === 1) {
    // Spy Cloak Hood / Cowl with Luminous High-Contrast Contour & Glowing Eyes
    return (
      <g id="spy_hood">
        {/* Luminous Outer Assassin Contour */}
        <path
          d="M50,34 C49,19 52,11 60,11 C68,11 71,19 70,34 C66,30 54,30 50,34 Z"
          fill="none"
          stroke="#f0abfc"
          strokeWidth="2.2"
          style={{ filter: "drop-shadow(0 0 4px #e879f9)" }}
        />
        {/* Assassin Deep Midnight Hood */}
        <path
          d="M51,32 C50,20 53,13 60,13 C67,13 70,20 69,32 C65,28 55,28 51,32 Z"
          fill="#2e1065"
          stroke="#c084fc"
          strokeWidth="1.2"
        />
        {/* Stealth Face Cowl */}
        <path d="M54,28 C57,30 63,30 66,28 L64,33 L56,33 Z" fill="#0f172a" stroke="#a855f7" strokeWidth="0.8" />
        {/* Radiant Cyan Eyes */}
        <ellipse cx="57" cy="25" rx="1.6" ry="1" fill="#22d3ee" style={{ filter: "drop-shadow(0 0 3px #22d3ee)" }} />
        <ellipse cx="63" cy="25" rx="1.6" ry="1" fill="#22d3ee" style={{ filter: "drop-shadow(0 0 3px #22d3ee)" }} />
      </g>
    );
  }

  // Standard Infantry Shako for other ranks (Scout, Sergeant, Lieutenant, Captain)
  return (
    <g id="infantry_shako">
      <polygon points="54,24 66,24 65,14 55,14" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
      <path d="M53,24 C57,26 63,26 67,24 Z" fill="#020617" />
      <circle cx="60" cy="18" r="2" fill="#facc15" />
      <circle cx="56" cy="12" r="2.5" fill={isRed ? "#ef4444" : "#3b82f6"} />
    </g>
  );
};

/* =========================================================================
   SPECIAL DEFENDER: HEAVY BOMB / EXPLOSIVE STRUCTURE
   Features active burning fuse, disarm shield (for Miner), and a
   full-scale cinematic explosion with fireballs, shockwave, flying shrapnel & smoke!
   ========================================================================= */

const BombDefender: React.FC<{
  isRed: boolean;
  elapsedMs: number;
  isDefused: boolean;
  isDecisiveHitLanded: boolean;
}> = ({ isRed, elapsedMs, isDefused, isDecisiveHitLanded }) => {
  const isExploding = !isDefused && isDecisiveHitLanded;
  const blastProgress = isExploding ? Math.min(1, (elapsedMs - 1350) / 950) : 0;

  // Burning fuse length shrinks from t=0 to 1350ms
  const fuseBurnPercent = isDefused ? 0.3 : Math.min(1, elapsedMs / 1350);

  return (
    <div
      className="absolute w-[95%] h-[95%] flex items-center justify-center pointer-events-none z-20"
      style={{
        transform: isExploding
          ? `scale(${1.22 + blastProgress * 0.55}) translateZ(32px)`
          : "scale(1.22) translateZ(12px)",
        transition: isExploding ? "none" : "transform 150ms ease-out",
        transformStyle: "preserve-3d",
      }}
    >
      {/* 1. CINEMATIC MULTI-LAYERED EXPLOSION ANIMATION (When detonated) */}
      {isExploding && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 overflow-visible">
          {/* A. Blinding Central Ignition Flash (Rapid burst) */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: "160px",
              height: "160px",
              background: "radial-gradient(circle, #ffffff 0%, #fef08a 35%, #f97316 70%, transparent 100%)",
              opacity: Math.max(0, 1 - blastProgress * 2.2),
              transform: `scale(${0.5 + blastProgress * 2.8})`,
              filter: "blur(2px)",
            }}
          />

          {/* B. Primary Supersonic Shockwave Ring (Expanding Golden-Red Blast Wave) */}
          <div
            className="absolute rounded-full border-4 border-amber-300 pointer-events-none"
            style={{
              width: "100px",
              height: "100px",
              transform: `scale(${0.4 + blastProgress * 3.8}) rotateX(45deg)`,
              opacity: Math.max(0, 1 - blastProgress * 1.3),
              boxShadow: "0 0 25px rgba(251,191,36,0.95), inset 0 0 15px rgba(239,68,68,0.85)",
            }}
          />

          {/* C. Secondary Expanding Red Shockwave Ring */}
          <div
            className="absolute rounded-full border-2 border-red-500 pointer-events-none"
            style={{
              width: "120px",
              height: "120px",
              transform: `scale(${0.3 + blastProgress * 4.2}) rotateX(45deg)`,
              opacity: Math.max(0, 1 - blastProgress * 1.5),
              boxShadow: "0 0 20px rgba(239,68,68,0.9)",
            }}
          />

          {/* D. Turbulent Rolling Fireball & Inferno Lobes */}
          <svg
            viewBox="0 0 140 140"
            className="absolute w-[220%] h-[220%] pointer-events-none overflow-visible"
            style={{
              transform: `scale(${0.7 + blastProgress * 1.8}) rotate(${blastProgress * 45}deg)`,
              opacity: Math.max(0, 1 - blastProgress * 1.2),
            }}
          >
            <defs>
              <radialGradient id="fireballGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="25%" stopColor="#fef08a" />
                <stop offset="55%" stopColor="#f97316" />
                <stop offset="85%" stopColor="#dc2626" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
              <radialGradient id="smokeGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#1e293b" stopOpacity="0.9" />
                <stop offset="60%" stopColor="#0f172a" stopOpacity="0.6" />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Fireball turbulent petals / tongues */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <circle
                key={`fire_${deg}`}
                cx={70 + Math.cos((deg * Math.PI) / 180) * (20 + blastProgress * 30)}
                cy={70 + Math.sin((deg * Math.PI) / 180) * (20 + blastProgress * 30)}
                r={16 + blastProgress * 12}
                fill="url(#fireballGrad)"
                style={{ filter: "drop-shadow(0 0 8px rgba(249,115,22,0.9))" }}
              />
            ))}

            {/* Central roaring core */}
            <circle cx="70" cy="70" r={28 + blastProgress * 20} fill="url(#fireballGrad)" />

            {/* Billowing Volumetric Smoke puffs rising & expanding */}
            {[-30, 20, 70, 120, 200].map((deg, i) => (
              <circle
                key={`smoke_${i}`}
                cx={70 + Math.cos((deg * Math.PI) / 180) * (35 + blastProgress * 40)}
                cy={70 + Math.sin((deg * Math.PI) / 180) * (35 + blastProgress * 40) - blastProgress * 20}
                r={18 + blastProgress * 22}
                fill="url(#smokeGrad)"
                opacity={Math.max(0, 0.85 - blastProgress * 0.9)}
              />
            ))}
          </svg>

          {/* E. Shattered Bomb Metal Shrapnel & Flying Fragments */}
          {[0, 30, 65, 105, 140, 175, 210, 250, 290, 330].map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            const dist = (35 + blastProgress * 85) * (1 + (i % 3) * 0.2);
            const x = Math.cos(rad) * dist;
            const y = Math.sin(rad) * dist;
            return (
              <div
                key={`shrapnel_${i}`}
                className="absolute w-3 h-3 bg-gradient-to-br from-amber-300 via-orange-600 to-slate-900 pointer-events-none rounded-sm shadow-[0_0_8px_#f97316]"
                style={{
                  transform: `translate3d(${x}px, ${y}px, 40px) rotate(${deg + blastProgress * 720}deg) scale(${
                    Math.max(0.4, 1.2 - blastProgress * 0.6)
                  })`,
                  opacity: Math.max(0, 1 - blastProgress * 1.1),
                }}
              />
            );
          })}

          {/* F. Flying Incandescent Sparks & Embers with trails */}
          {[15, 50, 85, 120, 160, 195, 235, 275, 310, 345].map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            const dist = (45 + blastProgress * 110) * (1 + (i % 2) * 0.3);
            const x = Math.cos(rad) * dist;
            const y = Math.sin(rad) * dist;
            return (
              <div
                key={`ember_${i}`}
                className="absolute w-1.5 h-1.5 rounded-full bg-yellow-200 pointer-events-none shadow-[0_0_10px_#fef08a,0_0_18px_#f97316]"
                style={{
                  transform: `translate3d(${x}px, ${y}px, 50px)`,
                  opacity: Math.max(0, 1 - blastProgress * 1.2),
                }}
              />
            );
          })}
        </div>
      )}

      {/* 2. 3D NAVAL CONTACT MINE STRUCTURE */}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full overflow-visible drop-shadow-[0_8px_16px_rgba(0,0,0,0.9)]"
        style={{
          opacity: isExploding ? Math.max(0, 1 - blastProgress * 1.8) : 1,
          transform: isExploding
            ? `scale(${1 - blastProgress * 0.4}) rotate(${blastProgress * 45}deg)`
            : "scale(1)",
          transition: isExploding ? "none" : "transform 200ms ease-out",
        }}
      >
        <defs>
          <radialGradient id="bombMetal" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>
        </defs>

        {/* Steel Ordnance Contact Spikes */}
        {[-45, 0, 45, 90, 135, 180, 225, 270].map((deg) => (
          <g key={deg}>
            <line
              x1="50"
              y1="50"
              x2={50 + Math.cos((deg * Math.PI) / 180) * 38}
              y2={50 + Math.sin((deg * Math.PI) / 180) * 38}
              stroke="#334155"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Spike Horn Tip */}
            <circle
              cx={50 + Math.cos((deg * Math.PI) / 180) * 38}
              cy={50 + Math.sin((deg * Math.PI) / 180) * 38}
              r="2.5"
              fill={isRed ? "#ef4444" : "#3b82f6"}
            />
          </g>
        ))}

        {/* Heavy Iron Sphere */}
        <circle cx="50" cy="50" r="30" fill="url(#bombMetal)" stroke={isRed ? "#ef4444" : "#3b82f6"} strokeWidth="2.5" />

        {/* Tactical Central Hazard Beacon (Pulses Red Warning) */}
        <circle
          cx="50"
          cy="50"
          r="6"
          fill="#ef4444"
          className="animate-pulse"
          style={{ filter: "drop-shadow(0 0 6px #ef4444)" }}
        />
        <circle cx="50" cy="50" r="2.5" fill="#ffffff" />

        {/* FUSE & SIZZLING BURNING SPARKS (Until defused or detonated) */}
        {!isDefused && !isExploding && (
          <g id="bomb_fuse">
            {/* Curved Fuse Line */}
            <path
              d="M50,20 C50,12 60,10 62,4"
              fill="none"
              stroke="#78350f"
              strokeWidth="2.8"
              strokeDasharray="30"
              strokeDashoffset={fuseBurnPercent * 18}
            />
            {/* Fiery Fuse Sizzle Spark Head */}
            <circle cx="62" cy="4" r="3.5" fill="#facc15" className="animate-ping" />
            <circle cx="62" cy="4" r="2.5" fill="#f97316" />
            <circle cx="62" cy="4" r="1.2" fill="#ffffff" />
            {/* Flying Fuse Sizzle Embers */}
            <circle cx="60" cy="1" r="1.2" fill="#fbbf24" className="animate-bounce" />
            <circle cx="64" cy="7" r="1" fill="#f97316" />
          </g>
        )}

        {/* DEFUSED HOLOGRAPHIC SEAL (When disarmed by Miner) */}
        {isDefused && (
          <g id="defused_seal">
            <circle cx="50" cy="50" r="22" fill="#14532d" opacity="0.85" stroke="#22c55e" strokeWidth="2" />
            <text x="50" y="47" textAnchor="middle" fill="#86efac" fontSize="9" fontWeight="900" letterSpacing="0.5">
              DEFUSED
            </text>
            <text x="50" y="58" textAnchor="middle" fill="#22c55e" fontSize="7" fontWeight="900">
              DISINNESCATA
            </text>
            <path d="M42,50 L47,55 L58,42" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}
      </svg>
    </div>
  );
};

/* =========================================================================
   SPECIAL DEFENDER: CITADEL & IMPERIAL FLAG
   ========================================================================= */

const FlagDefender: React.FC<{
  isRed: boolean;
  elapsedMs: number;
  isCaptured: boolean;
  isDecisiveHitLanded: boolean;
}> = ({ isRed, elapsedMs, isCaptured, isDecisiveHitLanded }) => {
  return (
    <div
      className="absolute w-[95%] h-[95%] flex items-center justify-center pointer-events-none z-20"
      style={{
        transform: isCaptured && isDecisiveHitLanded
          ? "rotate(75deg) translate3d(20px, 30px, 0) scale(1.05)"
          : "scale(1.22) translateZ(14px)",
        opacity: isCaptured && isDecisiveHitLanded ? 0.45 : 1,
        transition: "all 400ms ease-out",
        transformStyle: "preserve-3d",
      }}
    >
      <svg viewBox="0 0 100 120" className="w-full h-full overflow-visible drop-shadow-[0_8px_14px_rgba(0,0,0,0.8)]">
        {/* Golden Flagstaff */}
        <line x1="30" y1="110" x2="30" y2="10" stroke="#ca8a04" strokeWidth="4" strokeLinecap="round" />
        <circle cx="30" cy="8" r="4.5" fill="#facc15" stroke="#78350f" strokeWidth="1" />

        {/* Imperial Flag Banner */}
        <path
          d="M32,15 C50,12 65,22 85,16 L85,60 C65,66 50,56 32,60 Z"
          fill={isRed ? "#dc2626" : "#2563eb"}
          stroke={isRed ? "#f87171" : "#93c5fd"}
          strokeWidth="1.5"
        />
        {/* Crown emblem on flag */}
        <polygon points="58,32 54,42 62,42" fill="#facc15" />
        <polygon points="50,34 52,42 48,42" fill="#facc15" />
        <polygon points="66,34 68,42 64,42" fill="#facc15" />
      </svg>
    </div>
  );
};

export default SwordDuelArena;
