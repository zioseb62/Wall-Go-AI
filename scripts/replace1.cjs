const fs = require('fs');

let content = fs.readFileSync('App.tsx', 'utf-8');

const targetContentStart = `          <div \n            ref={modesScrollRef} `;
const targetContentEnd = `             </div>\n          )}`;

const startIndex = content.indexOf(targetContentStart);
let endIndex = content.indexOf(targetContentEnd, startIndex);
if(startIndex !== -1 && endIndex !== -1) {
  endIndex += targetContentEnd.length;
  
  const replacement = `              <div className="w-full grid grid-cols-2 gap-3 pb-4">
                {[
                  { m: 'dominio', i: '🟦', n: 'Wall Go AI', l: language === 'it' ? 'Territorio' : 'Territory', bg: 'bg-blue-600/20', brd: 'border-blue-500', from: 'from-blue-500/20', shadow: 'shadow-blue-900/50', txt: 'text-blue-400', txtSub: 'text-blue-300/80' },
                  { m: 'corsa', i: '🏁', n: 'Quoridor', l: language === 'it' ? 'Percorso' : 'Path', bg: 'bg-orange-600/20', brd: 'border-orange-500', from: 'from-orange-500/20', shadow: 'shadow-orange-900/50', txt: 'text-orange-400', txtSub: 'text-orange-300/80' },
                  { m: 'amazons', i: '🏹', n: 'Amazons', l: language === 'it' ? 'Distruzione' : 'Destroy', bg: 'bg-purple-600/20', brd: 'border-purple-500', from: 'from-purple-500/20', shadow: 'shadow-purple-900/50', txt: 'text-purple-400', txtSub: 'text-purple-300/80' },
                  { m: 'domineering', i: '⚔️', n: 'Domineering', l: language === 'it' ? 'Blocco' : 'Block', bg: 'bg-rose-600/20', brd: 'border-rose-500', from: 'from-rose-500/20', shadow: 'shadow-rose-900/50', txt: 'text-rose-400', txtSub: 'text-rose-300/80' },
                  { m: 'abalone', i: '🎱', n: 'Abalone', l: language === 'it' ? 'Spinta' : 'Push', bg: 'bg-slate-700/80', brd: 'border-slate-400', from: 'from-slate-400/20', shadow: 'shadow-[0_0_20px_rgba(148,163,184,0.3)]', txt: 'text-slate-200', txtSub: 'text-slate-300/80' },
                  { m: 'hex', i: '⬡', n: 'Hex', l: language === 'it' ? 'Connessione' : 'Connection', bg: 'bg-fuchsia-600/20', brd: 'border-fuchsia-500', from: 'from-fuchsia-500/20', shadow: 'shadow-fuchsia-900/50', txt: 'text-fuchsia-400', txtSub: 'text-fuchsia-300/80' },
                  { m: 'orbito', i: '🪐', n: 'Orbito', l: language === 'it' ? 'Allineamento' : 'Align', bg: 'bg-pink-600/20', brd: 'border-pink-500', from: 'from-pink-500/20', shadow: 'shadow-pink-900/50', txt: 'text-pink-400', txtSub: 'text-pink-300/80' },
                  { m: 'pente', i: '⭐', n: 'Pente', l: language === 'it' ? 'Allinea 5' : 'Align 5', bg: 'bg-teal-900/30', brd: 'border-teal-500/50 border-dashed', from: '', shadow: '', txt: 'text-teal-400', txtSub: 'text-teal-300/60', cs: true }
                ].map(g => (
                  <button key={g.m} onClick={() => {
                    if (g.cs) {
                      setComingSoonToast(\`PENTE \${language === 'it' ? 'in arrivo a breve!' : 'coming soon!'}\`);
                      if (comingSoonToastTimeout.current) clearTimeout(comingSoonToastTimeout.current);
                      comingSoonToastTimeout.current = setTimeout(() => setComingSoonToast(null), 2500);
                      return;
                    }
                    if (g.m === 'orbito') {
                      setIsOrbitoRulesOpen(true);
                    } else {
                      handleGameModeChange(g.m as GameMode);
                    }
                    if (g.m === 'corsa' || g.m === 'amazons' || g.m === 'domineering' || g.m === 'abalone' || g.m === 'hex') {
                      if (playerCount > 2 || (g.m === 'corsa' && playerCount === 3)) setPlayerCount(2);
                    }
                    if (g.m === 'dominio' || g.m === 'corsa') {
                      if (boardTheme.startsWith('amazons') || boardTheme === 'domineering' || boardTheme.startsWith('abalone')) setBoardTheme('neon');
                    }
                    if (g.m === 'amazons' && !boardTheme.startsWith('amazons')) setBoardTheme('amazons-6');
                    if (g.m === 'domineering') setBoardTheme('domineering');
                    if (g.m === 'abalone') setBoardTheme('abalone');
                    
                    if (g.m === 'corsa' && !hasSeenFugaRules) { setHasSeenFugaRules(true); localStorage.setItem('hasSeenFugaRules', 'true'); setIsRulesOpen(true); }
                    if (g.m === 'domineering' && !hasSeenDomineeringRules) { setHasSeenDomineeringRules(true); localStorage.setItem('hasSeenDomineeringRules', 'true'); setIsRulesOpen(true); }
                    if (g.m === 'abalone' && !hasSeenAbaloneRules) { setHasSeenAbaloneRules(true); localStorage.setItem('hasSeenAbaloneRules', 'true'); setIsRulesOpen(true); }
                    if (g.m === 'hex' && !hasSeenHexRules) { setHasSeenHexRules(true); localStorage.setItem('hasSeenHexRules', 'true'); setIsRulesOpen(true); }

                    setSetupView('details');
                  }} className={\`border-2 rounded-[1.25rem] p-4 flex flex-col items-center justify-center aspect-square relative active:scale-95 transition-transform \${g.cs ? 'bg-teal-900/30 border-teal-500/50 border-dashed opacity-70' : \`\${g.bg} \${g.brd} \${g.shadow}\`}\`}>
                    {!g.cs && <div className={\`absolute inset-0 bg-gradient-to-t \${g.from}\`}></div>}
                    {g.cs && <div className="absolute -top-2 -right-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-[8px] font-black px-2 py-0.5 rounded-full text-white shadow-lg z-20">COMING SOON</div>}
                    <div className={\`text-3xl mb-2 relative z-10 \${g.m==='hex'?'text-fuchsia-400':''}\`}>{g.i}</div>
                    <span className={\`text-xs font-black uppercase tracking-widest text-center relative z-10 line-clamp-1 w-full \${g.cs ? 'text-teal-400 opacity-70' : g.txt}\`}>{g.n}</span>
                    <span className={\`text-[8px] mt-1 uppercase relative z-10 \${g.cs ? 'text-teal-300/60 opacity-70' : g.txtSub}\`}>{g.l}</span>
                  </button>
                ))}
              </div>
              {comingSoonToast && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-max max-w-[280px] bg-slate-800 text-rose-400 text-sm font-black px-4 py-3 rounded-2xl shadow-2xl border border-rose-500/30 animate-in fade-in slide-in-from-bottom-2 z-50 text-center pointer-events-none">
                  {comingSoonToast}
                </div>
              )}`;
  
  content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
  fs.writeFileSync('App.tsx', content, 'utf-8');
  console.log('Grid replaced');
} else {
  console.log('Start index: ' + startIndex + ' End index: ' + endIndex);
}
