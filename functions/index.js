const { google } = require('googleapis');
const sheets = google.sheets('v4');

const SPREADSHEET_ID = '1pLqB_HZ0Wq6525EZMrc2KEexm9P5lIpTAr2Uv_FPxHc';
const RANGE = 'Bidder!A:F';

const auth = new google.auth.GoogleAuth({
  keyFile: './key-line-454113-g0-b08527996dab.json', // Relative path
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

exports.authenticateBidder = async (req, res) => {
  res.set('Access-Control-Allow-Origin', 'https://www.freight-ebidding.com');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  try {
    const { bidderId, verificationNumber } = req.body;
    if (!bidderId || bidderId.length !== 12 || !verificationNumber || verificationNumber.length !== 4) {
      return res.status(400).send({
        error: 'Invalid input: Bidder ID must be 12 characters, Verification Number must be 4 characters.'
      });
    }

    const client = await auth.getClient();
    const response = await sheets.spreadsheets.values.get({
      auth: client,
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const rows = response.data.values || [];
    const userRow = rows.find(row => row[4] === bidderId && row[3] === verificationNumber);

    if (!userRow) {
      return res.status(401).send({
        error: 'Invalid credentials: Bidder ID or Verification Number is incorrect.'
      });
    }

    const status = userRow[2] || '';
    if (status === 'Active') {
      return res.status(200).send({
        message: 'Authentication successful',
        status: 'active'
      });
    } else if (status === 'On Hold') {
      return res.status(403).send({
        message: 'This ID is on hold. Please contact the admin.',
        status: 'on_hold'
      });
    } else {
      return res.status(403).send({
        message: 'This ID has not been activated. Please contact the admin.',
        status: 'not_activated'
      });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).send({
      error: 'Internal server error'
    });
  }
};