"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/server.ts
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
// Import tools
const food_ordering_js_1 = require("./tools/food-ordering.js");
const ride_booking_js_1 = require("./tools/ride-booking.js");
const movie_booking_js_1 = require("./tools/movie-booking.js");
// Import services
const database_service_js_1 = require("./services/database.service.js");
const logger_js_1 = require("./utils/logger.js");
// Load environment variables
dotenv_1.default.config();
class PlatoMCPServer {
    server;
    tools;
    dashboardApp;
    httpServer;
    io;
    constructor() {
        // Initialize MCP Server
        this.server = new index_js_1.Server({
            name: "plato-mcp-server",
            version: "1.0.0",
            description: "Multi-service booking platform integrating food delivery, ride booking, and movie tickets"
        }, {
            capabilities: {
                tools: {},
                resources: {},
                prompts: {}
            }
        });
        // Initialize tools
        this.tools = new Map();
        this.initializeTools();
        // Set up MCP request handlers
        this.setupMCPHandlers();
        // Initialize dashboard
        this.dashboardApp = (0, express_1.default)();
        this.httpServer = (0, http_1.createServer)(this.dashboardApp);
        this.io = new socket_io_1.Server(this.httpServer, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        this.setupDashboard();
        this.setupWebSocket();
    }
    initializeTools() {
        const foodTool = new food_ordering_js_1.FoodOrderingTool();
        const rideTool = new ride_booking_js_1.RideBookingTool();
        const movieTool = new movie_booking_js_1.MovieBookingTool();
        this.tools.set('order_food', foodTool);
        this.tools.set('book_ride', rideTool);
        this.tools.set('book_movie', movieTool);
        logger_js_1.logger.info('Initialized tools:', Array.from(this.tools.keys()));
    }
    setupMCPHandlers() {
        // Handle tool listing
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
            const tools = Array.from(this.tools.values()).map(tool => tool.definition);
            logger_js_1.logger.info('Listing tools:', tools.map(t => t.name));
            return {
                tools
            };
        });
        // Handle tool calls
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            logger_js_1.logger.info(`Tool call: ${name}`, args);
            const tool = this.tools.get(name);
            if (!tool) {
                throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Tool not found: ${name}`);
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
                }
                else {
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
            }
            catch (error) {
                logger_js_1.logger.error(`Tool execution error for ${name}:`, error);
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
    setupDashboard() {
        this.dashboardApp.use((0, cors_1.default)());
        this.dashboardApp.use(express_1.default.json());
        // Metrics endpoint
        this.dashboardApp.get('/api/metrics', async (req, res) => {
            try {
                const metrics = await database_service_js_1.db.getMetrics();
                res.json(metrics);
            }
            catch (error) {
                logger_js_1.logger.error('Error fetching metrics:', error);
                res.status(500).json({ error: 'Failed to fetch metrics' });
            }
        });
        // Recent orders endpoint
        this.dashboardApp.get('/api/orders/:type', async (req, res) => {
            try {
                const { type } = req.params;
                const limit = parseInt(req.query.limit) || 10;
                const orders = await database_service_js_1.db.getOrdersByType(type, limit);
                res.json(orders);
            }
            catch (error) {
                logger_js_1.logger.error('Error fetching orders:', error);
                res.status(500).json({ error: 'Failed to fetch orders' });
            }
        });
        // Tool usage statistics
        this.dashboardApp.get('/api/tools/stats', async (req, res) => {
            try {
                const stats = await database_service_js_1.db.client.usage.groupBy({
                    by: ['toolName', 'success'],
                    _count: { id: true },
                    _avg: { duration: true }
                });
                const formattedStats = stats.reduce((acc, stat) => {
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
                    }
                    else {
                        acc[toolName].failedCalls += stat._count.id;
                    }
                    acc[toolName].avgDuration = stat._avg.duration || 0;
                    return acc;
                }, {});
                res.json(Object.values(formattedStats));
            }
            catch (error) {
                logger_js_1.logger.error('Error fetching tool stats:', error);
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
        this.dashboardApp.use(express_1.default.static('public'));
    }
    setupWebSocket() {
        // Make broadcast function globally available
        global.broadcastUsage = (usage) => {
            this.io.to('metrics').emit('usage_update', usage);
        };
        this.io.on('connection', (socket) => {
            logger_js_1.logger.info('Dashboard client connected:', socket.id);
            socket.on('subscribe_metrics', () => {
                socket.join('metrics');
                logger_js_1.logger.info('Client subscribed to metrics:', socket.id);
            });
            socket.on('unsubscribe_metrics', () => {
                socket.leave('metrics');
                logger_js_1.logger.info('Client unsubscribed from metrics:', socket.id);
            });
            socket.on('disconnect', () => {
                logger_js_1.logger.info('Dashboard client disconnected:', socket.id);
            });
        });
    }
    async start() {
        try {
            // Connect to database
            await database_service_js_1.db.connect();
            // Start dashboard server
            const dashboardPort = process.env.DASHBOARD_PORT || 3002;
            this.httpServer.listen(dashboardPort, () => {
                logger_js_1.logger.info(`Dashboard server running on port ${dashboardPort}`);
            });
            // Start MCP server
            const transport = new stdio_js_1.StdioServerTransport();
            await this.server.connect(transport);
            logger_js_1.logger.info('Plato MCP Server started successfully');
            // Keep the process running
            process.on('SIGINT', async () => {
                logger_js_1.logger.info('Shutting down gracefully...');
                await this.shutdown();
                process.exit(0);
            });
        }
        catch (error) {
            logger_js_1.logger.error('Failed to start server:', error);
            process.exit(1);
        }
    }
    async shutdown() {
        try {
            await database_service_js_1.db.disconnect();
            this.httpServer.close();
            logger_js_1.logger.info('Server shutdown complete');
        }
        catch (error) {
            logger_js_1.logger.error('Error during shutdown:', error);
        }
    }
}
// Start the server
const server = new PlatoMCPServer();
server.start().catch((error) => {
    logger_js_1.logger.error('Failed to start Plato MCP Server:', error);
    process.exit(1);
});
exports.default = PlatoMCPServer;
//# sourceMappingURL=server.js.map