const { google } = require('googleapis');
const sheets = google.sheets('v4');

// Replace with your Google Sheet ID and range
const SPREADSHEET_ID = '1pLqB_HZ0Wq6525EZMrc2KEexm9P5lIpTAr2Uv_FPxHc';
const RANGE = 'Bidder!A:F';

// Service account authentication
const auth = new google.auth.GoogleAuth({
  keyFile: '/Personal/e-bidding-service/key-line-454113-g0-7a009921c965.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// HTTP-triggered Cloud Function
exports.authenticateBidder = async (req, res) => {
  // Set CORS headers for all responses
  res.set('Access-Control-Allow-Origin', 'https://freight-ebidding.com'); // Or '*' for all origins
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS'); // Allow POST and OPTIONS
  res.set('Access-Control-Allow-Headers', 'Content-Type'); // Allow Content-Type header

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(204).send(''); // No content for preflight
  }

  try {
    // Extract bidder ID and verification number from the POST request body
    const { bidderId, verificationNumber } = req.body;

    // Validate input
    if (!bidderId || bidderId.length !== 12 || !verificationNumber || verificationNumber.length !== 4) {
      return res.status(400).send({
        error: 'Invalid input: Bidder ID must be 12 characters, Verification Number must be 4 characters.'
      });
    }

    // Authenticate with Google Sheets API
    const client = await auth.getClient();

    // Fetch data from the Google Sheet
    const response = await sheets.spreadsheets.values.get({
      auth: client,
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const rows = response.data.values || [];

    // Find a row matching the bidder ID and verification number
    const userRow = rows.find(row => row[4] === bidderId && row[3] === verificationNumber);

    // If no match is found, return an error
    if (!userRow) {
      return res.status(401).send({
        error: 'Invalid credentials: Bidder ID or Verification Number is incorrect.'
      });
    }

    // Check the bidder's status
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