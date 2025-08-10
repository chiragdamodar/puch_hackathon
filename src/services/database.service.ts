// src/services/database.service.ts
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

class DatabaseService {
  private prisma: PrismaClient;
  private static instance: DatabaseService;

  private constructor() {
    this.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  // Usage tracking methods
  async trackUsage(data: {
    toolName: string;
    userId?: string;
    location?: string;
    parameters: any;
    response?: any;
    success: boolean;
    duration: number;
    error?: string;
  }) {
    try {
      const usage = await this.prisma.usage.create({
        data: {
          toolName: data.toolName,
          userId: data.userId,
          location: data.location,
          parameters: data.parameters,
          response: data.response,
          success: data.success,
          duration: data.duration,
          error: data.error,
        },
      });

      // Broadcast to WebSocket clients
      if (global.broadcastUsage) {
        global.broadcastUsage({
          id: usage.id,
          toolName: usage.toolName,
          success: usage.success,
          timestamp: usage.timestamp,
        });
      }

      return usage;
    } catch (error) {
      logger.error('Error tracking usage:', error);
      throw error;
    }
  }

  // Order management methods
  async createOrder(data: {
    type: string;
    userId?: string;
    status: string;
    details: any;
    amount?: number;
    location?: string;
    usageId?: string;
  }) {
    return this.prisma.order.create({
      data: {
        type: data.type,
        userId: data.userId,
        status: data.status,
        details: data.details,
        amount: data.amount,
        location: data.location,
        usageId: data.usageId,
      },
    });
  }

  async updateOrderStatus(orderId: string, status: string) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
  }

  // Metrics methods
  async getMetrics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalUsage, todayUsage, toolStats, recentActivity] = await Promise.all([
      this.prisma.usage.count(),
      this.prisma.usage.count({
        where: { timestamp: { gte: today } },
      }),
      this.prisma.usage.groupBy({
        by: ['toolName'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.usage.findMany({
        select: {
          timestamp: true,
          toolName: true,
          success: true,
        },
        orderBy: { timestamp: 'desc' },
        take: 10,
      }),
    ]);

    return {
      totalUsage,
      todayUsage,
      toolStats: toolStats.map((stat) => ({
        toolName: stat.toolName,
        count: stat._count.id,
      })),
      recentActivity,
    };
  }

  async getOrdersByType(type: string, limit = 10) {
    return this.prisma.order.findMany({
      where: { type },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  async trackApiCall(data: {
    service: string;
    endpoint: string;
    statusCode: number;
    duration: number;
  }) {
    return this.prisma.apiMetrics.create({
      data,
    });
  }

  get client() {
    return this.prisma;
  }
}

export const db = DatabaseService.getInstance();