// P1-1: Exponential backoff and retry strategies

interface RetryConfig {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
  factor: number
}

export const RETRY_CONFIGS = {
  polygon: {
    maxAttempts: 20,
    baseDelayMs: 60000, // 1 minute
    maxDelayMs: 600000, // 10 minutes
    factor: 2
  },
  bitcoin: {
    maxAttempts: 288, // 24 hours at 5min intervals
    baseDelayMs: 300000, // 5 minutes
    maxDelayMs: 300000, // Keep constant for Bitcoin (no backoff needed)
    factor: 1
  }
}

/**
 * Calculate exponential backoff delay
 * Formula: min(baseDelay * factor^(attempts-1), maxDelay)
 */
export function calculateBackoff(attempts: number, config: RetryConfig): number {
  const delay = config.baseDelayMs * Math.pow(config.factor, attempts - 1)
  return Math.min(delay, config.maxDelayMs)
}

/**
 * Check if enough time has passed since last attempt
 */
export function shouldRetry(
  lastAttemptTime: string | null,
  attempts: number,
  config: RetryConfig
): boolean {
  if (!lastAttemptTime) return true
  
  const lastAttempt = new Date(lastAttemptTime).getTime()
  const now = Date.now()
  const backoffDelay = calculateBackoff(attempts, config)
  
  return (now - lastAttempt) >= backoffDelay
}

/**
 * Get human-readable time until next retry
 */
export function getNextRetryTime(
  lastAttemptTime: string,
  attempts: number,
  config: RetryConfig
): { nextRetryAt: Date; waitTimeMs: number } {
  const lastAttempt = new Date(lastAttemptTime).getTime()
  const backoffDelay = calculateBackoff(attempts, config)
  const nextRetryAt = new Date(lastAttempt + backoffDelay)
  const waitTimeMs = Math.max(0, nextRetryAt.getTime() - Date.now())
  
  return { nextRetryAt, waitTimeMs }
}

/**
 * Circuit breaker to pause processing when too many failures
 */
export class CircuitBreaker {
  private failureCount = 0
  private lastFailureTime: number | null = null
  private isOpen = false
  
  constructor(
    private threshold: number = 5,
    private cooldownMs: number = 300000 // 5 minutes
  ) {}

  recordSuccess() {
    this.failureCount = 0
    this.isOpen = false
  }

  recordFailure() {
    this.failureCount++
    this.lastFailureTime = Date.now()
    
    if (this.failureCount >= this.threshold) {
      this.isOpen = true
    }
  }

  canProceed(): boolean {
    if (!this.isOpen) return true
    
    // Check if cooldown period has passed
    if (this.lastFailureTime && Date.now() - this.lastFailureTime > this.cooldownMs) {
      this.isOpen = false
      this.failureCount = 0
      return true
    }
    
    return false
  }

  getStatus() {
    return {
      isOpen: this.isOpen,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null
    }
  }
}
