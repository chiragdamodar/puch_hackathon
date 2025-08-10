// src/tools/validate.ts
import { logger } from '../utils/logger.js';
export class ValidateTool {
    definition;
    constructor() {
        this.definition = {
            name: 'validate',
            description: 'Validate bearer token and return user phone number for Pucho.ai MCP authentication',
            inputSchema: {
                type: 'object',
                properties: {
                    token: {
                        type: 'string',
                        description: 'Bearer token to validate',
                    },
                },
                required: ['token'],
            },
        };
    }
    async handler(params) {
        try {
            logger.info('Validating MCP bearer token', { token: params.token.substring(0, 10) + '...' });
            // Validate the token against environment variable
            const expectedToken = process.env.MCP_BEARER_TOKEN;
            const expectedPhone = process.env.MCP_VALIDATE_PHONE_NUMBER;
            if (!expectedToken || !expectedPhone) {
                logger.error('MCP configuration missing - check MCP_BEARER_TOKEN and MCP_VALIDATE_PHONE_NUMBER in .env');
                return {
                    success: false,
                    error: 'Server configuration error',
                };
            }
            // Check if token matches
            if (params.token === expectedToken) {
                logger.info('MCP token validation successful', { phone: expectedPhone });
                // Return phone number in the format required by Pucho.ai: {country_code}{number}
                return {
                    success: true,
                    phone: expectedPhone,
                    message: 'Token validated successfully',
                };
            }
            else {
                logger.warn('MCP token validation failed - token mismatch');
                return {
                    success: false,
                    error: 'Invalid token',
                };
            }
        }
        catch (error) {
            logger.error('Error in validate tool:', error);
            return {
                success: false,
                error: error.message || 'Validation failed',
            };
        }
    }
    /**
     * Additional validation methods for different token types
     */
    static validateTokenFormat(token) {
        // Basic token format validation
        return !!(token && token.length >= 10 && /^[a-zA-Z0-9_-]+$/.test(token));
    }
    static validatePhoneNumber(phone) {
        // Validate phone number format: {country_code}{number}
        // Example: 919876543210 for +91-9876543210
        return /^\d{10,15}$/.test(phone);
    }
    /**
     * Generate a new bearer token for testing
     */
    static generateBearerToken() {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substring(2);
        return `hackathon_${timestamp}_${random}`;
    }
}
//# sourceMappingURL=validate.js.map