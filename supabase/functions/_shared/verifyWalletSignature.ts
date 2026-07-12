import { PublicKey } from 'https://esm.sh/@solana/web3.js@1.98.4';
import nacl from 'https://esm.sh/tweetnacl@1.0.3';

export interface VerificationResult {
  valid: boolean;
  error?: string;
  walletAddress?: string;
}

/**
 * Verifies a Solana wallet signature
 * @param walletAddress - The claimed wallet address
 * @param message - The original message that was signed
 * @param signature - The base64-encoded signature
 * @param timestamp - The timestamp from when the message was signed
 * @returns Verification result with validity status
 */
export async function verifyWalletSignature(
  walletAddress: string,
  message: string,
  signature: string,
  timestamp: number
): Promise<VerificationResult> {
  try {
    // Validate timestamp (must be within 5 minutes)
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    if (timestamp > now) {
      return { valid: false, error: 'Signature timestamp is in the future' };
    }
    
    if (now - timestamp > maxAge) {
      return { valid: false, error: 'Signature has expired (older than 5 minutes)' };
    }

    // Validate message format
    if (!message.includes('Throngverse Action')) {
      return { valid: false, error: 'Invalid message format' };
    }

    if (!message.includes(`Wallet: ${walletAddress}`)) {
      return { valid: false, error: 'Wallet address mismatch in message' };
    }

    if (!message.includes(`Timestamp: ${timestamp}`)) {
      return { valid: false, error: 'Timestamp mismatch in message' };
    }

    // Convert wallet address to public key
    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(walletAddress);
    } catch (error) {
      return { valid: false, error: 'Invalid wallet address format' };
    }

    // Decode the signature from base64
    let signatureBytes: Uint8Array;
    try {
      const binaryString = atob(signature);
      signatureBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        signatureBytes[i] = binaryString.charCodeAt(i);
      }
    } catch (error) {
      return { valid: false, error: 'Invalid signature encoding' };
    }

    // Encode the message
    const messageBytes = new TextEncoder().encode(message);

    // Verify the signature using nacl
    const verified = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes()
    );

    if (!verified) {
      return { valid: false, error: 'Signature verification failed' };
    }

    return { valid: true, walletAddress };

  } catch (error) {
    console.error('Signature verification error:', error);
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Unknown verification error' 
    };
  }
}
