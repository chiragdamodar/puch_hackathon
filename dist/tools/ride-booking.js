"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RideBookingTool = void 0;
// src/tools/ride-booking.ts
const zod_1 = require("zod");
const namma_yatri_service_1 = require("../services/namma-yatri.service");
const database_service_1 = require("../services/database.service");
const logger_1 = require("../utils/logger");
const RideBookingSchema = zod_1.z.object({
    pickup: zod_1.z.string().min(1, 'Pickup location is required'),
    destination: zod_1.z.string().min(1, 'Destination is required'),
    rideType: zod_1.z.enum(['auto', 'bike', 'cab']).optional(),
    scheduledTime: zod_1.z.string().optional(),
});
class RideBookingTool {
    nammaYatriService;
    constructor() {
        this.nammaYatriService = new namma_yatri_service_1.NammaYatriService();
    }
    get definition() {
        return {
            name: 'book_ride',
            description: 'Search and book rides using Namma Yatri service. Get fare estimates and book auto, bike, or cab rides.',
            inputSchema: {
                type: 'object',
                properties: {
                    pickup: {
                        type: 'string',
                        description: 'Pickup location (e.g., "MG Road, Bangalore" or "Mysore Palace")',
                    },
                    destination: {
                        type: 'string',
                        description: 'Destination location',
                    },
                    rideType: {
                        type: 'string',
                        enum: ['auto', 'bike', 'cab'],
                        description: 'Type of ride preferred',
                    },
                    scheduledTime: {
                        type: 'string',
                        description: 'Scheduled time for the ride (ISO format)',
                    },
                },
                required: ['pickup', 'destination'],
            },
        };
    }
    async handler(args) {
        const startTime = Date.now();
        let success = false;
        let responseData = null;
        let error;
        try {
            const params = RideBookingSchema.parse(args);
            logger_1.logger.info('Processing ride booking request', params);
            // Search for ride estimates
            const estimates = await this.nammaYatriService.searchRides({
                pickup: params.pickup,
                destination: params.destination,
                rideType: params.rideType,
            });
            if (estimates.length === 0) {
                throw new Error(`No rides available from ${params.pickup} to ${params.destination}`);
            }
            // Sort by fare (lowest first)
            estimates.sort((a, b) => a.fare.totalFare - b.fare.totalFare);
            responseData = {
                estimates,
                searchCriteria: params,
                message: `Found ${estimates.length} ride options from ${params.pickup} to ${params.destination}`,
                bookingInstructions: 'To book a ride, please call the provided driver number or use the Namma Yatri app.',
            };
            success = true;
            return {
                success: true,
                data: responseData,
                metadata: {
                    duration: Date.now() - startTime,
                    timestamp: new Date().toISOString(),
                    source: 'Namma Yatri',
                },
            };
        }
        catch (err) {
            error = err.message || 'Unknown error occurred';
            logger_1.logger.error('Ride booking tool error:', err);
            return {
                success: false,
                error,
                metadata: {
                    duration: Date.now() - startTime,
                    timestamp: new Date().toISOString(),
                    source: 'Namma Yatri',
                },
            };
        }
        finally {
            try {
                await database_service_1.db.trackUsage({
                    toolName: 'book_ride',
                    userId: undefined,
                    location: `${args?.pickup} to ${args?.destination}`,
                    parameters: args,
                    response: responseData,
                    success,
                    duration: Date.now() - startTime,
                    error,
                });
            }
            catch (trackingError) {
                logger_1.logger.error('Error tracking ride booking usage:', trackingError);
            }
        }
    }
}
exports.RideBookingTool = RideBookingTool;
//# sourceMappingURL=ride-booking.js.map