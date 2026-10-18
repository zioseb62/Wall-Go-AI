import { PlayerStats } from "../types";

export function getUserStatsKey(userName?: string, userLocation?: string): string {
  const cleanName = (userName || "Player").trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
  const cleanLoc = (userLocation || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
  return `wallgo_stats_${cleanName}${cleanLoc ? `_${cleanLoc}` : ""}`;
}

export async function saveStorageItem(key: string, value: string): Promise<void> {
  try {
    localStorage.setItem(key, value);
    if (key === "wallgo_stats") {
      const currentName = localStorage.getItem("wallgo_name");
      const currentLoc = localStorage.getItem("wallgo_location");
      if (currentName && currentName !== "Player") {
        const userKey = getUserStatsKey(currentName, currentLoc || "");
        localStorage.setItem(userKey, value);
      }
    }
  } catch (e) {
    console.warn(`[Storage] localStorage.setItem failed for ${key}:`, e);
  }
}

export async function saveStorageItemsBatch(keys: string[], values: string[]): Promise<void> {
  if (keys.length !== values.length) {
    console.error("[Storage] Keys and values arrays must have equal length");
    return;
  }
  keys.forEach((k, idx) => {
    try {
      localStorage.setItem(k, values[idx]);
      if (k === "wallgo_stats") {
        const currentName = localStorage.getItem("wallgo_name");
        const currentLoc = localStorage.getItem("wallgo_location");
        if (currentName && currentName !== "Player") {
          const userKey = getUserStatsKey(currentName, currentLoc || "");
          localStorage.setItem(userKey, values[idx]);
        }
      }
    } catch (e) {
      console.warn(`[Storage] localStorage.setItem failed for ${k}:`, e);
    }
  });
}

export async function removeStorageItem(key: string): Promise<void> {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`[Storage] localStorage.removeItem failed for ${key}:`, e);
  }
}

export async function loadStorageItem(key: string): Promise<string | null> {
  try {
    if (key === "wallgo_stats") {
      const currentName = localStorage.getItem("wallgo_name");
      const currentLoc = localStorage.getItem("wallgo_location");
      if (currentName && currentName !== "Player") {
        const userKey = getUserStatsKey(currentName, currentLoc || "");
        const userSpecific = localStorage.getItem(userKey);
        if (userSpecific && userSpecific !== "undefined") {
          return userSpecific;
        }
      }
    }
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

export async function loadStorageItemsBatch(keys: string[]): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  for (const k of keys) {
    try {
      result[k] = localStorage.getItem(k);
    } catch (e) {
      result[k] = null;
    }
  }
  return result;
}

export function mergePlayerStats(localStats: PlayerStats | null, cloudStats: PlayerStats | null): PlayerStats | null {
  if (!localStats && !cloudStats) return null;
  if (!localStats) return cloudStats;
  if (!cloudStats) return localStats;

  const mergedUnlocked = Array.from(new Set([
    ...(localStats.unlockedModes || []),
    ...(cloudStats.unlockedModes || [])
  ]));

  const mergedFreeUnlocked = Array.from(new Set([
    ...(localStats.freeUnlockedModes || []),
    ...(cloudStats.freeUnlockedModes || [])
  ]));

  const mergedBadgesMap = new Map<string, any>();
  const diffValues = { normale: 1, difficile: 2, estrema: 3, maestro: 4 };
  [...(cloudStats.badges || []), ...(localStats.badges || [])].forEach((b: any) => {
    const id = typeof b === "string" ? b : b.id;
    const diff = typeof b === "string" ? "normale" : (b.difficulty || "normale");
    const existing = mergedBadgesMap.get(id);
    if (!existing) {
      mergedBadgesMap.set(id, typeof b === "string" ? { id, difficulty: diff, date: new Date().toISOString() } : b);
    } else {
      const existDiff = typeof existing === "string" ? "normale" : (existing.difficulty || "normale");
      if ((diffValues[diff as keyof typeof diffValues] || 1) > (diffValues[existDiff as keyof typeof diffValues] || 1)) {
        mergedBadgesMap.set(id, typeof b === "string" ? { id, difficulty: diff, date: new Date().toISOString() } : b);
      }
    }
  });

  const baseStats = { ...cloudStats, ...localStats };

  return {
    ...baseStats,
    unlockedModes: mergedUnlocked,
    freeUnlockedModes: mergedFreeUnlocked,
    badges: Array.from(mergedBadgesMap.values()),
    totalScore: Math.max(localStats.totalScore || 0, cloudStats.totalScore || 0),
    totalFugaScore: Math.max(localStats.totalFugaScore || 0, cloudStats.totalFugaScore || 0),
    totalAmazonsScore: Math.max(localStats.totalAmazonsScore || 0, cloudStats.totalAmazonsScore || 0),
    totalDomineeringScore: Math.max(localStats.totalDomineeringScore || 0, cloudStats.totalDomineeringScore || 0),
    totalAbaloneScore: Math.max(localStats.totalAbaloneScore || 0, cloudStats.totalAbaloneScore || 0),
    totalHexScore: Math.max(localStats.totalHexScore || 0, cloudStats.totalHexScore || 0),
    totalChainTriangleScore: Math.max(localStats.totalChainTriangleScore || 0, cloudStats.totalChainTriangleScore || 0),
    totalOrbitoScore: Math.max(localStats.totalOrbitoScore || 0, cloudStats.totalOrbitoScore || 0),
    totalPenteScore: Math.max(localStats.totalPenteScore || 0, cloudStats.totalPenteScore || 0),
    totalShobuScore: Math.max(localStats.totalShobuScore || 0, cloudStats.totalShobuScore || 0),
    totalYinshScore: Math.max(localStats.totalYinshScore || 0, cloudStats.totalYinshScore || 0),
    totalOnitamaScore: Math.max(localStats.totalOnitamaScore || 0, cloudStats.totalOnitamaScore || 0),
    totalBadukScore: Math.max(localStats.totalBadukScore || 0, cloudStats.totalBadukScore || 0),
    2: {
      wins: Math.max(localStats[2]?.wins || 0, cloudStats[2]?.wins || 0),
      losses: Math.max(localStats[2]?.losses || 0, cloudStats[2]?.losses || 0),
      hardWins: Math.max(localStats[2]?.hardWins || 0, cloudStats[2]?.hardWins || 0),
    },
    3: {
      wins: Math.max(localStats[3]?.wins || 0, cloudStats[3]?.wins || 0),
      losses: Math.max(localStats[3]?.losses || 0, cloudStats[3]?.losses || 0),
      hardWins: Math.max(localStats[3]?.hardWins || 0, cloudStats[3]?.hardWins || 0),
    },
    4: {
      wins: Math.max(localStats[4]?.wins || 0, cloudStats[4]?.wins || 0),
      losses: Math.max(localStats[4]?.losses || 0, cloudStats[4]?.losses || 0),
      hardWins: Math.max(localStats[4]?.hardWins || 0, cloudStats[4]?.hardWins || 0),
    },
  };
}
