declare class DatabaseService {
    private prisma;
    constructor();
    trackUsage(data: {
        toolName: string;
        userId?: string;
        location?: string;
        parameters: any;
        response?: any;
        success: boolean;
        duration: number;
        error?: string;
    }): Promise<{
        error: string | null;
        id: string;
        toolName: string;
        userId: string | null;
        location: string | null;
        parameters: string;
        response: string | null;
        success: boolean;
        duration: number;
        timestamp: Date;
    }>;
    trackApiCall(data: {
        service: string;
        endpoint: string;
        statusCode: number;
        duration: number;
    }): Promise<{
        id: string;
        duration: number;
        timestamp: Date;
        service: string;
        endpoint: string;
        statusCode: number;
    }>;
    getUsageStats(): Promise<{
        totalUsage: number;
        todayUsage: number;
        toolStats: {
            toolName: string;
            count: number;
        }[];
        recentActivity: {
            toolName: string;
            success: boolean;
            timestamp: Date;
        }[];
    }>;
    disconnect(): Promise<void>;
}
export declare const db: DatabaseService;
export {};
//# sourceMappingURL=database.service.d.ts.map