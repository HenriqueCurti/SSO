import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";

const logDir = "logs";

// Formatos customizados
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = "";
    if (Object.keys(meta).length > 0) {
      metaStr = "\n" + JSON.stringify(meta, null, 2);
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Transports
const transports: winston.transport[] = [
  // Console
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
  }),

  // Erros em arquivo separado
  new DailyRotateFile({
    filename: path.join(logDir, "error-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    level: "error",
    format: logFormat,
    maxSize: "20m",
    maxFiles: "14d",
    zippedArchive: true,
  }),

  // Todos os logs
  new DailyRotateFile({
    filename: path.join(logDir, "combined-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    format: logFormat,
    maxSize: "20m",
    maxFiles: "14d",
    zippedArchive: true,
  }),
];

// Logger principal
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  transports,
  exitOnError: false,
});

// Stream para Morgan (logs HTTP)
export const loggerStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// Helper para logs estruturados
export const logWithContext = (
  level: "info" | "warn" | "error" | "debug",
  message: string,
  context?: Record<string, any>
) => {
  logger.log(level, message, context);
};

// Logs específicos de autenticação
export const authLogger = {
  loginSuccess: (userId: string, ip: string, userAgent?: string) => {
    logger.info("Login successful", {
      userId,
      ip,
      userAgent,
      event: "LOGIN_SUCCESS",
    });
  },

  loginFailed: (email: string, ip: string, reason: string) => {
    logger.warn("Login failed", {
      email,
      ip,
      reason,
      event: "LOGIN_FAILED",
    });
  },

  registerSuccess: (userId: string, email: string) => {
    logger.info("User registered", {
      userId,
      email,
      event: "REGISTER_SUCCESS",
    });
  },

  tokenRefreshed: (userId: string) => {
    logger.debug("Token refreshed", {
      userId,
      event: "TOKEN_REFRESH",
    });
  },

  logoutSuccess: (userId: string) => {
    logger.info("User logged out", {
      userId,
      event: "LOGOUT_SUCCESS",
    });
  },

  suspiciousActivity: (description: string, context: Record<string, any>) => {
    logger.warn("Suspicious activity detected", {
      description,
      ...context,
      event: "SUSPICIOUS_ACTIVITY",
    });
  },
};
