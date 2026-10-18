import React, { useEffect, useState } from "react";
import { DailyMission, getPastDaysDateStrings, generateDailyMissions } from "../utils/dailyMissions";
import { Language } from "../types";
import { createPortal } from "react-dom";
import { loadStorageItem } from "../utils/storage";
import { Logo } from "./Logo";

function getMissionIcon(m: DailyMission) {
  if (m.type === "win_mode" || m.type === "win_multiplayer_mode") {
    switch (m.target) {
      case "dominio": return <Logo size={22} />;
      case "corsa": return "🏁";
      case "amazons": return "🏹";
      case "domineering": return "⚔️";
      case "hex": return "⬡";
      case "pente": return "⭐";
      case "orbito": return "🪐";
      case "chain_triangle": return "🔺";
      case "shobu": return "🪨";
      case "yinsh": return "💍";
      case "abalone": return "🎱";
      case "onitama": return "🏯";
      case "baduk": return "⚫";
      default: return "🎮";
    }
  } else if (m.type === "win_multiplayer" || m.type === "play_multiplayer") {
    return "🌐";
  } else if (m.type === "win_theme") {
    return "🎨";
  } else if (m.type === "win_difficulty") {
    return "🔥";
  }
  return "🎯";
}

interface DailyMissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  missions: DailyMission[];
  language: Language;
}

