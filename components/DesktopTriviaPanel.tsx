import React from 'react';
import { Language } from '../types';

interface DesktopTriviaPanelProps {
  language: Language;
  selectedGame: string;
  onSelectGame: (game: string) => void;
  historyData: Record<string, Partial<Record<Language, React.ReactNode>>>;
  onOpenPylosRules?: () => void;
}

const gameYoutubeLinks: Record<string, string> = {
  dominio: "https://www.youtube.com/results?search_query=the+devils+plan+nine+millions+game",
  baduk: "https://www.youtube.com/results?search_query=how+to+play+go+board+game",
  quarto: "https://www.youtube.com/results?search_query=how+to+play+quarto+board+game",
  pylos: "https://www.youtube.com/results?search_query=how+to+play+pylos+board+game",
  corsa: "https://www.youtube.com/results?search_query=how+to+play+quoridor+board+game",
  stratego: "https://www.youtube.com/results?search_query=how+to+play+stratego+board+game",
  onitama: "https://www.youtube.com/results?search_query=how+to+play+onitama+board+game",
  domineering: "https://www.youtube.com/results?search_query=how+to+play+domineering+board+game",
  hex: "https://www.youtube.com/results?search_query=how+to+play+hex+board+game",
  pente: "https://www.youtube.com/results?search_query=how+to+play+pente+board+game",
  orbito: "https://www.youtube.com/results?search_query=how+to+play+orbito+board+game",
  yinsh: "https://www.youtube.com/results?search_query=how+to+play+yinsh+board+game",
  abalone: "https://www.youtube.com/results?search_query=how+to+play+abalone+board+game",
  amazons: "https://www.youtube.com/results?search_query=how+to+play+game+of+the+amazons+board+game",
  chain_triangle: "https://www.youtube.com/results?search_query=how+to+play+trigon+board+game",
  shobu: "https://www.youtube.com/results?search_query=how+to+play+shobu+board+game"
};

const gameListMeta: { m: string; n: string; i: string; color: string }[] = [
  { m: "dominio", n: "Wall Go AI", i: "🌐", color: "text-blue-400" },
  { m: "baduk", n: "Baduk / Go", i: "⚫", color: "text-zinc-300" },
  { m: "quarto", n: "Quarto", i: "🧩", color: "text-indigo-400" },
  { m: "pylos", n: "Pylos", i: "🔺", color: "text-sky-400" },
  { m: "corsa", n: "Quoridor", i: "🏁", color: "text-orange-400" },
  { m: "stratego", n: "Stratego", i: "🚩", color: "text-amber-400" },
  { m: "onitama", n: "Onitama", i: "🏯", color: "text-red-400" },
  { m: "domineering", n: "Domineering", i: "⚔️", color: "text-rose-400" },
  { m: "hex", n: "Hex", i: "⬡", color: "text-fuchsia-400" },
  { m: "pente", n: "Pente", i: "⭐", color: "text-teal-400" },
  { m: "orbito", n: "Orbito", i: "🪐", color: "text-pink-400" },
  { m: "yinsh", n: "Yinsh", i: "💍", color: "text-emerald-400" },
  { m: "abalone", n: "Abalone", i: "🎱", color: "text-slate-200" },
  { m: "amazons", n: "Amazons", i: "🏹", color: "text-purple-400" },
  { m: "chain_triangle", n: "Chain Triangle", i: "🔺", color: "text-yellow-400" },
  { m: "shobu", n: "Shobu", i: "🪨", color: "text-cyan-400" }
];

