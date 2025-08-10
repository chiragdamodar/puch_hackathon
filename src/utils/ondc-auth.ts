// src/utils/ondc-auth.ts
import { createHash } from 'crypto';
import * as nacl from 'tweetnacl';
import { logger } from './logger.js';

export interface ONDCAuthConfig {
  signingPrivateKey: string;
  signingPublicKey: string;
  subscriberId: string;
  uniqueKeyId: string;
}

export class ONDCAuthenticator {
  private config: ONDCAuthConfig;

  constructor(config: ONDCAuthConfig) {
    this.config = config;
  }

  /**
   * Generate Authorization header for ONDC requests
   * Following the signing process described in ONDC API Keys Guide
   */
  generateAuthHeader(requestBody: string): string {
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
      
      logger.info('Generated ONDC auth header', { keyId, created, expires });
      return authHeader;
    } catch (error) {
      logger.error('Error generating ONDC auth header:', error);
      throw new Error('Failed to generate authentication header');
    }
  }

  /**
   * Compute BLAKE-512 hash and base64 encode
   * Note: Node.js crypto doesn't have BLAKE-512, so we'll use SHA-512 as fallback
   * For production, consider using a proper BLAKE-512 implementation
   */
  private computeBlake512Hash(data: string): string {
    // Using SHA-512 as fallback since Node.js doesn't have BLAKE-512 natively
    // For production ONDC integration, use proper BLAKE-512 implementation
    const hash = createHash('sha512').update(data, 'utf8').digest('base64');
    return hash;
  }

  /**
   * Sign string using Ed25519 private key
   */
  private signString(signingString: string): string {
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
    } catch (error) {
      logger.error('Error signing string with Ed25519:', error);
      throw new Error('Failed to sign request');
    }
  }

  /**
   * Verify signature (for testing purposes)
   */
  verifySignature(message: string, signature: string): boolean {
    try {
      const publicKeyBytes = this.base64ToUint8Array(this.config.signingPublicKey);
      const signatureBytes = this.base64ToUint8Array(signature);
      const messageBytes = new TextEncoder().encode(message);
      
      return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    } catch (error) {
      logger.error('Error verifying signature:', error);
      return false;
    }
  }

  /**
   * Generate new Ed25519 key pair for testing
   */
  static generateKeyPair(): { publicKey: string; privateKey: string } {
    const keyPair = nacl.sign.keyPair();
    return {
      publicKey: ONDCAuthenticator.prototype.uint8ArrayToBase64(keyPair.publicKey),
      privateKey: ONDCAuthenticator.prototype.uint8ArrayToBase64(keyPair.secretKey),
    };
  }

  /**
   * Create ONDC context object for requests
   */
  createONDCContext(action: string, domain: string = 'ONDC:RET11'): any {
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

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = Buffer.from(base64, 'base64').toString('binary');
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    return Buffer.from(bytes).toString('base64');
  }
}

/**
 * Create ONDC authenticator from environment variables
 */
export function createONDCAuthenticator(): ONDCAuthenticator {
  const config: ONDCAuthConfig = {
    signingPrivateKey: process.env.ONDC_SIGNING_PRIVATE_KEY!,
    signingPublicKey: process.env.ONDC_SIGNING_PUBLIC_KEY!,
    subscriberId: process.env.ONDC_SUBSCRIBER_ID!,
    uniqueKeyId: process.env.ONDC_UNIQUE_KEY_ID!,
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