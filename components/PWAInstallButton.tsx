import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share, PlusSquare } from 'lucide-react';
import { Language } from '../types';

interface PWAInstallButtonProps {
  language?: Language;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ language = 'it' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA or native app, hide
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        title={language === 'it' ? "Installa l'applicazione sul dispositivo" : "Install app on device"}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-[0_0_12px_rgba(16,185,129,0.35)] active:scale-95 transition-all border border-emerald-400/40"
      >
        <Download className="w-3.5 h-3.5" />
        <span>{language === 'it' ? 'Installa App' : 'Install App'}</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          title={language === 'it' ? "Installa su iPhone o iPad" : "Install on iPhone/iPad"}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-[11px] font-bold uppercase tracking-wider rounded-xl border border-white/10 active:scale-95 transition-all shadow-md"
        >
          <Share className="w-3.5 h-3.5 text-blue-400" />
          <span>{language === 'it' ? 'Installa su iOS' : 'Install iOS'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-3 border border-blue-500/40">
                <Share className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-base font-black text-white uppercase tracking-wider mb-2">
                {language === 'it' ? 'Installa su iPhone / iPad' : 'Install on iPhone / iPad'}
              </h3>
              <p className="text-xs text-slate-300 mb-4 leading-relaxed text-left bg-slate-800/70 p-3 rounded-xl border border-slate-700/60">
                {language === 'it' ? (
                  <>
                    1. Tocca il pulsante <strong className="text-white">Condividi</strong> (<Share className="inline w-3 h-3 text-blue-400" />) nella barra di Safari.<br />
                    2. Scorri in basso e seleziona <strong className="text-emerald-400"><PlusSquare className="inline w-3 h-3" /> Aggiungi alla schermata Home</strong>.
                  </>
                ) : (
                  <>
                    1. Tap the <strong className="text-white">Share</strong> button (<Share className="inline w-3 h-3 text-blue-400" />) in Safari.<br />
                    2. Scroll down and tap <strong className="text-emerald-400"><PlusSquare className="inline w-3 h-3" /> Add to Home Screen</strong>.
                  </>
                )}
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs uppercase tracking-wider text-slate-300 border border-slate-700 active:scale-95 transition-all"
              >
                {language === 'it' ? 'Chiudi' : 'Close'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
