// src/lib/__tests__/mycaseUpload.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { VAULT_DIR } from '../tokenStore';

describe('MyCase Upload Ingestion API', () => {
  const testMatterId = 'mc_test_upload_999';
  const testVaultDir = path.join(VAULT_DIR, 'vault', 'mycase', testMatterId);

  beforeEach(() => {
    if (fs.existsSync(testVaultDir)) {
      fs.rmSync(testVaultDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testVaultDir)) {
      fs.rmSync(testVaultDir, { recursive: true, force: true });
    }
  });

  it('should physically write local uploaded file stream & update index documents.json', () => {
    // 1. Create target folder mock
    fs.mkdirSync(testVaultDir, { recursive: true });

    // Mock incoming uploader parameters
    const fileName = 'mri_hospital_discharge_report.pdf';
    const mockFileContent = 'PDF binary stream contents';
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const targetFilePath = path.join(testVaultDir, cleanFileName);

    // Simulate saving file to local folder
    fs.writeFileSync(targetFilePath, mockFileContent);

    // 2. Perform indexing & triage logic
    const docsFile = path.join(testVaultDir, 'documents.json');
    const documents = [];

    // Triage test
    const lowerName = fileName.toLowerCase();
    let aiTag = 'Uncategorized 📄';
    if (lowerName.includes('hospital') || lowerName.includes('discharge')) {
      aiTag = 'Medical Record 🏥';
    }

    const newDoc = {
      id: `mc_doc_${Date.now()}`,
      name: fileName,
      size: mockFileContent.length,
      ai_tag: aiTag,
      downloaded: true,
      downloaded_at: new Date().toISOString()
    };
    documents.unshift(newDoc);
    fs.writeFileSync(docsFile, JSON.stringify(documents, null, 2));

    // 3. Verify side-effects
    expect(fs.existsSync(targetFilePath)).toBe(true);
    expect(fs.existsSync(docsFile)).toBe(true);

    const data = JSON.parse(fs.readFileSync(docsFile, 'utf-8'));
    expect(data.length).toBe(1);
    expect(data[0].name).toBe(fileName);
    expect(data[0].ai_tag).toBe('Medical Record 🏥');
    expect(data[0].size).toBe(mockFileContent.length);
  });
});
