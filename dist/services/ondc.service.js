// src/services/ondc.service.ts
import axios from 'axios';
import { logger } from '../utils/logger.js';
import { db } from './database.service.js';
import { createONDCAuthenticator } from '../utils/ondc-auth.js';
export class ONDCService {
    apiClient;
    baseURL;
    authenticator;
    constructor() {
        this.baseURL = process.env.ONDC_BASE_URL || 'https://mock.ondc.org';
        this.authenticator = createONDCAuthenticator();
        this.apiClient = axios.create({
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
                    logger.debug('Added ONDC auth header to request');
                }
                catch (error) {
                    logger.warn('Failed to add ONDC auth header, proceeding without auth:', error);
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
            await db.trackApiCall({
                service: 'ondc',
                endpoint,
                statusCode,
                duration,
            });
        }
        catch (error) {
            logger.error('Error tracking ONDC API call:', error);
        }
    }
    async searchRestaurants(params) {
        try {
            logger.info('Searching restaurants via ONDC', params);
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
            logger.error('Error searching restaurants:', error);
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
            logger.error('Error placing order:', error);
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
            logger.error('Error parsing ONDC restaurant data:', error);
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
//# sourceMappingURL=ondc.service.js.map