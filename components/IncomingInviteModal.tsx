import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { GameMode, Language, BoardTheme } from "../types";
import { Swords, Check, X, Clock } from "lucide-react";
import { SoundManager } from "../utils/soundManager";
import { getGameModeLabel } from "./OnlinePlayerSearchModal";
import { getAbaloneLayoutName } from "../utils/gameLogic";

export interface IncomingInviteData {
  id: string;
  fromDeviceId: string;
  fromName: string;
  fromLocation?: string;
  fromScore?: number;
  gameMode: GameMode;
  boardTheme?: BoardTheme;
  roomId: string;
}

interface IncomingInviteModalProps {
  invite: IncomingInviteData | null;
  onAccept: (invite: IncomingInviteData) => void;
  onDecline: (inviteId: string) => void;
  language: Language;
}

const INCOMING_INVITE_STRINGS: Record<Language, {
  title: string;
  subtitle: string;
  game: string;
  respondWithin: string;
  decline: string;
  accept: string;
}> = {
  it: {
    title: "Sfida Online Ricevuta!",
    subtitle: "Un giocatore ti ha invitato a una partita online 1v1",
    game: "Gioco:",
    respondWithin: "Rispondi entro:",
    decline: "Rifiuta",
    accept: "Accetta",
  },
  en: {
    title: "Online Challenge Received!",
    subtitle: "A player invited you to a 1v1 online match",
    game: "Game:",
    respondWithin: "Respond within:",
    decline: "Decline",
    accept: "Accept",
  },
  es: {
    title: "¡Desafío Online Recibido!",
    subtitle: "Un jugador te ha invitado a una partida online 1v1",
    game: "Juego:",
    respondWithin: "Responder antes de:",
    decline: "Rechazar",
    accept: "Aceptar",
  },
  fr: {
    title: "Défi en ligne reçu !",
    subtitle: "Un joueur vous a invité à un match en ligne 1v1",
    game: "Jeu :",
    respondWithin: "Répondre d'ici :",
    decline: "Refuser",
    accept: "Accepter",
  },
  de: {
    title: "Online-Herausforderung erhalten!",
    subtitle: "Ein Spieler hat dich zu einem 1v1-Online-Spiel eingeladen",
    game: "Spiel:",
    respondWithin: "Antworten innerhalb:",
    decline: "Ablehnen",
    accept: "Annehmen",
  },
};

export const IncomingInviteModal: React.FC<IncomingInviteModalProps> = ({
  invite,
  onAccept,
  onDecline,
  language,
}) => {
  const [countdown, setCountdown] = useState(40);
  const timerRef = useRef<any>(null);
  const onDeclineRef = useRef(onDecline);
  onDeclineRef.current = onDecline;

  const t = INCOMING_INVITE_STRINGS[language] || INCOMING_INVITE_STRINGS.it;

  useEffect(() => {
    if (invite) {
      setCountdown(40);
      try {
        SoundManager.playMovePiece();
      } catch (e) {
        // ignore
      }

      timerRef.current = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [invite?.id]);

  useEffect(() => {
    if (invite && countdown === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      const timer = setTimeout(() => {
        onDeclineRef.current(invite.id);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [countdown, invite?.id]);

  if (!invite) return null;

  const gameLabel = invite.gameMode === "baduk"
    ? `Baduk / Go (${invite.boardTheme === "baduk-19" ? "19x19" : invite.boardTheme === "baduk-13" ? "13x13" : "9x9"})`
    : invite.gameMode === "abalone"
      ? `Abalone (${getAbaloneLayoutName(invite.boardTheme, language)})`
      : getGameModeLabel(invite.gameMode, language);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-slate-900 border-2 border-emerald-500/80 rounded-3xl p-6 shadow-[0_0_50px_rgba(16,185,129,0.3)] flex flex-col items-center text-center text-white space-y-4 animate-in zoom-in-95 duration-200">
        
        {/* Pulsing Icon */}
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400">
            <Swords size={32} className="animate-bounce" />
          </div>
          <span className="absolute top-0 right-0 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
          </span>
        </div>

        {/* Title */}
        <div>
          <h3 className="text-xl font-black italic tracking-tight text-white flex items-center justify-center gap-2">
            <span>{t.title}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">{t.subtitle}</p>
        </div>

        {/* Challenger Card */}
        <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="text-sm font-bold text-emerald-300">
            {invite.fromName}
            {invite.fromLocation ? (
              <span className="text-xs font-normal text-slate-400 block">
                📍 {invite.fromLocation}
              </span>
            ) : null}
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-300 font-semibold">
            <span>{t.game}</span>
            <span className="px-2.5 py-1 bg-indigo-950 text-indigo-300 rounded-lg border border-indigo-800/80">
              {gameLabel}
            </span>
          </div>
        </div>

        {/* Countdown timer */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <Clock size={14} className="text-amber-400 animate-spin" />
          <span>{t.respondWithin} <strong>{countdown}s</strong></span>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-3 w-full pt-1">
          <button
            onClick={() => onDecline(invite.id)}
            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs sm:text-sm font-bold transition-all border border-slate-700 flex items-center justify-center gap-1.5"
          >
            <X size={16} /> {t.decline}
          </button>
          <button
            onClick={() => onAccept(invite)}
            className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs sm:text-sm font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-1.5"
          >
            <Check size={16} /> {t.accept}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
