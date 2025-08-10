"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MovieBookingTool = void 0;
// src/tools/movie-booking.ts
const zod_1 = require("zod");
const bookmyshow_service_1 = require("../services/bookmyshow.service");
const database_service_1 = require("../services/database.service");
const logger_1 = require("../utils/logger");
const MovieBookingSchema = zod_1.z.object({
    city: zod_1.z.string().min(1, 'City is required'),
    movieTitle: zod_1.z.string().optional(),
    cinemaName: zod_1.z.string().optional(),
    date: zod_1.z.string().optional(),
    showTime: zod_1.z.string().optional(),
});
class MovieBookingTool {
    bookMyShowService;
    constructor() {
        this.bookMyShowService = new bookmyshow_service_1.BookMyShowService();
    }
    get definition() {
        return {
            name: 'book_movie',
            description: 'Search movies and showtimes, find cinemas and ticket prices via BookMyShow scraping.',
            inputSchema: {
                type: 'object',
                properties: {
                    city: {
                        type: 'string',
                        description: 'City name (e.g., "Bangalore", "Mumbai", "Mysuru")',
                    },
                    movieTitle: {
                        type: 'string',
                        description: 'Specific movie title to search for',
                    },
                    cinemaName: {
                        type: 'string',
                        description: 'Preferred cinema name',
                    },
                    date: {
                        type: 'string',
                        description: 'Date for the show (YYYY-MM-DD format)',
                    },
                    showTime: {
                        type: 'string',
                        description: 'Preferred show time',
                    },
                },
                required: ['city'],
            },
        };
    }
    async handler(args) {
        const startTime = Date.now();
        let success = false;
        let responseData = null;
        let error;
        try {
            const params = MovieBookingSchema.parse(args);
            logger_1.logger.info('Processing movie booking request', params);
            // Search for movies
            const movies = await this.bookMyShowService.searchMovies({
                city: params.city,
                movieTitle: params.movieTitle,
                date: params.date,
            });
            if (movies.length === 0) {
                throw new Error(`No movies found in ${params.city}${params.movieTitle ? ` for "${params.movieTitle}"` : ''}`);
            }
            // Filter by cinema if specified
            let filteredMovies = movies;
            if (params.cinemaName) {
                filteredMovies = movies.map(movie => ({
                    ...movie,
                    cinemas: movie.cinemas.filter(cinema => cinema.name.toLowerCase().includes(params.cinemaName.toLowerCase())),
                })).filter(movie => movie.cinemas.length > 0);
            }
            // Filter by show time if specified
            if (params.showTime) {
                filteredMovies = filteredMovies.map(movie => ({
                    ...movie,
                    cinemas: movie.cinemas.map(cinema => ({
                        ...cinema,
                        shows: cinema.shows.filter(show => show.time.includes(params.showTime)),
                    })).filter(cinema => cinema.shows.length > 0),
                })).filter(movie => movie.cinemas.length > 0);
            }
            responseData = {
                movies: filteredMovies.slice(0, 3), // Limit to top 3 movies
                searchCriteria: params,
                totalFound: filteredMovies.length,
                message: `Found ${filteredMovies.length} movies in ${params.city}`,
                bookingNote: 'To book tickets, visit BookMyShow website or app with the cinema and showtime details.',
            };
            success = true;
            return {
                success: true,
                data: responseData,
                metadata: {
                    duration: Date.now() - startTime,
                    timestamp: new Date().toISOString(),
                    source: 'BookMyShow',
                },
            };
        }
        catch (err) {
            error = err.message || 'Unknown error occurred';
            logger_1.logger.error('Movie booking tool error:', err);
            return {
                success: false,
                error,
                metadata: {
                    duration: Date.now() - startTime,
                    timestamp: new Date().toISOString(),
                    source: 'BookMyShow',
                },
            };
        }
        finally {
            try {
                await database_service_1.db.trackUsage({
                    toolName: 'book_movie',
                    userId: undefined,
                    location: args?.city,
                    parameters: args,
                    response: responseData,
                    success,
                    duration: Date.now() - startTime,
                    error,
                });
            }
            catch (trackingError) {
                logger_1.logger.error('Error tracking movie booking usage:', trackingError);
            }
        }
    }
}
exports.MovieBookingTool = MovieBookingTool;
//# sourceMappingURL=movie-booking.js.map