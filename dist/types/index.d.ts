export interface FoodOrderParams {
    location: string;
    cuisine?: string;
    budget?: number;
    dishType?: 'veg' | 'non-veg' | 'both';
}
export interface RideBookingParams {
    pickup: string;
    destination: string;
    rideType?: 'auto' | 'bike' | 'cab';
    scheduledTime?: string;
}
export interface MovieBookingParams {
    city: string;
    movieTitle?: string;
    cinemaName?: string;
    date?: string;
    showTime?: string;
}
export interface Restaurant {
    id: string;
    name: string;
    cuisine: string[];
    rating: number;
    deliveryTime: string;
    deliveryFee: number;
    location: string;
    menu?: MenuItem[];
}
export interface MenuItem {
    id: string;
    name: string;
    price: number;
    description?: string;
    isVeg: boolean;
    rating?: number;
}
export interface RideEstimate {
    estimateId: string;
    vehicleType: string;
    fare: {
        baseFare: number;
        totalFare: number;
        currency: string;
    };
    duration: string;
    distance: string;
    driverDetails?: {
        name: string;
        rating: number;
        vehicleNumber: string;
    };
}
export interface Movie {
    id: string;
    title: string;
    genre: string;
    rating: number;
    duration: string;
    language: string;
    poster: string;
    description: string;
    releaseDate: string;
    cast: string[];
    director: string;
}
export interface Cinema {
    id: string;
    name: string;
    location: string;
    distance: string;
    rating: number;
    amenities: string[];
    showtimes: ShowTime[];
}
export interface ShowTime {
    id: string;
    time: string;
    price: number;
    availableSeats: number;
    screenType: string;
}
export interface ToolResponse {
    success: boolean;
    data?: any;
    error?: string;
    metadata?: {
        duration: number;
        timestamp: string;
        source: string;
    };
}
export interface UsageMetrics {
    totalUsage: number;
    todayUsage: number;
    toolStats: {
        toolName: string;
        count: number;
    }[];
    recentActivity: {
        timestamp: string;
        toolName: string;
        success: boolean;
    }[];
}
//# sourceMappingURL=index.d.ts.map