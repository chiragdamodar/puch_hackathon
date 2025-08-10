// src/services/bookmyshow.service.ts
import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../utils/logger.js';
import { db } from './database.service.js';
export class BookMyShowService {
    apiClient;
    baseURL;
    scrapingDelay;
    constructor() {
        this.baseURL = process.env.BOOKMYSHOW_BASE_URL || 'https://in.bookmyshow.com';
        this.scrapingDelay = parseInt(process.env.SCRAPING_DELAY_MS || '2000');
        this.apiClient = axios.create({
            baseURL: this.baseURL,
            timeout: 15000,
            headers: {
                'User-Agent': process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            },
        });
        this.setupInterceptors();
    }
    setupInterceptors() {
        this.apiClient.interceptors.request.use((config) => {
            config.metadata = { startTime: Date.now() };
            return config;
        });
        this.apiClient.interceptors.response.use((response) => {
            const duration = Date.now() - response.config.metadata.startTime;
            this.trackApiCall(response.config.url || '', response.status, duration);
            return response;
        }, (error) => {
            const duration = Date.now() - error.config?.metadata?.startTime || 0;
            const statusCode = error.response?.status || 0;
            this.trackApiCall(error.config?.url || '', statusCode, duration);
            return Promise.reject(error);
        });
    }
    async trackApiCall(endpoint, statusCode, duration) {
        try {
            await db.trackApiCall({
                service: 'bookmyshow',
                endpoint,
                statusCode,
                duration,
            });
        }
        catch (error) {
            logger.error('Error tracking BookMyShow API call:', error);
        }
    }
    /**
     * Search for movies in a specific city
     */
    async searchMovies(params) {
        try {
            logger.info('Searching movies via BookMyShow scraping', params);
            // Add delay to be respectful to the server
            await this.delay(this.scrapingDelay);
            const citySlug = this.getCitySlug(params.city);
            const url = `/${citySlug}/movies`;
            const response = await this.apiClient.get(url);
            const movies = this.parseMoviesFromHTML(response.data, params);
            logger.info(`Found ${movies.length} movies for ${params.city}`);
            return movies;
        }
        catch (error) {
            logger.error('Error scraping movies from BookMyShow:', error);
            return this.getMockMovies(params);
        }
    }
    /**
     * Get cinemas and showtimes for a specific movie
     */
    async getCinemasAndShowtimes(movieId, city, date) {
        try {
            logger.info('Getting cinemas and showtimes', { movieId, city, date });
            await this.delay(this.scrapingDelay);
            const citySlug = this.getCitySlug(city);
            const dateParam = date || this.getTodayDate();
            const url = `/${citySlug}/movies/${movieId}/${dateParam}`;
            const response = await this.apiClient.get(url);
            const cinemas = this.parseCinemasFromHTML(response.data);
            logger.info(`Found ${cinemas.length} cinemas for movie ${movieId}`);
            return cinemas;
        }
        catch (error) {
            logger.error('Error scraping cinemas from BookMyShow:', error);
            return this.getMockCinemas(movieId, city);
        }
    }
    /**
     * Mock booking functionality (BookMyShow doesn't allow automated booking)
     */
    async bookMovie(params) {
        try {
            logger.info('Mock booking movie tickets', params);
            // This would typically redirect to BookMyShow's booking flow
            // For demo purposes, we'll return a mock booking response
            const bookingId = this.generateBookingId();
            const booking = {
                bookingId,
                status: 'confirmed',
                movie: await this.getMovieDetails(params.movieId),
                cinema: await this.getCinemaDetails(params.cinemaId),
                showTime: await this.getShowTimeDetails(params.showTimeId),
                seats: params.seats,
                customerDetails: params.customerDetails,
                totalAmount: this.calculateAmount(params.seats.length),
                bookingTime: new Date().toISOString(),
                qrCode: this.generateQRCode(bookingId),
                instructions: 'Please arrive at the cinema 15 minutes before showtime. Show this booking confirmation at the entrance.',
            };
            logger.info('Mock booking created successfully', { bookingId });
            return booking;
        }
        catch (error) {
            logger.error('Error creating mock booking:', error);
            throw new Error('Failed to book movie tickets. Please try again.');
        }
    }
    /**
     * Parse movies from HTML response
     */
    parseMoviesFromHTML(html, params) {
        try {
            const $ = cheerio.load(html);
            const movies = [];
            // BookMyShow movie cards selector (this may need adjustment based on actual HTML structure)
            $('.movie-card, .movie-item, [data-testid="movie-card"]').each((_, element) => {
                const $movie = $(element);
                const title = $movie.find('.movie-title, .title, h3').first().text().trim();
                const genre = $movie.find('.genre, .category').text().trim();
                const rating = $movie.find('.rating, .star-rating').text().trim();
                const language = $movie.find('.language').text().trim();
                const poster = $movie.find('img').attr('src');
                const movieLink = $movie.find('a').attr('href');
                if (title) {
                    // Apply filters
                    if (params.movieName && !title.toLowerCase().includes(params.movieName.toLowerCase())) {
                        return;
                    }
                    if (params.genre && !genre.toLowerCase().includes(params.genre.toLowerCase())) {
                        return;
                    }
                    if (params.language && !language.toLowerCase().includes(params.language.toLowerCase())) {
                        return;
                    }
                    movies.push({
                        id: this.extractMovieId(movieLink || title),
                        title,
                        genre: genre || 'Drama',
                        rating: parseFloat(rating) || 0,
                        language: language || 'Hindi',
                        poster: poster || '',
                        duration: '2h 30m', // Default duration
                        description: 'Movie description not available through scraping',
                        releaseDate: new Date().toISOString(),
                        cast: [],
                        director: 'Director information not available',
                    });
                }
            });
            return movies;
        }
        catch (error) {
            logger.error('Error parsing movies from HTML:', error);
            return [];
        }
    }
    /**
     * Parse cinemas from HTML response
     */
    parseCinemasFromHTML(html) {
        try {
            const $ = cheerio.load(html);
            const cinemas = [];
            // Cinema selectors (may need adjustment)
            $('.cinema-card, .venue-details, [data-testid="cinema"]').each((_, element) => {
                const $cinema = $(element);
                const name = $cinema.find('.cinema-name, .venue-name, h4').first().text().trim();
                const location = $cinema.find('.location, .address').text().trim();
                const distance = $cinema.find('.distance').text().trim();
                // Extract showtimes
                const showtimes = [];
                $cinema.find('.showtime, .time-slot, [data-testid="showtime"]').each((_, timeElement) => {
                    const $time = $(timeElement);
                    const time = $time.text().trim();
                    const price = $time.find('.price').text().trim() || $time.attr('data-price');
                    if (time) {
                        showtimes.push({
                            id: `show_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                            time,
                            price: this.parsePrice(price || '250'),
                            availableSeats: Math.floor(Math.random() * 100) + 50, // Mock availability
                            screenType: $time.attr('data-screen-type') || '2D',
                        });
                    }
                });
                if (name && showtimes.length > 0) {
                    cinemas.push({
                        id: this.extractCinemaId(name),
                        name,
                        location: location || 'Location not specified',
                        distance: distance || 'Distance not available',
                        rating: 4.0 + Math.random(), // Mock rating
                        amenities: ['Parking', 'Food Court', 'Air Conditioning'],
                        showtimes,
                    });
                }
            });
            return cinemas;
        }
        catch (error) {
            logger.error('Error parsing cinemas from HTML:', error);
            return [];
        }
    }
    getCitySlug(city) {
        const cityMappings = {
            'bangalore': 'bengaluru',
            'mumbai': 'mumbai',
            'delhi': 'delhi-ncr',
            'pune': 'pune',
            'chennai': 'chennai',
            'hyderabad': 'hyderabad',
            'kolkata': 'kolkata',
            'mysuru': 'mysore',
            'mysore': 'mysore',
        };
        return cityMappings[city.toLowerCase()] || 'bengaluru';
    }
    extractMovieId(titleOrLink) {
        if (titleOrLink.includes('/')) {
            // Extract from URL
            const matches = titleOrLink.match(/\/movies\/([^\/]+)/);
            return matches ? matches[1] : this.generateId(titleOrLink);
        }
        return this.generateId(titleOrLink);
    }
    extractCinemaId(name) {
        return this.generateId(name);
    }
    generateId(input) {
        return input.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    parsePrice(priceString) {
        const matches = priceString.match(/\d+/);
        return matches ? parseInt(matches[0]) : 250;
    }
    getTodayDate() {
        return new Date().toISOString().split('T')[0];
    }
    generateBookingId() {
        return `BMS${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    }
    generateQRCode(bookingId) {
        // Mock QR code URL
        return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${bookingId}`;
    }
    calculateAmount(seatCount) {
        const basePrice = 250;
        const taxes = basePrice * 0.18; // 18% tax
        const convenienceFee = 30;
        return (basePrice + taxes + convenienceFee) * seatCount;
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    // Mock data methods
    getMockMovies(params) {
        const mockMovies = [
            {
                id: 'pushpa-2-the-rule',
                title: 'Pushpa 2: The Rule',
                genre: 'Action, Drama',
                rating: 8.5,
                language: 'Telugu',
                poster: 'https://example.com/pushpa2-poster.jpg',
                duration: '3h 15m',
                description: 'The highly anticipated sequel to Pushpa: The Rise',
                releaseDate: new Date().toISOString(),
                cast: ['Allu Arjun', 'Rashmika Mandanna'],
                director: 'Sukumar',
            },
            {
                id: 'kgf-chapter-3',
                title: 'KGF Chapter 3',
                genre: 'Action, Drama',
                rating: 9.0,
                language: 'Kannada',
                poster: 'https://example.com/kgf3-poster.jpg',
                duration: '2h 45m',
                description: 'The epic conclusion to the KGF series',
                releaseDate: new Date().toISOString(),
                cast: ['Yash', 'Srinidhi Shetty'],
                director: 'Prashanth Neel',
            },
        ];
        // Filter by movie name if specified
        if (params.movieName) {
            return mockMovies.filter(movie => movie.title.toLowerCase().includes(params.movieName.toLowerCase()));
        }
        return mockMovies;
    }
    getMockCinemas(movieId, city) {
        return [
            {
                id: 'pvr-forum-mall',
                name: 'PVR Forum Mall',
                location: 'Hosur Road, Bangalore',
                distance: '2.5 km',
                rating: 4.2,
                amenities: ['Parking', 'Food Court', 'Air Conditioning', 'Wheelchair Access'],
                showtimes: [
                    {
                        id: 'show_001',
                        time: '10:00 AM',
                        price: 200,
                        availableSeats: 75,
                        screenType: '2D',
                    },
                    {
                        id: 'show_002',
                        time: '1:30 PM',
                        price: 250,
                        availableSeats: 45,
                        screenType: '2D',
                    },
                    {
                        id: 'show_003',
                        time: '6:45 PM',
                        price: 300,
                        availableSeats: 20,
                        screenType: 'IMAX',
                    },
                ],
            },
            {
                id: 'inox-mantri-square',
                name: 'INOX Mantri Square',
                location: 'Malleswaram, Bangalore',
                distance: '4.1 km',
                rating: 4.0,
                amenities: ['Parking', 'Food Court', 'Premium Seating'],
                showtimes: [
                    {
                        id: 'show_004',
                        time: '11:15 AM',
                        price: 220,
                        availableSeats: 60,
                        screenType: '2D',
                    },
                    {
                        id: 'show_005',
                        time: '4:00 PM',
                        price: 280,
                        availableSeats: 35,
                        screenType: '3D',
                    },
                ],
            },
        ];
    }
    async getMovieDetails(movieId) {
        // In real implementation, fetch from database or cache
        return { id: movieId, title: 'Movie Title' };
    }
    async getCinemaDetails(cinemaId) {
        return { id: cinemaId, name: 'Cinema Name' };
    }
    async getShowTimeDetails(showTimeId) {
        return { id: showTimeId, time: 'Show Time' };
    }
}
//# sourceMappingURL=bookmyshow.service.js.map