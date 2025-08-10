import { Movie, Cinema } from '../types/index.js';
export interface MovieSearchParams {
    city: string;
    movieName?: string;
    genre?: string;
    language?: string;
    date?: string;
}
export interface BookingParams {
    movieId: string;
    cinemaId: string;
    showTimeId: string;
    seats: string[];
    customerDetails: {
        name: string;
        email: string;
        phone: string;
    };
}
export declare class BookMyShowService {
    private apiClient;
    private baseURL;
    private scrapingDelay;
    constructor();
    private setupInterceptors;
    private trackApiCall;
    /**
     * Search for movies in a specific city
     */
    searchMovies(params: MovieSearchParams): Promise<Movie[]>;
    /**
     * Get cinemas and showtimes for a specific movie
     */
    getCinemasAndShowtimes(movieId: string, city: string, date?: string): Promise<Cinema[]>;
    /**
     * Mock booking functionality (BookMyShow doesn't allow automated booking)
     */
    bookMovie(params: BookingParams): Promise<any>;
    /**
     * Parse movies from HTML response
     */
    private parseMoviesFromHTML;
    /**
     * Parse cinemas from HTML response
     */
    private parseCinemasFromHTML;
    private getCitySlug;
    private extractMovieId;
    private extractCinemaId;
    private generateId;
    private parsePrice;
    private getTodayDate;
    private generateBookingId;
    private generateQRCode;
    private calculateAmount;
    private delay;
    private getMockMovies;
    private getMockCinemas;
    private getMovieDetails;
    private getCinemaDetails;
    private getShowTimeDetails;
}
//# sourceMappingURL=bookmyshow.service.d.ts.map