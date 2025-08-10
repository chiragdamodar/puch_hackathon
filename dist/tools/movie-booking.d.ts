import { ToolResponse } from '../types/index.js';
export interface MovieBookingToolDefinition {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: any;
        required: string[];
    };
}
export declare class MovieBookingTool {
    definition: MovieBookingToolDefinition;
    private bookMyShowService;
    constructor();
    handler(params: any): Promise<ToolResponse>;
    private searchMovies;
    private getShowtimes;
    private bookTickets;
    /**
     * Get popular movies for a city (helper method)
     */
    getPopularMovies(city: string): Promise<any>;
    /**
     * Get available cities (helper method)
     */
    getAvailableCities(): string[];
}
//# sourceMappingURL=movie-booking.d.ts.map