const functions = require('@google-cloud/functions-framework');
const { google } = require('googleapis');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const jwt = require('jsonwebtoken');

const SPREADSHEET_ID = '175En4kZ7OoR52jmg_AABZB0h7ag7n48kS-dkxuMCWxo';
const secretClient = new SecretManagerServiceClient();

async function getKey() {
  const [version] = await secretClient.accessSecretVersion({
    name: 'projects/key-line-454113-g0/secrets/authenticate-bidder-key/versions/latest',
  });
  return JSON.parse(version.payload.data.toString());
}

async function getJwtSecret() {
  try {
    const [version] = await secretClient.accessSecretVersion({
      name: 'projects/key-line-454113-g0/secrets/jwt-secret/versions/latest',
    });
    return version.payload.data.toString();
  } catch (error) {
    console.error('Error fetching JWT secret:', error.message);
    throw error;
  }
}

functions.http('getBidData', async (req, res) => {
  res.set('Access-Control-Allow-Origin', 'https://www.freight-ebidding.com');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method === 'GET') {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }
    const authParts = authHeader.split(' ');
    if (authParts.length !== 2 || authParts[0] !== 'Bearer') {
      return res.status(401).json({ error: 'Invalid authorization header' });
    }
    const token = authParts[1];
    try {
      const jwtSecret = await getJwtSecret();
      jwt.verify(token, jwtSecret);
    } catch (err) {
      console.error('JWT verification failed:', err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

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