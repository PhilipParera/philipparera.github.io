const functions = require('@google-cloud/functions-framework');

functions.http('getBidData', (req, res) => {
  res.set('Access-Control-Allow-Origin', 'https://www.freight-ebidding.com');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method === 'GET') {
    try {
      const bidData = {
        bids: [
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

  return res.status(405).json({ error: 'Method not allowed' });
});