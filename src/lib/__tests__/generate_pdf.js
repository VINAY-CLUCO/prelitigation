// generate_pdf.js
// Converts markdown documents to PDF using markdown-pdf package

const fs = require('fs');
const path = require('path');
const markdownpdf = require('markdown-pdf');

const files = [
  {
    md: 'C:\\Users\\vinay\\.gemini\\antigravity\\brain\\3f7ecdb0-d5df-445a-9b3c-10158b965eeb\\clio_integration_architecture.md',
    pdf: 'C:\\Users\\vinay\\.gemini\\antigravity\\brain\\3f7ecdb0-d5df-445a-9b3c-10158b965eeb\\clio_integration_architecture.pdf'
  },
  {
    md: 'C:\\Users\\vinay\\.gemini\\antigravity\\brain\\3f7ecdb0-d5df-445a-9b3c-10158b965eeb\\pitch.md',
    pdf: 'C:\\Users\\vinay\\.gemini\\antigravity\\brain\\3f7ecdb0-d5df-445a-9b3c-10158b965eeb\\pitch.pdf'
  },
  {
    md: 'C:\\Users\\vinay\\.gemini\\antigravity\\brain\\3f7ecdb0-d5df-445a-9b3c-10158b965eeb\\perfect_pitch.md',
    pdf: 'C:\\Users\\vinay\\.gemini\\antigravity\\brain\\3f7ecdb0-d5df-445a-9b3c-10158b965eeb\\perfect_pitch.pdf'
  }
];

function compileFile(index) {
  if (index >= files.length) {
    console.log('All PDFs compiled successfully!');
    return;
  }

  const { md, pdf } = files[index];
  console.log('Compiling:', md);

  if (!fs.existsSync(md)) {
    console.error('Source markdown file missing:', md);
    compileFile(index + 1);
    return;
  }

  markdownpdf().from(md).to(pdf, function () {
    console.log('Success! Created:', pdf);
    compileFile(index + 1);
  });
}

compileFile(0);
