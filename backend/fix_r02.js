const fs = require('fs');
const path = 'src/services/rules-engine/reglas/R02_titular.ts';
let c = fs.readFileSync(path, 'utf8');

const reemplazos = [
  ['.map((c) => c.nombre_completo)', '.map((c: any) => c.nombre_completo)'],
  ['.filter((n): n is string => !!n)', '.filter((n: any): n is string => !!n)'],
  ['.map((t) => t.nombre_completo)', '.map((t: any) => t.nombre_completo)'],
  ['.find((nCert) =>', '.find((nCert: any) =>'],
  ['.some((nEsc) =>', '.some((nEsc: any) =>'],
];

let cambios = 0;
for (const [viejo, nuevo] of reemplazos) {
  if (c.includes(viejo)) {
    c = c.split(viejo).join(nuevo);
    cambios++;
  }
}

if (cambios === 0) {
  console.log('Sin cambios aplicados (ya estaba arreglado o no encontrado)');
  process.exit(0);
}

fs.writeFileSync(path, c);
console.log('OK: ' + cambios + ' reemplazos aplicados');
