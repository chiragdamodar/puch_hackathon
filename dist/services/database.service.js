import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
class DatabaseService {
    prisma;
    constructor() {
        this.prisma = new PrismaClient();
    }
    async trackUsage(data) {
        try {
            return await this.prisma.usage.create({
                data: {
                    ...data,
                    parameters: JSON.stringify(data.parameters),
                    response: data.response ? JSON.stringify(data.response) : null,
                },
            });
        }
        catch (error) {
            logger.error('Error tracking usage:', error);
            return null;
        }
    }
    async trackApiCall(data) {
        try {
            return await this.prisma.apiMetrics.create({
                data,
            });
        }
        catch (error) {
            logger.error('Error tracking API call:', error);
            return null;
        }
    }
    async getUsageStats() {
        try {
            const totalUsage = await this.prisma.usage.count();
            const todayUsage = await this.prisma.usage.count({
                where: {
                    timestamp: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    },
                },
            });
            const toolStats = await this.prisma.usage.groupBy({
                by: ['toolName'],
                _count: {
                    id: true,
                },
            });
            const recentActivity = await this.prisma.usage.findMany({
                take: 10,
                orderBy: {
                    timestamp: 'desc',
                },
                select: {
                    timestamp: true,
                    toolName: true,
                    success: true,
                },
            });
            return {
                totalUsage,
                todayUsage,
                toolStats: toolStats.map(stat => ({
                    toolName: stat.toolName,
                    count: stat._count.id,
                })),
                recentActivity,
            };
        }
        catch (error) {
            logger.error('Error getting usage stats:', error);
            return {
                totalUsage: 0,
                todayUsage: 0,
                toolStats: [],
                recentActivity: [],
            };
        }
    }
    async disconnect() {
        await this.prisma.$disconnect();
    }
}
export const db = new DatabaseService();
//# sourceMappingURL=database.service.js.map