import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, query, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AI_PLAYER_CANDIDATES } from './OnlinePlayerSearchModal';

interface AdminStatsModalProps {
  onClose: () => void;
}

export const isSimulatedPlayerRecord = (data: any, docId?: string): boolean => {
  if (!data && !docId) return false;
  if (data?.isSimulated || data?.isFakeAI || data?.isGuestAI || data?.isHostAI) return true;
  if (docId && (docId.startsWith("ai_simulated_") || docId.startsWith("simulated_"))) return true;
  if (data?.temporaryExpiresAt || data?.expiresAt) return true;
  const rawName = (data?.userName || "").trim().toLowerCase();
  if (rawName.startsWith("simulated_") || rawName.startsWith("ai_simulated_")) return true;
  if (AI_PLAYER_CANDIDATES.some(c => c.name.toLowerCase() === rawName || rawName.startsWith(c.name.toLowerCase()))) {
    return true;
  }
  return false;
};

export const BADGE_POINTS: Record<string, number> = {
  'cervellone': 5,
  'dominatore': 10,
  'abalone_hard': 20,
  'hex_hard': 20,
  'orbito_hard': 20,
  'shobu_master': 15,
  'ponte': 15,
  'maestro': 30,
  'fuga_hard': 20,
  'amazons_hard': 20,
  'chain_triangle_medium': 10,
  'chain_triangle_hard': 20,
  'yinsh_master': 20,
  'onitama_hard': 20,
  'baduk_extreme': 30,
  'pente_extreme': 30,
  'domineering_extreme': 30,
  'stratego_master': 30,
};

