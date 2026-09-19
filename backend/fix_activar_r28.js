const fs = require('fs');
const path = 'src/services/rules-engine/index.ts';
let lineas = fs.readFileSync(path, 'utf8').split(/\r?\n/);

if (lineas.some(l => l.includes('R28_CedulasVsComparecientes'))) {
  console.log('YA APLICADO');
  process.exit(0);
}

let cambios = 0;
const resultado = [];

for (const l of lineas) {
  if (l.includes('Núcleo de 21 reglas activas')) {
    resultado.push(l.replace('Núcleo de 21 reglas activas', 'Núcleo de 22 reglas activas'));
    cambios++;
    continue;
  }
  if (l.includes('Activas (21):') && l.includes('R27')) {
    resultado.push(l.replace('R27', 'R27, R28'));
    cambios++;
    continue;
  }
  if (l.includes("import { R27_UsoSuelo }")) {
    resultado.push(l);
    resultado.push("import { R28_CedulasVsComparecientes } from './reglas/R28_cedulas_comparecientes';");
    cambios++;
    continue;
  }
  if (l.trim() === 'R27_UsoSuelo,') {
    resultado.push(l);
    resultado.push('  R28_CedulasVsComparecientes,');
    cambios++;
    continue;
  }
  resultado.push(l);
}

if (cambios < 4) {
  console.log('ERROR: solo se aplicaron ' + cambios + ' cambios (esperados 4)');
  process.exit(1);
}

fs.writeFileSync(path, resultado.join('\r\n'));
console.log('OK: R28 activada en el motor (' + cambios + ' cambios)');
