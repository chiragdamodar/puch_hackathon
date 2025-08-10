import winston from 'winston';
export declare const logger: winston.Logger;
export declare function withTiming<T>(fn: () => Promise<T>, label: string): Promise<T>;
//# sourceMappingURL=logger.d.ts.map