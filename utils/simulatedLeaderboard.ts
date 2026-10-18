import { doc, setDoc, getDoc, getDocs, deleteDoc, collection } from "firebase/firestore";
import { db } from "../firebase";
import { GameMode } from "../types";
import { AI_PLAYER_CANDIDATES } from "../components/OnlinePlayerSearchModal";

export const getSimulatedPlayerScore = (name: string, fallbackScore?: number): number => {
  if (fallbackScore && fallbackScore > 0) return Math.min(150, fallbackScore);
  const found = AI_PLAYER_CANDIDATES.find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  );
  return found ? Math.min(150, found.score) : 95;
};

export const getSimulatedLeaderboardSlug = (name: string, location?: string): string => {
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const cleanLoc = (location || "").toLowerCase().replace(/[^a-z0-9]/g, "_");
  return cleanLoc ? `simulated_${cleanName}_${cleanLoc}` : `simulated_${cleanName}`;
};

export const isSimulatedPlayerExpired = (data: any, docId?: string, nowTime: number = Date.now()): boolean => {
  const isSimulated = data?.isSimulated || (docId && docId.startsWith("simulated_"));
  if (!isSimulated) return false;

  const expiresAtStr = data?.temporaryExpiresAt || data?.expiresAt;
  const createdAtStr = data?.createdAt;

  if (expiresAtStr) {
    const expTime = new Date(expiresAtStr).getTime();
    if (!isNaN(expTime)) {
      return expTime <= nowTime;
    }
  }

  if (createdAtStr) {
    const createdTime = new Date(createdAtStr).getTime();
    if (!isNaN(createdTime)) {
      return (nowTime - createdTime) >= 24 * 60 * 60 * 1000;
    }
  }

  return false;
};

/**
 * Inserts or refreshes a simulated player in the Firestore leaderboard with a 24-hour expiration.
 */
export const insertSimulatedPlayerToLeaderboard = async (params: {
  name: string;
  location?: string;
  score?: number;
  gameMode?: GameMode;
}): Promise<void> => {
  if (!db || !params.name) return;

  try {
    const score = getSimulatedPlayerScore(params.name, params.score);
    const targetSlug = getSimulatedLeaderboardSlug(params.name, params.location);
    const displayName = params.location ? `${params.name} (${params.location})` : params.name;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const gamesCount = Math.max(1, Math.floor(score / 15));

    const mode = params.gameMode || "dominio";
    const modeFieldMap: Record<GameMode, string> = {
      dominio: "totalScore",
      corsa: "totalFugaScore",
      amazons: "totalAmazonsScore",
      domineering: "totalDomineeringScore",
      abalone: "totalAbaloneScore",
      hex: "totalHexScore",
      orbito: "totalOrbitoScore",
      pente: "totalPenteScore",
      chain_triangle: "totalChainTriangleScore",
      shobu: "totalShobuScore",
      yinsh: "totalYinshScore",
      onitama: "totalOnitamaScore",
      baduk: "totalBadukScore",
      stratego: "totalStrategoScore",
    };

    const targetModeField = modeFieldMap[mode] || "totalScore";

    // Check existing document to preserve or update stats
    const docRef = doc(db, "leaderboard", targetSlug);
    let existingData: Record<string, any> = {};
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        existingData = snap.data();
      }
    } catch (e) {
      // Non-blocking read error
    }

    const prevOverall = typeof existingData.totalScoreOverall === "number" ? existingData.totalScoreOverall : 0;
    const finalOverallScore = Math.max(prevOverall, score);

    const payload: Record<string, any> = {
      ...existingData,
      userName: displayName,
      totalScore: mode === "dominio" ? score : (typeof existingData.totalScore === "number" ? existingData.totalScore : 0),
      totalFugaScore: mode === "corsa" ? score : (typeof existingData.totalFugaScore === "number" ? existingData.totalFugaScore : 0),
      totalAmazonsScore: mode === "amazons" ? score : (typeof existingData.totalAmazonsScore === "number" ? existingData.totalAmazonsScore : 0),
      totalDomineeringScore: mode === "domineering" ? score : (typeof existingData.totalDomineeringScore === "number" ? existingData.totalDomineeringScore : 0),
      totalAbaloneScore: mode === "abalone" ? score : (typeof existingData.totalAbaloneScore === "number" ? existingData.totalAbaloneScore : 0),
      totalHexScore: mode === "hex" ? score : (typeof existingData.totalHexScore === "number" ? existingData.totalHexScore : 0),
      totalOrbitoScore: mode === "orbito" ? score : (typeof existingData.totalOrbitoScore === "number" ? existingData.totalOrbitoScore : 0),
      totalPenteScore: mode === "pente" ? score : (typeof existingData.totalPenteScore === "number" ? existingData.totalPenteScore : 0),
      totalChainTriangleScore: mode === "chain_triangle" ? score : (typeof existingData.totalChainTriangleScore === "number" ? existingData.totalChainTriangleScore : 0),
      totalShobuScore: mode === "shobu" ? score : (typeof existingData.totalShobuScore === "number" ? existingData.totalShobuScore : 0),
      totalYinshScore: mode === "yinsh" ? score : (typeof existingData.totalYinshScore === "number" ? existingData.totalYinshScore : 0),
      totalOnitamaScore: mode === "onitama" ? score : (typeof existingData.totalOnitamaScore === "number" ? existingData.totalOnitamaScore : 0),
      totalBadukScore: mode === "baduk" ? score : (typeof existingData.totalBadukScore === "number" ? existingData.totalBadukScore : 0),
      totalScoreOverall: finalOverallScore,
      totalGamesOverall: Math.max(existingData.totalGamesOverall || 0, gamesCount),
      totalGamesTarget: {
        ...(existingData.totalGamesTarget || {}),
        [mode]: Math.max(existingData.totalGamesTarget?.[mode] || 0, gamesCount),
        generale: Math.max(existingData.totalGamesTarget?.generale || 0, gamesCount),
      },
      lastActive: now.toISOString(),
      createdAt: existingData.createdAt || now.toISOString(),
      isSimulated: true,
      temporaryExpiresAt: expiresAt,
      expiresAt: expiresAt,
    };

    // Ensure the targeted mode has the full score
    payload[targetModeField] = score;
    delete payload.badges;

    await setDoc(docRef, payload, { merge: true });
    console.log(`[SimulatedLeaderboard] Inserted/Updated ${displayName} (${score} pts) into leaderboard for 24h.`);
  } catch (err) {
    console.error("[SimulatedLeaderboard] Error inserting simulated player:", err);
  }
};

/**
 * Prunes expired simulated players from the leaderboard.
 */
export const pruneExpiredSimulatedPlayers = async (): Promise<void> => {
  if (!db) return;
  try {
    const snap = await getDocs(collection(db, "leaderboard"));
    const nowTime = Date.now();
    const deletePromises: Promise<any>[] = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (isSimulatedPlayerExpired(data, docSnap.id, nowTime)) {
        deletePromises.push(deleteDoc(doc(db, "leaderboard", docSnap.id)));
      }
    });

    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
      console.log(`[SimulatedLeaderboard] Pruned ${deletePromises.length} expired simulated player(s).`);
    }
  } catch (err) {
    console.error("[SimulatedLeaderboard] Error pruning expired players:", err);
  }
};
