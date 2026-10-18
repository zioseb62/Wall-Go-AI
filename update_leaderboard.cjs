const fs = require('fs');
let code = fs.readFileSync('components/LeaderboardModal.tsx', 'utf8');

const target = `                            return (
                                <>
                                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-1.5 flex flex-col items-center justify-center">`;

const replace = `                            return (
                                <>
                                    <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-1.5 flex flex-col items-center justify-center">
                                        <span className="text-[8px] font-black text-cyan-500 uppercase tracking-widest mb-0.5">{language === 'it' ? 'Online' : 'Online'}</span>
                                        <span className="text-sm font-black text-cyan-400">{(stats.totalOnlineMatches || 0)}</span>
                                    </div>
                                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-1.5 flex flex-col items-center justify-center">`;

code = code.replace(target, replace);
fs.writeFileSync('components/LeaderboardModal.tsx', code);
