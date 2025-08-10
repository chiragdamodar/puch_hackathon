// src/tools/food-ordering.ts
import { z } from 'zod';
import { ONDCService } from '../services/ondc.service.js';
import { db } from '../services/database.service.js';
import { logger } from '../utils/logger.js';
const FoodOrderSchema = z.object({
    location: z.string().min(1, 'Location is required'),
    cuisine: z.string().optional(),
    budget: z.number().positive().optional(),
    dishType: z.enum(['veg', 'non-veg', 'both']).optional(),
});
export class FoodOrderingTool {
    ondcService;
    constructor() {
        this.ondcService = new ONDCService();
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
            logger.info('Processing food order request', params);
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
            logger.error('Food ordering tool error:', err);
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
                await db.trackUsage({
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
                logger.error('Error tracking food ordering usage:', trackingError);
            }
        }
    }
}
//# sourceMappingURL=food-ordering.js.map