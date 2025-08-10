// api/tools/book_ride.js
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

  const { pickup, destination, rideType = 'auto' } = req.body || {};
  
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

  res.status(200).json({
    success: true,
    data: {
      rides,
      route: { pickup, destination },
      booking_id: `BK${Date.now()}`
    }
  });
};