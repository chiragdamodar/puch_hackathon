"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ONDCService = void 0;
// src/services/ondc.service.ts
const axios_1 = __importDefault(require("axios"));
const logger_js_1 = require("../utils/logger.js");
const database_service_js_1 = require("./database.service.js");
const ondc_auth_js_1 = require("../utils/ondc-auth.js");
class ONDCService {
    apiClient;
    baseURL;
    authenticator;
    constructor() {
        this.baseURL = process.env.ONDC_BASE_URL || 'https://mock.ondc.org';
        this.authenticator = (0, ondc_auth_js_1.createONDCAuthenticator)();
        this.apiClient = axios_1.default.create({
            baseURL: this.baseURL,
            timeout: 15000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });
        // Add request/response interceptors for metrics and auth
        this.setupInterceptors();
    }
    setupInterceptors() {
        this.apiClient.interceptors.request.use((config) => {
            config.metadata = { startTime: Date.now() };
            // Add ONDC authentication header for signed requests
            if (config.data && config.url !== '/health') {
                try {
                    const requestBody = typeof config.data === 'string' ? config.data : JSON.stringify(config.data);
                    const authHeader = this.authenticator.generateAuthHeader(requestBody);
                    config.headers['Authorization'] = authHeader;
                    logger_js_1.logger.debug('Added ONDC auth header to request');
                }
                catch (error) {
                    logger_js_1.logger.warn('Failed to add ONDC auth header, proceeding without auth:', error);
                    // For mock server, we can proceed without auth
                    if (this.baseURL.includes('mock.ondc.org')) {
                        config.headers['Authorization'] = 'Bearer sandbox_test_key';
                    }
                }
            }
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
            await database_service_js_1.db.trackApiCall({
                service: 'ondc',
                endpoint,
                statusCode,
                duration,
            });
        }
        catch (error) {
            logger_js_1.logger.error('Error tracking ONDC API call:', error);
        }
    }
    async searchRestaurants(params) {
        try {
            logger_js_1.logger.info('Searching restaurants via ONDC', params);
            const searchPayload = {
                context: this.authenticator.createONDCContext('search', 'ONDC:RET11'),
                message: {
                    intent: {
                        item: {
                            descriptor: {
                                name: params.cuisine || '',
                            },
                        },
                        fulfillment: {
                            end: {
                                location: {
                                    gps: await this.geocodeLocation(params.location),
                                },
                            },
                        },
                        payment: {
                            '@ondc/org/buyer_app_finder_fee_type': 'percent',
                            '@ondc/org/buyer_app_finder_fee_amount': '3',
                        },
                    },
                },
            };
            const response = await this.apiClient.post('/search', searchPayload);
            // Parse ONDC response format
            const restaurants = this.parseRestaurantsFromONDC(response.data);
            // Filter by budget if specified
            if (params.budget) {
                return restaurants.filter(restaurant => restaurant.menu?.some(item => item.price <= params.budget));
            }
            return restaurants;
        }
        catch (error) {
            logger_js_1.logger.error('Error searching restaurants:', error);
            // Return mock data for demo purposes
            return this.getMockRestaurants(params);
        }
    }
    async placeOrder(restaurantId, items) {
        try {
            const orderPayload = {
                context: this.authenticator.createONDCContext('init', 'ONDC:RET11'),
                message: {
                    order: {
                        provider: {
                            id: restaurantId,
                        },
                        items: items.map(item => ({
                            id: item.itemId,
                            quantity: {
                                count: item.quantity,
                            },
                        })),
                    },
                },
            };
            const response = await this.apiClient.post('/init', orderPayload);
            return this.parseOrderResponse(response.data);
        }
        catch (error) {
            logger_js_1.logger.error('Error placing order:', error);
            throw new Error('Failed to place order. Please try again.');
        }
    }
    parseRestaurantsFromONDC(data) {
        try {
            const providers = data.message?.catalog?.providers || [];
            return providers.map((provider) => ({
                id: provider.id,
                name: provider.descriptor?.name || 'Unknown Restaurant',
                cuisine: provider.categories?.map((cat) => cat.descriptor?.name) || ['General'],
                rating: parseFloat(provider.rating) || 4.0,
                deliveryTime: provider.time?.duration || '30-45 mins',
                deliveryFee: provider.fulfillments?.[0]?.pricing?.price || 20,
                location: provider.locations?.[0]?.address?.full || 'Location not specified',
                menu: this.parseMenuItems(provider.items || []),
            }));
        }
        catch (error) {
            logger_js_1.logger.error('Error parsing ONDC restaurant data:', error);
            return [];
        }
    }
    parseMenuItems(items) {
        return items.map((item) => ({
            id: item.id,
            name: item.descriptor?.name || 'Unknown Item',
            price: parseFloat(item.price?.value) || 0,
            description: item.descriptor?.long_desc || '',
            isVeg: item.tags?.some((tag) => tag.code === 'veg') || false,
            rating: parseFloat(item.rating) || 0,
        }));
    }
    parseOrderResponse(data) {
        return {
            orderId: data.message?.order?.id,
            status: data.message?.order?.state,
            estimatedDelivery: data.message?.order?.fulfillments?.[0]?.end?.time?.timestamp,
            total: data.message?.order?.quote?.price?.value,
        };
    }
    extractCityFromLocation(location) {
        // Simple city extraction - enhance based on your needs
        const cities = ['bangalore', 'mumbai', 'delhi', 'pune', 'hyderabad', 'chennai', 'mysuru'];
        const locationLower = location.toLowerCase();
        for (const city of cities) {
            if (locationLower.includes(city)) {
                return city;
            }
        }
        return 'bangalore'; // default
    }
    async geocodeLocation(location) {
        // Mock geocoding - replace with actual service
        const coordinates = {
            'bangalore': '12.9716,77.5946',
            'mumbai': '19.0760,72.8777',
            'delhi': '28.7041,77.1025',
            'mysuru': '12.2958,76.6394',
        };
        const city = this.extractCityFromLocation(location);
        return coordinates[city] || '12.9716,77.5946';
    }
    getMockRestaurants(params) {
        const mockRestaurants = [
            {
                id: 'rest_001',
                name: 'Spice Garden',
                cuisine: ['Indian', 'South Indian'],
                rating: 4.2,
                deliveryTime: '25-35 mins',
                deliveryFee: 15,
                location: params.location,
                menu: [
                    {
                        id: 'item_001',
                        name: 'Mysore Masala Dosa',
                        price: 120,
                        description: 'Crispy dosa with spicy red chutney',
                        isVeg: true,
                        rating: 4.5,
                    },
                    {
                        id: 'item_002',
                        name: 'Chicken Biryani',
                        price: 280,
                        description: 'Aromatic basmati rice with tender chicken',
                        isVeg: false,
                        rating: 4.3,
                    },
                ],
            },
            {
                id: 'rest_002',
                name: 'Pizza Corner',
                cuisine: ['Italian', 'Fast Food'],
                rating: 4.0,
                deliveryTime: '20-30 mins',
                deliveryFee: 25,
                location: params.location,
                menu: [
                    {
                        id: 'item_003',
                        name: 'Margherita Pizza',
                        price: 250,
                        description: 'Classic tomato and mozzarella pizza',
                        isVeg: true,
                        rating: 4.1,
                    },
                ],
            },
        ];
        // Filter by cuisine if specified
        if (params.cuisine) {
            return mockRestaurants.filter(restaurant => restaurant.cuisine.some(c => c.toLowerCase().includes(params.cuisine.toLowerCase())));
        }
        return mockRestaurants;
    }
}
exports.ONDCService = ONDCService;
//# sourceMappingURL=ondc.service.js.map