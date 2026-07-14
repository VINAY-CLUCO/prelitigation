const markdownpdf = require("markdown-pdf");
const fs = require("fs");

const mdPath = "C:\\Users\\vinay\\.gemini\\antigravity\\brain\\e5379b86-f5b0-4fd3-b5e3-6de6628d3219\\Executive_Summary.md";
const pdfPath = "C:\\Users\\vinay\\.gemini\\antigravity\\brain\\e5379b86-f5b0-4fd3-b5e3-6de6628d3219\\Cluco_Phase1_Report.pdf";

markdownpdf()
  .from(mdPath)
  .to(pdfPath, () => {
    console.log("PDF successfully generated at " + pdfPath);
  });
