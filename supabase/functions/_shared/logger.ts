// P1-2: Structured logging with context
// Provides consistent logging format across all functions

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'

interface LogContext {
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  error?: {
    message: string
    stack?: string
    code?: string
  }
}

class Logger {
  private serviceName: string

  constructor(serviceName: string) {
    this.serviceName = serviceName
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        service: this.serviceName,
        ...context
      }
    }

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      }
    }

    // Output as structured JSON for parsing by log aggregators
    const output = JSON.stringify(entry)

    switch (level) {
      case 'ERROR':
        console.error(output)
        break
      case 'WARN':
        console.warn(output)
        break
      case 'DEBUG':
        console.debug(output)
        break
      default:
        console.log(output)
    }
  }

  info(message: string, context?: LogContext) {
    this.log('INFO', message, context)
  }

  warn(message: string, context?: LogContext) {
    this.log('WARN', message, context)
  }

  error(message: string, context?: LogContext, error?: Error) {
    this.log('ERROR', message, context, error)
  }

  debug(message: string, context?: LogContext) {
    this.log('DEBUG', message, context)
  }
}

export function createLogger(serviceName: string): Logger {
  return new Logger(serviceName)
}

// Convenience function for measuring duration
export function withTiming<T>(fn: () => T | Promise<T>): Promise<{ result: T; durationMs: number }> {
  const startTime = Date.now()
  
  return Promise.resolve(fn()).then(result => ({
    result,
    durationMs: Date.now() - startTime
  }))
}
