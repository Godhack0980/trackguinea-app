'use server';

// Polyfill DOMMatrix for PDFJS in Node.js/SSR environments to prevent loading reference errors
if (typeof global !== 'undefined' && !(global as any).DOMMatrix) {
  (global as any).DOMMatrix = class DOMMatrix {
    constructor() {}
  };
}

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import Tesseract from 'tesseract.js';

// Dynamically require pdf-parse on the server side
const pdfParse = require('pdf-parse');

const VerifyDocumentOutputSchema = z.object({
  isValid: z.boolean().describe("true si le document est du bon type, appartient à la bonne personne et n'est pas expiré."),
  extractedType: z.string().describe("Le type de document extrait du document."),
  docNumber: z.string().optional().describe("Le numéro officiel extrait du document."),
  issueDateStr: z.string().optional().describe("La date d'émission au format AAAA-MM-JJ."),
  expiryDateStr: z.string().optional().describe("La date d'expiration au format AAAA-MM-JJ."),
  rejectionReason: z.string().optional().describe("La raison du rejet si isValid est false."),
  confidence: z.number().optional().describe("Le score de confiance de 0 à 100."),
  warnings: z.array(z.string()).optional().describe("Liste des alertes ou problèmes détectés."),
});

const docTypes = {
  identityCard: "Carte d'identité",
  license: "Permis de conduire",
  insurance: "Assurance véhicule",
  carteGrise: "Carte grise",
  technicalVisit: "Attestation de visite technique",
};

async function runOCR(buffer: Buffer): Promise<string> {
  const path = require('path');
  const workerPath = path.join(process.cwd(), 'node_modules/tesseract.js/src/worker-script/node/index.js');
  
  const worker = await Tesseract.createWorker('fra+eng', 1, {
    workerPath: workerPath,
    langPath: process.cwd(),
    gzip: false,
  });
  
  try {
    const { data: { text } } = await worker.recognize(buffer);
    return text;
  } finally {
    await worker.terminate();
  }
}

async function extractText(buffer: Buffer, contentType: string): Promise<string> {
  if (contentType === 'application/pdf') {
    try {
      const data = await pdfParse(buffer);
      return data.text || '';
    } catch (e) {
      console.warn("pdf-parse failed, falling back to Tesseract OCR:", e);
      return runOCR(buffer);
    }
  } else {
    return runOCR(buffer);
  }
}