export const DailyMissionsModal: React.FC<DailyMissionsModalProps> = ({ isOpen, onClose, missions, language }) => {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"today" | "history">("today");
  const [historyData, setHistoryData] = useState<{ date: string; completedCount: number; totalCount: number; missions: DailyMission[] }[]>([]);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && activeTab === "history") {
      const loadHistory = async () => {
        try {
          const storedHistoryStr = await loadStorageItem("wallgo_mission_history");
          const storedHistory = storedHistoryStr ? JSON.parse(storedHistoryStr) : {};
          
          const pastDates = getPastDaysDateStrings(28);
          const hist = pastDates.map(date => {
            let dailyMissions = generateDailyMissions(date);
            const totalCount = dailyMissions.length;
            let completedMissionsIds = storedHistory[date] || [];
            
            // For today, we use the active missions prop if it matches
            let completedCount = completedMissionsIds.length;
            if (date === getPastDaysDateStrings(1)[0]) {
               completedCount = missions.filter(m => m.isCompleted).length;
               completedMissionsIds = missions.filter(m => m.isCompleted).map(m => m.id);
               dailyMissions = dailyMissions.map(m => ({ ...m, isCompleted: completedMissionsIds.includes(m.id) }));
            } else {
               dailyMissions = dailyMissions.map(m => ({ ...m, isCompleted: completedMissionsIds.includes(m.id) }));
            }

            return {
              date,
              completedCount,
              totalCount,
              missions: dailyMissions
            };
          });
          setHistoryData(hist);
        } catch (e) {
          console.error("Failed to load mission history", e);
        }
      };
      loadHistory();
    }
  }, [isOpen, activeTab, missions]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col p-5 sm:p-6 border-b border-slate-800 shrink-0 gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-black text-white italic tracking-tight flex items-center gap-3">
              <span>🎯</span>
              {language === 'it' ? 'Missioni' : language === 'fr' ? 'Missions' : language === 'de' ? 'Missionen' : language === 'es' ? 'Misiones' : 'Missions'}
            </h2>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shrink-0"
            >
              ✕
            </button>
          </div>
          
          <div className="flex p-1 bg-slate-950 rounded-xl">
            <button
              onClick={() => setActiveTab("today")}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === "today" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-300"}`}
            >
              {language === 'it' ? 'Oggi' : language === 'fr' ? 'Aujourd\'hui' : language === 'de' ? 'Heute' : language === 'es' ? 'Hoy' : 'Today'}
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === "history" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-300"}`}
            >
              {language === 'it' ? 'Cronologia' : language === 'fr' ? 'Historique' : language === 'de' ? 'Verlauf' : language === 'es' ? 'Historial' : 'History'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3 no-scrollbar">
          {activeTab === "today" && missions.map(m => (
            <div 
              key={m.id} 
              className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all ${
                m.isCompleted 
                  ? 'bg-emerald-900/30 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                  : 'bg-slate-800 border-slate-700'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`relative w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  m.isCompleted 
                    ? 'bg-emerald-500/20 border border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                    : 'bg-slate-700 text-slate-200'
                }`}>
                  <span className="font-bold text-lg flex items-center justify-center">
                    {getMissionIcon(m)}
                  </span>
                  {m.isCompleted && (
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 text-slate-950 shadow-sm border-2 border-slate-900">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className={`text-sm sm:text-base font-bold leading-tight ${m.isCompleted ? 'text-emerald-300' : 'text-white'}`}>
                    {m.description[language] || m.description["en"]}
                  </span>
                  <span className={`text-xs sm:text-sm font-black ${m.isCompleted ? 'text-emerald-500' : 'text-indigo-400'}`}>
                    +{m.reward} PT
                  </span>
                </div>
              </div>
            </div>
          ))}

          {activeTab === "history" && !selectedHistoryDate && (
            <div className="grid grid-cols-7 gap-2">
              {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((day, i) => (
                <div key={i} className="text-center text-xs font-bold text-slate-500 pb-2">
                   {/* Note: This is simplified, maybe we can just show boxes without day names or compute them properly */}
                   {language === 'en' ? ['M','T','W','T','F','S','S'][i] : language === 'fr' ? ['L','M','M','J','V','S','D'][i] : language === 'de' ? ['M','D','M','D','F','S','S'][i] : language === 'es' ? ['L','M','M','J','V','S','D'][i] : ['L','M','M','G','V','S','D'][i]}
                </div>
              ))}
              
              {/* Pad beginning of month to align correctly */}
              {Array.from({ length: historyData.length > 0 ? (new Date(parseInt(historyData[historyData.length - 1].date.split('-')[0]), parseInt(historyData[historyData.length - 1].date.split('-')[1]) - 1, parseInt(historyData[historyData.length - 1].date.split('-')[2])).getDay() + 6) % 7 : 0 }).map((_, i) => (
                 <div key={`pad-${i}`} className="aspect-square rounded-md bg-transparent" />
              ))}
              
              {/* We need to display history starting from oldest to newest */}
              {[...historyData].reverse().map((dayData, index) => {
                const isCompletedAll = dayData.completedCount === dayData.totalCount && dayData.totalCount > 0;
                const isPartial = dayData.completedCount > 0 && dayData.completedCount < dayData.totalCount;
                
                return (
                  <button 
                    key={dayData.date} 
                    onClick={() => setSelectedHistoryDate(dayData.date)}
                    className={`aspect-square rounded-md flex items-center justify-center text-xs font-bold transition-all border hover:scale-105 active:scale-95 ${
                      isCompletedAll 
                        ? 'bg-emerald-500 border-emerald-400 text-slate-900 shadow-[0_0_8px_rgba(16,185,129,0.4)] hover:bg-emerald-400' 
                        : isPartial
                          ? 'bg-emerald-900 border-emerald-700 text-emerald-300 hover:bg-emerald-800'
                          : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'
                    }`}
                    title={`${dayData.date}: ${dayData.completedCount}/${dayData.totalCount}`}
                  >
                     {dayData.date.split('-')[2].replace(/^0/, '')}
                  </button>
                )
              })}
            </div>
          )}

          {activeTab === "history" && selectedHistoryDate && (
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => setSelectedHistoryDate(null)}
                className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors self-start mb-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
                {language === 'it' ? 'Indietro' : language === 'fr' ? 'Retour' : language === 'de' ? 'Zurück' : language === 'es' ? 'Volver' : 'Back'} - {selectedHistoryDate.split('-').reverse().join('/')}
              </button>
              
              {historyData.find(d => d.date === selectedHistoryDate)?.missions.map(m => (
                <div 
                  key={m.id} 
                  className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all ${
                    m.isCompleted 
                      ? 'bg-emerald-900/30 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`relative w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      m.isCompleted 
                        ? 'bg-emerald-500/20 border border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                        : 'bg-slate-700 text-slate-200'
                    }`}>
                      <span className="font-bold text-lg flex items-center justify-center">
                        {getMissionIcon(m)}
                      </span>
                      {m.isCompleted && (
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 text-slate-950 shadow-sm border-2 border-slate-900">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className={`text-sm sm:text-base font-bold leading-tight ${m.isCompleted ? 'text-emerald-300' : 'text-white'}`}>
                        {m.description[language] || m.description["en"]}
                      </span>
                      <span className={`text-xs sm:text-sm font-black ${m.isCompleted ? 'text-emerald-500' : 'text-indigo-400'}`}>
                        +{m.reward} PT
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
