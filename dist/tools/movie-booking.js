// src/tools/movie-booking.ts
import { BookMyShowService } from '../services/bookmyshow.service.js';
import { logger } from '../utils/logger.js';
export class MovieBookingTool {
    definition;
    bookMyShowService;
    constructor() {
        this.bookMyShowService = new BookMyShowService();
        this.definition = {
            name: 'book_movie',
            description: 'Search for movies and book movie tickets through BookMyShow integration',
            inputSchema: {
                type: 'object',
                properties: {
                    action: {
                        type: 'string',
                        enum: ['search_movies', 'get_showtimes', 'book_tickets'],
                        description: 'Action to perform: search_movies, get_showtimes, or book_tickets',
                    },
                    city: {
                        type: 'string',
                        description: 'City name (e.g., Bangalore, Mumbai, Delhi)',
                    },
                    movieName: {
                        type: 'string',
                        description: 'Name of the movie to search for (optional)',
                    },
                    genre: {
                        type: 'string',
                        description: 'Movie genre filter (optional)',
                    },
                    language: {
                        type: 'string',
                        description: 'Movie language (e.g., Hindi, English, Telugu, Kannada)',
                    },
                    date: {
                        type: 'string',
                        description: 'Date for showtimes (YYYY-MM-DD format, optional)',
                    },
                    movieId: {
                        type: 'string',
                        description: 'Movie ID for getting showtimes or booking (required for get_showtimes and book_tickets)',
                    },
                    cinemaId: {
                        type: 'string',
                        description: 'Cinema ID for booking (required for book_tickets)',
                    },
                    showTimeId: {
                        type: 'string',
                        description: 'Show time ID for booking (required for book_tickets)',
                    },
                    seats: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Array of seat numbers to book (required for book_tickets)',
                    },
                    customerDetails: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            email: { type: 'string' },
                            phone: { type: 'string' },
                        },
                        description: 'Customer details for booking (required for book_tickets)',
                    },
                },
                required: ['action', 'city'],
            },
        };
    }
    async handler(params) {
        const startTime = Date.now();
        try {
            logger.info('Executing movie booking tool', { action: params.action, city: params.city });
            let result;
            switch (params.action) {
                case 'search_movies':
                    result = await this.searchMovies(params);
                    break;
                case 'get_showtimes':
                    if (!params.movieId) {
                        throw new Error('movieId is required for get_showtimes action');
                    }
                    result = await this.getShowtimes(params);
                    break;
                case 'book_tickets':
                    if (!params.movieId || !params.cinemaId || !params.showTimeId || !params.seats || !params.customerDetails) {
                        throw new Error('movieId, cinemaId, showTimeId, seats, and customerDetails are required for book_tickets action');
                    }
                    result = await this.bookTickets(params);
                    break;
                default:
                    throw new Error(`Invalid action: ${params.action}. Must be one of: search_movies, get_showtimes, book_tickets`);
            }
            const duration = Date.now() - startTime;
            return {
                success: true,
                data: result,
                metadata: {
                    duration,
                    timestamp: new Date().toISOString(),
                    source: 'bookmyshow',
                },
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            logger.error('Error in movie booking tool:', error);
            return {
                success: false,
                error: error.message || 'Failed to execute movie booking action',
                metadata: {
                    duration,
                    timestamp: new Date().toISOString(),
                    source: 'bookmyshow',
                },
            };
        }
    }
    async searchMovies(params) {
        const movies = await this.bookMyShowService.searchMovies(params);
        return {
            action: 'search_movies',
            city: params.city,
            filters: {
                movieName: params.movieName,
                genre: params.genre,
                language: params.language,
            },
            results: movies,
            count: movies.length,
            message: `Found ${movies.length} movies in ${params.city}`,
        };
    }
    async getShowtimes(params) {
        const cinemas = await this.bookMyShowService.getCinemasAndShowtimes(params.movieId, params.city, params.date);
        return {
            action: 'get_showtimes',
            movieId: params.movieId,
            city: params.city,
            date: params.date || 'today',
            cinemas,
            totalCinemas: cinemas.length,
            totalShowtimes: cinemas.reduce((total, cinema) => total + cinema.showtimes.length, 0),
            message: `Found ${cinemas.length} cinemas with showtimes for this movie`,
        };
    }
    async bookTickets(params) {
        const booking = await this.bookMyShowService.bookMovie(params);
        return {
            action: 'book_tickets',
            booking,
            message: 'Movie tickets booked successfully! Please save your booking ID for reference.',
            instructions: [
                'Please arrive at the cinema 15 minutes before showtime',
                'Show this booking confirmation at the entrance',
                'Carry a valid ID proof',
                'Maintain social distancing and follow cinema guidelines',
            ],
        };
    }
    /**
     * Get popular movies for a city (helper method)
     */
    async getPopularMovies(city) {
        return this.searchMovies({ city });
    }
    /**
     * Get available cities (helper method)
     */
    getAvailableCities() {
        return [
            'Bangalore', 'Mumbai', 'Delhi', 'Chennai', 'Hyderabad',
            'Pune', 'Kolkata', 'Mysuru', 'Kochi', 'Ahmedabad'
        ];
    }
}
//# sourceMappingURL=movie-booking.js.map