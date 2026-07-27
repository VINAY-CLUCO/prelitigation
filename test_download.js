const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const tokens = JSON.parse(fs.readFileSync(path.join(process.env.USERPROFILE, '.cluco', 'tokens.json')));
const gdriveToken = tokens.gdrive.access_token;
const gmailToken = tokens.gmail.access_token;

async function testGDrive() {
    console.log('Testing GDrive Download...');
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: gdriveToken });
    const drive = google.drive({ version: 'v3', auth });
    
    try {
        const listRes = await drive.files.list({ pageSize: 1, fields: 'files(id, name, mimeType)' });
        if (listRes.data.files.length > 0) {
            const file = listRes.data.files[0];
            console.log('✅ Found GDrive file:', file.name);
            console.log('✅ GDrive API is working perfectly.');
        } else {
            console.log('✅ No GDrive files found, but API connection is working.');
        }
    } catch (err) {
        console.error('❌ GDrive Error:', err.message);
    }
}

async function testGmail() {
    console.log('\nTesting Gmail Download...');
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: gmailToken });
    const gmail = google.gmail({ version: 'v1', auth });
    
    try {
        const listRes = await gmail.users.messages.list({ userId: 'me', maxResults: 1 });
        if (listRes.data.messages && listRes.data.messages.length > 0) {
            const msgId = listRes.data.messages[0].id;
            const msgRes = await gmail.users.messages.get({ userId: 'me', id: msgId });
            console.log('✅ Found Gmail message snippet:', msgRes.data.snippet.substring(0, 50) + '...');
            console.log('✅ Gmail API is working perfectly.');
        } else {
            console.log('✅ No Gmail messages found, but API connection is working.');
        }
    } catch (err) {
        console.error('❌ Gmail Error:', err.message);
    }
}

async function main() {
    await testGDrive();
    await testGmail();
}

main();
