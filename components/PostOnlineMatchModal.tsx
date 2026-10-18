import React from "react";
import { Language } from "../types";
import { Mail, Home, X, Swords } from "lucide-react";

interface PostOnlineMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  opponentName: string;
  opponentLocation?: string;
  gameMode?: string;
  onProposeNewInvite: () => void;
  onReturnToMenu: () => void;
  language: Language;
}

const POST_MATCH_STRINGS: Record<Language, {
  closeTitle: string;
  title: string;
  opponent: string;
  description: string;
  proposeNew: string;
  menu: string;
}> = {
  it: {
    closeTitle: "Chiudi e guarda il tabellone",
    title: "Partita Conclusa",
    opponent: "Avversario:",
    description: "Vuoi proporre un nuovo invito per un'altra partita o tornare al menu iniziale?",
    proposeNew: "Proponi nuovo invito",
    menu: "Menu iniziale",
  },
  en: {
    closeTitle: "Close and view board",
    title: "Match Finished",
    opponent: "Opponent:",
    description: "Would you like to propose a new invite for another match or return to the main menu?",
    proposeNew: "Propose new invite",
    menu: "Main menu",
  },
  es: {
    closeTitle: "Cerrar y ver tablero",
    title: "Partida Concluida",
    opponent: "Adversario:",
    description: "¿Quieres proponer una nueva invitación para otra partida o volver al menú principal?",
    proposeNew: "Proponer nueva invitación",
    menu: "Menú principal",
  },
  fr: {
    closeTitle: "Fermer et regarder le plateau",
    title: "Partie terminée",
    opponent: "Adversaire :",
    description: "Voulez-vous proposer une nouvelle invitation ou retourner au menu principal ?",
    proposeNew: "Proposer une invitation",
    menu: "Menu principal",
  },
  de: {
    closeTitle: "Schließen und Brett ansehen",
    title: "Spiel Beendet",
    opponent: "Gegner:",
    description: "Möchtest du eine neue Einladung senden oder zum Hauptmenü zurückkehren?",
    proposeNew: "Neue Einladung vorschlagen",
    menu: "Hauptmenü",
  },
};

export const PostOnlineMatchModal: React.FC<PostOnlineMatchModalProps> = ({
  isOpen,
  onClose,
  opponentName,
  opponentLocation,
  onProposeNewInvite,
  onReturnToMenu,
  language,
}) => {
  if (!isOpen) return null;

  const t = POST_MATCH_STRINGS[language] || POST_MATCH_STRINGS.it;

  return (
    <div
      id="post-online-match-backdrop"
      className="fixed inset-0 z-[3200] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300"
    >
      <div
        id="post-online-match-modal"
        className="relative w-full max-w-sm bg-slate-900/95 border-2 border-slate-700 rounded-[2.5rem] p-6 shadow-2xl flex flex-col items-center text-center gap-5 animate-in zoom-in-95 duration-200"
      >
        {/* Close button to view board */}
        <button
          id="btn-close-post-match-modal"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors"
          title={t.closeTitle}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon badge */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.25)]">
          <Swords className="w-8 h-8" />
        </div>

        {/* Title and Description */}
        <div className="space-y-2">
          <h2 className="text-2xl font-black italic uppercase tracking-tight text-white">
            {t.title}
          </h2>
          {opponentName && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/90 border border-white/10 text-xs font-semibold text-slate-300">
              <span>{t.opponent}</span>
              <span className="text-cyan-400 font-bold">{opponentName}</span>
              {opponentLocation ? (
                <span className="text-slate-400 text-[11px]">({opponentLocation})</span>
              ) : null}
            </div>
          )}
          <p className="text-sm text-slate-300 font-medium leading-relaxed pt-1">
            {t.description}
          </p>
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col gap-3 pt-1">
          <button
            id="btn-propose-new-invite"
            onClick={onProposeNewInvite}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.35)] active:scale-95 transition-all flex items-center justify-center gap-2.5"
          >
            <Mail className="w-4 h-4" />
            <span>{t.proposeNew}</span>
          </button>

          <button
            id="btn-return-to-menu-from-modal"
            onClick={onReturnToMenu}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm uppercase tracking-wider rounded-2xl border border-white/10 active:scale-95 transition-all flex items-center justify-center gap-2.5"
          >
            <Home className="w-4 h-4 text-slate-400" />
            <span>{t.menu}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
