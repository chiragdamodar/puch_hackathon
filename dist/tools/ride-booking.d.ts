import { ToolResponse } from '../types';
export declare class RideBookingTool {
    private nammaYatriService;
    constructor();
    get definition(): {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                pickup: {
                    type: string;
                    description: string;
                };
                destination: {
                    type: string;
                    description: string;
                };
                rideType: {
                    type: string;
                    enum: string[];
                    description: string;
                };
                scheduledTime: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
    };
    handler(args: unknown): Promise<ToolResponse>;
}
//# sourceMappingURL=ride-booking.d.ts.map