export const DesktopTriviaPanel: React.FC<DesktopTriviaPanelProps> = ({
  language,
  selectedGame,
  onSelectGame,
  historyData,
  onOpenPylosRules
}) => {
  const activeMeta = gameListMeta.find((g) => g.m === selectedGame) || gameListMeta[0];
  const ytUrl = gameYoutubeLinks[selectedGame] || gameYoutubeLinks.dominio;
  const triviaContent =
    historyData[selectedGame]?.[language] ||
    historyData[selectedGame]?.["en"] ||
    historyData[selectedGame]?.["it"];

  return (
    <div className="w-full h-full flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2.5 lg:mb-3 shrink-0 min-w-0">
        <span className="text-xl lg:text-2xl shrink-0">📜</span>
        <div className="min-w-0">
          <h2 className="text-sm md:text-base lg:text-lg font-black italic text-orange-400 uppercase tracking-tight leading-none truncate">
            {language === "it"
              ? "STORIA & CURIOSITÀ"
              : language === "fr"
                ? "HISTOIRE & ANECDOTES"
                : language === "de"
                  ? "GESCHICHTE & TRIVIA"
                  : language === "es"
                    ? "HISTORIA Y CURIOSIDADES"
                    : "HISTORY & TRIVIA"}
          </h2>
          <span className="text-[9px] lg:text-[10px] text-slate-400 font-bold block truncate">
            {language === "it"
              ? "Curiosità e YouTube tutorial"
              : language === "fr"
                ? "Anecdotes et tutoriels YouTube"
                : language === "de"
                  ? "Wissenswertes & YouTube-Tutorials"
                  : language === "es"
                    ? "Curiosidades y tutoriales de YouTube"
                    : "Trivia & YouTube tutorial guides"}
          </span>
        </div>
      </div>

      {/* Game Selector Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 shrink-0 custom-scrollbar mb-2.5 lg:mb-3">
        {gameListMeta.map((g) => {
          const isSelected = g.m === selectedGame;
          return (
            <button
              key={g.m}
              onClick={() => onSelectGame(g.m)}
              className={`px-2 lg:px-2.5 py-1 lg:py-1.5 rounded-xl font-bold text-[10px] lg:text-[11px] whitespace-nowrap transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                isSelected
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50 scale-105"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
              }`}
            >
              <span>{g.i}</span>
              <span>{g.n}</span>
            </button>
          );
        })}
      </div>

      {/* YouTube Tutorial Link Card */}
      <a
        href={ytUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full mb-2.5 lg:mb-3 p-2.5 lg:p-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-2xl border border-red-400/30 shadow-lg shadow-red-950/40 flex items-center justify-between group active:scale-95 transition-all shrink-0 cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <span className="text-sm lg:text-lg">▶️</span>
          </div>
          <div className="min-w-0 flex flex-col">
            <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-wider text-red-100 leading-tight truncate">
              {language === "it"
                ? "GUARDA SU YOUTUBE"
                : language === "fr"
                  ? "VOIR SUR YOUTUBE"
                  : language === "de"
                    ? "AUF YOUTUBE ANSEHEN"
                    : language === "es"
                      ? "VER EN YOUTUBE"
                      : "WATCH ON YOUTUBE"}
            </span>
            <span className="text-[11px] lg:text-xs font-black text-white truncate">
              {activeMeta.n}
            </span>
          </div>
        </div>
        <span className="text-xs font-extrabold bg-black/30 px-2 py-1 rounded-lg text-red-200 group-hover:text-white shrink-0 ml-1">
          ↗
        </span>
      </a>

      {/* Trivia Scrollable Content */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3 min-h-0 text-xs">
        <div className="bg-slate-800/80 p-2.5 lg:p-3 rounded-2xl border border-white/5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg lg:text-xl">{activeMeta.i}</span>
            <span className={`font-black text-xs lg:text-sm ${activeMeta.color}`}>
              {activeMeta.n}
            </span>
          </div>
          {selectedGame === "pylos" && onOpenPylosRules && (
            <button
              onClick={onOpenPylosRules}
              className="px-2.5 py-1 rounded-lg bg-sky-600/30 hover:bg-sky-600/50 border border-sky-400/40 text-sky-200 text-[10px] font-black uppercase tracking-wider shrink-0 transition-colors cursor-pointer"
            >
              ❓ {language === "it" ? "Regole" : language === "fr" ? "Règles" : language === "de" ? "Regeln" : language === "es" ? "Reglas" : "Rules"}
            </button>
          )}
        </div>
        <div className="text-slate-300">
          {triviaContent || (
            <p className="text-slate-400 italic">
              {language === "it"
                ? "Curiosità e storia per questo gioco saranno presto disponibili."
                : language === "fr"
                  ? "Les anecdotes et l'histoire de ce jeu seront bientôt disponibles."
                  : language === "de"
                    ? "Wissenswertes und Geschichte zu diesem Spiel sind bald verfügbar."
                    : language === "es"
                      ? "Las curiosidades e historia de este juego estarán disponibles pronto."
                      : "Trivia and history for this game will be available soon."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
