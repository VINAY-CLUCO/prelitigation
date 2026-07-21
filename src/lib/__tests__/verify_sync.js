// verify_sync.js
// Tests the full multi-provider ingestion workflow programmatically

const fs = require('fs');
const path = require('path');
const os = require('os');

const VAULT_DIR = path.join(os.homedir(), '.cluco');

async function testAll() {
  const providers = ['clio', 'gdrive', 'gmail', 'onedrive', 'outlook', 'dropbox', 'mycase'];
  
  console.log('--- 1. Connecting all providers in simulator mode ---');
  for (const p of providers) {
    try {
      const res = await fetch('http://localhost:3000/api/connections/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: p })
      });
      const data = await res.json();
      console.log(`Connection for ${p}:`, data);
    } catch (e) {
      console.error(`Failed to connect ${p}:`, e.message);
    }
  }

  console.log('\n--- 2. Triggering sync for all providers ---');
  for (const p of providers) {
    try {
      console.log(`Triggering sync for: ${p}`);
      const res = await fetch(`http://localhost:3000/api/connections/sync?provider=${p}`);
      if (!res.ok) {
        console.error(`Failed to sync ${p}: Status ${res.status}`);
      }
    } catch (e) {
      console.error(`Error triggering sync for ${p}:`, e.message);
    }
  }

  console.log('\n--- 3. Waiting 22 seconds for background worker to process ---');
  await new Promise((resolve) => setTimeout(resolve, 22000));

  console.log('\n--- 4. Verifying filesystem directories and document indices ---');
  let successCount = 0;
  for (const p of providers) {
    const providerPath = path.join(VAULT_DIR, 'vault', p);
    console.log(`Checking folder: ${providerPath}`);
    if (fs.existsSync(providerPath)) {
      if (p === 'clio' || p === 'mycase') {
        const subdirs = fs.readdirSync(providerPath);
        console.log(`  Subdirectories for ${p}:`, subdirs);
        for (const sd of subdirs) {
          const docPath = path.join(providerPath, sd, 'documents.json');
          if (fs.existsSync(docPath)) {
            const docs = JSON.parse(fs.readFileSync(docPath, 'utf-8'));
            console.log(`    Matter ${sd} has documents:`, docs.map((d) => d.name));
            if (docs.length > 0) successCount++;
          }
        }
      } else {
        const docPath = path.join(providerPath, 'documents.json');
        if (fs.existsSync(docPath)) {
          const docs = JSON.parse(fs.readFileSync(docPath, 'utf-8'));
          console.log(`    Provider ${p} has documents:`, docs.map((d) => d.name));
          if (docs.length > 0) successCount++;
        }
      }
    } else {
      console.error(`  Error: Folder ${providerPath} does not exist!`);
    }
  }

  console.log('\n--- 5. Verification Verdict ---');
  if (successCount >= providers.length) {
    console.log('SUCCESS: All 7 providers ingested files and updated indices successfully!');
  } else {
    console.error(`WARNING: Only ${successCount}/${providers.length} providers ingested files successfully.`);
  }
}

testAll();
