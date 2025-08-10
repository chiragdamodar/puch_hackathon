// src/server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

// Import tools
import { FoodOrderingTool } from './tools/food-ordering.js';
import { RideBookingTool } from './tools/ride-booking.js';
import { MovieBookingTool } from './tools/movie-booking.js';

// Import services
import { db } from './services/database.service.js';
import { logger } from './utils/logger.js';

// Load environment variables
dotenv.config();

class PlatoMCPServer {
  private server: Server;
  private tools: Map<string, any>;
  private dashboardApp: express.Application;
  private httpServer: any;
  private io: SocketIOServer;

  constructor() {
    // Initialize MCP Server
    this.server = new Server(
      {
        name: "plato-mcp-server",
        version: "1.0.0",
        description: "Multi-service booking platform integrating food delivery, ride booking, and movie tickets"
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
        }
      }
    );

    // Initialize tools
    this.tools = new Map();
    this.initializeTools();

    // Set up MCP request handlers
    this.setupMCPHandlers();

    // Initialize dashboard
    this.dashboardApp = express();
    this.httpServer = createServer(this.dashboardApp);
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.setupDashboard();
    this.setupWebSocket();
  }

  private initializeTools() {
    const foodTool = new FoodOrderingTool();
    const rideTool = new RideBookingTool();
    const movieTool = new MovieBookingTool();

    this.tools.set('order_food', foodTool);
    this.tools.set('book_ride', rideTool);
    this.tools.set('book_movie', movieTool);

    logger.info('Initialized tools:', Array.from(this.tools.keys()));
  }

  private setupMCPHandlers() {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = Array.from(this.tools.values()).map(tool => tool.definition);
      
      logger.info('Listing tools:', tools.map(t => t.name));
      
      return {
        tools
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      logger.info(`Tool call: ${name}`, args);

      const tool = this.tools.get(name);
      if (!tool) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Tool not found: ${name}`
        );
      }

      try {
        const result = await tool.handler(args);
        
        // Format response for MCP
        if (result.success) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result.data, null, 2)
              }
            ]
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${result.error}`
              }
            ],
            isError: true
          };
        }
      } catch (error: any) {
        logger.error(`Tool execution error for ${name}:`, error);
        
        return {
          content: [
            {
              type: "text",
              text: `Tool execution failed: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  private setupDashboard() {
    this.dashboardApp.use(cors());
    this.dashboardApp.use(express.json());

    // Metrics endpoint
    this.dashboardApp.get('/api/metrics', async (req, res) => {
      try {
        const metrics = await db.getMetrics();
        res.json(metrics);
      } catch (error) {
        logger.error('Error fetching metrics:', error);
        res.status(500).json({ error: 'Failed to fetch metrics' });
      }
    });

    // Recent orders endpoint
    this.dashboardApp.get('/api/orders/:type', async (req, res) => {
      try {
        const { type } = req.params;
        const limit = parseInt(req.query.limit as string) || 10;
        
        const orders = await db.getOrdersByType(type, limit);
        res.json(orders);
      } catch (error) {
        logger.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
      }
    });

    // Tool usage statistics
    this.dashboardApp.get('/api/tools/stats', async (req, res) => {
      try {
        const stats = await db.client.usage.groupBy({
          by: ['toolName', 'success'],
          _count: { id: true },
          _avg: { duration: true }
        });

        const formattedStats = stats.reduce((acc: any, stat) => {
          const toolName = stat.toolName;
          if (!acc[toolName]) {
            acc[toolName] = {
              toolName,
              totalCalls: 0,
              successfulCalls: 0,
              failedCalls: 0,
              avgDuration: 0
            };
          }
          
          acc[toolName].totalCalls += stat._count.id;
          if (stat.success) {
            acc[toolName].successfulCalls += stat._count.id;
          } else {
            acc[toolName].failedCalls += stat._count.id;
          }
          acc[toolName].avgDuration = stat._avg.duration || 0;
          
          return acc;
        }, {});

        res.json(Object.values(formattedStats));
      } catch (error) {
        logger.error('Error fetching tool stats:', error);
        res.status(500).json({ error: 'Failed to fetch tool statistics' });
      }
    });

    // Health check endpoint
    this.dashboardApp.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // Static dashboard (if you build a frontend)
    this.dashboardApp.use(express.static('public'));
  }

  private setupWebSocket() {
    // Make broadcast function globally available
    global.broadcastUsage = (usage: any) => {
      this.io.to('metrics').emit('usage_update', usage);
    };

    this.io.on('connection', (socket) => {
      logger.info('Dashboard client connected:', socket.id);

      socket.on('subscribe_metrics', () => {
        socket.join('metrics');
        logger.info('Client subscribed to metrics:', socket.id);
      });

      socket.on('unsubscribe_metrics', () => {
        socket.leave('metrics');
        logger.info('Client unsubscribed from metrics:', socket.id);
      });

      socket.on('disconnect', () => {
        logger.info('Dashboard client disconnected:', socket.id);
      });
    });
  }

  async start() {
    try {
      // Connect to database
      await db.connect();
      
      // Start dashboard server
      const dashboardPort = process.env.DASHBOARD_PORT || 3002;
      this.httpServer.listen(dashboardPort, () => {
        logger.info(`Dashboard server running on port ${dashboardPort}`);
      });

      // Start MCP server
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      logger.info('Plato MCP Server started successfully');
      
      // Keep the process running
      process.on('SIGINT', async () => {
        logger.info('Shutting down gracefully...');
        await this.shutdown();
        process.exit(0);
      });

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    try {
      await db.disconnect();
      this.httpServer.close();
      logger.info('Server shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
  }
}

// Global declarations for TypeScript
declare global {
  var broadcastUsage: ((usage: any) => void) | undefined;
}

// Start the server
const server = new PlatoMCPServer();
server.start().catch((error) => {
  logger.error('Failed to start Plato MCP Server:', error);
  process.exit(1);
});

export default PlatoMCPServer;