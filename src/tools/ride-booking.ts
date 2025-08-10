// src/tools/ride-booking.ts
import { z } from 'zod';
import { NammaYatriService } from '../services/namma-yatri.service';
import { db } from '../services/database.service';
import { logger } from '../utils/logger';
import { ToolResponse, RideBookingParams } from '../types';

const RideBookingSchema = z.object({
  pickup: z.string().min(1, 'Pickup location is required'),
  destination: z.string().min(1, 'Destination is required'),
  rideType: z.enum(['auto', 'bike', 'cab']).optional(),
  scheduledTime: z.string().optional(),
});

export class RideBookingTool {
  private nammaYatriService: NammaYatriService;

  constructor() {
    this.nammaYatriService = new NammaYatriService();
  }

  get definition() {
    return {
      name: 'book_ride',
      description: 'Search and book rides using Namma Yatri service. Get fare estimates and book auto, bike, or cab rides.',
      inputSchema: {
        type: 'object',
        properties: {
          pickup: {
            type: 'string',
            description: 'Pickup location (e.g., "MG Road, Bangalore" or "Mysore Palace")',
          },
          destination: {
            type: 'string',
            description: 'Destination location',
          },
          rideType: {
            type: 'string',
            enum: ['auto', 'bike', 'cab'],
            description: 'Type of ride preferred',
          },
          scheduledTime: {
            type: 'string',
            description: 'Scheduled time for the ride (ISO format)',
          },
        },
        required: ['pickup', 'destination'],
      },
    };
  }

  async handler(args: unknown): Promise<ToolResponse> {
    const startTime = Date.now();
    let success = false;
    let responseData: any = null;
    let error: string | undefined;

    try {
      const params = RideBookingSchema.parse(args) as RideBookingParams;
      
      logger.info('Processing ride booking request', params);

      // Search for ride estimates
      const estimates = await this.nammaYatriService.searchRides({
        pickup: params.pickup,
        destination: params.destination,
        rideType: params.rideType,
      });

      if (estimates.length === 0) {
        throw new Error(`No rides available from ${params.pickup} to ${params.destination}`);
      }

      // Sort by fare (lowest first)
      estimates.sort((a, b) => a.fare.totalFare - b.fare.totalFare);

      responseData = {
        estimates,
        searchCriteria: params,
        message: `Found ${estimates.length} ride options from ${params.pickup} to ${params.destination}`,
        bookingInstructions: 'To book a ride, please call the provided driver number or use the Namma Yatri app.',
      };

      success = true;

      return {
        success: true,
        data: responseData,
        metadata: {
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          source: 'Namma Yatri',
        },
      };
    } catch (err: any) {
      error = err.message || 'Unknown error occurred';
      logger.error('Ride booking tool error:', err);

      return {
        success: false,
        error,
        metadata: {
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          source: 'Namma Yatri',
        },
      };
    } finally {
      try {
        await db.trackUsage({
          toolName: 'book_ride',
          userId: undefined,
          location: `${(args as any)?.pickup} to ${(args as any)?.destination}`,
          parameters: args,
          response: responseData,
          success,
          duration: Date.now() - startTime,
          error,
        });
      } catch (trackingError) {
        logger.error('Error tracking ride booking usage:', trackingError);
      }
    }
  }
}