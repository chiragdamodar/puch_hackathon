// api/tools/order_food.js
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

  const { location = 'Bangalore', cuisine = 'Any', budget = 500 } = req.body || {};
  
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
  ].filter(r => budget >= 200);

  res.status(200).json({
    success: true,
    data: {
      restaurants,
      search_params: { location, cuisine, budget },
      total_found: restaurants.length
    }
  });
};