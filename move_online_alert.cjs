const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const targetHeader = `              {isMyTurnOnline ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/40 text-[11px] animate-pulse shrink-0">
                  👉 Tocca a te!
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium border border-amber-500/40 text-[11px] flex items-center gap-1 shrink-0">
                  ⏳ In attesa di {onlineMatchSession.opponentName}...
                </span>
              )}`;
const replaceHeader = ``;
code = code.replace(targetHeader, replaceHeader);

const targetFooter = `            <footer className="mt-auto bg-slate-900/80 p-3 px-4 rounded-[2rem] border-[2px] border-[#fef08a] relative flex-shrink-0">
              {isPlayerSuspended && (`;

const replaceFooter = `            <footer className="mt-auto bg-slate-900/80 p-3 px-4 rounded-[2rem] border-[2px] border-[#fef08a] relative flex-shrink-0">
              {onlineMatchSession && !gameState.winner && (
                <div className={\`w-full mb-3 py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-[11px] sm:text-xs font-black tracking-widest uppercase \${isMyTurnOnline ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]"}\`}>
                  {isMyTurnOnline ? (
                    <>
                       <span className="text-sm">👉</span>
                       <span>{language === "it" ? "Tocca a te!" : "Your turn!"}</span>
                    </>
                  ) : (
                    <>
                       <span className="text-sm">⏳</span>
                       <span>{language === "it" ? \`In attesa di \${onlineMatchSession.opponentName}...\` : \`Waiting for \${onlineMatchSession.opponentName}...\`}</span>
                    </>
                  )}
                </div>
              )}
              {isPlayerSuspended && (`;
code = code.replace(targetFooter, replaceFooter);

fs.writeFileSync('App.tsx', code);
