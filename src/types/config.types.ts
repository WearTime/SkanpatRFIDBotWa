import { LoggingConfig } from "./logging.types";
import { MessagesConfig } from "./message.types";
import { PhoneNumberConfig } from "./phone.types";
import { SecurityConfig } from "./security.types";
import { WebApiConfig } from "./webApi.types";
import { WhatsAppConfig } from "./whatsapp.types";

export interface ServerConfig {
  port: number;
  host: string;
}

export interface RateLimitingConfig {
  windowMs: number;
  maxRequests: number;
}

export interface Config {
  server: ServerConfig;
  webApi: WebApiConfig;
  whatsapp: WhatsAppConfig;
  security: SecurityConfig;
  logging: LoggingConfig;
  messages: MessagesConfig;
  phoneNumber: PhoneNumberConfig;
  rateLimiting: RateLimitingConfig;
}
