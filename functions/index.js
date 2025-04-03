exports.authenticateBidder = async (req, res) => {
  try {
    res.set('Access-Control-Allow-Origin', 'https://www.freight-ebidding.com');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }
    return res.status(200).send({ message: 'Test successful' });
  } catch (error) {
    console.error('Error in function:', error);
    return res.status(500).send({ error: 'Internal server error' });
  }
};