import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
writeFileSync('dist-react/package.json', JSON.stringify({ name: '@sekura/react', version, type: 'module', sideEffects: false, exports: { '.': { types: './index.d.ts', import: './index.js' } }, peerDependencies: { react: '>=18 <20' }, files: ['index.js', 'index.d.ts', 'README.md', 'LICENSE'] }, null, 2) + '\n');
copyFileSync('src/react/README.md', 'dist-react/README.md');
copyFileSync('LICENSE', 'dist-react/LICENSE');
console.log(`Built @sekura/react ${version}: Button, TextField, Textarea, Select, Checkbox, Switch`);
