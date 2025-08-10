// api/tools/validate.js
module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { bearer_token } = req.body || {};
  const expectedToken = process.env.MCP_BEARER_TOKEN || 'hackathon_test_token_2024';
  
  if (bearer_token === expectedToken) {
    res.status(200).json({
      success: true,
      data: {
        phone_number: process.env.MCP_VALIDATE_PHONE_NUMBER || '919141055471',
        message: 'Authentication successful'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid bearer token'
    });
  }
};