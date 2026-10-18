const fs = require('fs');
const path = require('path');

const dominio = require('./data/dominio.cjs');
const amazons = require('./data/amazons.cjs');
const corsa = require('./data/corsa.cjs');
const domineering = require('./data/domineering.cjs');
const chain_triangle = require('./data/chain_triangle.cjs');
const hex = require('./data/hex.cjs');
const orbito = require('./data/orbito.cjs');
const pente = require('./data/pente.cjs');
const shobu = require('./data/shobu.cjs');
const baduk = require('./data/baduk.cjs');
const stratego = require('./data/stratego.cjs');

const yinshRaw = fs.readFileSync(path.join(__dirname, 'yinshBlock.txt'), 'utf8');
const abaloneRaw = fs.readFileSync(path.join(__dirname, 'abaloneBlock.txt'), 'utf8');
const onitamaRaw = fs.readFileSync(path.join(__dirname, 'onitamaBlock.txt'), 'utf8');

function renderGame(gameKey, obj) {
  return `  ${gameKey}: {
    it: ${obj.it},
    en: ${obj.en},
    es: ${obj.es},
    fr: ${obj.fr},
    de: ${obj.de}
  }`;
}

const out = `import React from 'react';
import { Language } from '../types';

export const historyData: Record<string, Partial<Record<Language, React.ReactNode>>> = {
${renderGame('dominio', dominio)},
${yinshRaw.trim().replace(/^yinsh:\s*{/, '  yinsh: {')},
${abaloneRaw.trim().replace(/^abalone:\s*{/, '  abalone: {')},
${renderGame('amazons', amazons)},
${renderGame('corsa', corsa)},
${renderGame('domineering', domineering)},
${renderGame('chain_triangle', chain_triangle)},
${renderGame('hex', hex)},
${renderGame('orbito', orbito)},
${renderGame('pente', pente)},
${renderGame('shobu', shobu)},
${onitamaRaw.trim().replace(/^onitama:\s*{/, '  onitama: {')},
${renderGame('baduk', baduk)},
${renderGame('stratego', stratego)}
};
`;

fs.writeFileSync(path.join(__dirname, '../utils/historyData.tsx'), out, 'utf8');
console.log('Successfully generated utils/historyData.tsx, length:', out.length);
