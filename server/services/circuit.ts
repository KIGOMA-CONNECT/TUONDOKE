import logger from '../logger.js';

type State = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

class CircuitBreaker {
  private state: State = 'CLOSED';
  private failures = 0;
  private lastFailure = 0;
  private threshold: number;
  private resetTimeout: number;

  constructor(threshold = 5, resetTimeout = 30000) {
    this.threshold = threshold;
    this.resetTimeout = resetTimeout;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit is OPEN');
      }
    }
    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
      }
      return result;
    } catch (err) {
      this.failures++;
      this.lastFailure = Date.now();
      if (this.failures >= this.threshold) {
        this.state = 'OPEN';
        logger.warn({ failures: this.failures }, 'Circuit breaker OPEN');
      }
      throw err;
    }
  }

  getState(): State { return this.state; }
  reset(): void { this.state = 'CLOSED'; this.failures = 0; }
}

export default CircuitBreaker;
