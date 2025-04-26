const functions = require('@google-cloud/functions-framework');
const { google } = require('googleapis');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const SPREADSHEET_ID = '175En4kZ7OoR52jmg_AABZB0h7ag7n48kS-dkxuMCWxo';
const secretClient = new SecretManagerServiceClient();

async function getKey() {
  const [version] = await secretClient.accessSecretVersion({
    name: 'projects/key-line-454113-g0/secrets/authenticate-bidder-key/versions/latest',
  });
  return JSON.parse(version.payload.data.toString());
}

functions.http('getBidData', async (req, res) => {
  res.set('Access-Control-Allow-Origin', 'https://www.freight-ebidding.com');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method === 'GET') {
    try {
      const credentials = await getKey();
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      const client = await auth.getClient();
      const sheets = google.sheets({ version: 'v4', auth: client });

      // Assuming bids are in a "Bids" sheet, columns: bidderId, jobCode, bidValue
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Bids!A2:C', // Adjust range based on your sheet
      });

      const rows = response.data.values || [];
      const bids = rows.map(row => ({
        bidderId: row[0] || '',
        jobCode: row[1] || '',
        bidValue: parseFloat(row[2]) || 0
      }));

      return res.status(200).json({ bids });
    } catch (error) {
      console.error('Error fetching bid data:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
});