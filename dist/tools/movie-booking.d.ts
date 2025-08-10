import { ToolResponse } from '../types';
export declare class MovieBookingTool {
    private bookMyShowService;
    constructor();
    get definition(): {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                city: {
                    type: string;
                    description: string;
                };
                movieTitle: {
                    type: string;
                    description: string;
                };
                cinemaName: {
                    type: string;
                    description: string;
                };
                date: {
                    type: string;
                    description: string;
                };
                showTime: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
    };
    handler(args: unknown): Promise<ToolResponse>;
}
//# sourceMappingURL=movie-booking.d.ts.map