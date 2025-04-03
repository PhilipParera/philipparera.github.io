const { google } = require('googleapis');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const sheets = google.sheets('v4');

const SPREADSHEET_ID = '1pLqB_HZ0Wq6525EZMrc2KEexm9P5lIpTAr2Uv_FPxHc';
const RANGE = 'Bidder!A:F';

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

exports.authenticateBidder = async (req, res) => {
  console.log('Request received:', req.method, req.body);
  res.set('Access-Control-Allow-Origin', 'https://www.freight-ebidding.com');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request.');
    return res.status(204).send('');
  }

  let bidderId, verificationNumber;
  try {
    console.log('Validating request body...');
    if (!req.body || typeof req.body !== 'object') {
      throw new Error('Invalid JSON payload');
    }
    ({ bidderId, verificationNumber } = req.body);
    if (!bidderId || bidderId.length !== 12 || !verificationNumber || verificationNumber.length !== 4) {
      console.log('Invalid input detected:', { bidderId, verificationNumber });
      return res.status(400).send({
        error: 'Invalid input: Bidder ID must be 12 characters, Verification Number must be 4 characters.',
      });
    }
    console.log('Input validation passed.');
  } catch (parseError) {
    console.error('Parse Error:', parseError.message);
    return res.status(400).send({
      error: 'Invalid JSON request body',
    });
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
    console.log('Rows fetched:', rows);

    const dataRows = rows.slice(1); // Skip header row
    const userRow = dataRows.find(
      (row) => row.length >= 5 && row[4] === bidderId && row[3] === verificationNumber
    );

    if (!userRow) {
      console.log('No matching user found for:', { bidderId, verificationNumber });
      return res.status(401).send({
        error: 'Invalid credentials: Bidder ID or Verification Number is incorrect.',
      });
    }

    const status = (userRow[2] || '').trim(); // Trim added
    console.log('User status:', status);

    if (status === 'Active') {
      console.log('Authentication successful for bidder:', bidderId);
      return res.status(200).send({
        message: 'Authentication successful',
        status: 'active',
      });
    } else if (status === 'On hold') { // Updated casing
      console.log('Bidder on hold:', bidderId);
      return res.status(403).send({
        error: 'This ID is on hold. Please contact the admin.',
        status: 'on_hold',
      });
    } else {
      console.log('Bidder not activated:', bidderId);
      return res.status(403).send({
        error: 'This ID has not been activated. Please contact the admin.',
        status: 'not_activated',
      });
    }
  } catch (error) {
    console.error('Detailed Error:', error.message, error.stack);
    return res.status(500).send({
      error: 'Internal server error',
    });
  }
};