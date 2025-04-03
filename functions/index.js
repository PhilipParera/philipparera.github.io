const { google } = require('googleapis');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const sheets = google.sheets('v4');

const SPREADSHEET_ID = '1pLqB_HZ0Wq6525EZMrc2KEexm9P5lIpTAr2Uv_FPxHc';
const RANGE = 'Bidder!A:F';
const secretClient = new SecretManagerServiceClient();

async function getKey() {
  try {
    const [version] = await secretClient.accessSecretVersion({
      name: 'projects/key-line-454113-g0/secrets/authenticate-bidder-key/versions/latest',
    });
    return JSON.parse(version.payload.data.toString());
  } catch (error) {
    console.error('Error fetching secret:', error.message);
    throw error;
  }
}

exports.authenticateBidder = async (req, res) => {
  res.set('Access-Control-Allow-Origin', 'https://www.freight-ebidding.com');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  let bidderId, verificationNumber;
  try {
    ({ bidderId, verificationNumber } = req.body);
    if (!bidderId || bidderId.length !== 12 || !verificationNumber || verificationNumber.length !== 4) {
      return res.status(400).send({
        error: 'Invalid input: Bidder ID must be 12 characters, Verification Number must be 4 characters.',
      });
    }
  } catch (error) {
    return res.status(400).send({ error: 'Invalid JSON request body' });
  }

  try {
    const credentials = await getKey();
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const client = await auth.getClient();
    const response = await sheets.spreadsheets.values.get({
      auth: client,
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const rows = response.data.values || [];
    const dataRows = rows.slice(1);
    const userRow = dataRows.find(
      (row) => row.length >= 5 && row[4] === bidderId && row[3] === verificationNumber
    );

    if (!userRow) {
      return res.status(401).send({ error: 'Invalid credentials.' });
    }

    const status = (userRow[2] || '').trim().toLowerCase();
    if (status === 'active') {
      return res.status(200).send({
        message: 'Authentication successful',
      });
    } else if (status === 'hold' || status === 'on hold') {
      return res.status(403).send({ error: 'This ID is on hold. Please contact the admin.' });
    } else {
      return res.status(403).send({ error: 'This ID has not been activated. Contact the admin.' });
    }
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).send({ error: 'Internal server error' });
  }
};