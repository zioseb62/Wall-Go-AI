import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, where, getCountFromServer, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { translations } from '../utils/translations';
import { Language, PlayerStats } from '../types';
import { isSimulatedPlayerExpired } from '../utils/simulatedLeaderboard';

interface LeaderboardEntry {
  id: string;
  userName: string;
  totalScore: number;
}

interface LeaderboardModalProps {
  onClose?: () => void;
  language: Language;
  currentUserName: string;
  userLocation?: string;
  currentScore: number;
  deviceId: string;
  stats?: PlayerStats;
  onBadgeClick?: (badge: any) => void;
  isAdmin?: boolean;
  isInline?: boolean;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ onClose, language, currentUserName, userLocation, currentScore, deviceId, stats, onBadgeClick, isAdmin = false, isInline = false }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myAggregatedScore, setMyAggregatedScore] = useState<number>(currentScore);
  const [myTotalGamesLabel, setMyTotalGamesLabel] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'stats' | 'badges'>('leaderboard');
  const [leaderboardMode, setLeaderboardMode] = useState<'dominio' | 'corsa' | 'amazons' | 'domineering' | 'abalone' | 'orbito' | 'hex' | 'pente' | 'chain_triangle' | 'shobu' | 'yinsh' | 'onitama' | 'baduk' | 'stratego' | 'generale'>('generale');
  const t = translations[language];

  useEffect(() => {
    setCurrentPage(0);
  }, [leaderboardMode]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const scoreField = leaderboardMode === 'stratego' ? 'totalStrategoScore' : (leaderboardMode === 'baduk' ? 'totalBadukScore' : (leaderboardMode === 'pente' ? 'totalPenteScore' : (leaderboardMode === 'chain_triangle' ? 'totalChainTriangleScore' : (leaderboardMode === 'shobu' ? 'totalShobuScore' : (leaderboardMode === 'yinsh' ? 'totalYinshScore' : (leaderboardMode === 'onitama' ? 'totalOnitamaScore' : (leaderboardMode === 'orbito' ? 'totalOrbitoScore' : (leaderboardMode === 'corsa' ? 'totalFugaScore' : (leaderboardMode === 'amazons' ? 'totalAmazonsScore' : (leaderboardMode === 'domineering' ? 'totalDomineeringScore' : (leaderboardMode === 'abalone' ? 'totalAbaloneScore' : (leaderboardMode === 'hex' ? 'totalHexScore' : (leaderboardMode === 'generale' ? 'totalScoreOverall' : 'totalScore')))))))))))));
        const q = query(collection(db, 'leaderboard'), orderBy(scoreField, 'desc'), limit(200));
        const snapshot = await getDocs(q);
        const data: LeaderboardEntry[] = [];
        const nowTime = Date.now();
        const expiredDeletions: Promise<any>[] = [];

        snapshot.forEach(docSnap => {
          const docData = docSnap.data();
          if (isSimulatedPlayerExpired(docData, docSnap.id, nowTime)) {
            expiredDeletions.push(deleteDoc(doc(db, 'leaderboard', docSnap.id)).catch(() => {}));
            return;
          }
          data.push({ id: docSnap.id, ...docData } as LeaderboardEntry);
        });

        if (expiredDeletions.length > 0) {
          Promise.all(expiredDeletions).catch(() => {});
        }

        setEntries(data);

        if (currentUserName) {
          const slug = userLocation 
            ? `${currentUserName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${userLocation.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
            : currentUserName.toLowerCase().replace(/[^a-z0-9]/g, '_');
          let actualScore = 0;
          if (leaderboardMode === 'corsa') {
             actualScore = stats?.totalFugaScore ?? 0;
          } else if (leaderboardMode === 'amazons') {
             actualScore = stats?.totalAmazonsScore ?? 0;
          } else if (leaderboardMode === 'domineering') {
             actualScore = stats?.totalDomineeringScore ?? 0;
          } else if (leaderboardMode === 'abalone') {
             actualScore = stats?.totalAbaloneScore ?? 0;
          } else if (leaderboardMode === 'orbito') {
             actualScore = (stats as any)?.totalOrbitoScore ?? 0;
          } else if (leaderboardMode === 'hex') {
             actualScore = (stats as any)?.totalHexScore ?? 0;
          } else if (leaderboardMode === 'dominio') {
             actualScore = stats?.totalScore ?? currentScore;
          } else if (leaderboardMode === 'pente') {
             actualScore = (stats as any)?.totalPenteScore ?? 0;
          } else if (leaderboardMode === 'chain_triangle') {
             actualScore = (stats as any)?.totalChainTriangleScore ?? 0;
          } else if (leaderboardMode === 'shobu') {
             actualScore = (stats as any)?.totalShobuScore ?? 0;
          } else if (leaderboardMode === 'yinsh') {
             actualScore = (stats as any)?.totalYinshScore ?? 0;
          } else if (leaderboardMode === 'onitama') {
             actualScore = (stats as any)?.totalOnitamaScore ?? 0;
          } else if (leaderboardMode === 'baduk') {
             actualScore = (stats as any)?.totalBadukScore ?? 0;
          } else if (leaderboardMode === 'stratego') {
             actualScore = (stats as any)?.totalStrategoScore ?? 0;
          } else {
             actualScore = (stats?.totalScore || 0) + (stats?.totalFugaScore || 0) + (stats?.totalAmazonsScore || 0) + (stats?.totalDomineeringScore || 0) + ((stats as any)?.totalAbaloneScore || 0) + ((stats as any)?.totalHexScore || 0) + ((stats as any)?.totalOrbitoScore || 0) + ((stats as any)?.totalPenteScore || 0) + ((stats as any)?.totalChainTriangleScore || 0) + ((stats as any)?.totalShobuScore || 0) + ((stats as any)?.totalYinshScore || 0) + ((stats as any)?.totalOnitamaScore || 0) + ((stats as any)?.totalBadukScore || 0) + ((stats as any)?.totalStrategoScore || 0);
          }
          
          if (slug) {
            const myDoc = await getDoc(doc(db, 'leaderboard', slug));
            if (myDoc.exists()) {
              const data = myDoc.data();
              const dbScore = data[scoreField];
              if (dbScore !== undefined && dbScore !== null) {
                 actualScore = dbScore;
              }
              if (leaderboardMode === 'generale') {
                 setMyTotalGamesLabel(data.totalGamesOverall || 0);
              } else if (leaderboardMode === 'dominio') {
                 setMyTotalGamesLabel(data.totalGamesTarget?.generale || 0);
              } else {
                 setMyTotalGamesLabel(data.totalGamesTarget?.[leaderboardMode] || 0);
              }
            } else {
              const calcGamesObj = (obj: any) => {
                if (!obj) return 0;
                let sum = 0;
                Object.values(obj).forEach((v: any) => {
                  if (typeof v === 'object' && v !== null) sum += (v.wins || 0) + (v.losses || 0);
                  else if (typeof v === 'number') sum += v;
                });
                return sum;
              };
              const baseG = calcGamesObj(stats?.[2]) + calcGamesObj(stats?.[3]) + calcGamesObj(stats?.[4]) + calcGamesObj(stats?.stats);
              const corsaG = calcGamesObj(stats?.corsaStats);
              const amazonsG = calcGamesObj(stats?.amazonsStats);
              const domineeringG = calcGamesObj(stats?.domineeringStats);
              const abaloneG = calcGamesObj(stats?.abaloneStats);
              const hexG = calcGamesObj(stats?.hexStats);
              const chainG = calcGamesObj(stats?.chainTriangleStats);
              const penteG = calcGamesObj(stats?.penteStats);
              const shobuG = calcGamesObj(stats?.shobuStats);
              const yinshG = calcGamesObj(stats?.yinshStats);
              const onitamaG = calcGamesObj(stats?.onitamaStats);
              const orbitoG = calcGamesObj(stats?.orbitoStats);
              const badukG = calcGamesObj(stats?.badukStats);
              const strategoG = calcGamesObj(stats?.strategoStats);

              if (leaderboardMode === 'generale') {
                setMyTotalGamesLabel(baseG + corsaG + amazonsG + domineeringG + abaloneG + hexG + chainG + penteG + shobuG + yinshG + onitamaG + orbitoG + badukG + strategoG);
              } else if (leaderboardMode === 'dominio') {
                setMyTotalGamesLabel(baseG);
              } else {
                const mapMode: Record<string, number> = {
                  corsa: corsaG, amazons: amazonsG, domineering: domineeringG, abalone: abaloneG,
                  hex: hexG, chain_triangle: chainG, pente: penteG, shobu: shobuG,
                  yinsh: yinshG, onitama: onitamaG, orbito: orbitoG, baduk: badukG,
                  stratego: strategoG
                };
                setMyTotalGamesLabel(mapMode[leaderboardMode] || 0);
              }
            }
          }
          setMyAggregatedScore(actualScore);

          const rankQuery = query(collection(db, 'leaderboard'), where(scoreField, '>', actualScore));
          const rankSnapshot = await getCountFromServer(rankQuery);
          setMyRank(rankSnapshot.data().count + 1);
        }
      } catch (e) {
        console.error("Error fetching leaderboard:", e);
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === 'leaderboard') {
        fetchLeaderboard();
    }
  }, [currentScore, currentUserName, activeTab, leaderboardMode, stats]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
  const safePage = Math.min(currentPage, totalPages - 1);
  const startIndex = safePage * pageSize;
  const endIndex = Math.min(entries.length, startIndex + pageSize);
  const displayedEntries = entries.slice(startIndex, endIndex);

  const panelContent = (
    <div className={isInline ? "w-full h-full flex flex-col min-h-0" : "w-full max-w-md bg-slate-900 rounded-[2.5rem] p-6 flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-300 shadow-2xl border border-white/10"}>
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl sm:text-2xl">{activeTab === 'leaderboard' ? '🏆' : activeTab === 'stats' ? '📊' : '🎖️'}</span>
          <h2 className="text-lg sm:text-2xl font-black italic text-blue-400 uppercase tracking-tight">
            {language === 'it' ? 'CLASSIFICHE' : 'RANK & STATS'}
          </h2>
        </div>
        {!isInline && onClose && (
          <button onClick={onClose} className="w-8 h-8 bg-slate-800 rounded-full font-black text-white hover:bg-slate-700 transition-colors">✕</button>
        )}
      </div>

      <div className="flex gap-1.5 mb-3 text-[10px] uppercase tracking-widest sm:text-xs sm:tracking-normal w-full overflow-x-auto shrink-0 custom-scrollbar">
          <button 
              onClick={() => {
                setActiveTab('leaderboard');
                setCurrentPage(0);
              }} 
              className={`flex-1 min-w-0 px-1 py-2 rounded-xl font-bold transition-all ${activeTab === 'leaderboard' ? 'bg-amber-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
              TOP 10
          </button>
          <button 
              onClick={() => setActiveTab('stats')} 
              className={`flex-1 min-w-0 px-1 py-2 rounded-xl font-bold transition-all ${activeTab === 'stats' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
              STATS
          </button>
          <button 
              onClick={() => setActiveTab('badges')} 
              className={`flex-1 min-w-0 px-1 py-2 rounded-xl font-bold transition-all ${activeTab === 'badges' ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
              BADGES
          </button>
      </div>

      {activeTab === 'leaderboard' && (
          <>
            <div className="flex justify-center mb-3 px-1 tracking-widest cursor-pointer shrink-0">
              <select
                value={leaderboardMode}
                onChange={(e) => {
                  setLeaderboardMode(e.target.value as any);
                  setCurrentPage(0);
                }}
                className="bg-slate-800 text-white font-black text-[11px] uppercase rounded-xl px-3 py-2 outline-none border border-white/10 cursor-pointer w-full text-center"
              >
                <option value="generale">🏆 {language === 'it' ? 'Generale' : 'Overall'}</option>
                <option value="dominio">🌐 Wall Go AI</option>
                <option value="corsa">🏁 Quoridor</option>
                <option value="amazons">🏹 Amazons</option>
                <option value="domineering">⚔️ Domineering</option>
                <option value="abalone">🎱 Abalone</option>
                <option value="hex">⬡ Hex</option>
                <option value="orbito">🪐 Orbito</option>
                <option value="pente">⭐ Pente</option>
                <option value="chain_triangle">🔺 Chain Triangle</option>
                <option value="shobu">🪨 Shobu</option>
                <option value="yinsh">💍 Yinsh</option>
                <option value="onitama">🏯 Onitama</option>
                <option value="baduk">⚫ Baduk / Go</option>
                <option value="stratego">🚩 Stratego</option>
              </select>
            </div>
                {loading ? (
                <div className="flex-1 flex items-center justify-center py-10">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                ) : (
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                    {displayedEntries.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 font-bold">Nessun dato disponibile</div>
                    ) : (
                    displayedEntries.map((entry, idx) => {
                        const globalRank = startIndex + idx + 1;
                        const listSlug = userLocation
                          ? `${currentUserName ? currentUserName.toLowerCase().replace(/[^a-z0-9]/g, '_') : ''}_${userLocation.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
                          : currentUserName ? currentUserName.toLowerCase().replace(/[^a-z0-9]/g, '_') : '';
                        const isMe = listSlug === entry.id;
                        const scoreFieldItem =
                          leaderboardMode === "stratego"
                            ? "totalStrategoScore"
                            : leaderboardMode === "baduk"
                            ? "totalBadukScore"
                            : leaderboardMode === "orbito"
                            ? "totalOrbitoScore"
                            : leaderboardMode === "pente"
                              ? "totalPenteScore"
                              : leaderboardMode === "chain_triangle"
                                ? "totalChainTriangleScore"
                                : leaderboardMode === "shobu"
                                  ? "totalShobuScore"
                                  : leaderboardMode === "yinsh"
                                    ? "totalYinshScore"
                                  : leaderboardMode === "onitama"
                                    ? "totalOnitamaScore"
                                  : leaderboardMode === "corsa"
                                    ? "totalFugaScore"
                                  : leaderboardMode === "amazons"
                                    ? "totalAmazonsScore"
                                    : leaderboardMode === "domineering"
                                      ? "totalDomineeringScore"
                                      : leaderboardMode === "abalone"
                                        ? "totalAbaloneScore"
                                        : leaderboardMode === "hex"
                                          ? "totalHexScore"
                                          : leaderboardMode === "generale"
                                            ? "totalScoreOverall"
                                            : "totalScore";
                        return (
                        <div key={entry.id} className={`flex items-center justify-between p-1 px-2 rounded-lg border ${isMe ? 'bg-blue-600/20 border-blue-500/50' : 'bg-slate-800/50 border-white/5'}`}>
                            <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-2">
                            <div className={`shrink-0 min-w-[22px] h-5 px-1 rounded-full flex items-center justify-center font-black text-[10px] ${globalRank === 1 ? 'bg-yellow-500/20 text-yellow-500' : globalRank === 2 ? 'bg-slate-400/20 text-slate-300' : globalRank === 3 ? 'bg-amber-700/20 text-amber-600' : 'bg-slate-700 text-slate-400'}`}>
                                {globalRank}
                            </div>
                            <span className={`font-bold text-xs truncate ${isMe ? 'text-blue-400' : 'text-white'}`}>{entry.userName || 'Player'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 isolate">
                               <span className="font-black text-xs min-w-[32px] text-right">{Number((((entry as any)[scoreFieldItem]) || 0).toFixed(1))}</span>
                               <span className="text-[9px] font-bold text-slate-500 min-w-[24px] text-right">
                                 {leaderboardMode === 'generale' ? ((entry as any).totalGamesOverall || 0) : leaderboardMode === 'dominio' ? (((entry as any).totalGamesTarget?.generale) || 0) : (((entry as any).totalGamesTarget?.[leaderboardMode]) || 0)} <span className="opacity-70">p.</span>
                               </span>
                            </div>
                        </div>
                        );
                    })
                    )}
                </div>
                )}

                {/* Pagination Controls */}
                {!loading && entries.length > 0 && (
                  <div className="flex items-center justify-between gap-1 px-2 py-1.5 mt-2 mb-1 bg-slate-950/70 rounded-xl border border-white/10 shrink-0 select-none">
                    <button
                      type="button"
                      disabled={safePage === 0}
                      onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                      className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all active:scale-95 ${
                        safePage === 0
                          ? 'opacity-30 text-slate-500 cursor-not-allowed bg-slate-800/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 hover:border-white/20'
                      }`}
                      title={language === 'it' ? 'Visualizza i 10 precedenti' : 'View previous 10'}
                    >
                      <span className="text-xs">◀</span>
                      <span className="text-[11px] whitespace-nowrap">{language === 'it' ? 'Precedenti 10' : 'Previous 10'}</span>
                    </button>

                    <div className="flex flex-col items-center justify-center leading-tight px-1 min-w-0">
                      <span className="text-[11px] font-black text-amber-400 uppercase tracking-tight whitespace-nowrap">
                        {language === 'it' ? `Pos. ${startIndex + 1} - ${endIndex}` : `Rank ${startIndex + 1} - ${endIndex}`}
                      </span>
                      <span className="text-[9px] font-semibold text-slate-400 whitespace-nowrap">
                        {language === 'it' ? `su ${entries.length} giocatori` : `of ${entries.length} players`}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={safePage >= totalPages - 1}
                      onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                      className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all active:scale-95 ${
                        safePage >= totalPages - 1
                          ? 'opacity-30 text-slate-500 cursor-not-allowed bg-slate-800/30'
                          : 'bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_10px_rgba(217,119,6,0.35)]'
                      }`}
                      title={language === 'it' ? 'Visualizza i successivi 10' : 'View next 10'}
                    >
                      <span className="text-[11px] whitespace-nowrap">{language === 'it' ? 'Successivi 10' : 'Next 10'}</span>
                      <span className="text-xs">▶</span>
                    </button>
                  </div>
                )}

                {currentUserName && !loading && myRank !== null && (
                <div className="mt-1 pt-1 border-t border-white/10 shrink-0">
                    <div 
                      onClick={() => {
                        const targetPage = Math.floor((myRank - 1) / pageSize);
                        if (targetPage >= 0 && targetPage < totalPages) {
                          setCurrentPage(targetPage);
                        }
                      }}
                      title={language === 'it' ? 'Clicca per raggiungere la tua posizione in classifica' : 'Click to jump to your position'}
                      className="flex items-center justify-between p-1 px-2 rounded-lg bg-slate-800 border border-white/10 hover:border-blue-500/50 cursor-pointer transition-colors"
                    >
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-2">
                        <div className="shrink-0 min-w-[22px] h-5 px-1 rounded-full flex items-center justify-center font-black text-[10px] bg-slate-700 text-slate-400">
                        {myRank}
                        </div>
                        <div className="flex flex-col leading-none min-w-0">
                        <span className="font-bold text-xs text-blue-400 truncate">
                           {userLocation ? `${currentUserName} (${userLocation})` : currentUserName}
                        </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 isolate">
                        <span className="font-black text-xs min-w-[32px] text-right">{Number((myAggregatedScore || 0).toFixed(1))}</span>
                        <span className="text-[9px] font-bold text-slate-500 min-w-[24px] text-right">
                            {myTotalGamesLabel} <span className="opacity-70">p.</span>
                        </span>
                    </div>
                    </div>
                </div>
                )}
            </>
        )}

        {activeTab === 'stats' && stats && (
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                <div className="bg-slate-800 rounded-2xl p-4 border border-white/5 space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">{t.aiStarts ? (t as any).matches || 'Matches' : 'Partite'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                        {[2, 3, 4].map(players => (
                            <div key={players} className="bg-slate-900/50 rounded-lg p-1.5 flex flex-col items-center">
                                <span className="text-[9px] font-black text-slate-400 mb-0.5">{players} P</span>
                                <div className="flex gap-2 w-full justify-center">
                                    <span className="text-xs font-black text-emerald-400">{stats[players as 2|3|4].wins} V</span>
                                    <span className="text-xs font-black text-red-400">{stats[players as 2|3|4].losses} P</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-800 rounded-2xl p-3 border border-white/5 space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">Scores</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                        {(() => {
                            const BADGE_POINTS: Record<string, number> = {
                              cervellone: 5,
                              dominatore: 10,
                              abalone_hard: 20,
                              hex_hard: 20,
                              orbito_hard: 20,
                              maestro: 30,
                              fuga_hard: 20,
                              amazons_hard: 20,
                              chain_triangle_medium: 10,
                              chain_triangle_hard: 20,
                              shobu_master: 15,
                              yinsh_master: 20,
                              onitama_hard: 20,
                              baduk_extreme: 50,
                              stratego_master: 30,
                            };
                            let localBadgeSum = 0;
                            stats?.badges?.forEach((b: any) => {
                               const id = typeof b === "string" ? b : b.id;
                               const diff = typeof b === "string" ? "normale" : (b.difficulty || "normale");
                               let pts = BADGE_POINTS[id] || 0;
                               if (diff === "normale") pts = pts / 2;
                               else if (diff === "estrema") pts = pts * 1.5;
                               else if (diff === "maestro") pts = pts * 2;
                               localBadgeSum += pts;
                            });
                            const wallGoBaseScore = Math.max(0, (stats.totalScore || 0) - localBadgeSum);
                            return (
                                <>
                                    <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-1.5 flex flex-col items-center justify-center">
                                        <span className="text-[8px] font-black text-cyan-500 uppercase tracking-widest mb-0.5">{language === 'it' ? 'Online' : 'Online'}</span>
                                        <span className="text-sm font-black text-cyan-400">{(stats.totalOnlineMatches || 0)}</span>
                                    </div>
                                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-1.5 flex flex-col items-center justify-center">
                                        <span className="text-[8px] font-black text-yellow-500 uppercase tracking-widest mb-0.5">{language === 'it' ? 'Badge Pts' : 'Badge Pts'}</span>
                                        <span className="text-sm font-black text-yellow-400">{localBadgeSum.toFixed(1)}</span>
                                    </div>
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-1.5 flex flex-col items-center justify-center">
                                        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">{language === 'it' ? 'Spesi' : 'Spent'}</span>
                                        <span className="text-sm font-black text-emerald-400">{Array.from(new Set(stats.unlockedModes || [])).filter(m => !["dominio", "pente", "amazons", "corsa", "domineering", "abalone", "hex", "orbito", "chain_triangle", "yinsh"].includes(m) && !(stats.freeUnlockedModes && stats.freeUnlockedModes.includes(m))).length * 50}</span>
                                    </div>
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-1.5 flex flex-col items-center justify-center">
                                        <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-0.5">Wall Go</span>
                                        <span className="text-sm font-black text-blue-400">{wallGoBaseScore.toFixed(1)}</span>
                                    </div>
                                </>
                            );
                        })()}
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-1.5 flex flex-col items-center justify-center">
                            <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest mb-0.5">Quoridor</span>
                            <span className="text-sm font-black text-orange-400">{(stats.totalFugaScore || 0).toFixed(1)}</span>
                        </div>
                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-1.5 flex flex-col items-center justify-center">
                            <span className="text-[8px] font-black text-purple-500 uppercase tracking-widest mb-0.5">Amazons</span>
                            <span className="text-sm font-black text-purple-400">{(stats.totalAmazonsScore || 0).toFixed(1)}</span>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-1.5 flex flex-col items-center justify-center">
                            <span className="text-[8px] font-black text-red-500 uppercase tracking-widest mb-0.5">Domineering</span>
                            <span className="text-sm font-black text-red-400">{(stats.totalDomineeringScore || 0).toFixed(1)}</span>
                        </div>
                        <div className="bg-slate-500/10 border border-slate-500/20 rounded-lg p-1.5 flex flex-col items-center justify-center">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Abalone</span>
                            <span className="text-sm font-black text-slate-400">{((stats as any).totalAbaloneScore || 0).toFixed(1)}</span>
                        </div>
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-1.5 flex flex-col items-center justify-center">
                            <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">Hex</span>
                            <span className="text-sm font-black text-indigo-400">{((stats as any).totalHexScore || 0).toFixed(1)}</span>
                        </div>
                        <div className="bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-lg p-1.5 flex flex-col items-center justify-center">
                            <span className="text-[8px] font-black text-fuchsia-500 uppercase tracking-widest mb-0.5">Orbito</span>
                            <span className="text-sm font-black text-fuchsia-400">{((stats as any).totalOrbitoScore || 0).toFixed(1)}</span>
                        </div>
                        <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-1.5 flex flex-col items-center justify-center">
                            <span className="text-[8px] font-black text-teal-500 uppercase tracking-widest mb-0.5">Pente</span>
                            <span className="text-sm font-black text-teal-400">{((stats as any).totalPenteScore || 0).toFixed(1)}</span>
                        </div>
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-1.5 flex flex-col items-center justify-center">
                            <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest mb-0.5">Triangoli</span>
                            <span className="text-sm font-black text-rose-400">{((stats as any).totalChainTriangleScore || 0).toFixed(1)}</span>
                        </div>
                        <div className="bg-amber-800/10 border border-amber-800/20 rounded-lg p-1.5 flex flex-col items-center justify-center">
                            <span className="text-[8px] font-black text-amber-700 uppercase tracking-widest mb-0.5">Shobu</span>
                            <span className="text-sm font-black text-amber-600">{((stats as any).totalShobuScore || 0).toFixed(1)}</span>
                        </div>
                        <div className="bg-purple-800/10 border border-purple-800/20 rounded-lg p-1.5 flex flex-col items-center justify-center">
                            <span className="text-[8px] font-black text-purple-500 uppercase tracking-widest mb-0.5">Yinsh</span>
                            <span className="text-sm font-black text-purple-400">{((stats as any).totalYinshScore || 0).toFixed(1)}</span>
                        </div>
                        <div className="bg-rose-800/10 border border-rose-800/20 rounded-lg p-1.5 flex flex-col items-center justify-center">
                            <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest mb-0.5">Onitama</span>
                            <span className="text-sm font-black text-rose-400">{((stats as any).totalOnitamaScore || 0).toFixed(1)}</span>
                        </div>
                        <div className="bg-emerald-800/10 border border-emerald-800/20 rounded-lg p-1.5 flex flex-col items-center justify-center">
                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">Baduk</span>
                            <span className="text-sm font-black text-emerald-400">{((stats as any).totalBadukScore || 0).toFixed(1)}</span>
                        </div>
                        <div className="bg-red-800/10 border border-red-800/20 rounded-lg p-1.5 flex flex-col items-center justify-center">
                            <span className="text-[8px] font-black text-red-500 uppercase tracking-widest mb-0.5">Stratego</span>
                            <span className="text-sm font-black text-red-400">{((stats as any).totalStrategoScore || 0).toFixed(1)}</span>
                        </div>
                    </div>
                    <div className="pt-2 text-center">
                         <span className="text-[10px] text-slate-400 italic">
                             {language === 'it' 
                               ? "* Il tuo Punteggio Globale (in alto) è la somma dei tuoi Scores " 
                               + "meno 50 punti per ogni gioco sbloccato." 
                               : "* Your Global Score (at the top) is the sum of your Scores "
                               + "minus 50 points for each unlocked game."}
                         </span>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'badges' && stats && (
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="bg-slate-800 rounded-2xl p-4 border border-white/5 flex flex-col items-center">
                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-4">{t.achievements}</span>
                    <div className="grid grid-cols-4 gap-x-2 gap-y-4 w-full justify-items-center">
                    {[
                        { id: 'cervellone', icon: '🧠', name: t.badgeBrainiac, desc: t.badgeBrainiacDesc },
                        { id: 'dominatore', icon: '👑', name: t.badgeDominator, desc: t.badgeDominatorDesc },
                        { id: 'abalone_hard', icon: '🟤', name: (t as any).badgeAbaloneHard, desc: (t as any).badgeAbaloneHardDesc },
                        { id: 'hex_hard', icon: '⬡', name: (t as any).badgeHexHard || "Hex Master", desc: (t as any).badgeHexHardDesc || "Vinci in HEX a livello Difficile" },
                        { id: 'shobu_master', icon: '🪨', name: (t as any).badgeShobuMaster || "Maestro Shobu", desc: (t as any).badgeShobuMasterDesc || "Vinci in Shobu a livello Medio o Difficile" },
                        { id: 'onitama_hard', icon: '🏯', name: (t as any).badgeOnitamaHard || "Maestro Onitama", desc: (t as any).badgeOnitamaHardDesc || "Vinci una partita a livello Difficile o Estrema in modalità Onitama" },
                        { id: 'fuga_hard', icon: '🏃', name: (t as any).badgeFugaHard || "Velocista", desc: (t as any).badgeFugaHardDesc || "Vinci una partita a livello Difficile in modalità FUGA" },
                        { id: 'amazons_hard', icon: '🏹', name: (t as any).badgeAmazonsHard || "Guerriero", desc: (t as any).badgeAmazonsHardDesc || "Vinci una partita a livello Difficile in modalità AMAZONS" },
                        { id: 'orbito_hard', icon: '🌀', name: (t as any).badgeOrbitoHard || "Maestro Orbito", desc: (t as any).badgeOrbitoHardDesc || "Vinci in ORBITO a livello Difficile" },
                        { id: 'chain_triangle_medium', icon: '🔺', name: (t as any).badgeChainTriangleMedium || "Pensatore di Triangoli", desc: (t as any).badgeChainTriangleMediumDesc || "Vinci una partita a livello Medio in CHAIN TRIANGLE" },
                        { id: 'chain_triangle_hard', icon: '🌋', name: (t as any).badgeChainTriangleHard || "Maestro dei Triangoli", desc: (t as any).badgeChainTriangleHardDesc || "Vinci una partita a livello Difficile in CHAIN TRIANGLE" },
                        { id: 'yinsh_master', icon: '💍', name: (t as any).badgeYinshMaster || "Signore degli Anelli", desc: (t as any).badgeYinshMasterDesc || "Vinci una partita a livello Medio o Difficile in modalità YINSH" },
                        { id: 'maestro', icon: '🍡', name: (t as any).badgeMaster || "Maestro Dango", desc: (t as any).badgeMasterDesc || "Vinci una partita a livello Dango" },
                        { id: 'baduk_extreme', icon: '☯️', name: language === "it" ? "Maestro Divino" : "Divine Master", desc: language === "it" ? "Vinci una partita a livello Estrema in modalità Baduk/Go" : "Win a game on Extreme difficulty in Baduk/Go mode" },
                        { id: 'stratego_master', icon: '🚩', name: language === "it" ? "Generale Supremo" : "Supreme General", desc: language === "it" ? "Vinci una partita a livello Difficile o superiore in Stratego" : "Win a game on Hard difficulty or higher in Stratego" }
                    ].map(badge => {
                        const unlocked = stats.badges?.find(b => typeof b === 'string' ? b === badge.id : b.id === badge.id);
                        const isUnlocked = !!unlocked;
                        const unlockDate = unlocked && typeof unlocked !== 'string' ? unlocked.date : undefined;
                        const difficulty = unlocked && typeof unlocked !== 'string' ? unlocked.difficulty : undefined;
                        const isHalfUnlocked = isUnlocked && difficulty === 'normale' && (badge.id === 'shobu_master' || badge.id === 'onitama_hard');
                        
                        return (
                        <button 
                            key={badge.id}
                            onClick={() => onBadgeClick && onBadgeClick({ id: badge.id, name: badge.name, desc: badge.desc, icon: badge.icon, date: unlockDate, isUnlocked, difficulty })}
                            className={`flex flex-col items-center transition-all ${isUnlocked ? 'opacity-100 scale-110' : 'opacity-30 grayscale'}`}
                        >
                            <div className="relative text-[28px] leading-tight mb-1 drop-shadow-lg">
                            <span className={isHalfUnlocked ? "grayscale opacity-30" : ""}>{badge.icon}</span>
                            {isHalfUnlocked && (
                                <span 
                                className="absolute top-0 left-0 overflow-hidden whitespace-nowrap" 
                                style={{ width: '50%' }}
                                >
                                {badge.icon}
                                </span>
                            )}
                            </div>
                            <span className="text-[9px] font-bold text-slate-300 uppercase text-center w-[72px] leading-tight">
                                {badge.name}
                            </span>
                        </button>
                        );
                    })}
                    </div>
                </div>
            </div>
        )}
      </div>
  );

  if (isInline) {
    return panelContent;
  }

  return (
    <div className="fixed inset-0 z-[2000] bg-black/85 backdrop-blur-md flex items-center justify-center p-2">
      {panelContent}
    </div>
  );
};
