const functions = require('@google-cloud/functions-framework');
const { google } = require('googleapis');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const jwt = require('jsonwebtoken');
const sheets = google.sheets('v4');

const SPREADSHEET_ID = '11coHdDHo0ZXYFVVNTBXUfklxXDFh3dACDhyv_L3shgQ';
const RANGE = 'Data!A2:A';

const secretClient = new SecretManagerServiceClient();

async function getKey() {
  console.log('Attempting to fetch secret...');
  try {
    const [version] = await secretClient.accessSecretVersion({
      name: 'projects/key-line-454113-g0/secrets/authenticate-bidder-key/versions/latest',
    });
    const secretData = version.payload.data.toString();
    const credentials = JSON.parse(secretData);
    console.log('Secret fetched successfully.');
    return credentials;
  } catch (error) {
    console.error('Error fetching or parsing secret:', error.message);
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
    console.error('Error fetching JWT secret:', error.message);
    throw error;
  }
}

functions.http('getShipmentCodes', async (req, res) => {
  console.log('Request received:', req.method);
  res.set('Access-Control-Allow-Origin', 'https://www.freight-ebidding.com');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request.');
    return res.status(204).send('');
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ error: 'No authorization token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const jwtSecret = await getJwtSecret();
    jwt.verify(token, jwtSecret);
  } catch (err) {
    console.error('JWT verification failed:', err.message);
    return res.status(403).send({ error: 'Invalid or expired token' });
  }

  try {
    console.log('Fetching credentials...');
    const credentials = await getKey();
    console.log('Credentials fetched successfully.');

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    console.log('Auth object created.');

    const client = await auth.getClient();
    console.log('Auth client obtained.');

    console.log('Querying Google Sheets...');
    const response = await sheets.spreadsheets.values.get({
      auth: client,
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });
    console.log('Sheets response received:', response.data);

    const rows = response.data.values || [];
    const shipmentCodes = rows.map(row => row[0]);
    console.log('Shipment codes fetched:', shipmentCodes);

    return res.status(200).send({ shipmentCodes });
  } catch (error) {
    console.error('Detailed Error:', error.message, error.stack);
    return res.status(500).send({
      error: 'Internal server error',
    });
  }
});