export const AdminStatsModal: React.FC<AdminStatsModalProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [dailyChartData, setDailyChartData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeToday: 0,
    gamesPlayedToday: 0,
    totalGamesPlayed: 0,
    totalDominioGames: 0,
    totalCorsaGames: 0,
    totalAmazonsGames: 0,
    totalDomineeringGames: 0,
    totalAbaloneGames: 0,
    totalHexGames: 0,
    totalOrbitoGames: 0,
    totalPenteGames: 0,
    totalChainTriangleGames: 0,
    totalShobuGames: 0,
    totalYinshGames: 0,
    totalOnitamaGames: 0,
    totalBadukGames: 0,
    totalStrategoGames: 0,
    multiplayerDominioGames: 0,
    multiplayerCorsaGames: 0,
    multiplayerAmazonsGames: 0,
    multiplayerDomineeringGames: 0,
    multiplayerAbaloneGames: 0,
    multiplayerHexGames: 0,
    multiplayerOrbitoGames: 0,
    multiplayerPenteGames: 0,
    multiplayerChainTriangleGames: 0,
    multiplayerShobuGames: 0,
    multiplayerYinshGames: 0,
    multiplayerOnitamaGames: 0,
    multiplayerBadukGames: 0,
    multiplayerStrategoGames: 0,
    totalOnlineMatches: 0,
    totalSimulatedOnlineMatches: 0,
    totalBadges: 0,
    totalUnlockedGames: 0,
    totalFreeUnlockedGames: 0,
    perGameUnlocks: {} as Record<string, number>,
    mostActiveUserToday: "Nessuno",
    testers: [] as { userName: string, location: string, email: string, lastActive: string, isTester?: boolean }[],
    comments: [] as { userName: string, comment: string, lastActive: string }[]
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [snapshot, dailySnapshot, roomsSnapshot] = await Promise.all([
          getDocs(collection(db, 'devices')),
          getDocs(query(collection(db, 'daily_stats'), orderBy('date', 'desc'), limit(30))),
          getDocs(collection(db, 'online_rooms')).catch(() => ({ forEach: () => {}, size: 0 } as any))
        ]);

        const normalizeGameMode = (m: string): string => {
          const mode = (m || '').toLowerCase().trim();
          if (mode === 'fuga') return 'corsa';
          if (mode === 'wallgo') return 'dominio';
          if (mode === 'chain_triangle' || mode === 'chaintriangle' || mode === 'triangoli') return 'chain_triangle';
          return mode;
        };

        const multiplayerByMode: Record<string, number> = {
          dominio: 0,
          corsa: 0,
          amazons: 0,
          domineering: 0,
          abalone: 0,
          hex: 0,
          orbito: 0,
          pente: 0,
          chain_triangle: 0,
          shobu: 0,
          yinsh: 0,
          onitama: 0,
          baduk: 0,
        };
        const deviceMultiplayerByMode: Record<string, number> = { ...multiplayerByMode };

        let roomsSimulatedCount = 0;
        let devicesSimulatedCount = 0;

        if (roomsSnapshot && typeof roomsSnapshot.forEach === 'function') {
          roomsSnapshot.forEach((doc: any) => {
            const rData = doc.data();
            const mode = normalizeGameMode(rData.gameMode || 'dominio');
            if (multiplayerByMode[mode] !== undefined) {
              multiplayerByMode[mode]++;
            } else {
              multiplayerByMode[mode] = 1;
            }

            const isSimulated = !!(
              rData.isGuestAI ||
              rData.isSimulatedOpponent ||
              (typeof rData.guestDeviceId === 'string' && rData.guestDeviceId.startsWith('ai_simulated_')) ||
              (typeof rData.opponentDeviceId === 'string' && rData.opponentDeviceId.startsWith('ai_simulated_')) ||
              (typeof rData.hostDeviceId === 'string' && rData.hostDeviceId.startsWith('ai_simulated_')) ||
              (typeof rData.roomId === 'string' && rData.roomId.includes('ai_simulated_'))
            );
            if (isSimulated) {
              roomsSimulatedCount++;
            }
          });
        }
        
        // Fetch daily stats for chart
        const chartData: any[] = [];
        dailySnapshot.forEach(doc => {
          const d = doc.data();
          chartData.push({
            date: d.date,
            gamesPlayed: d.gamesPlayed || 0,
            activePlayers: d.activePlayers ? d.activePlayers.length : 0
          });
        });
        chartData.reverse();
        setDailyChartData(chartData);

        let totalUsers = 0;
        let activeToday = 0;
        let gamesPlayedToday = 0;
        let totalGamesPlayed = 0;
        let totalDominioGames = 0;
        let totalCorsaGames = 0;
        let totalAmazonsGames = 0;
        let totalDomineeringGames = 0;
        let totalAbaloneGames = 0;
        let totalHexGames = 0;
        let totalOrbitoGames = 0;
        let totalPenteGames = 0;
        let totalChainTriangleGames = 0;
        let totalShobuGames = 0;
        let totalYinshGames = 0;
        let totalOnitamaGames = 0;
        let totalBadukGames = 0;
        let totalStrategoGames = 0;
        let totalOnlineMatches = 0;
        let maxGamesToday = 0;
        let mostActiveUser = "Nessuno";
        let totalUnlockedGames = 0;
        let totalFreeUnlockedGames = 0;
        let testers: { userName: string, location: string, email: string, lastActive: string, isTester?: boolean }[] = [];
        let comments: { userName: string, comment: string, lastActive: string }[] = [];
        const perGameUnlocks: Record<string, number> = {
          corsa: 0,
          amazons: 0,
          domineering: 0,
          abalone: 0,
          hex: 0,
          orbito: 0,
          pente: 0,
          chain_triangle: 0,
          shobu: 0,
          onitama: 0,
          stratego: 0
        };

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const uniqueBadges = new Set<string>();

        // Map to aggregate by userName (storing stats per user)
        const userMap = new Map<string, { 
           unlockedModes: Set<string>, 
           freeUnlockedModes: Set<string>,
           lastActive: string,
           gamesPlayedToday: number,
           isToday: boolean,
           email: string,
           location: string,
           userName: string,
           isTester: boolean
        }>();

        snapshot.forEach(doc => {
          const data = doc.data();
          if (isSimulatedPlayerRecord(data, doc.id)) {
            return;
          }
          const uName = (data.userName || "Player").toLowerCase().trim();
          
          if (!userMap.has(uName)) {
            userMap.set(uName, { 
              unlockedModes: new Set(data.unlockedModes || []), 
              freeUnlockedModes: new Set(data.freeUnlockedModes || []),
              lastActive: data.lastActive || data.lastGamePlayedAt || '1970-01-01',
              gamesPlayedToday: 0,
              isToday: false,
              email: data.userEmail || '',
              location: data.userLocation || '',
              userName: data.userName || 'Player',
              isTester: data.isTester || false
            });
          }
          
          const usr = userMap.get(uName)!;
          if (data.isTester) usr.isTester = true;
          if (data.userEmail) usr.email = data.userEmail;
          if (data.userLocation) usr.location = data.userLocation;
                    if (data.userComment && data.userComment.trim() !== "") {
                       comments.push({ userName: data.userName || "Player", comment: data.userComment, lastActive: data.lastActive || data.lastGamePlayedAt || "1970-01-01" });
                    }
                    // testers collection is now done after the loop
          
          // Aggregate unlocks
          if (data.unlockedModes && Array.isArray(data.unlockedModes)) {
            data.unlockedModes.forEach((m: string) => usr.unlockedModes.add(m));
          }
          if (data.freeUnlockedModes && Array.isArray(data.freeUnlockedModes)) {
            data.freeUnlockedModes.forEach((m: string) => usr.freeUnlockedModes.add(m));
          }
          
          // Update last active
          const currentActive = data.lastActive || data.lastGamePlayedAt || '1970-01-01';
          if (new Date(currentActive) > new Date(usr.lastActive)) {
            usr.lastActive = currentActive;
            if (data.userEmail) usr.email = data.userEmail;
            if (data.userLocation) usr.location = data.userLocation;
            if (data.userName) usr.userName = data.userName;
            if (data.isTester !== undefined) usr.isTester = data.isTester;
          }

          // Games and active status for today
          if (data.lastActive) {
            const lastActiveDate = new Date(data.lastActive);
            if (lastActiveDate >= todayStart) {
              usr.isToday = true;
            }
          }

          if (data.lastGamePlayedAt) {
            const lastGameDate = new Date(data.lastGamePlayedAt);
            if (lastGameDate >= todayStart) {
              const deviceGamesToday = data.gamesPlayedToday || 1;
              usr.gamesPlayedToday += deviceGamesToday;
              gamesPlayedToday += deviceGamesToday;
            }
          }

          // The following stats remain per-device to be summed up total
          const sumDiffs = (st: any) => {
             if (!st) return 0;
             return (st.normale?.wins || 0) + (st.normale?.losses || 0) +
                    (st.difficile?.wins || 0) + (st.difficile?.losses || 0) +
                    (st.estrema?.wins || 0) + (st.estrema?.losses || 0) +
                    (st.maestro?.wins || 0) + (st.maestro?.losses || 0);
          };

          const getFlat = (p: string) => (data[`${p}.wins`] || 0) + (data[`${p}.losses`] || 0);

          if (data.stats) totalDominioGames += sumDiffs(data.stats);
          else totalDominioGames += getFlat('stats.normale') + getFlat('stats.difficile') + getFlat('stats.estrema') + getFlat('stats.maestro');

          if (data.corsaStats) totalCorsaGames += sumDiffs(data.corsaStats);
          else totalCorsaGames += getFlat('corsaStats.normale') + getFlat('corsaStats.difficile') + getFlat('corsaStats.estrema') + getFlat('corsaStats.maestro');

          if (data.amazonsStats) totalAmazonsGames += sumDiffs(data.amazonsStats);
          else totalAmazonsGames += getFlat('amazonsStats.normale') + getFlat('amazonsStats.difficile') + getFlat('amazonsStats.estrema') + getFlat('amazonsStats.maestro');

          if (data.domineeringStats) totalDomineeringGames += sumDiffs(data.domineeringStats);
          else totalDomineeringGames += getFlat('domineeringStats.normale') + getFlat('domineeringStats.difficile') + getFlat('domineeringStats.estrema') + getFlat('domineeringStats.maestro');

          if (data.abaloneStats) totalAbaloneGames += sumDiffs(data.abaloneStats);
          else totalAbaloneGames += getFlat('abaloneStats.normale') + getFlat('abaloneStats.difficile') + getFlat('abaloneStats.estrema') + getFlat('abaloneStats.maestro');

          if (data.hexStats) totalHexGames += sumDiffs(data.hexStats);
          else totalHexGames += getFlat('hexStats.normale') + getFlat('hexStats.difficile') + getFlat('hexStats.estrema') + getFlat('hexStats.maestro');

          if (data.orbitoStats) totalOrbitoGames += sumDiffs(data.orbitoStats);
          else totalOrbitoGames += getFlat('orbitoStats.normale') + getFlat('orbitoStats.difficile') + getFlat('orbitoStats.estrema') + getFlat('orbitoStats.maestro');

          if (data.penteStats) totalPenteGames += sumDiffs(data.penteStats);
          else totalPenteGames += getFlat('penteStats.normale') + getFlat('penteStats.difficile') + getFlat('penteStats.estrema') + getFlat('penteStats.maestro');

          if (data.chainTriangleStats) totalChainTriangleGames += sumDiffs(data.chainTriangleStats);
          else totalChainTriangleGames += getFlat('chainTriangleStats.normale') + getFlat('chainTriangleStats.difficile') + getFlat('chainTriangleStats.estrema') + getFlat('chainTriangleStats.maestro');

          if (data.shobuStats) totalShobuGames += sumDiffs(data.shobuStats);
          else totalShobuGames += getFlat('shobuStats.normale') + getFlat('shobuStats.difficile') + getFlat('shobuStats.estrema') + getFlat('shobuStats.maestro');

          if (data.yinshStats) totalYinshGames += sumDiffs(data.yinshStats);
          else totalYinshGames += getFlat('yinshStats.normale') + getFlat('yinshStats.difficile') + getFlat('yinshStats.estrema') + getFlat('yinshStats.maestro');

          if (data.onitamaStats) totalOnitamaGames += sumDiffs(data.onitamaStats);
          else totalOnitamaGames += getFlat('onitamaStats.normale') + getFlat('onitamaStats.difficile') + getFlat('onitamaStats.estrema') + getFlat('onitamaStats.maestro');

          if (data.badukStats) totalBadukGames += sumDiffs(data.badukStats);
          else totalBadukGames += getFlat('badukStats.normale') + getFlat('badukStats.difficile') + getFlat('badukStats.estrema') + getFlat('badukStats.maestro');

          if (data.strategoStats) totalStrategoGames += sumDiffs(data.strategoStats);
          else totalStrategoGames += getFlat('strategoStats.normale') + getFlat('strategoStats.difficile') + getFlat('strategoStats.estrema') + getFlat('strategoStats.maestro');
          
          if (typeof data.totalOnlineMatches === 'number') totalOnlineMatches += data.totalOnlineMatches;
          if (typeof data.totalOnlineMatchesVsAi === 'number') {
            devicesSimulatedCount += data.totalOnlineMatchesVsAi;
          } else if (typeof data.onlineMatchesVsAi === 'number') {
            devicesSimulatedCount += data.onlineMatchesVsAi;
          }

          if (data.onlineMatchesByMode && typeof data.onlineMatchesByMode === 'object') {
            Object.entries(data.onlineMatchesByMode).forEach(([m, count]) => {
              const mode = normalizeGameMode(m);
              const cnt = typeof count === 'number' ? count : 0;
              deviceMultiplayerByMode[mode] = (deviceMultiplayerByMode[mode] || 0) + cnt;
            });
          }

          if (data.badges) {
            const bList = Array.isArray(data.badges) ? data.badges : Object.keys(data.badges);
            bList.forEach((b: any) => uniqueBadges.add(typeof b === 'string' ? b : b.id));
          }
        });

        // Now finalize totalUsers and totalUnlockedGames from the aggregated map
        userMap.forEach((usr, uName) => {
          if (usr.isTester || (usr.userName || '').toLowerCase().includes('@gmail.com') || (usr.email || '').toLowerCase().includes('@gmail.com')) {
            testers.push({ userName: usr.userName, location: usr.location, email: usr.email, lastActive: usr.lastActive, isTester: usr.isTester });
          }
          totalUsers++;
          if (usr.isToday) activeToday++;
          
          if (usr.gamesPlayedToday > maxGamesToday) {
            maxGamesToday = usr.gamesPlayedToday;
            mostActiveUser = uName.charAt(0).toUpperCase() + uName.slice(1);
          }

          const extra = Array.from(usr.unlockedModes);
          const freeExtra = Array.from(usr.freeUnlockedModes);

          // L'account zioseb ha tutti i giochi in freeUnlockedModes per via di uno script di migrazione,
          // ma per le statistiche li contiamo come sbloccati con punti.
          if (uName === "zioseb") {
            totalUnlockedGames += extra.filter(m => m !== "dominio").length;
          } else {
            totalUnlockedGames += extra.filter(m => m !== "dominio" && !usr.freeUnlockedModes.has(m)).length;
            totalFreeUnlockedGames += freeExtra.filter(m => m !== "dominio").length;
          }

          extra.forEach(m => {
            if (m !== "dominio") {
              if (perGameUnlocks[m] !== undefined) {
                perGameUnlocks[m]++;
              }
            }
          });
        });

        totalGamesPlayed = totalDominioGames + totalCorsaGames + totalAmazonsGames + totalDomineeringGames + totalAbaloneGames + totalHexGames + totalOrbitoGames + totalPenteGames + totalChainTriangleGames + totalShobuGames + totalYinshGames + totalOnitamaGames + totalBadukGames + totalStrategoGames;

        // Calculate per-game multiplayer counts taking the max of online_rooms count and device counts
        const getFinalMultiCount = (mode: string) => {
          const roomCount = multiplayerByMode[mode] || 0;
          const devCount = Math.round((deviceMultiplayerByMode[mode] || 0) / 2);
          return Math.max(roomCount, devCount);
        };

        const multiplayerDominioGames = getFinalMultiCount('dominio');
        const multiplayerCorsaGames = getFinalMultiCount('corsa');
        const multiplayerAmazonsGames = getFinalMultiCount('amazons');
        const multiplayerDomineeringGames = getFinalMultiCount('domineering');
        const multiplayerAbaloneGames = getFinalMultiCount('abalone');
        const multiplayerHexGames = getFinalMultiCount('hex');
        const multiplayerOrbitoGames = getFinalMultiCount('orbito');
        const multiplayerPenteGames = getFinalMultiCount('pente');
        const multiplayerChainTriangleGames = getFinalMultiCount('chain_triangle');
        const multiplayerShobuGames = getFinalMultiCount('shobu');
        const multiplayerYinshGames = getFinalMultiCount('yinsh');
        const multiplayerOnitamaGames = getFinalMultiCount('onitama');
        const multiplayerBadukGames = getFinalMultiCount('baduk');
        const multiplayerStrategoGames = getFinalMultiCount('stratego');

        const totalMultiplayerGamesSum = multiplayerDominioGames + multiplayerCorsaGames + multiplayerAmazonsGames +
          multiplayerDomineeringGames + multiplayerAbaloneGames + multiplayerHexGames + multiplayerOrbitoGames +
          multiplayerPenteGames + multiplayerChainTriangleGames + multiplayerShobuGames + multiplayerYinshGames +
          multiplayerOnitamaGames + multiplayerBadukGames + multiplayerStrategoGames;

        totalOnlineMatches = Math.max(totalOnlineMatches, (roomsSnapshot as any)?.size || 0, totalMultiplayerGamesSum);
        const totalSimulatedOnlineMatches = Math.max(roomsSimulatedCount, devicesSimulatedCount);

        testers.sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime());
        setStats({
          testers,
          comments,
          totalUsers,
          activeToday,
          gamesPlayedToday,
          totalGamesPlayed,
          totalDominioGames,
          totalCorsaGames,
          totalAmazonsGames,
          totalDomineeringGames,
          totalAbaloneGames,
          totalHexGames,
          totalOrbitoGames,
          totalPenteGames,
          totalChainTriangleGames,
          totalShobuGames,
          totalYinshGames,
          totalOnitamaGames,
          totalBadukGames,
          totalStrategoGames,
          multiplayerDominioGames,
          multiplayerCorsaGames,
          multiplayerAmazonsGames,
          multiplayerDomineeringGames,
          multiplayerAbaloneGames,
          multiplayerHexGames,
          multiplayerOrbitoGames,
          multiplayerPenteGames,
          multiplayerChainTriangleGames,
          multiplayerShobuGames,
          multiplayerYinshGames,
          multiplayerOnitamaGames,
          multiplayerBadukGames,
          multiplayerStrategoGames,
          totalOnlineMatches,
          totalSimulatedOnlineMatches,
          totalBadges: uniqueBadges.size,
          totalUnlockedGames,
          totalFreeUnlockedGames,
          perGameUnlocks,
          mostActiveUserToday: maxGamesToday > 0 ? `${mostActiveUser} (${maxGamesToday})` : "Nessuno"
        });
      } catch (e) {
        console.error("Error fetching admin stats:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleSyncLeaderboard = async () => {
    setSyncing(true);
    try {
      const getPointsForDiff = (id: string, d: 'normale' | 'difficile' | 'estrema' | 'maestro' | undefined) => {
        if (!d) return BADGE_POINTS[id] || 0;
        if (d === 'normale') return (BADGE_POINTS[id] || 0) / 2;
        if (d === 'difficile') return BADGE_POINTS[id] || 0;
        if (d === 'estrema') return (BADGE_POINTS[id] || 0) * 1.5;
        if (d === 'maestro') return (BADGE_POINTS[id] || 0) * 2;
        return 0;
      };

      // 1. Fetch all devices
      const snapshot = await getDocs(collection(db, 'devices'));
      
      // 2. Group by userName and find old devices
      const userGroups: Record<string, { 
        totalBaseScore: number, 
        totalFugaScore: number, 
        totalAmazonsScore: number, 
        totalDomineeringScore: number, 
        totalAbaloneScore: number,
        totalHexScore: number,
        totalOrbitoScore: number,
        totalPenteScore: number,
        totalChainTriangleScore: number,
        totalShobuScore: number,
        totalYinshScore: number,
        totalOnitamaScore: number,
        totalBadukScore: number,
        totalStrategoScore: number,
        location: string, 
        lastActive: number, 
        originalName: string,
        badges: Map<string, 'normale' | 'difficile' | 'estrema' | 'maestro'>,
        unlockedModes: Set<string>,
        freeUnlockedModes: Set<string>
      }> = {};
      
      const nowTime = new Date().getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const devicesToDelete: string[] = [];
      const mostRecentDevicePerSlug: Record<string, { id: string, time: number }> = {};
      
      snapshot.forEach((deviceDoc) => {
        const data = deviceDoc.data();
        if (isSimulatedPlayerRecord(data, deviceDoc.id)) {
          return;
        }
        if (data.userName) {
          const uName = data.userName.trim();
          const slug = uName.toLowerCase().replace(/[^a-z0-9]/g, '_');
          if (!slug) return;
          
          const lastActiveStr = data.lastActive || data.lastGamePlayedAt;
          const lastActiveTime = lastActiveStr ? new Date(lastActiveStr).getTime() : 0;
          
          if (!userGroups[slug]) {
            userGroups[slug] = { 
              totalBaseScore: 0, 
              totalFugaScore: 0, 
              totalAmazonsScore: 0, 
              totalDomineeringScore: 0, 
              totalAbaloneScore: 0,
              totalHexScore: 0,
              totalOrbitoScore: 0,
              totalPenteScore: 0,
              totalChainTriangleScore: 0,
              totalShobuScore: 0,
              totalYinshScore: 0,
              totalOnitamaScore: 0,
              totalBadukScore: 0,
              totalStrategoScore: 0,
              location: data.userLocation || '', 
              lastActive: 0, 
              originalName: uName,
              badges: new Map(),
              unlockedModes: new Set(),
              freeUnlockedModes: new Set()
            };
            mostRecentDevicePerSlug[slug] = { id: deviceDoc.id, time: lastActiveTime };
          } else {
            if (lastActiveTime > mostRecentDevicePerSlug[slug].time) {
              mostRecentDevicePerSlug[slug] = { id: deviceDoc.id, time: lastActiveTime };
            }
          }
          
          // Calculate score WITHOUT badges
          let deviceBadgePoints = 0;
          const badges = data.badges || {};
          Object.entries(badges).forEach(([id, bData]: [string, any]) => {
            const bDiff = typeof bData === 'object' && bData !== null ? (bData.difficulty || 'normale') : 'normale';
            deviceBadgePoints += getPointsForDiff(id, bDiff);
            
            // Keep track of all unique badges and their best difficulty
            const currentDiff = userGroups[slug].badges.get(id);
            const diffValues: Record<string, number> = { 'normale': 1, 'difficile': 2, 'estrema': 3, 'maestro': 4 };
            if (!currentDiff || diffValues[bDiff as string] > diffValues[currentDiff as string]) {
              userGroups[slug].badges.set(id, bDiff);
            }
          });

          const docScore = Number(data.totalScore) || 0;
          const baseScore = Math.max(0, docScore - deviceBadgePoints);
          
          if (data.unlockedModes && Array.isArray(data.unlockedModes)) {
            data.unlockedModes.forEach((m: string) => userGroups[slug].unlockedModes.add(m));
          }
          if (data.freeUnlockedModes && Array.isArray(data.freeUnlockedModes)) {
            data.freeUnlockedModes.forEach((m: string) => userGroups[slug].freeUnlockedModes.add(m));
          }
          
          userGroups[slug].totalBaseScore += baseScore;
          userGroups[slug].totalFugaScore += Number(data.totalFugaScore) || 0;
          userGroups[slug].totalAmazonsScore += Number(data.totalAmazonsScore) || 0;
          userGroups[slug].totalDomineeringScore += Number(data.totalDomineeringScore) || 0;
          userGroups[slug].totalAbaloneScore += Number(data.totalAbaloneScore) || 0;
          userGroups[slug].totalHexScore += Number(data.totalHexScore) || 0;
          userGroups[slug].totalOrbitoScore += Number(data.totalOrbitoScore) || 0;
          userGroups[slug].totalPenteScore += Number(data.totalPenteScore) || 0;
          userGroups[slug].totalChainTriangleScore += Number(data.totalChainTriangleScore) || 0;
          userGroups[slug].totalShobuScore += Number(data.totalShobuScore) || 0;
          userGroups[slug].totalYinshScore += Number(data.totalYinshScore) || 0;
          userGroups[slug].totalOnitamaScore += Number(data.totalOnitamaScore) || 0;
          userGroups[slug].totalBadukScore += Number(data.totalBadukScore) || 0;
          userGroups[slug].totalStrategoScore += Number(data.totalStrategoScore) || 0;
          
          if (lastActiveTime > userGroups[slug].lastActive) {
            userGroups[slug].lastActive = lastActiveTime;
            userGroups[slug].originalName = uName;
            if (data.userLocation) {
              userGroups[slug].location = data.userLocation;
            }
          }
        }
      });

      // 2.5 Identify old devices to delete
      snapshot.forEach((deviceDoc) => {
        const data = deviceDoc.data();
        if (data.userName) {
          const uName = data.userName.trim();
          const slug = uName.toLowerCase().replace(/[^a-z0-9]/g, '_');
          if (!slug) return;
          
          const lastActiveStr = data.lastActive || data.lastGamePlayedAt;
          const lastActiveTime = lastActiveStr ? new Date(lastActiveStr).getTime() : 0;
          
          if (mostRecentDevicePerSlug[slug] && deviceDoc.id !== mostRecentDevicePerSlug[slug].id) {
            if (nowTime - lastActiveTime > sevenDaysMs) {
              devicesToDelete.push(deviceDoc.id);
            }
          }
        }
      });

      // 3. Delete all existing leaderboard entries and old devices (preserving active simulated players)
      const oldLeaderboardSnap = await getDocs(collection(db, 'leaderboard'));
      const nowMs = Date.now();
      const deletePromises = oldLeaderboardSnap.docs
        .filter(d => {
          const docData = d.data();
          const isSimulated = docData.isSimulated || d.id.startsWith("simulated_");
          if (isSimulated) {
            const expStr = docData.temporaryExpiresAt || docData.expiresAt;
            if (expStr && new Date(expStr).getTime() > nowMs) {
              return false; // Keep active simulated player in leaderboard
            }
          }
          return true;
        })
        .map(d => deleteDoc(doc(db, 'leaderboard', d.id)));
      
      for (const idToDelete of devicesToDelete) {
        deletePromises.push(deleteDoc(doc(db, 'devices', idToDelete)));
      }
      
      await Promise.all(deletePromises);

      // 4. Write aggregated entries
      let syncedCount = 0;
      const getPointsSpent = (unlockedModes: Set<string>, userName: string, userLocation: string, freeUnlockedModes: Set<string>): number => {
        if (userName === "ZioSeb" && userLocation.includes("Sant'Alfio")) return 0;
        let spent = 0;
        const unique = Array.from(unlockedModes);
        unique.forEach(m => {
          if (m === "dominio") return;
          if (freeUnlockedModes.has(m)) return;
          spent += 50;
        });
        return spent;
      };

      const syncPromises = Object.entries(userGroups).map(async ([slug, info]) => {
        // Recalculate unique badge points
        let totalUniqueBadgePoints = 0;
        info.badges.forEach((diff, id) => {
          totalUniqueBadgePoints += getPointsForDiff(id, diff);
        });

        const finalScore = info.totalBaseScore + totalUniqueBadgePoints;
        const ptsSpent = getPointsSpent(info.unlockedModes, info.originalName, info.location, info.freeUnlockedModes);
        const totalScoreOverall = Math.max(0, finalScore + info.totalFugaScore + info.totalAmazonsScore + info.totalDomineeringScore + info.totalAbaloneScore + info.totalHexScore + info.totalOrbitoScore + info.totalPenteScore + info.totalChainTriangleScore + info.totalShobuScore + info.totalYinshScore + info.totalOnitamaScore + info.totalBadukScore + info.totalStrategoScore - ptsSpent);
        const displayName = info.location ? `${info.originalName} (${info.location})` : info.originalName;
        const targetSlug = info.location
          ? `${info.originalName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${info.location.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
          : info.originalName.toLowerCase().replace(/[^a-z0-9]/g, '_');

        await setDoc(doc(db, 'leaderboard', targetSlug), {
          userName: displayName,
          totalScore: finalScore,
          totalFugaScore: info.totalFugaScore,
          totalAmazonsScore: info.totalAmazonsScore,
          totalDomineeringScore: info.totalDomineeringScore,
          totalAbaloneScore: info.totalAbaloneScore,
          totalHexScore: info.totalHexScore,
          totalChainTriangleScore: info.totalChainTriangleScore,
          totalOrbitoScore: info.totalOrbitoScore,
          totalPenteScore: info.totalPenteScore,
          totalShobuScore: info.totalShobuScore,
          totalYinshScore: info.totalYinshScore,
          totalOnitamaScore: info.totalOnitamaScore,
          totalBadukScore: info.totalBadukScore,
          totalStrategoScore: info.totalStrategoScore,
          totalScoreOverall: totalScoreOverall,
          lastActive: info.lastActive ? new Date(info.lastActive).toISOString() : new Date().toISOString()
        }, { merge: true });
        syncedCount++;
      });
      
      await Promise.all(syncPromises);
      console.log(`Sincronizzazione completata! ${syncedCount} profili aggiornati nella leaderboard.`);
    } catch (e) {
      console.error("Error syncing leaderboard:", e);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md sm:max-w-lg bg-slate-900 rounded-[2.5rem] p-5 sm:p-6 flex flex-col animate-in zoom-in-95 duration-300 shadow-2xl border border-emerald-500/30">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            <h2 className="text-2xl font-black italic text-emerald-400 uppercase tracking-tight">Admin Stats</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-slate-800 rounded-full font-black text-white hover:bg-slate-700 transition-colors">✕</button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-10">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Utenti Totali" value={stats.totalUsers} icon="👥" />
              <StatCard label="Attivi Oggi" value={stats.activeToday} icon="🟢" />
              <StatCard label="Partite Oggi" value={stats.gamesPlayedToday} icon="🎮" />
              <StatCard label="Partite Totali" value={stats.totalGamesPlayed} icon="⚔️" />
              <StatCard
                label="Partite Online (Tot)"
                value={stats.totalOnlineMatches}
                subValue={`(${stats.totalSimulatedOnlineMatches} finti)`}
                icon="🌐"
                className="bg-cyan-900/40 border-cyan-500/30"
                valueColor="text-cyan-400"
              />
              <StatCard label="Utente più attivo oggi" value={stats.mostActiveUserToday} icon="👑" className="col-span-2" />
            </div>

            <div className="bg-slate-800/50 rounded-2xl border border-white/5 p-3 mt-4">
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dettaglio Partite</h3>
                <div className="flex items-center space-x-2 text-[9px] font-bold">
                  <span className="text-blue-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"></span> AI
                  </span>
                  <span className="text-slate-500">/</span>
                  <span className="text-cyan-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block"></span> Multiplayer
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MiniStat label="Dominio" aiValue={stats.totalDominioGames} multiValue={stats.multiplayerDominioGames} />
                <MiniStat label="Corsa" aiValue={stats.totalCorsaGames} multiValue={stats.multiplayerCorsaGames} />
                <MiniStat label="Amazons" aiValue={stats.totalAmazonsGames} multiValue={stats.multiplayerAmazonsGames} />
                <MiniStat label="Domineering" aiValue={stats.totalDomineeringGames} multiValue={stats.multiplayerDomineeringGames} />
                <MiniStat label="Abalone" aiValue={stats.totalAbaloneGames} multiValue={stats.multiplayerAbaloneGames} />
                <MiniStat label="Hex" aiValue={stats.totalHexGames} multiValue={stats.multiplayerHexGames} />
                <MiniStat label="Orbito" aiValue={stats.totalOrbitoGames} multiValue={stats.multiplayerOrbitoGames} />
                <MiniStat label="Pente" aiValue={stats.totalPenteGames} multiValue={stats.multiplayerPenteGames} />
                <MiniStat label="Triangoli" aiValue={stats.totalChainTriangleGames} multiValue={stats.multiplayerChainTriangleGames} />
                <MiniStat label="Shobu" aiValue={stats.totalShobuGames} multiValue={stats.multiplayerShobuGames} />
                <MiniStat label="Yinsh" aiValue={stats.totalYinshGames} multiValue={stats.multiplayerYinshGames} />
                <MiniStat label="Onitama" aiValue={stats.totalOnitamaGames} multiValue={stats.multiplayerOnitamaGames} />
                <MiniStat label="Baduk" aiValue={stats.totalBadukGames} multiValue={stats.multiplayerBadukGames} />
                <MiniStat label="Stratego" aiValue={stats.totalStrategoGames} multiValue={stats.multiplayerStrategoGames} />
              </div>
            </div>

            <StatRow label="Badge totali vinti" value={stats.totalBadges} />
            <StatRow label="Giochi sbloccati totali (con punti)" value={stats.totalUnlockedGames} />
            <StatRow label="Giochi sbloccati via password" value={stats.totalFreeUnlockedGames} />
            
            {dailyChartData.length > 0 && (
              <div className="mt-6 p-4 bg-slate-800/50 rounded-2xl border border-white/5">
                <h3 className="text-sm font-bold text-slate-300 mb-4 text-center">Andamento (Ultimi 30 giorni)</h3>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickFormatter={(val) => val.substring(5)} />
                      <YAxis stroke="#94a3b8" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }} />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Line type="monotone" dataKey="gamesPlayed" name="Partite" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="activePlayers" name="Giocatori" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            
            {stats.testers && (
              <div className="bg-slate-800/50 rounded-2xl border border-white/5 p-4 mt-4">
                <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center justify-between">
                  <span>Candidati Tester App</span>
                  <span className="bg-emerald-500 text-slate-900 px-2 py-0.5 rounded-full text-xs">{stats.testers.length}</span>
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                  {stats.testers.length === 0 && <div className="text-xs text-slate-500 italic">Nessun tester registrato.</div>}
                  {stats.testers.map((t, i) => (
                    <div key={i} className="flex flex-col bg-slate-900/50 p-2 rounded-lg border border-white/5">
                      <span className="font-bold text-blue-400 text-sm break-all">{t.userName} {t.email && <span className="text-xs text-slate-400 font-normal ml-1">({t.email})</span>} {t.isTester && <span className="ml-2 bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider">Tester</span>}</span>
                      <div className="flex justify-between mt-1">
                         <span className="text-xs text-slate-400">{t.location || "No location"}</span>
                         <span className="text-[10px] text-slate-500">{t.lastActive.split("T")[0]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats.comments && (
              <div className="bg-slate-800/50 rounded-2xl border border-white/5 p-4 mt-4">
                <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center justify-between">
                  <span>Commenti</span>
                  <span className="bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs">{stats.comments.length}</span>
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                  {stats.comments.length === 0 && <div className="text-xs text-slate-500 italic">Nessun commento ricevuto.</div>}
                  {stats.comments.map((c, i) => (
                    <div key={i} className="flex flex-col bg-slate-900/50 p-3 rounded-lg border border-white/5">
                      <span className="font-bold text-emerald-400 text-xs mb-1">{c.userName}</span>
                      <span className="text-sm text-slate-300 italic">"{c.comment}"</span>
                      <span className="text-[10px] text-slate-500 mt-2 text-right">{c.lastActive.split("T")[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="pt-4 mt-4 border-t border-white/10">
              <button 
                onClick={handleSyncLeaderboard}
                disabled={syncing}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {syncing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sincronizzazione in corso...
                  </>
                ) : (
                  <>
                    🔄 Sincronizza Leaderboard Storica
                  </>
                )}
              </button>
              <p className="text-xs text-slate-400 text-center mt-2">
                Recupera i punteggi dei giocatori che non hanno ancora aperto la nuova versione.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({
  label,
  value,
  subValue,
  icon,
  className = "",
  valueColor = "text-emerald-400"
}: {
  label: string;
  value: string | number;
  subValue?: React.ReactNode;
  icon: string;
  className?: string;
  valueColor?: string;
}) => (
  <div className={`p-4 bg-slate-800/50 rounded-2xl border border-white/5 flex flex-col justify-between ${className}`}>
    <div className="flex justify-between items-start mb-1">
      <span className="text-sm">{icon}</span>
      <div className="flex items-baseline gap-1.5 flex-wrap justify-end">
        <span className={"font-black text-xl " + valueColor}>{value}</span>
        {subValue && (
          <span
            className="text-[11px] sm:text-xs font-bold text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded-lg border border-amber-400/20 whitespace-nowrap"
            title="Di cui partite contro finti giocatori (AI)"
          >
            {subValue}
          </span>
        )}
      </div>
    </div>
    <span className="font-bold text-slate-400 text-[9px] uppercase tracking-wider">{label}</span>
  </div>
);

const MiniStat = ({ label, aiValue, multiValue }: { label: string, aiValue: number, multiValue?: number }) => (
  <div className="flex justify-between items-center bg-slate-800/80 px-2.5 sm:px-3 py-2 rounded-xl border border-white/5 min-w-0 h-10">
    <span
      className={`font-bold text-slate-400 uppercase tracking-tight truncate mr-1.5 whitespace-nowrap ${
        label.length > 9 ? "text-[8.5px] sm:text-[9.5px]" : "text-[9px] sm:text-[10px]"
      }`}
      title={label}
    >
      {label}
    </span>
    <div className="flex items-center space-x-1 font-black text-xs sm:text-sm shrink-0 ml-auto">
      <span className="text-blue-400" title="Partite contro AI">{aiValue}</span>
      {multiValue !== undefined && (
        <>
          <span className="text-slate-500 font-bold">/</span>
          <span className="text-cyan-400" title="Partite Multiplayer">{multiValue}</span>
        </>
      )}
    </div>
  </div>
);

const StatRow = ({ label, value }: { label: string, value: number | string }) => (
  <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-2xl border border-white/5">
    <span className="font-bold text-slate-300 text-sm">{label}</span>
    <span className="font-black text-xl text-emerald-400">{value}</span>
  </div>
);
