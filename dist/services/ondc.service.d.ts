import { Restaurant } from '../types/index.js';
export declare class ONDCService {
    private apiClient;
    private baseURL;
    private authenticator;
    constructor();
    private setupInterceptors;
    private trackApiCall;
    searchRestaurants(params: {
        location: string;
        cuisine?: string;
        budget?: number;
    }): Promise<Restaurant[]>;
    placeOrder(restaurantId: string, items: {
        itemId: string;
        quantity: number;
    }[]): Promise<{
        orderId: any;
        status: any;
        estimatedDelivery: any;
        total: any;
    }>;
    private parseRestaurantsFromONDC;
    private parseMenuItems;
    private parseOrderResponse;
    private extractCityFromLocation;
    private geocodeLocation;
    private getMockRestaurants;
}
//# sourceMappingURL=ondc.service.d.ts.map