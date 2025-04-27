const functions = require('@google-cloud/functions-framework');
const { google } = require('googleapis');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const jwt = require('jsonwebtoken');
const sheets = google.sheets('v4');

const SPREADSHEET_ID = '175En4kZ7OoR52jmg_AABZB0h7ag7n48kS-dkxuMCWxo';

const secretClient = new SecretManagerServiceClient();

async function getKey() {
  try {
    const [version] = await secretClient.accessSecretVersion({
      name: 'projects/key-line-454113-g0/secrets/authenticate-bidder-key/versions/latest',
    });
    const secretData = version.payload.data.toString();
    const credentials = JSON.parse(secretData);
    return credentials;
  } catch (error) {
    throw error;
  }
}

async function getJwtSecret() {
  try {
    const [version] = await secretClient.accessSecretVersion({
      name: 'projects/key-line-454113-g0/secrets/jwt-secret/versions/latest',
    });
    return version.payload.data.toString();
  } catch (error) {
    throw error;
  }
}

functions.http('getShipmentCodes', async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*'); // Changed for local testing
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ error: 'No authorization token provided' });
  }
  const authParts = authHeader.split(' ');
  if (authParts.length !== 2 || authParts[0] !== 'Bearer') {
    return res.status(401).send({ error: 'Invalid authorization header' });
  }
  const token = authParts[1];
  try {
    const jwtSecret = await getJwtSecret();
    jwt.verify(token, jwtSecret);
  } catch (err) {
    return res.status(403).send({ error: 'Invalid or expired token' });
  }

  try {
    const credentials = await getKey();
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const client = await auth.getClient();
    const sheetName = req.query.sheet || 'Active';
    if (!['Active', 'Closed'].includes(sheetName)) {
      return res.status(400).send({ error: 'Invalid sheet name' });
    }
    const RANGE = `${sheetName}!A2:V`;
    const response = await sheets.spreadsheets.values.get({
      auth: client,
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });
    const rows = response.data.values || [];
    const shipments = rows.map(row => ({
      shipmentCode: row[0] || '',
      openingDate: row[1] || '',
      closingDate: row[2] || '',
      target: row[6] || '',
      winningBidValue: row[7] || '', // Added winning bid value from column H
      firstId: row[9] || '',
      secondId: row[10] || '',
      vendorDivision: row[15] || '',
      freightMethod: row[16] || '',
      incoterm: row[17] || '',
      pol: row[18] || '',
      gwKg: row[19] || '',
      volCbm: row[20] || '',
      shipperAddress: row[21] || ''
    }));
    return res.status(200).send({ shipments });
  } catch (error) {
    return res.status(500).send({
      error: 'Internal server error',
    });
  }
});