function levenshtein(a: string, b: string): number {
  const tmp: number[][] = [];
  let i, j;
  for (i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (i = 1; i <= a.length; i++) {
    for (j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
}

function hasFuzzyKeyword(normalizedText: string, keyword: string, maxDistance = 2): boolean {
  if (normalizedText.includes(keyword)) return true;
  const words = normalizedText.split(/[^a-z0-9]/).filter(w => w.length >= 3);
  for (const word of words) {
    if (Math.abs(word.length - keyword.length) <= 2) {
      const dist = levenshtein(word, keyword);
      if (dist <= maxDistance) return true;
    }
  }
  return false;
}

function isTextGuinean(normalizedText: string): boolean {
  return hasFuzzyKeyword(normalizedText, "guinee") || 
         hasFuzzyKeyword(normalizedText, "republique") || 
         normalizedText.includes("gin") ||
         hasFuzzyKeyword(normalizedText, "conakry") ||
         hasFuzzyKeyword(normalizedText, "cedeao") ||
         hasFuzzyKeyword(normalizedText, "ecowas") ||
         hasFuzzyKeyword(normalizedText, "kindia") ||
         hasFuzzyKeyword(normalizedText, "labe") ||
         hasFuzzyKeyword(normalizedText, "kankan") ||
         hasFuzzyKeyword(normalizedText, "mamou") ||
         hasFuzzyKeyword(normalizedText, "boke");
}

function verifyNameMatch(text: string, expectedFirstName: string, expectedLastName: string): { match: boolean; warnings: string[] } {
  const cleanStr = (s: string) => s.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Replace MRZ separators with space to ensure names like LOUA<<PIERRE<DAN get separated
  const cleanedText = text.replace(/<+/g, " ");
  const cleanText = cleanStr(cleanedText);
  const textWords = cleanText.split(/\s+/).filter(w => w.length > 0);

  const firstWords = cleanStr(expectedFirstName).split(/\s+/).filter(w => w.length > 0);
  const lastWords = cleanStr(expectedLastName).split(/\s+/).filter(w => w.length > 0);
  
  const warnings: string[] = [];

  // Helper to check if a word matches any word in the text (exact or fuzzy)
  const isWordInText = (word: string) => {
    if (cleanText.includes(word)) return true;
    
    // Levenshtein fuzzy match
    for (const extWord of textWords) {
      if (extWord === word) return true;
      const dist = levenshtein(word, extWord);
      if (word.length <= 3 && dist === 0) return true;
      if (word.length > 3 && word.length <= 5 && dist <= 1) return true;
      if (word.length > 5 && dist <= 2) return true;
    }
    return false;
  };

  // We require at least one word from the first name and one from the last name to match
  let firstMatch = false;
  for (const w of firstWords) {
    if (isWordInText(w)) {
      firstMatch = true;
      break;
    }
  }

  let lastMatch = false;
  for (const w of lastWords) {
    if (isWordInText(w)) {
      lastMatch = true;
      break;
    }
  }

  const nameMatch = firstMatch && lastMatch;

  if (!nameMatch) {
    if (!firstMatch) {
      warnings.push(`Le prénom '${expectedFirstName}' n'a pas été détecté sur la pièce.`);
    }
    if (!lastMatch) {
      warnings.push(`Le nom de famille '${expectedLastName}' n'a pas été détecté sur la pièce.`);
    }
  }

  return { match: nameMatch, warnings };
}

function extractMRZData(text: string): { dob?: string; expiry?: string; idNumber?: string; passportNumber?: string; nationality?: string } {
  const result: { dob?: string; expiry?: string; idNumber?: string; passportNumber?: string; nationality?: string } = {};
  const lines = text.split('\n');
  
  for (let line of lines) {
    const cleanLine = line.replace(/[\s\t\r\n]+/g, '').trim();
    
    // 1. Look for Date of Birth & Expiry Date in MRZ Line 2
    // Pattern: 6 digits (DOB), 1 check digit, M/F/<, 6 digits (Expiry), 1 check digit
    // e.g. 9907272M2903219...
    const dateMatch = cleanLine.match(/(\d{6})[0-9]?[MF<](\d{6})/i);
    if (dateMatch) {
      const dobStr = dateMatch[1];
      const expStr = dateMatch[2];
      
      // Parse DOB (YYMMDD)
      const dobYY = parseInt(dobStr.substring(0, 2));
      const dobMM = dobStr.substring(2, 4);
      const dobDD = dobStr.substring(4, 6);
      let dobYear = 2000 + dobYY;
      if (dobYear > new Date().getFullYear()) {
        dobYear = 1900 + dobYY;
      }
      result.dob = `${dobYear}-${dobMM}-${dobDD}`;

      // Parse Expiry (YYMMDD)
      const expYY = parseInt(expStr.substring(0, 2));
      const expMM = expStr.substring(2, 4);
      const expDD = expStr.substring(4, 6);
      const expYear = 2000 + expYY;
      result.expiry = `${expYear}-${expMM}-${expDD}`;
    }

    // 2. Look for ECOWAS ID card number in MRZ Line 1
    // Pattern: GIN followed by 9 digits, <, 7 digits
    // e.g. I<GIN212307241<02300146
    const idMatch = cleanLine.match(/GIN(\d{9})<(\d{7})/i);
    if (idMatch) {
      result.idNumber = (idMatch[1] + idMatch[2]).substring(0, 16);
    }

    // 3. Look for Passport number in MRZ Line 2 (Tesseract might read GIN as 6IN, etc.)
    const passMrzMatch = cleanLine.match(/^([A-Z0-9]{9})\d[A-Z0-9<]{3}\d{5,6}/i);
    if (passMrzMatch) {
      let pNum = passMrzMatch[1].toUpperCase();
      if (pNum.length === 9 && pNum[0] === '0') {
        pNum = 'O' + pNum.slice(1);
      }
      result.passportNumber = pNum;
    }

    // 4. Look for Nationality / Country Code right before the DOB in MRZ Line 2
    // Pattern: 3 letters country code followed by 6 digits DOB, check digit, sex
    const countryMatch = cleanLine.match(/([A-Z0-9<]{3})\d{6}[0-9]?[MF<]/i);
    if (countryMatch) {
      const code = countryMatch[1].toUpperCase().replace(/6/g, 'G'); // Correct OCR 6IN to GIN
      if (code === 'GIN' || code === 'G|N') {
        result.nationality = "Guinéenne";
      } else {
        result.nationality = code;
      }
    }
  }

  return result;
}

function extractAllDates(text: string): { pastDates: string[]; futureDates: string[] } {
  const dateRegex = /\b(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})\b/g;
  const matches = [...text.matchAll(dateRegex)];
  const pastDates: string[] = [];
  const futureDates: string[] = [];
  
  const monthsRegex = /(janv|jan|fevr|févr|feb|mars|mar|avr|apr|mai|may|juin|jun|juil|jul|aout|août|aug|sept|sep|oct|nov|dec)/gi;
  const monthDateRegex = new RegExp(`\\b(\\d{1,2})\\s*${monthsRegex.source}(?:\\s*\\/\\s*[a-z]+)?\\s*(\\d{2,4})\\b`, 'gi');
  const monthMatches = [...text.matchAll(monthDateRegex)];
  
  const parsedDatesList: string[] = [];

  const addDate = (day: number, month: number, year: number) => {
    let fullYear = year;
    if (fullYear < 100) {
      fullYear += 2000;
    }
    if (fullYear > 1900 && fullYear < 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const dateStr = `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (!parsedDatesList.includes(dateStr)) {
        parsedDatesList.push(dateStr);
      }
    }
  };

  for (const m of matches) {
    addDate(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]));
  }

  for (const m of monthMatches) {
    const day = parseInt(m[1]);
    const monthStr = m[2].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const year = parseInt(m[3]);

    let month = 0;
    if (monthStr.startsWith('jan')) month = 1;
    else if (monthStr.startsWith('fev') || monthStr.startsWith('feb')) month = 2;
    else if (monthStr.startsWith('mar')) month = 3;
    else if (monthStr.startsWith('avr') || monthStr.startsWith('apr')) month = 4;
    else if (monthStr.startsWith('mai') || monthStr.startsWith('may')) month = 5;
    else if (monthStr.startsWith('jui') && monthStr.includes('n')) month = 6;
    else if (monthStr.startsWith('jui') || monthStr.startsWith('jul')) month = 7;
    else if (monthStr.startsWith('aou') || monthStr.startsWith('aug')) month = 8;
    else if (monthStr.startsWith('sep')) month = 9;
    else if (monthStr.startsWith('oct')) month = 10;
    else if (monthStr.startsWith('nov')) month = 11;
    else if (monthStr.startsWith('dec')) month = 12;

    addDate(day, month, year);
  }

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  for (const d of parsedDatesList) {
    if (d >= todayStr) {
      futureDates.push(d);
    } else {
      pastDates.push(d);
    }
  }

  futureDates.sort();
  pastDates.sort((a, b) => b.localeCompare(a));

  return { pastDates, futureDates };
}

function isDateExpired(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return date < new Date();
}

// Strip letters from extracted number — Guinean doc numbers are digits-only, except passport which starts with 'O'
function stripLettersFromNumber(num: string, keepO = false): string {
  if (keepO) {
    return num.replace(/[^0-9oO]/g, '').toUpperCase();
  }
  return num.replace(/[^0-9]/g, '');
}

// Enforce digit limits for Guinean document types:
// Passport: exactly 15 digits OR 9 characters starting with 'O'
// Identity Card (CEDEAO): exactly 16 digits
// Returns null if the number fails the strict check for that sub-type
function enforceDocNumberRules(
  rawNum: string,
  subType: 'passport' | 'identityCard' | null
): { num: string; rejection?: string } {
  const keepO = subType === 'passport';
  const cleanNum = stripLettersFromNumber(rawNum, keepO);

  if (subType === 'passport') {
    // If it's a 9-character passport number (should start with O)
    if (cleanNum.length === 9) {
      if (cleanNum[0] !== 'O') {
        return { num: '', rejection: "Le numéro de passeport à 9 caractères doit commencer par la lettre O." };
      }
      return { num: cleanNum };
    }
    // Else, verify 15-digit format (NIN)
    const digitsOnly = cleanNum.replace(/[^0-9]/g, '');
    if (digitsOnly.length === 15) {
      return { num: digitsOnly };
    }
    if (digitsOnly.length === 17) {
      return { num: digitsOnly.slice(0, 15) };
    }
    if (digitsOnly.length > 17) {
      return { num: '', rejection: `Le numéro de passeport extrait (${digitsOnly.length} chiffres) dépasse la limite autorisée de 15 chiffres.` };
    }
    if (digitsOnly.length === 16) {
      return { num: '', rejection: `Un numéro de 16 chiffres a été extrait — un passeport guinéen comporte 15 chiffres.` };
    }
    return { num: cleanNum };
  }
  
  if (subType === 'identityCard') {
    if (cleanNum.length > 16) {
      return { num: cleanNum.slice(0, 16) };
    }
    return { num: cleanNum };
  }
  // No strict limit for other types
  return { num: cleanNum };
}

function extractDocumentNumber(
  text: string, 
  docKey: string, 
  mrzIdNumber?: string, 
  subType?: 'passport' | 'identityCard' | null,
  mrzPassportNumber?: string,
  enteredDocNumber?: string
): { num: string; rejection?: string } {
  const cleanText = text.replace(/<+/g, " ").replace(/[\s\t\n]+/g, " ").trim();

  let rawNum = '';
  
  if (docKey === 'identityCard') {
    // 1. Prioritize user entered number if it matches the OCR text fuzzy/exact (normalize O and 0)
    if (enteredDocNumber) {
      const cleanEntered = enteredDocNumber.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const cleanEnteredNorm = cleanEntered.replace(/O/g, "0");
      const cleanOCRText = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const cleanOCRTextNorm = cleanOCRText.replace(/O/g, "0");
      if (cleanOCRTextNorm.includes(cleanEnteredNorm)) {
        rawNum = enteredDocNumber;
      }
    }

    // 2. Fallback to MRZ Passport number
    if (!rawNum && mrzPassportNumber) {
      let pNum = mrzPassportNumber;
      if (pNum.length === 9 && pNum[0] === '0') {
        pNum = 'O' + pNum.slice(1);
      }
      rawNum = pNum;
    }

    // 3. Fallback to MRZ ID number
    if (!rawNum && mrzIdNumber) {
      rawNum = mrzIdNumber;
    }

    if (!rawNum) {
      // For passport subtype, look for 9-character code or 15-digit sequence first
      if (subType === 'passport') {
        const cleanNoSpaces = cleanText.replace(/\s+/g, '').toUpperCase();
        // Look for 9 characters starting with O or 0 followed by 8 digits
        const pass9Match = cleanNoSpaces.match(/\b[O0]\d{8}\b/) || cleanNoSpaces.match(/[O0]\d{8}/);
        if (pass9Match) {
          let pNum = pass9Match[0];
          if (pNum[0] === '0') pNum = 'O' + pNum.slice(1);
          rawNum = pNum;
        }

        if (!rawNum) {
          const passMatch = cleanText.replace(/\s+/g, '').match(/\d{15}/);
          if (passMatch) rawNum = passMatch[0];
        }
      }

      if (!rawNum) {
        // CEDEAO ID card: 16 digits
        const ecowasMatch = cleanText.replace(/\s+/g, "").match(/\d{16}/);
        if (ecowasMatch) rawNum = ecowasMatch[0];
      }

      if (!rawNum) {
        // Fallback: 15-digit NIN
        const ninMatch = cleanText.replace(/\s+/g, "").match(/\d{15}/);
        if (ninMatch) rawNum = ninMatch[0];
      }

      if (!rawNum) {
        // MRZ personal number fallback
        const mrzPersonalMatch = cleanText.replace(/\s+/g, "").match(/[MF<]\d{7}(\d{14,16})/i);
        if (mrzPersonalMatch) rawNum = mrzPersonalMatch[1];
      }

      if (!rawNum) {
        const embeddedMatch = cleanText.match(/\d{14,17}/);
        if (embeddedMatch) rawNum = embeddedMatch[0];
      }
    }
  } else if (docKey === 'license') {
    // PC Number: 11 digits
    const matches = cleanText.match(/\b\d{11}\b/g);
    if (matches && matches.length > 0) rawNum = matches[0];
    if (!rawNum) {
      const fallbackPc = cleanText.match(/\d{10,12}/);
      if (fallbackPc) rawNum = fallbackPc[0];
    }
  } else if (docKey === 'carteGrise') {
    // Immatriculation plate — keep letters for carte grise (format: XX0000XX)
    const immatRegex = /\b[A-Z]{2}\s*\d{3,4}\s*[A-Z]{1,2}\b/i;
    const immatMatch = cleanText.match(immatRegex);
    if (immatMatch) return { num: immatMatch[0].toUpperCase().replace(/\s+/g, "") };
    const cgRegex = /\b[A-Z]{2}\s*\d{6,10}\b/i;
    const cgMatch = cleanText.match(cgRegex);
    if (cgMatch) return { num: cgMatch[0].toUpperCase().replace(/\s+/g, "") };
    const labels = ["immatriculation", "carte grise", "n ci"];
    for (const label of labels) {
      const idx = cleanText.toLowerCase().indexOf(label);
      if (idx !== -1) {
        const sub = cleanText.substring(idx + label.length, idx + label.length + 20).trim();
        const words = sub.split(/\s+/);
        if (words.length > 0 && words[0].length >= 5) return { num: words[0].toUpperCase() };
      }
    }
  } else {
    const fallbackMatch = cleanText.match(/\b\d{8,12}\b/);
    if (fallbackMatch) rawNum = fallbackMatch[0];
  }

  if (!rawNum) return { num: '' };

  return enforceDocNumberRules(rawNum, subType ?? null);
}

export async function verifyDocument(input: {
  url: string;
  docKey: 'identityCard' | 'license' | 'insurance' | 'carteGrise' | 'technicalVisit';
  // Sub-type for identity card: 'passport' or 'identityCard'
  selectedDocSubType?: 'passport' | 'identityCard' | null;
  expectedFirstName: string;
  expectedLastName: string;
  enteredDocNumber?: string;
}) {
  const { url, docKey, expectedFirstName, expectedLastName, selectedDocSubType, enteredDocNumber } = input;
  const docTypeLabel = docTypes[docKey] || "Document";
  
  try {
    if (!url) {
      throw new Error("URL du document manquante");
    }

    let contentType = 'image/jpeg';
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('.pdf')) {
      contentType = 'application/pdf';
    } else if (lowerUrl.includes('.png')) {
      contentType = 'image/png';
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Impossible de télécharger le document: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const checkTextValidity = (txt: string, normTxt: string) => {
      const mrz = extractMRZData(txt);
      const { match: namesMatched } = verifyNameMatch(txt, expectedFirstName, expectedLastName);
      
      const hasCtx = isTextGuinean(normTxt);
      if (!hasCtx) return false;
      
      const { pastDates, futureDates } = extractAllDates(txt);

      if (docKey === 'identityCard') {
        const hasIdKeywords = hasFuzzyKeyword(normTxt, "republique") || 
                              hasFuzzyKeyword(normTxt, "guinee") || 
                              hasFuzzyKeyword(normTxt, "identite") || 
                              hasFuzzyKeyword(normTxt, "passport") || 
                              hasFuzzyKeyword(normTxt, "passeport") || 
                              hasFuzzyKeyword(normTxt, "cedeao") ||
                              normTxt.includes("nin") ||
                              /ppgin/i.test(normTxt) ||
                              /p[<|i]gin/i.test(normTxt) ||
                              /i[<|i]gin/i.test(normTxt);
        
        const { num: documentNumber } = extractDocumentNumber(txt, docKey, mrz.idNumber, selectedDocSubType, mrz.passportNumber, enteredDocNumber);
        
        let expiryDateStr = mrz.expiry || (futureDates.length > 0 ? futureDates[0] : null);
        const isExpired = isDateExpired(expiryDateStr);

        let docNumberMatch = true;
        if (enteredDocNumber && documentNumber) {
          const cleanEntered = enteredDocNumber.toUpperCase().replace(/[^A-Z0-9]/g, "");
          const cleanExtracted = documentNumber.toUpperCase().replace(/[^A-Z0-9]/g, "");
          const dist = levenshtein(cleanEntered, cleanExtracted);
          docNumberMatch = (cleanEntered === cleanExtracted) || (dist <= 2);
        }

        return namesMatched && hasIdKeywords && !!documentNumber && !isExpired && docNumberMatch;
      }
      
      // For other keys (license, insurance, etc.), check name and doc number extraction
      const { num: docNum } = extractDocumentNumber(txt, docKey, undefined, undefined, undefined, enteredDocNumber);
      return namesMatched && !!docNum;
    };

    let text = await extractText(buffer, contentType);
    let lowerText = text.toLowerCase();
    let normalizedText = lowerText.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Auto-rotation fallback for images if original orientation fails validation check
    if (!contentType.includes('pdf') && !checkTextValidity(text, normalizedText)) {
      console.log("OCR: Original orientation failed validation. Trying auto-rotation...");
      try {
        const Jimp = require('jimp');
        const rotations = [90, 180, 270];
        for (const angle of rotations) {
          console.log(`OCR: Rotating image by ${angle} degrees...`);
          const image = await Jimp.read(buffer);
          image.rotate(angle);
          const rotatedBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
          const rotatedText = await runOCR(rotatedBuffer);
          const rotatedNormalized = rotatedText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          
          if (checkTextValidity(rotatedText, rotatedNormalized)) {
            console.log(`OCR: Success! Valid text found at ${angle} degrees rotation.`);
            text = rotatedText;
            lowerText = rotatedText.toLowerCase();
            normalizedText = rotatedNormalized;
            break;
          }
        }
      } catch (rotError: any) {
        console.warn("OCR: Image auto-rotation failed:", rotError.message);
      }
    }

    // 1. Text visibility and legibility checks
    if (!text || text.trim().length < 40) {
      return {
        isValid: false,
        extractedType: docTypeLabel,
        rejectionReason: "L'image du document est trop floue, sombre ou le texte y est totalement invisible. Veuillez reprendre une photo bien nette sous un bon éclairage.",
        confidence: 10,
        warnings: ["Image floue ou texte illisible."],
      };
    }

    // Strict Guinean context check
    const hasGuineanContext = isTextGuinean(normalizedText);
                              
    if (!hasGuineanContext) {
      return {
        isValid: false,
        extractedType: docTypeLabel,
        rejectionReason: "Ce document n'est pas identifié comme un document officiel de la République de Guinée, ou le texte est illisible.",
        confidence: 15,
        warnings: ["Document non officiel ou illisible."],
      };
    }

    let isValid = false;
    let rejectionReason = "";
    const extractedData: any = {};
    const warnings: string[] = [];

    // Extract MRZ data if available
    const mrzData = extractMRZData(text);

    // Verify name match fuzzy
    const { match: nameMatch, warnings: nameWarnings } = verifyNameMatch(text, expectedFirstName, expectedLastName);
    warnings.push(...nameWarnings);

    // Extract all dates in past and future
    const { pastDates, futureDates } = extractAllDates(text);

    // Verify based on document key
    if (docKey === 'identityCard') {
      const hasIdKeywords = hasFuzzyKeyword(normalizedText, "republique") || 
                            hasFuzzyKeyword(normalizedText, "guinee") || 
                            hasFuzzyKeyword(normalizedText, "identite") || 
                            hasFuzzyKeyword(normalizedText, "passport") || 
                            hasFuzzyKeyword(normalizedText, "passeport") || 
                            hasFuzzyKeyword(normalizedText, "cedeao") ||
                            normalizedText.includes("nin") ||
                            /ppgin/i.test(normalizedText) ||
                            /p[<|i]gin/i.test(normalizedText) ||
                            /i[<|i]gin/i.test(normalizedText) ||
                            /cedeao/i.test(normalizedText);
                            
      // Validate that detected document type matches user's chosen sub-type
      const isPassportDoc = normalizedText.includes("passeport") || 
                            normalizedText.includes("passport") || 
                            hasFuzzyKeyword(normalizedText, "passeport") ||
                            hasFuzzyKeyword(normalizedText, "passport") ||
                            normalizedText.includes("p<gin") ||
                            /p[<|i]gin/i.test(normalizedText) ||
                            /ppgin/i.test(normalizedText);

      const isIdCardDoc = normalizedText.includes("identite") || 
                          normalizedText.includes("cedeao") || 
                          hasFuzzyKeyword(normalizedText, "identite") ||
                          hasFuzzyKeyword(normalizedText, "cedeao") ||
                          normalizedText.includes("i<gin") || 
                          normalizedText.includes("nin") ||
                          /i[<|i]gin/i.test(normalizedText);

      if (selectedDocSubType === 'passport' && !isPassportDoc && isIdCardDoc) {
        return {
          isValid: false,
          extractedType: docTypeLabel,
          rejectionReason: "Vous avez sélectionné 'Passeport' mais le document téléversé ressemble à une Carte Nationale d'Identité. Veuillez choisir le bon type de document.",
          confidence: 20,
          warnings: ["Type de document ne correspond pas à la sélection."],
        };
      }
      if (selectedDocSubType === 'identityCard' && !isIdCardDoc && isPassportDoc) {
        return {
          isValid: false,
          extractedType: docTypeLabel,
          rejectionReason: "Vous avez sélectionné 'Carte Nationale d'Identité' mais le document téléversé ressemble à un Passeport. Veuillez choisir le bon type de document.",
          confidence: 20,
          warnings: ["Type de document ne correspond pas à la sélection."],
        };
      }

      const { num: documentNumber, rejection: numRejection } = extractDocumentNumber(text, docKey, mrzData.idNumber, selectedDocSubType, mrzData.passportNumber, enteredDocNumber);

      if (numRejection) {
        return {
          isValid: false,
          extractedType: docTypeLabel,
          rejectionReason: numRejection,
          confidence: 20,
          warnings: [numRejection],
        };
      }
      
      // Determine expiry date
      let expiryDateStr = mrzData.expiry || (futureDates.length > 0 ? futureDates[0] : null);
      
      // Determine issue date (find the first past date that is after year 2000 to ignore birth dates)
      let issueDateStr = pastDates.find(d => parseInt(d.split('-')[0]) > 2000);
      
      // 5-year default validity logic if one of the dates is missing
      if (expiryDateStr && !issueDateStr) {
        const expDate = new Date(expiryDateStr);
        expDate.setFullYear(expDate.getFullYear() - 5);
        issueDateStr = expDate.toISOString().split('T')[0];
      } else if (!expiryDateStr && issueDateStr) {
        const issDate = new Date(issueDateStr);
        issDate.setFullYear(issDate.getFullYear() + 5);
        expiryDateStr = issDate.toISOString().split('T')[0];
      }
      
      const isExpired = isDateExpired(expiryDateStr);

      extractedData.docNumber = documentNumber;
      extractedData.expiryDateStr = expiryDateStr;
      extractedData.issueDateStr = issueDateStr || mrzData.dob;
      
      isValid = nameMatch && hasIdKeywords && !!documentNumber && !isExpired;

      if (!hasIdKeywords) {
        warnings.push("Le document ne semble pas être une pièce d'identité officielle.");
      }
      if (!documentNumber) {
        warnings.push("Numéro de pièce d'identité introuvable.");
      }
      if (isExpired) {
        warnings.push("La pièce d'identité est expirée.");
      }
    } 
    else if (docKey === 'license') {
      const hasLicenseKeywords = normalizedText.includes("permis") || 
                                 normalizedText.includes("conduire") || 
                                 normalizedText.includes("licence") || 
                                 normalizedText.includes("conduite") ||
                                 normalizedText.includes("pc");
                                 
      let expiryDateStr = futureDates.length > 0 ? futureDates[0] : null;
      let issueDateStr = pastDates.find(d => parseInt(d.split('-')[0]) > 2000);
      
      if (!expiryDateStr && issueDateStr) {
        const issueDate = new Date(issueDateStr);
        issueDate.setFullYear(issueDate.getFullYear() + 5);
        expiryDateStr = issueDate.toISOString().split('T')[0];
      } else if (expiryDateStr && !issueDateStr) {
        const expDate = new Date(expiryDateStr);
        expDate.setFullYear(expDate.getFullYear() - 5);
        issueDateStr = expDate.toISOString().split('T')[0];
      }
      
      const isExpired = isDateExpired(expiryDateStr);
      const { num: documentNumber } = extractDocumentNumber(text, docKey);

      extractedData.docNumber = documentNumber;
      extractedData.expiryDateStr = expiryDateStr;
      extractedData.issueDateStr = issueDateStr;
      
      isValid = nameMatch && hasLicenseKeywords && !!documentNumber && !isExpired;

      if (!hasLicenseKeywords) {
        warnings.push("Le document ne ressemble pas à un permis de conduire.");
      }
      if (!documentNumber) {
        warnings.push("Numéro de permis de conduire introuvable.");
      }
      if (isExpired) {
        warnings.push("Le permis de conduire est expiré.");
      }
      if (!expiryDateStr) {
        warnings.push("Date d'expiration introuvable.");
      }
    }
    else if (docKey === 'insurance') {
      const hasInsuranceKeywords = normalizedText.includes("assurance") || 
                                   normalizedText.includes("attestation") || 
                                   normalizedText.includes("police") || 
                                   normalizedText.includes("assure") ||
                                   normalizedText.includes("compagnie") ||
                                   normalizedText.includes("garantie");
                                   
      const expiryDateStr = futureDates.length > 0 ? futureDates[0] : null;
      const issueDateStr = pastDates.find(d => parseInt(d.split('-')[0]) > 2000);
      const isExpired = isDateExpired(expiryDateStr);
      const { num: documentNumber } = extractDocumentNumber(text, docKey);

      extractedData.docNumber = documentNumber;
      extractedData.expiryDateStr = expiryDateStr;
      extractedData.issueDateStr = issueDateStr;

      isValid = nameMatch && hasInsuranceKeywords && !!documentNumber && !isExpired;

      if (!hasInsuranceKeywords) {
        warnings.push("Le document ne semble pas être une attestation d'assurance.");
      }
      if (!documentNumber) {
        warnings.push("Numéro d'assurance introuvable.");
      }
      if (isExpired) {
        warnings.push("L'assurance est expirée.");
      }
      if (!expiryDateStr) {
        warnings.push("Date d'expiration introuvable.");
      }
    }
    else if (docKey === 'carteGrise') {
      const hasCgKeywords = normalizedText.includes("immatriculation") || 
                            normalizedText.includes("carte grise") || 
                            normalizedText.includes("certificat") || 
                            normalizedText.includes("vehicule") || 
                            normalizedText.includes("chassis") ||
                            normalizedText.includes("transports");
                            
      const { num: documentNumber } = extractDocumentNumber(text, docKey);
      let issueDateStr = pastDates.find(d => parseInt(d.split('-')[0]) > 2000);

      extractedData.docNumber = documentNumber;
      extractedData.issueDateStr = issueDateStr;

      isValid = nameMatch && hasCgKeywords && !!documentNumber;

      if (!hasCgKeywords) {
        warnings.push("Le document ne semble pas être une carte grise.");
      }
      if (!documentNumber) {
        warnings.push("Numéro d'immatriculation introuvable.");
      }
    }
    else if (docKey === 'technicalVisit') {
      const hasTechnicalKeywords = normalizedText.includes("technique") || 
                                   normalizedText.includes("visite") || 
                                   normalizedText.includes("attestation") || 
                                   normalizedText.includes("controle") || 
                                   normalizedText.includes("contrôle");
                                   
      const expiryDateStr = futureDates.length > 0 ? futureDates[0] : null;
      const issueDateStr = pastDates.find(d => parseInt(d.split('-')[0]) > 2000);
      const isExpired = isDateExpired(expiryDateStr);
      const { num: documentNumber } = extractDocumentNumber(text, docKey);

      extractedData.docNumber = documentNumber;
      extractedData.expiryDateStr = expiryDateStr;
      extractedData.issueDateStr = issueDateStr;

      isValid = nameMatch && hasTechnicalKeywords && !!documentNumber && !isExpired;

      if (!hasTechnicalKeywords) {
        warnings.push("Le document ne ressemble pas à une visite technique.");
      }
      if (!documentNumber) {
        warnings.push("Numéro de certificat introuvable.");
      }
      if (isExpired) {
        warnings.push("La visite technique est expirée.");
      }
      if (!expiryDateStr) {
        warnings.push("Date d'expiration introuvable.");
      }
    }

    let docNumberMatch = true;
    if (enteredDocNumber && extractedData.docNumber) {
      const cleanEntered = enteredDocNumber.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const cleanExtracted = extractedData.docNumber.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const dist = levenshtein(cleanEntered, cleanExtracted);
      docNumberMatch = (cleanEntered === cleanExtracted) || (dist <= 2);
      
      if (!docNumberMatch) {
        isValid = false;
        warnings.push(`Le numéro renseigné (${enteredDocNumber}) ne correspond pas au numéro détecté (${extractedData.docNumber}).`);
      }
    }

    // Confidence score calculation
    let confidence = 30;
    if (nameMatch) confidence += 40;
    if (extractedData.docNumber) confidence += 20;
    if (warnings.length === 0) confidence += 10;
    confidence = Math.min(100, confidence);

    if (!isValid) {
      if (!nameMatch) {
        rejectionReason = "Le nom et prénom figurant sur le document ne correspondent pas à ceux de votre profil.";
      } else if (!docNumberMatch) {
        rejectionReason = `Le numéro de document lu sur l'image (${extractedData.docNumber}) ne correspond pas au numéro (${enteredDocNumber}) que vous avez renseigné.`;
      } else if (warnings.some(w => w.includes("expiré"))) {
        rejectionReason = "Ce document est expiré. Veuillez fournir un document en cours de validité.";
      } else if (warnings.some(w => w.includes("introuvable"))) {
        rejectionReason = "Certaines informations obligatoires (numéro ou dates) n'ont pas pu être lues. L'image est peut-être floue ou coupée.";
      } else {
        rejectionReason = warnings.join(" | ") || "Le document est incomplet ou invalide.";
      }
    }

    return {
      isValid,
      extractedType: docTypeLabel,
      docNumber: extractedData.docNumber || "",
      issueDateStr: extractedData.issueDateStr || new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
      expiryDateStr: extractedData.expiryDateStr || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
      dobStr: mrzData.dob || null,
      nationality: mrzData.nationality || "Guinéenne",
      rejectionReason: isValid ? undefined : rejectionReason,
      confidence,
      warnings,
    };

  } catch (error: any) {
    console.error("Local OCR/Validation failed. Error:", error.message || error);
    return {
      isValid: false,
      extractedType: docTypeLabel,
      rejectionReason: "Une erreur est survenue lors de l'analyse automatique du document. Veuillez vous assurer que le fichier est bien lisible.",
      confidence: 10,
      warnings: [error.message || "Erreur interne de traitement"],
    };
  }
}
