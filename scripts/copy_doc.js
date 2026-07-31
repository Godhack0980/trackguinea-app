const fs = require('fs');
const path = require('path');

const src = 'C:\\Users\\kesso tech\\.gemini\\antigravity\\scratch\\trackguinea-app\\TransConnekt_Documentation.html';
const dest1 = path.join(__dirname, 'public', 'docs', 'transconnekt_documentation.html');
const dest2 = path.join(__dirname, 'public', 'docs', 'TransConnekt_Documentation.html');

fs.mkdirSync(path.dirname(dest1), { recursive: true });
fs.copyFileSync(src, dest1);
fs.copyFileSync(src, dest2);

console.log('Successfully copied TransConnekt_Documentation.html to public/docs!');
