const fs = require('fs');
const path = require('path');

const directories = ['./src', './public'];
const files = ['./package.json', './next.config.js', './next.config.mjs', './README.md', './tailwind.config.js'];

function walk(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walk(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

const replacements = [
    { from: /TrackGuinea/g, to: 'TransConnekt' },
    { from: /trackguinea/g, to: 'transconnekt' },
    { from: /Tracguinea/g, to: 'TransConnekt' },
    { from: /tracguinea/g, to: 'transconnekt' }
];

function processFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    let newContent = content;
    
    for (const r of replacements) {
        if (r.from.test(newContent)) {
            newContent = newContent.replace(r.from, r.to);
            changed = true;
        }
    }
    
    if (changed) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Replaced brand in: ${filePath}`);
    }
}

// Process directories
directories.forEach(dir => walk(dir, processFile));

// Process files
files.forEach(processFile);
console.log("Branding replacement completed successfully!");
