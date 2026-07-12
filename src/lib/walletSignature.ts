import { WalletContextState } from '@solana/wallet-adapter-react';

export interface SignedMessage {
  message: string;
  signature: string;
  timestamp: number;
}

/**
 * Signs a message with the connected Solana wallet
 * @param wallet - The wallet context from useWallet()
 * @param action - The action being performed (e.g., "spawn-throngling", "use-tool")
 * @returns Object containing the message, signature, and timestamp
 */
export async function signMessage(
  wallet: WalletContextState,
  action: string
): Promise<SignedMessage> {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  if (!wallet.signMessage) {
    throw new Error('Wallet does not support message signing');
  }

  const timestamp = Date.now();
  const message = `Throngverse Action\nAction: ${action}\nTimestamp: ${timestamp}\nWallet: ${wallet.publicKey.toString()}`;

  try {
    // Sign the message with the wallet
    const encodedMessage = new TextEncoder().encode(message);
    const signatureUint8 = await wallet.signMessage(encodedMessage);
    
    // Convert signature to base58 string
    const signature = btoa(String.fromCharCode(...signatureUint8));

    return {
      message,
      signature,
      timestamp,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('User rejected')) {
      throw new Error('Signature rejected by user');
    }
    throw error;
  }
}

/**
 * Cache for recent signatures to avoid re-signing for rapid actions
 */
interface SignatureCache {
  [key: string]: {
    signedMessage: SignedMessage;
    expiresAt: number;
  };
}

const signatureCache: SignatureCache = {};

/**
 * Signs a message with caching to avoid excessive wallet popups
 * Cache expires after 30 seconds
 */
export async function signMessageCached(
  wallet: WalletContextState,
  action: string,
  cacheDurationMs = 30000
): Promise<SignedMessage> {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const cacheKey = `${wallet.publicKey.toString()}-${action}`;
  const now = Date.now();

  // Check if we have a valid cached signature
  if (signatureCache[cacheKey] && signatureCache[cacheKey].expiresAt > now) {
    return signatureCache[cacheKey].signedMessage;
  }

  // Generate new signature
  const signedMessage = await signMessage(wallet, action);

  // Cache it
  signatureCache[cacheKey] = {
    signedMessage,
    expiresAt: now + cacheDurationMs,
  };

  return signedMessage;
}
