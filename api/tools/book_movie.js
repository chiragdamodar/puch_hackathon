// api/tools/book_movie.js
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

  const { action, city, language = 'English' } = req.body || {};
  
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

  res.status(200).json({
    success: true,
    data: {
      movies,
      city,
      language,
      total_found: movies.length
    }
  });
};