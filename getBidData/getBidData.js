const functions = require('@google-cloud/functions-framework');

functions.http('getBidData', (req, res) => {
  // Set CORS headers to allow requests from your domain
  res.set('Access-Control-Allow-Origin', 'https://www.freight-ebidding.com');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  // Handle GET request
  if (req.method === 'GET') {
    try {
      // Replace this with your actual logic to fetch bid data
      const bidData = {
        bids: [
          // Example bid data; adjust based on your data source
          { bidderId: '123456789012', jobCode: 'JOB001', bidValue: 1000 },
          { bidderId: '987654321098', jobCode: 'JOB001', bidValue: 950 }
        ]
      };
      return res.status(200).json(bidData);
    } catch (error) {
      console.error('Error fetching bid data:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Return 405 for unsupported methods
  return res.status(405).json({ error: 'Method not allowed' });
});