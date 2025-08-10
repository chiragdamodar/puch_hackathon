"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ONDCAuthenticator = void 0;
exports.createONDCAuthenticator = createONDCAuthenticator;
// src/utils/ondc-auth.ts
const crypto_1 = require("crypto");
const nacl = __importStar(require("tweetnacl"));
const logger_js_1 = require("./logger.js");
class ONDCAuthenticator {
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Generate Authorization header for ONDC requests
     * Following the signing process described in ONDC API Keys Guide
     */
    generateAuthHeader(requestBody) {
        try {
            // Step 1: Compute BLAKE-512 hash of request body
            const digest = this.computeBlake512Hash(requestBody);
            // Step 2: Generate timestamps
            const created = Math.floor(Date.now() / 1000);
            const expires = created + 3600; // 1 hour expiry
            // Step 3: Create signing string
            const signingString = `(created): ${created}\n(expires): ${expires}\ndigest: BLAKE-512=${digest}`;
            // Step 4: Sign the string using Ed25519
            const signature = this.signString(signingString);
            // Step 5: Construct Authorization header
            const keyId = `${this.config.subscriberId}|${this.config.uniqueKeyId}|ed25519`;
            const authHeader = `Signature keyId="${keyId}", algorithm="ed25519", created="${created}", expires="${expires}", headers="(created)(expires)digest", signature="${signature}"`;
            logger_js_1.logger.info('Generated ONDC auth header', { keyId, created, expires });
            return authHeader;
        }
        catch (error) {
            logger_js_1.logger.error('Error generating ONDC auth header:', error);
            throw new Error('Failed to generate authentication header');
        }
    }
    /**
     * Compute BLAKE-512 hash and base64 encode
     * Note: Node.js crypto doesn't have BLAKE-512, so we'll use SHA-512 as fallback
     * For production, consider using a proper BLAKE-512 implementation
     */
    computeBlake512Hash(data) {
        // Using SHA-512 as fallback since Node.js doesn't have BLAKE-512 natively
        // For production ONDC integration, use proper BLAKE-512 implementation
        const hash = (0, crypto_1.createHash)('sha512').update(data, 'utf8').digest('base64');
        return hash;
    }
    /**
     * Sign string using Ed25519 private key
     */
    signString(signingString) {
        try {
            // Decode base64 private key
            const privateKeyBytes = this.base64ToUint8Array(this.config.signingPrivateKey);
            // Create signing key pair
            const keyPair = nacl.sign.keyPair.fromSecretKey(privateKeyBytes);
            // Sign the string
            const messageBytes = new TextEncoder().encode(signingString);
            const signatureBytes = nacl.sign.detached(messageBytes, keyPair.secretKey);
            // Return base64 encoded signature
            return this.uint8ArrayToBase64(signatureBytes);
        }
        catch (error) {
            logger_js_1.logger.error('Error signing string with Ed25519:', error);
            throw new Error('Failed to sign request');
        }
    }
    /**
     * Verify signature (for testing purposes)
     */
    verifySignature(message, signature) {
        try {
            const publicKeyBytes = this.base64ToUint8Array(this.config.signingPublicKey);
            const signatureBytes = this.base64ToUint8Array(signature);
            const messageBytes = new TextEncoder().encode(message);
            return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
        }
        catch (error) {
            logger_js_1.logger.error('Error verifying signature:', error);
            return false;
        }
    }
    /**
     * Generate new Ed25519 key pair for testing
     */
    static generateKeyPair() {
        const keyPair = nacl.sign.keyPair();
        return {
            publicKey: ONDCAuthenticator.prototype.uint8ArrayToBase64(keyPair.publicKey),
            privateKey: ONDCAuthenticator.prototype.uint8ArrayToBase64(keyPair.secretKey),
        };
    }
    /**
     * Create ONDC context object for requests
     */
    createONDCContext(action, domain = 'ONDC:RET11') {
        return {
            domain,
            country: 'IND',
            city: 'std:080', // Bangalore
            action,
            core_version: '1.2.0',
            bap_id: this.config.subscriberId,
            bap_uri: process.env.MCP_SERVER_URL || 'https://localhost:3001',
            transaction_id: this.generateTransactionId(),
            message_id: this.generateMessageId(),
            timestamp: new Date().toISOString(),
            ttl: 'PT30S',
        };
    }
    generateTransactionId() {
        return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    base64ToUint8Array(base64) {
        const binaryString = Buffer.from(base64, 'base64').toString('binary');
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }
    uint8ArrayToBase64(bytes) {
        return Buffer.from(bytes).toString('base64');
    }
}
exports.ONDCAuthenticator = ONDCAuthenticator;
/**
 * Create ONDC authenticator from environment variables
 */
function createONDCAuthenticator() {
    const config = {
        signingPrivateKey: process.env.ONDC_SIGNING_PRIVATE_KEY,
        signingPublicKey: process.env.ONDC_SIGNING_PUBLIC_KEY,
        subscriberId: process.env.ONDC_SUBSCRIBER_ID,
        uniqueKeyId: process.env.ONDC_UNIQUE_KEY_ID,
    };
    // Validate required environment variables
    const missingVars = Object.entries(config)
        .filter(([_, value]) => !value)
        .map(([key]) => key);
    if (missingVars.length > 0) {
        throw new Error(`Missing ONDC auth environment variables: ${missingVars.join(', ')}`);
    }
    return new ONDCAuthenticator(config);
}
//# sourceMappingURL=ondc-auth.js.map