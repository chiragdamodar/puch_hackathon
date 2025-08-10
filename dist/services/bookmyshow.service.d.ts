import { Movie, ShowTime } from '../types';
export declare class BookMyShowService {
    private apiClient;
    private baseURL;
    private userAgent;
    constructor();
    private setupInterceptors;
    private trackApiCall;
    searchMovies(params: {
        city: string;
        movieTitle?: string;
        date?: string;
    }): Promise<Movie[]>;
    getMovieDetails(movieId: string, cityCode: string, date?: string): Promise<Movie | null>;
    getCinemaShowtimes(movieId: string, cinemaId: string, cityCode: string, date?: string): Promise<ShowTime[]>;
    private parseMoviesFromHTML;
    private parseMovieDetailsFromHTML;
    private parseCinemasFromHTML;
    private parseShowtimesFromHTML;
    private parseShowtimesFromElement;
    private extractMovieId;
    private extractGenre;
    private extractRating;
    private extractDuration;
    private extractLanguage;
    private extractGenreFromDetails;
    private extractRatingFromDetails;
    private extractDurationFromDetails;
    private extractLanguageFromDetails;
    private extractPriceFromShowtime;
    private extractScreenType;
    private getCityCode;
    private getTodayDate;
    private delay;
    private getMockMovies;
    private getMockCinemas;
    private getMockShowtimes;
}
//# sourceMappingURL=bookmyshow.service.d.ts.map