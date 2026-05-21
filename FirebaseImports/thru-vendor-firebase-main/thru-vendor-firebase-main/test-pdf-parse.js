const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
console.log('Is pdfParse a function?', typeof pdfParse === 'function');
console.log('pdfParse.default type:', typeof pdfParse.default);
console.log('Resolved path:', require.resolve('pdf-parse'));


async function testPdfParse() {
  try {
    console.log('Creating dummy PDF buffer...');
    // Create a minimal valid PDF buffer (empty page)
    const pdfData = `%PDF-1.7
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << >> /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
trailer
<< /Size 4 /Root 1 0 R >>
startxref
223
%%EOF`;
    const buffer = Buffer.from(pdfData);

    console.log('Parsing PDF...');
    const data = await pdfParse(buffer);
    console.log('PDF Parsed Successfully!');
    console.log('Text content:', data.text);
    console.log('Info:', data.info);
  } catch (error) {
    console.error('Error parsing PDF:', error);
  }
}

testPdfParse();
