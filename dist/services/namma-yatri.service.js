"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NammaYatriService = void 0;
// src/services/namma-yatri.service.ts
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
const database_service_1 = require("./database.service");
class NammaYatriService {
    apiClient;
    baseURL;
    constructor() {
        this.baseURL = process.env.NAMMA_YATRI_BASE_URL || 'https://api.sandbox.beckn.juspay.in';
        this.apiClient = axios_1.default.create({
            baseURL: this.baseURL,
            timeout: 15000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });
        this.setupInterceptors();
    }
    setupInterceptors() {
        this.apiClient.interceptors.request.use((config) => {
            config.metadata = { startTime: Date.now() };
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
            await database_service_1.db.trackApiCall({
                service: 'namma_yatri',
                endpoint,
                statusCode,
                duration,
            });
        }
        catch (error) {
            logger_1.logger.error('Error tracking Namma Yatri API call:', error);
        }
    }
    async searchRides(params) {
        try {
            logger_1.logger.info('Searching rides via Namma Yatri', params);
            const searchPayload = {
                context: {
                    domain: 'ONDC:TRV11',
                    action: 'search',
                    country: 'IND',
                    city: 'std:080', // Bangalore city code
                    core_version: '1.2.0',
                    timestamp: new Date().toISOString(),
                    transaction_id: this.generateTransactionId(),
                    message_id: this.generateMessageId(),
                },
                message: {
                    intent: {
                        fulfillment: {
                            start: {
                                location: {
                                    gps: await this.geocodeLocation(params.pickup),
                                    address: params.pickup,
                                },
                            },
                            end: {
                                location: {
                                    gps: await this.geocodeLocation(params.destination),
                                    address: params.destination,
                                },
                            },
                            vehicle: {
                                category: params.rideType || 'AUTO_RICKSHAW',
                            },
                        },
                    },
                },
            };
            const response = await this.apiClient.post('/search', searchPayload);
            return this.parseRideEstimates(response.data);
        }
        catch (error) {
            logger_1.logger.error('Error searching rides:', error);
            return this.getMockRideEstimates(params);
        }
    }
    async bookRide(estimateId, customerDetails) {
        try {
            const bookingPayload = {
                context: {
                    domain: 'ONDC:TRV11',
                    action: 'init',
                    country: 'IND',
                    city: 'std:080',
                    core_version: '1.2.0',
                    timestamp: new Date().toISOString(),
                    transaction_id: this.generateTransactionId(),
                    message_id: this.generateMessageId(),
                },
                message: {
                    order: {
                        items: [{
                                id: estimateId,
                            }],
                        billing: {
                            name: customerDetails.name,
                            phone: customerDetails.phone,
                        },
                        fulfillment: {
                            customer: {
                                person: {
                                    name: customerDetails.name,
                                },
                                contact: {
                                    phone: customerDetails.phone,
                                },
                            },
                        },
                    },
                },
            };
            const response = await this.apiClient.post('/init', bookingPayload);
            return this.parseBookingResponse(response.data);
        }
        catch (error) {
            logger_1.logger.error('Error booking ride:', error);
            throw new Error('Failed to book ride. Please try again.');
        }
    }
    async getRideStatus(bookingId) {
        try {
            const statusPayload = {
                context: {
                    domain: 'ONDC:TRV11',
                    action: 'status',
                    country: 'IND',
                    city: 'std:080',
                    core_version: '1.2.0',
                    timestamp: new Date().toISOString(),
                    transaction_id: this.generateTransactionId(),
                    message_id: this.generateMessageId(),
                },
                message: {
                    order_id: bookingId,
                },
            };
            const response = await this.apiClient.post('/status', statusPayload);
            return this.parseStatusResponse(response.data);
        }
        catch (error) {
            logger_1.logger.error('Error getting ride status:', error);
            throw new Error('Failed to get ride status');
        }
    }
    parseRideEstimates(data) {
        try {
            const providers = data.message?.catalog?.providers || [];
            const estimates = [];
            providers.forEach((provider) => {
                provider.items?.forEach((item) => {
                    estimates.push({
                        estimateId: item.id,
                        vehicleType: item.descriptor?.name || 'Auto Rickshaw',
                        fare: {
                            baseFare: parseFloat(item.price?.minimum_value) || 0,
                            totalFare: parseFloat(item.price?.value) || 0,
                            currency: item.price?.currency || 'INR',
                        },
                        duration: item.time?.duration || '15-20 mins',
                        distance: item.fulfillment?.start?.location?.distance || 'N/A',
                        driverDetails: provider.descriptor ? {
                            name: provider.descriptor.name,
                            rating: parseFloat(provider.rating) || 4.0,
                            vehicleNumber: provider.vehicle?.registration || 'KA01AB1234',
                        } : undefined,
                    });
                });
            });
            return estimates;
        }
        catch (error) {
            logger_1.logger.error('Error parsing ride estimates:', error);
            return [];
        }
    }
    parseBookingResponse(data) {
        return {
            bookingId: data.message?.order?.id,
            status: data.message?.order?.status,
            driverDetails: data.message?.order?.fulfillment?.agent,
            estimatedArrival: data.message?.order?.fulfillment?.start?.time?.timestamp,
            otp: data.message?.order?.fulfillment?.start?.authorization?.token,
        };
    }
    parseStatusResponse(data) {
        return {
            status: data.message?.order?.status,
            location: data.message?.order?.fulfillment?.start?.location?.gps,
            estimatedArrival: data.message?.order?.fulfillment?.start?.time?.timestamp,
            driverContact: data.message?.order?.fulfillment?.agent?.contact?.phone,
        };
    }
    generateTransactionId() {
        return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    async geocodeLocation(location) {
        // Mock geocoding for known locations in Bangalore/Mysuru
        const coordinates = {
            'mg road': '12.9759,77.6041',
            'brigade road': '12.9698,77.6205',
            'koramangala': '12.9352,77.6245',
            'indiranagar': '12.9784,77.6408',
            'whitefield': '12.9698,77.7500',
            'electronic city': '12.8456,77.6603',
            'mysore palace': '12.3052,76.6552',
            'chamundi hills': '12.2729,76.6727',
            'mysuru railway station': '12.3080,76.6418',
            'krs dam': '12.4244,76.5692',
        };
        const locationLower = location.toLowerCase();
        // Find matching coordinate
        for (const [key, coords] of Object.entries(coordinates)) {
            if (locationLower.includes(key)) {
                return coords;
            }
        }
        // Default to MG Road, Bangalore
        return '12.9759,77.6041';
    }
    getMockRideEstimates(params) {
        const baseDistance = this.calculateMockDistance(params.pickup, params.destination);
        const baseFare = Math.max(30, baseDistance * 12); // ₹12 per km, minimum ₹30
        return [
            {
                estimateId: 'ride_001',
                vehicleType: 'Auto Rickshaw',
                fare: {
                    baseFare: 30,
                    totalFare: baseFare,
                    currency: 'INR',
                },
                duration: `${Math.ceil(baseDistance * 3)}-${Math.ceil(baseDistance * 4)} mins`,
                distance: `${baseDistance.toFixed(1)} km`,
                driverDetails: {
                    name: 'Ravi Kumar',
                    rating: 4.2,
                    vehicleNumber: 'KA05AB1234',
                },
            },
            {
                estimateId: 'ride_002',
                vehicleType: 'Bike Taxi',
                fare: {
                    baseFare: 25,
                    totalFare: baseFare * 0.8,
                    currency: 'INR',
                },
                duration: `${Math.ceil(baseDistance * 2)}-${Math.ceil(baseDistance * 3)} mins`,
                distance: `${baseDistance.toFixed(1)} km`,
                driverDetails: {
                    name: 'Suresh M',
                    rating: 4.5,
                    vehicleNumber: 'KA03XY5678',
                },
            },
            {
                estimateId: 'ride_003',
                vehicleType: 'Cab',
                fare: {
                    baseFare: 50,
                    totalFare: baseFare * 1.5,
                    currency: 'INR',
                },
                duration: `${Math.ceil(baseDistance * 2.5)}-${Math.ceil(baseDistance * 3.5)} mins`,
                distance: `${baseDistance.toFixed(1)} km`,
                driverDetails: {
                    name: 'Prakash S',
                    rating: 4.3,
                    vehicleNumber: 'KA01MN9012',
                },
            },
        ];
    }
    calculateMockDistance(pickup, destination) {
        // Simple mock distance calculation based on location names
        const locations = ['mg road', 'brigade road', 'koramangala', 'indiranagar', 'whitefield', 'electronic city'];
        const pickupIndex = locations.findIndex(loc => pickup.toLowerCase().includes(loc));
        const destIndex = locations.findIndex(loc => destination.toLowerCase().includes(loc));
        if (pickupIndex !== -1 && destIndex !== -1) {
            return Math.abs(pickupIndex - destIndex) * 3 + Math.random() * 2; // 3-5 km per location gap
        }
        // Default distance between 5-15 km
        return 5 + Math.random() * 10;
    }
}
exports.NammaYatriService = NammaYatriService;
//# sourceMappingURL=namma-yatri.service.js.map