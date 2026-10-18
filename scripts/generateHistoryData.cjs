const fs = require('fs');
const path = require('path');

// Helper to wrap sections in JSX
function makeDoc(sections) {
  return `(
      <div className="space-y-6">
${sections.map(s => `        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black ${s.headingColor || 'text-orange-400'} uppercase mb-2 tracking-wider">${s.title}</h3>
${s.content}
        </div>`).join('\n')}
      </div>
    )`;
}

// We write the file with all 14 games
console.log("Generator helper loaded");
