declare class PlatoMCPServer {
    private server;
    private tools;
    private dashboardApp;
    private httpServer;
    private io;
    constructor();
    private initializeTools;
    private setupMCPHandlers;
    private setupDashboard;
    private setupWebSocket;
    start(): Promise<void>;
    shutdown(): Promise<void>;
}
declare global {
    var broadcastUsage: ((usage: any) => void) | undefined;
}
export default PlatoMCPServer;
//# sourceMappingURL=server.d.ts.map