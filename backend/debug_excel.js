
import * as xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';

const filePath = 'd:/Faisal/laragon/www/skripsi/Template_Soal_Exam.xlsx';

console.log("Reading file from:", filePath);

if (!fs.existsSync(filePath)) {
    console.error("File not found!");
    process.exit(1);
}

const fileBuffer = fs.readFileSync(filePath);
const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
console.log("Sheet Name:", sheetName);

const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }); // Get as array of arrays first to see headers

console.log("Row 0 (Headers):", JSON.stringify(data[0]));
console.log("Row 1 (Data):", JSON.stringify(data[1]));

const jsonData = xlsx.utils.sheet_to_json(sheet);
console.log("JSON parsed row 0 keys:", Object.keys(jsonData[0] || {}));
//jelaskan