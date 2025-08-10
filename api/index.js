// api/index.js - Vercel serverless function
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// List tools endpoint for MCP
app.get('/tools', (req, res) => {
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
  
  res.json(tools);
});

// Validate tool endpoint (required for Pucho.ai MCP connection)
app.post('/tools/validate', (req, res) => {
  const { bearer_token } = req.body;
  const expectedToken = process.env.MCP_BEARER_TOKEN || 'hackathon_test_token_2024';
  
  if (bearer_token === expectedToken) {
    res.json({
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
});

// Food ordering endpoint
app.post('/tools/order_food', (req, res) => {
  const { location = 'Bangalore', cuisine = 'Any', budget = 500 } = req.body;
  
  // Mock restaurant data
  const restaurants = [
    {
      id: 'rest_001',
      name: 'South Spice Kitchen',
      cuisine: 'South Indian',
      rating: 4.2,
      location: location,
      price_range: '₹200-400',
      delivery_time: '30-45 mins',
      specialties: ['Masala Dosa', 'Sambar Rice', 'Filter Coffee']
    },
    {
      id: 'rest_002', 
      name: 'North Indian Delights',
      cuisine: 'North Indian',
      rating: 4.5,
      location: location,
      price_range: '₹300-600',
      delivery_time: '25-35 mins',
      specialties: ['Butter Chicken', 'Dal Makhani', 'Garlic Naan']
    }
  ].filter(r => r.price_range.includes(budget.toString().slice(0, 1)));

  res.json({
    success: true,
    data: {
      restaurants,
      search_params: { location, cuisine, budget },
      total_found: restaurants.length
    }
  });
});

// Ride booking endpoint
app.post('/tools/book_ride', (req, res) => {
  const { pickup, destination, rideType = 'auto' } = req.body;
  
  // Mock ride estimates
  const rides = [
    {
      id: 'ride_001',
      vehicle_type: 'Auto Rickshaw',
      estimated_fare: '₹120-150',
      estimated_time: '15-20 mins',
      distance: '8.2 km',
      pickup_time: '5-10 mins'
    },
    {
      id: 'ride_002',
      vehicle_type: 'Bike Taxi', 
      estimated_fare: '₹80-100',
      estimated_time: '12-18 mins',
      distance: '8.2 km',
      pickup_time: '3-8 mins'
    },
    {
      id: 'ride_003',
      vehicle_type: 'Cab',
      estimated_fare: '₹200-250',
      estimated_time: '18-25 mins', 
      distance: '8.2 km',
      pickup_time: '8-15 mins'
    }
  ];

  res.json({
    success: true,
    data: {
      rides,
      route: { pickup, destination },
      booking_id: `BK${Date.now()}`
    }
  });
});

// Movie booking endpoint
app.post('/tools/book_movie', (req, res) => {
  const { action, city, language = 'English' } = req.body;
  
  // Mock movie data
  const movies = [
    {
      id: 'movie_001',
      title: 'The Latest Blockbuster',
      genre: ['Action', 'Adventure'],
      rating: 4.3,
      duration: '2h 30m',
      language: language,
      theaters: ['PVR Forum Mall', 'INOX Garuda Mall', 'Cinepolis Nexus']
    },
    {
      id: 'movie_002',
      title: 'Comedy Central',
      genre: ['Comedy', 'Drama'],
      rating: 4.1,
      duration: '2h 15m', 
      language: language,
      theaters: ['PVR Phoenix', 'INOX Mantri Square']
    }
  ];

  res.json({
    success: true,
    data: {
      movies,
      city,
      language,
      total_found: movies.length
    }
  });
});

// Export for Vercel
module.exports = app;