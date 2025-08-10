"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookMyShowService = void 0;
// src/services/bookmyshow.service.ts
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const logger_1 = require("../utils/logger");
const database_service_1 = require("./database.service");
class BookMyShowService {
    apiClient;
    baseURL;
    userAgent;
    constructor() {
        this.baseURL = process.env.BOOKMYSHOW_BASE_URL || 'https://in.bookmyshow.com';
        this.userAgent = process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
        this.apiClient = axios_1.default.create({
            baseURL: this.baseURL,
            timeout: 20000,
            headers: {
                'User-Agent': this.userAgent,
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
            await database_service_1.db.trackApiCall({
                service: 'bookmyshow',
                endpoint,
                statusCode,
                duration,
            });
        }
        catch (error) {
            logger_1.logger.error('Error tracking BookMyShow API call:', error);
        }
    }
    async searchMovies(params) {
        try {
            logger_1.logger.info('Searching movies via BookMyShow scraping', params);
            const cityCode = this.getCityCode(params.city);
            const url = `/${cityCode}/movies`;
            // Add delay to be respectful
            await this.delay(2000);
            const response = await this.apiClient.get(url);
            const $ = cheerio.load(response.data);
            const movies = this.parseMoviesFromHTML($, params.movieTitle);
            // If searching for specific movie, get detailed info
            if (params.movieTitle && movies.length > 0) {
                const detailedMovies = await Promise.all(movies.slice(0, 3).map(movie => this.getMovieDetails(movie.id, cityCode, params.date)));
                return detailedMovies.filter(movie => movie !== null);
            }
            return movies;
        }
        catch (error) {
            logger_1.logger.error('Error searching movies:', error);
            return this.getMockMovies(params);
        }
    }
    async getMovieDetails(movieId, cityCode, date) {
        try {
            const url = `/${cityCode}/movies/${movieId}`;
            await this.delay(2000); // Be respectful with requests
            const response = await this.apiClient.get(url);
            const $ = cheerio.load(response.data);
            return this.parseMovieDetailsFromHTML($, movieId, date);
        }
        catch (error) {
            logger_1.logger.error(`Error getting movie details for ${movieId}:`, error);
            return null;
        }
    }
    async getCinemaShowtimes(movieId, cinemaId, cityCode, date) {
        try {
            const dateParam = date || this.getTodayDate();
            const url = `/${cityCode}/movies/${movieId}?date=${dateParam}`;
            await this.delay(1500);
            const response = await this.apiClient.get(url);
            const $ = cheerio.load(response.data);
            return this.parseShowtimesFromHTML($, cinemaId);
        }
        catch (error) {
            logger_1.logger.error('Error getting cinema showtimes:', error);
            return this.getMockShowtimes();
        }
    }
    parseMoviesFromHTML($, searchTitle) {
        const movies = [];
        // Try different selectors based on BookMyShow's structure
        const movieSelectors = [
            '.card-container',
            '.movie-card-container',
            '[data-testid="movie-card"]',
            '.cinema-movie-tile'
        ];
        for (const selector of movieSelectors) {
            const movieElements = $(selector);
            if (movieElements.length > 0) {
                movieElements.each((index, element) => {
                    const $element = $(element);
                    const title = $element.find('img').attr('alt') ||
                        $element.find('.movie-name').text().trim() ||
                        $element.find('h3').text().trim();
                    if (!title)
                        return;
                    // Filter by search title if provided
                    if (searchTitle && !title.toLowerCase().includes(searchTitle.toLowerCase())) {
                        return;
                    }
                    const movieId = this.extractMovieId($element);
                    const genre = this.extractGenre($element);
                    const rating = this.extractRating($element);
                    const duration = this.extractDuration($element);
                    const language = this.extractLanguage($element);
                    movies.push({
                        id: movieId || `movie_${index}`,
                        title,
                        genre: genre ? [genre] : ['Drama'],
                        rating: rating || 0,
                        duration: duration || 'N/A',
                        language: language || 'Hindi',
                        poster: '',
                        description: '',
                        releaseDate: '',
                        cast: [],
                        director: '',
                        cinemas: [], // Will be populated in detailed view
                    });
                });
                break; // If we found movies with one selector, no need to try others
            }
        }
        return movies;
    }
    parseMovieDetailsFromHTML($, movieId, date) {
        try {
            const title = $('h1').first().text().trim() ||
                $('.movie-title').text().trim() ||
                $('[data-testid="movie-title"]').text().trim();
            if (!title)
                return null;
            const genre = this.extractGenreFromDetails($);
            const rating = this.extractRatingFromDetails($);
            const duration = this.extractDurationFromDetails($);
            const language = this.extractLanguageFromDetails($);
            const cinemas = this.parseCinemasFromHTML($);
            return {
                id: movieId,
                title,
                genre: genre || ['Drama'],
                rating: rating || 0,
                duration: duration || 'N/A',
                language: language || 'Hindi',
                poster: '',
                description: '',
                releaseDate: '',
                cast: [],
                director: '',
                cinemas,
            };
        }
        catch (error) {
            logger_1.logger.error('Error parsing movie details:', error);
            return null;
        }
    }
    parseCinemasFromHTML($) {
        const cinemas = [];
        // Try different selectors for cinema listings
        const cinemaSelectors = [
            '.venue-container',
            '.cinema-card',
            '[data-testid="cinema-card"]',
            '.showtime-venue'
        ];
        for (const selector of cinemaSelectors) {
            const cinemaElements = $(selector);
            if (cinemaElements.length > 0) {
                cinemaElements.each((index, element) => {
                    const $element = $(element);
                    const name = $element.find('.cinema-name').text().trim() ||
                        $element.find('h3').text().trim() ||
                        $element.find('.venue-name').text().trim();
                    if (!name)
                        return;
                    const location = $element.find('.cinema-location').text().trim() ||
                        $element.find('.location').text().trim() ||
                        'Location not specified';
                    const shows = this.parseShowtimesFromElement($element);
                    cinemas.push({
                        id: `cinema_${index}`,
                        name,
                        location,
                        distance: 'N/A',
                        rating: 0,
                        amenities: [],
                        shows,
                    });
                });
                break;
            }
        }
        return cinemas;
    }
    parseShowtimesFromHTML($, cinemaId) {
        const showtimes = [];
        const showtimeSelectors = [
            '.showtime-pill',
            '.session-time',
            '[data-testid="showtime-button"]',
            '.time-slot'
        ];
        for (const selector of showtimeSelectors) {
            const showtimeElements = $(selector);
            showtimeElements.each((index, element) => {
                const $element = $(element);
                const time = $element.text().trim();
                if (time && /\d{1,2}:\d{2}/.test(time)) {
                    showtimes.push({
                        id: `showtime_${index}`,
                        time,
                        price: this.extractPriceFromShowtime($element),
                        availableSeats: Math.floor(Math.random() * 50) + 10, // Mock available seats
                        screenType: this.extractScreenType($element),
                    });
                }
            });
            if (showtimes.length > 0)
                break;
        }
        return showtimes;
    }
    parseShowtimesFromElement($element) {
        const shows = [];
        $element.find('.showtime-pill, .session-time, .time-slot').each((index, showElement) => {
            const $show = cheerio.load(showElement);
            const time = $show.root().text().trim();
            if (time && /\d{1,2}:\d{2}/.test(time)) {
                shows.push({
                    id: `showtime_${index}`,
                    time,
                    price: Math.floor(Math.random() * 200) + 100, // Mock price ₹100-300
                    availableSeats: Math.floor(Math.random() * 50) + 10,
                    screenType: Math.random() > 0.7 ? '4DX' : '2D',
                });
            }
        });
        return shows;
    }
    // Helper extraction methods
    extractMovieId($element) {
        const href = $element.find('a').attr('href');
        if (href) {
            const match = href.match(/\/movies\/([^\/\?]+)/);
            return match ? match[1] : null;
        }
        return null;
    }
    extractGenre($element) {
        return $element.find('.genre').text().trim() ||
            $element.find('[data-testid="genre"]').text().trim() ||
            null;
    }
    extractRating($element) {
        const ratingText = $element.find('.rating').text().trim() ||
            $element.find('[data-testid="rating"]').text().trim();
        const rating = parseFloat(ratingText);
        return isNaN(rating) ? null : rating;
    }
    extractDuration($element) {
        return $element.find('.duration').text().trim() ||
            $element.find('[data-testid="duration"]').text().trim() ||
            null;
    }
    extractLanguage($element) {
        return $element.find('.language').text().trim() ||
            $element.find('[data-testid="language"]').text().trim() ||
            null;
    }
    extractGenreFromDetails($) {
        const genres = [];
        $('.genre-tag, .movie-genre, [data-testid="genre"]').each((index, element) => {
            const genre = $(element).text().trim();
            if (genre)
                genres.push(genre);
        });
        return genres.length > 0 ? genres : ['Drama'];
    }
    extractRatingFromDetails($) {
        const ratingSelectors = ['.rating-value', '.movie-rating', '[data-testid="rating"]'];
        for (const selector of ratingSelectors) {
            const ratingText = $(selector).text().trim();
            const rating = parseFloat(ratingText);
            if (!isNaN(rating))
                return rating;
        }
        return 0;
    }
    extractDurationFromDetails($) {
        const durationSelectors = ['.duration', '.movie-duration', '[data-testid="duration"]'];
        for (const selector of durationSelectors) {
            const duration = $(selector).text().trim();
            if (duration)
                return duration;
        }
        return 'N/A';
    }
    extractLanguageFromDetails($) {
        const languageSelectors = ['.language', '.movie-language', '[data-testid="language"]'];
        for (const selector of languageSelectors) {
            const language = $(selector).text().trim();
            if (language)
                return language;
        }
        return 'Hindi';
    }
    extractPriceFromShowtime($element) {
        const priceText = $element.find('.price').text().trim() ||
            $element.attr('data-price') ||
            '';
        const price = parseFloat(priceText.replace(/[₹,]/g, ''));
        return isNaN(price) ? Math.floor(Math.random() * 200) + 100 : price;
    }
    extractScreenType($element) {
        const screenText = $element.find('.screen-type').text().trim() ||
            $element.attr('data-screen-type') ||
            '';
        if (screenText.includes('4DX'))
            return '4DX';
        if (screenText.includes('IMAX'))
            return 'IMAX';
        if (screenText.includes('3D'))
            return '3D';
        return '2D';
    }
    getCityCode(city) {
        const cityCodes = {
            'bangalore': 'bengaluru',
            'bengaluru': 'bengaluru',
            'mumbai': 'mumbai',
            'delhi': 'delhi-ncr',
            'pune': 'pune',
            'hyderabad': 'hyderabad',
            'chennai': 'chennai',
            'mysuru': 'mysore',
            'mysore': 'mysore',
        };
        return cityCodes[city.toLowerCase()] || 'bengaluru';
    }
    getTodayDate() {
        return new Date().toISOString().split('T')[0];
    }
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    getMockMovies(params) {
        const allMovies = [
            {
                id: 'movie_001',
                title: 'RRR',
                genre: ['Action', 'Drama'],
                rating: 8.8,
                duration: '3h 7m',
                language: 'Telugu',
                poster: '',
                description: 'Epic period action film',
                releaseDate: '2022-03-25',
                cast: ['Ram Charan', 'Jr. NTR'],
                director: 'S. S. Rajamouli',
                cinemas: this.getMockCinemas(),
            },
            {
                id: 'movie_002',
                title: 'KGF Chapter 2',
                genre: ['Action', 'Crime'],
                rating: 8.4,
                duration: '2h 48m',
                language: 'Kannada',
                poster: '',
                description: 'Action-packed crime thriller',
                releaseDate: '2022-04-14',
                cast: ['Yash', 'Sanjay Dutt'],
                director: 'Prashanth Neel',
                cinemas: this.getMockCinemas(),
            },
            {
                id: 'movie_003',
                title: 'Brahmastra',
                genre: ['Adventure', 'Fantasy'],
                rating: 5.6,
                duration: '2h 47m',
                language: 'Hindi',
                poster: '',
                description: 'Fantasy adventure film',
                releaseDate: '2022-09-09',
                cast: ['Ranbir Kapoor', 'Alia Bhatt'],
                director: 'Ayan Mukerji',
                cinemas: this.getMockCinemas(),
            },
        ];
        if (params.movieTitle) {
            return allMovies.filter(movie => movie.title.toLowerCase().includes(params.movieTitle.toLowerCase()));
        }
        return allMovies;
    }
    getMockCinemas() {
        return [
            {
                id: 'cinema_001',
                name: 'PVR Forum Mall',
                location: 'Koramangala, Bangalore',
                distance: '5.2 km',
                rating: 4.2,
                amenities: ['Parking', 'Food Court', 'AC'],
                shows: this.getMockShowtimes(),
            },
            {
                id: 'cinema_002',
                name: 'INOX Garuda Mall',
                location: 'Magadi Road, Bangalore',
                distance: '7.8 km',
                rating: 4.0,
                amenities: ['Parking', 'Cafe', 'AC'],
                shows: this.getMockShowtimes(),
            },
        ];
    }
    getMockShowtimes() {
        return [
            { id: 'show_001', time: '10:00 AM', price: 150, availableSeats: 45, screenType: '2D' },
            { id: 'show_002', time: '1:30 PM', price: 180, availableSeats: 32, screenType: '2D' },
            { id: 'show_003', time: '6:45 PM', price: 220, availableSeats: 28, screenType: '2D' },
            { id: 'show_004', time: '10:15 PM', price: 200, availableSeats: 35, screenType: '2D' },
        ];
    }
}
exports.BookMyShowService = BookMyShowService;
//# sourceMappingURL=bookmyshow.service.js.map