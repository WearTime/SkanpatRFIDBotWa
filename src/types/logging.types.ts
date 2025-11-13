export interface LoggingConfig {
  level: string;
  enableFileLogging: boolean;
  logDir: string;
  maxFileSize: string;
  maxFiles: string;
  enableConsoleLogging: boolean;
}

export interface LogMetadata {
  [key: string]: any;
}

export interface MessageSentLog {
  phoneNumber: string;
  studentName: string;
  attendanceType: string;
  success: boolean;
  timestamp: string;
}
