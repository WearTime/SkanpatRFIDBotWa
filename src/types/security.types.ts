export interface SecurityConfig {
  sharedSecret: string;
  adminSecret: string;
  apiKeyLength: number;
  apiKeyIntervalMinutes: number;
  encryptionKey: string;
  encryptResponse: boolean;
}

export interface EncryptedRequest {
  data: string;
  timestamp: number;
}

export interface EncryptionResult {
  data: string;
  timestamp: number;
}
