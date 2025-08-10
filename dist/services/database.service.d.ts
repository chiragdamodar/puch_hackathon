import { PrismaClient } from '@prisma/client';
declare class DatabaseService {
    private prisma;
    private static instance;
    private constructor();
    static getInstance(): DatabaseService;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
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
    createOrder(data: {
        type: string;
        userId?: string;
        status: string;
        details: any;
        amount?: number;
        location?: string;
        usageId?: string;
    }): Promise<{
        id: string;
        userId: string | null;
        location: string | null;
        timestamp: Date;
        type: string;
        status: string;
        details: string;
        amount: number | null;
        usageId: string | null;
    }>;
    updateOrderStatus(orderId: string, status: string): Promise<{
        id: string;
        userId: string | null;
        location: string | null;
        timestamp: Date;
        type: string;
        status: string;
        details: string;
        amount: number | null;
        usageId: string | null;
    }>;
    getMetrics(): Promise<{
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
    getOrdersByType(type: string, limit?: number): Promise<{
        id: string;
        userId: string | null;
        location: string | null;
        timestamp: Date;
        type: string;
        status: string;
        details: string;
        amount: number | null;
        usageId: string | null;
    }[]>;
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
    get client(): PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
}
export declare const db: DatabaseService;
export {};
//# sourceMappingURL=database.service.d.ts.map