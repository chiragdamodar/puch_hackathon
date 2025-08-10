// api/tools.js
module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const tools = [
    {
      name: 'order_food',
      description: 'Search and order food from restaurants via ONDC',
      inputSchema: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'City or location' },
          cuisine: { type: 'string', description: 'Type of cuisine' },
          budget: { type: 'number', description: 'Maximum budget' }
        },
        required: ['location']
      }
    },
    {
      name: 'book_ride',
      description: 'Book rides and get fare estimates via Namma Yatri',
      inputSchema: {
        type: 'object',
        properties: {
          pickup: { type: 'string', description: 'Pickup location' },
          destination: { type: 'string', description: 'Destination location' },
          rideType: { type: 'string', description: 'Type of ride (auto, cab, bike)' }
        },
        required: ['pickup', 'destination']
      }
    },
    {
      name: 'book_movie',
      description: 'Search movies and book tickets via BookMyShow',
      inputSchema: {
        type: 'object',
        properties: {
          action: { type: 'string', description: 'Action to perform' },
          city: { type: 'string', description: 'City name' },
          language: { type: 'string', description: 'Movie language' }
        },
        required: ['action', 'city']
      }
    },
    {
      name: 'validate',
      description: 'Validate MCP server authentication',
      inputSchema: {
        type: 'object',
        properties: {
          bearer_token: { type: 'string', description: 'Bearer token for authentication' }
        },
        required: ['bearer_token']
      }
    }
  ];
  
  res.status(200).json(tools);
};