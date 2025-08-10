import { RideEstimate } from '../types';
export declare class NammaYatriService {
    private apiClient;
    private baseURL;
    constructor();
    private setupInterceptors;
    private trackApiCall;
    searchRides(params: {
        pickup: string;
        destination: string;
        rideType?: string;
    }): Promise<RideEstimate[]>;
    bookRide(estimateId: string, customerDetails: {
        name: string;
        phone: string;
    }): Promise<any>;
    getRideStatus(bookingId: string): Promise<any>;
    private parseRideEstimates;
    private parseBookingResponse;
    private parseStatusResponse;
    private generateTransactionId;
    private generateMessageId;
    private geocodeLocation;
    private getMockRideEstimates;
    private calculateMockDistance;
}
//# sourceMappingURL=namma-yatri.service.d.ts.map