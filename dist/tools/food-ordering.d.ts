import { ToolResponse } from '../types';
export declare class FoodOrderingTool {
    private ondcService;
    constructor();
    get definition(): {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                location: {
                    type: string;
                    description: string;
                };
                cuisine: {
                    type: string;
                    description: string;
                };
                budget: {
                    type: string;
                    description: string;
                };
                dishType: {
                    type: string;
                    enum: string[];
                    description: string;
                };
            };
            required: string[];
        };
    };
    handler(args: unknown): Promise<ToolResponse>;
}
//# sourceMappingURL=food-ordering.d.ts.map