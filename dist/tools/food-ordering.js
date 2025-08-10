"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FoodOrderingTool = void 0;
// src/tools/food-ordering.ts
const zod_1 = require("zod");
const ondc_service_1 = require("../services/ondc.service");
const database_service_1 = require("../services/database.service");
const logger_1 = require("../utils/logger");
const FoodOrderSchema = zod_1.z.object({
    location: zod_1.z.string().min(1, 'Location is required'),
    cuisine: zod_1.z.string().optional(),
    budget: zod_1.z.number().positive().optional(),
    dishType: zod_1.z.enum(['veg', 'non-veg', 'both']).optional(),
});
class FoodOrderingTool {
    ondcService;
    constructor() {
        this.ondcService = new ondc_service_1.ONDCService();
    }
    get definition() {
        return {
            name: 'order_food',
            description: 'Search and order food from local restaurants via ONDC network. Supports filtering by cuisine, budget, and dietary preferences.',
            inputSchema: {
                type: 'object',
                properties: {
                    location: {
                        type: 'string',
                        description: 'Delivery location (e.g., "Koramangala, Bangalore" or "MG Road, Mysuru")',
                    },
                    cuisine: {
                        type: 'string',
                        description: 'Preferred cuisine type (e.g., "South Indian", "North Indian", "Chinese")',
                    },
                    budget: {
                        type: 'number',
                        description: 'Maximum budget per dish in INR',
                    },
                    dishType: {
                        type: 'string',
                        enum: ['veg', 'non-veg', 'both'],
                        description: 'Dietary preference',
                    },
                },
                required: ['location'],
            },
        };
    }
    async handler(args) {
        const startTime = Date.now();
        let success = false;
        let responseData = null;
        let error;
        try {
            // Validate input
            const params = FoodOrderSchema.parse(args);
            logger_1.logger.info('Processing food order request', params);
            // Search restaurants
            const restaurants = await this.ondcService.searchRestaurants({
                location: params.location,
                cuisine: params.cuisine,
                budget: params.budget,
            });
            // Filter by dish type if specified
            let filteredRestaurants = restaurants;
            if (params.dishType && params.dishType !== 'both') {
                filteredRestaurants = restaurants.filter(restaurant => restaurant.menu?.some(item => params.dishType === 'veg' ? item.isVeg : !item.isVeg));
            }
            if (filteredRestaurants.length === 0) {
                throw new Error(`No restaurants found for your criteria in ${params.location}`);
            }
            // Prepare response
            responseData = {
                restaurants: filteredRestaurants.slice(0, 5), // Limit to top 5
                searchCriteria: params,
                totalFound: filteredRestaurants.length,
                message: `Found ${filteredRestaurants.length} restaurants in ${params.location}`,
            };
            success = true;
            return {
                success: true,
                data: responseData,
                metadata: {
                    duration: Date.now() - startTime,
                    timestamp: new Date().toISOString(),
                    source: 'ONDC',
                },
            };
        }
        catch (err) {
            error = err.message || 'Unknown error occurred';
            logger_1.logger.error('Food ordering tool error:', err);
            return {
                success: false,
                error,
                metadata: {
                    duration: Date.now() - startTime,
                    timestamp: new Date().toISOString(),
                    source: 'ONDC',
                },
            };
        }
        finally {
            // Track usage
            try {
                await database_service_1.db.trackUsage({
                    toolName: 'order_food',
                    userId: undefined, // Could be extracted from context
                    location: args?.location,
                    parameters: args,
                    response: responseData,
                    success,
                    duration: Date.now() - startTime,
                    error,
                });
            }
            catch (trackingError) {
                logger_1.logger.error('Error tracking food ordering usage:', trackingError);
            }
        }
    }
}
exports.FoodOrderingTool = FoodOrderingTool;
//# sourceMappingURL=food-ordering.js.map