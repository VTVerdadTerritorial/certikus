const fs = require('fs');
let cambios = 0;

// FIX 1: case.types.ts
const path1 = 'src/types/case.types.ts';
let c1 = fs.readFileSync(path1, 'utf8');
const viejo1 = "| 'otro';";
const nuevo1 = "| 'otro'\r\n  | 'orip'\r\n  | 'notaria'\r\n  | 'titularidad';";
if (c1.includes(viejo1)) {
  c1 = c1.replace(viejo1, nuevo1);
  fs.writeFileSync(path1, c1);
  cambios++;
  console.log('OK: case.types.ts ampliado');
} else {
  console.log('SKIP: case.types.ts');
}

// FIX 2: caseValidators.ts
const path2 = 'src/utils/caseValidators.ts';
let c2 = fs.readFileSync(path2, 'utf8');
const viejo2 = "'otro',\r\n]);";
const nuevo2 = "'otro',\r\n  'orip',\r\n  'notaria',\r\n  'titularidad',\r\n]);";
if (c2.includes(viejo2)) {
  c2 = c2.replace(viejo2, nuevo2);
  fs.writeFileSync(path2, c2);
  cambios++;
  console.log('OK: caseValidators.ts ampliado');
} else {
  console.log('SKIP: caseValidators.ts');
}

console.log('Total cambios: ' + cambios);
