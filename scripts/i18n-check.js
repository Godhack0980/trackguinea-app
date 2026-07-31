const fs = require('fs');
const path = require('path');

const locales = ['fr', 'en', 'es', 'pt', 'ar', 'de', 'zh'];
const referenceLocale = 'fr';
const messagesDir = path.join(__dirname, '../src/messages');

console.log('=== TRANSCONNEKT INTERNATIONALIZATION VALIDATION ===');
console.log(`Reference locale: ${referenceLocale}`);
console.log(`Checking locales: ${locales.filter(l => l !== referenceLocale).join(', ')}\n`);

let hasErrors = false;

// 1. Read files of the reference locale
const referencePath = path.join(messagesDir, referenceLocale);
if (!fs.existsSync(referencePath)) {
  console.error(`Error: Reference locale directory not found: ${referencePath}`);
  process.exit(1);
}

const files = fs.readdirSync(referencePath).filter(f => f.endsWith('.json'));

files.forEach(file => {
  const refFilePath = path.join(referencePath, file);
  let refContent;
  try {
    refContent = JSON.parse(fs.readFileSync(refFilePath, 'utf8'));
  } catch (e) {
    console.error(`[ERROR] Reference file ${file} is not valid JSON:`, e.message);
    hasErrors = true;
    return;
  }

  const refKeys = Object.keys(refContent);

  // Compare against other locales
  locales.forEach(loc => {
    if (loc === referenceLocale) return;

    const targetFilePath = path.join(messagesDir, loc, file);
    if (!fs.existsSync(targetFilePath)) {
      console.warn(`[WARNING] File missing in locale '${loc}': ${file}`);
      return;
    }

    let targetContent;
    try {
      targetContent = JSON.parse(fs.readFileSync(targetFilePath, 'utf8'));
    } catch (e) {
      console.error(`[ERROR] File in locale '${loc}' ${file} is not valid JSON:`, e.message);
      hasErrors = true;
      return;
    }

    const targetKeys = Object.keys(targetContent);

    // Find missing keys
    const missingKeys = refKeys.filter(k => !targetKeys.includes(k));
    if (missingKeys.length > 0) {
      console.error(`[ERROR] Missing keys in locale '${loc}' for file '${file}':`);
      missingKeys.forEach(k => console.error(`  - ${k}`));
      hasErrors = true;
    }

    // Find orphan keys (keys present in target but not in reference)
    const orphanKeys = targetKeys.filter(k => !refKeys.includes(k));
    if (orphanKeys.length > 0) {
      console.warn(`[WARNING] Orphan keys (not in reference 'fr') in locale '${loc}' for file '${file}':`);
      orphanKeys.forEach(k => console.warn(`  - ${k}`));
    }
  });
});

console.log('\n====================================================');
if (hasErrors) {
  console.log('Validation finished: ERRORS FOUND. Please fix missing translation keys.');
  process.exit(1);
} else {
  console.log('Validation finished: SUCCESS. All locale files match the structure perfectly!');
  process.exit(0);
}
