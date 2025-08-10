import express from 'express';
import cors from 'cors';
import { logger } from './utils/logger.js';
import { FoodOrderingTool } from './tools/food-ordering.js';
import { RideBookingTool } from './tools/ride-booking.js';
import { MovieBookingTool } from './tools/movie-booking.js';
import { ValidateTool } from './tools/validate.js';
class PlatoMcpServer {
    app;
    port;
    tools;
    constructor() {
        this.app = express();
        this.port = parseInt(process.env.PORT || '3001');
        this.tools = new Map();
        this.setupMiddleware();
        this.setupTools();
        this.setupRoutes();
        logger.info('Plato MCP Server initialized');
    }
    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static('public'));
    }
    setupTools() {
        const foodTool = new FoodOrderingTool();
        const rideTool = new RideBookingTool();
        const movieTool = new MovieBookingTool();
        const validateTool = new ValidateTool();
        this.tools.set('order_food', foodTool);
        this.tools.set('book_ride', rideTool);
        this.tools.set('book_movie', movieTool);
        this.tools.set('validate', validateTool);
        logger.info(`Registered ${this.tools.size} tools`);
    }
    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'healthy', timestamp: new Date().toISOString() });
        });
        // List available tools
        this.app.get('/tools', (req, res) => {
            const toolList = Array.from(this.tools.entries()).map(([name, tool]) => ({
                name,
                definition: tool.definition,
            }));
            res.json({ tools: toolList });
        });
        // Execute tool
        this.app.post('/tools/:toolName', async (req, res) => {
            const { toolName } = req.params;
            const tool = this.tools.get(toolName);
            if (!tool) {
                return res.status(404).json({
                    success: false,
                    error: `Tool '${toolName}' not found`,
                });
            }
            try {
                const result = await tool.handler(req.body);
                return res.json(result);
            }
            catch (error) {
                logger.error(`Error executing tool ${toolName}:`, error);
                return res.status(500).json({
                    success: false,
                    error: error.message || 'Internal server error',
                });
            }
        });
        // Serve dashboard
        this.app.get('/', (req, res) => {
            res.sendFile('index.html', { root: 'public' });
        });
    }
    start() {
        this.app.listen(this.port, () => {
            logger.info(`Server running on http://localhost:${this.port}`);
            logger.info(`Dashboard: http://localhost:${this.port}`);
            logger.info(`API: http://localhost:${this.port}/tools`);
            logger.info(`Health check: http://localhost:${this.port}/health`);
        });
    }
}
const server = new PlatoMcpServer();
server.start();
//# sourceMappingURL=server.js.map