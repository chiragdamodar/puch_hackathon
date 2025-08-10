export interface ONDCAuthConfig {
    signingPrivateKey: string;
    signingPublicKey: string;
    subscriberId: string;
    uniqueKeyId: string;
}
export declare class ONDCAuthenticator {
    private config;
    constructor(config: ONDCAuthConfig);
    /**
     * Generate Authorization header for ONDC requests
     * Following the signing process described in ONDC API Keys Guide
     */
    generateAuthHeader(requestBody: string): string;
    /**
     * Compute BLAKE-512 hash and base64 encode
     * Note: Node.js crypto doesn't have BLAKE-512, so we'll use SHA-512 as fallback
     * For production, consider using a proper BLAKE-512 implementation
     */
    private computeBlake512Hash;
    /**
     * Sign string using Ed25519 private key
     */
    private signString;
    /**
     * Verify signature (for testing purposes)
     */
    verifySignature(message: string, signature: string): boolean;
    /**
     * Generate new Ed25519 key pair for testing
     */
    static generateKeyPair(): {
        publicKey: string;
        privateKey: string;
    };
    /**
     * Create ONDC context object for requests
     */
    createONDCContext(action: string, domain?: string): any;
    private generateTransactionId;
    private generateMessageId;
    private base64ToUint8Array;
    private uint8ArrayToBase64;
}
/**
 * Create ONDC authenticator from environment variables
 */
export declare function createONDCAuthenticator(): ONDCAuthenticator;
//# sourceMappingURL=ondc-auth.d.ts.map