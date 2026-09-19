const fs = require('fs');
let cambios = 0;

const path1 = 'src/types/case.types.ts';
let c1 = fs.readFileSync(path1, 'utf8');
const viejo1 = "  | 'propiedad_horizontal'\n  | 'otro';";
const nuevo1 = "  | 'propiedad_horizontal'\n  | 'otro'\n  | 'orip'\n  | 'notaria'\n  | 'titularidad';";
if (c1.includes(viejo1)) {
  c1 = c1.replace(viejo1, nuevo1);
  fs.writeFileSync(path1, c1);
  cambios++;
  console.log('OK: case.types.ts ampliado');
} else {
  console.log('SKIP: case.types.ts');
}

const path2 = 'src/utils/caseValidators.ts';
let c2 = fs.readFileSync(path2, 'utf8');
const viejo2 = "  'propiedad_horizontal',\n  'otro',\n]);";
const nuevo2 = "  'propiedad_horizontal',\n  'otro',\n  'orip',\n  'notaria',\n  'titularidad',\n]);";
if (c2.includes(viejo2)) {
  c2 = c2.replace(viejo2, nuevo2);
  fs.writeFileSync(path2, c2);
  cambios++;
  console.log('OK: caseValidators.ts ampliado');
} else {
  console.log('SKIP: caseValidators.ts');
}

console.log('Total cambios: ' + cambios);
