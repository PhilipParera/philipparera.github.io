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
  const allowedOrigins = ['https://www.freight-ebidding.com', 'https://freight-ebidding.com'];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  } else {
    res.set('Access-Control-Allow-Origin', 'https://freight-ebidding.com');
  }

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

      // Fetch from IDJIRST_Flow
      const response1 = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'IDJIRST_Flow!B2:D',
      });

      // Fetch from IDPIPCI_Flow
      const response2 = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'IDPIPCI_Flow!B2:D',
      });

      const rows1 = response1.data.values || [];
      const rows2 = response2.data.values || [];
      const allRows = [...rows1, ...rows2];

      const bids = allRows.map(row => ({
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