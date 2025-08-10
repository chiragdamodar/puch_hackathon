export interface ValidateToolDefinition {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            token: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
}
export declare class ValidateTool {
    definition: ValidateToolDefinition;
    constructor();
    handler(params: {
        token: string;
    }): Promise<any>;
    /**
     * Additional validation methods for different token types
     */
    static validateTokenFormat(token: string): boolean;
    static validatePhoneNumber(phone: string): boolean;
    /**
     * Generate a new bearer token for testing
     */
    static generateBearerToken(): string;
}
//# sourceMappingURL=validate.d.ts.map