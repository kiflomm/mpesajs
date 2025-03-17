import { AxiosError } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

/**
 * Configuration for retry behavior when requests fail
 */
interface RetryConfig {
    maxRetries: number;      // Maximum number of retry attempts
    initialDelayMs: number;  // Initial delay before first retry in milliseconds
    maxDelayMs: number;      // Maximum delay between retries in milliseconds
    backoffFactor: number;   // Multiplier for exponential backoff
}

/**
 * Configuration for rate limiting behavior
 */
interface RateLimitConfig {
    maxConcurrent: number;   // Maximum number of concurrent requests allowed
    timeWindowMs: number;    // Time window to track requests in milliseconds
}

/**
 * Gets configuration from environment variables with fallbacks
 * Prioritizes reading from .env.mpesajs before falling back to .env
 */
function getConfigFromEnv(): { retryConfig: RetryConfig; rateLimitConfig: RateLimitConfig } {
    // Try to load .env.mpesajs first
    const mpesajsPath = path.resolve(process.cwd(), '.env.mpesajs');
    if (fs.existsSync(mpesajsPath)) {
        dotenv.config({ path: mpesajsPath });
    } else {
        // Fall back to .env if .env.mpesajs doesn't exist
        dotenv.config();
    }

    return {
        retryConfig: {
            maxRetries: parseInt(process.env.MPESAJS_MAX_RETRIES || '3', 10),
            initialDelayMs: parseInt(process.env.MPESAJS_INITIAL_DELAY_MS || '1000', 10),
            maxDelayMs: parseInt(process.env.MPESAJS_MAX_DELAY_MS || '10000', 10),
            backoffFactor: parseInt(process.env.MPESAJS_BACKOFF_FACTOR || '2', 10)
        },
        rateLimitConfig: {
            maxConcurrent: parseInt(process.env.MPESAJS_MAX_CONCURRENT || '1000', 10),
            timeWindowMs: parseInt(process.env.MPESAJS_TIME_WINDOW_MS || '60000', 10)
        }
    };
}

/**
 * RateLimiter class implements rate limiting and retry logic for API requests
 * Uses the Singleton pattern to ensure only one instance exists
 */
export class RateLimiter {
    private static instance: RateLimiter;
    private queue: Array<() => Promise<any>> = [];        // Queue of pending requests
    private activeRequests = 0;                           // Current number of executing requests
    private requestTimestamps: number[] = [];             // Timestamps of recent requests
    private retryConfig: RetryConfig;                     // Retry configuration
    private rateLimitConfig: RateLimitConfig;             // Rate limit configuration

    /**
     * Private constructor to prevent direct instantiation
     * Initializes default configurations for retry and rate limiting
     */
    private constructor() {
        const config = getConfigFromEnv();
        this.retryConfig = config.retryConfig;
        this.rateLimitConfig = config.rateLimitConfig;
    }

    /**
     * Gets the singleton instance of RateLimiter
     * Creates the instance if it doesn't exist
     */
    public static getInstance(): RateLimiter {
        if (!RateLimiter.instance) {
            RateLimiter.instance = new RateLimiter();
        }
        return RateLimiter.instance;
    }

    /**
     * Updates the retry configuration
     * Allows partial updates while maintaining existing values
     */
    public setRetryConfig(config: Partial<RetryConfig>): void {
        this.retryConfig = { ...this.retryConfig, ...config };
    }

    /**
     * Updates the rate limit configuration
     * Allows partial updates while maintaining existing values
     */
    public setRateLimitConfig(config: Partial<RateLimitConfig>): void {
        this.rateLimitConfig = { ...this.rateLimitConfig, ...config };
    }

    /**
     * Creates a promise that resolves after the specified delay
     * Used for implementing delays between retries
     */
    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Calculates the delay time for the next retry attempt using exponential backoff
     * Includes random jitter to prevent thundering herd problem
     */
    private calculateBackoff(attempt: number): number {
        const delay = Math.min(
            this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffFactor, attempt),
            this.retryConfig.maxDelayMs
        );
        // Add 25% random jitter to prevent all retries happening simultaneously
        return delay * (0.75 + Math.random() * 0.5);
    }

    /**
     * Determines if an error should trigger a retry attempt
     * Retries on network errors and specific HTTP status codes
     */
    private shouldRetry(error: any): boolean {
        if (error instanceof AxiosError) {
            const status = error.response?.status;
            return !status ||                     // Network error (no status)
                status === 429 ||                 // Too Many Requests
                status === 503 ||                 // Service Unavailable
                status === 504 ||                 // Gateway Timeout
                (status >= 500 && status < 600);  // Any other server error
        }
        return false;
    }

    /**
     * Executes an operation with automatic retries on failure
     * Implements exponential backoff between retry attempts
     */
    private async executeWithRetry<T>(
        operation: () => Promise<T>,
        attempt: number = 0
    ): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            if (attempt < this.retryConfig.maxRetries && this.shouldRetry(error)) {
                const backoffDelay = this.calculateBackoff(attempt);
                await this.delay(backoffDelay);
                return this.executeWithRetry(operation, attempt + 1);
            }
            throw error;
        }
    }

    /**
     * Removes timestamps older than the configured time window
     * Helps maintain accurate count of recent requests
     */
    private cleanupOldTimestamps(): void {
        const now = Date.now();
        this.requestTimestamps = this.requestTimestamps.filter(
            timestamp => now - timestamp < this.rateLimitConfig.timeWindowMs
        );
    }

    /**
     * Waits until a request slot becomes available
     * Ensures we don't exceed the configured rate limits
     */
    private async waitForAvailableSlot(): Promise<void> {
        while (true) {
            this.cleanupOldTimestamps();

            if (
                this.activeRequests < this.rateLimitConfig.maxConcurrent &&
                this.requestTimestamps.length < this.rateLimitConfig.maxConcurrent
            ) {
                return;
            }

            await this.delay(100); // Check again after 100ms
        }
    }

    /**
     * Main method to execute an operation with rate limiting and retry logic
     * Ensures operations don't exceed rate limits and handles retries on failure
     */
    public async execute<T>(operation: () => Promise<T>): Promise<T> {
        await this.waitForAvailableSlot();

        this.activeRequests++;
        this.requestTimestamps.push(Date.now());

        try {
            return await this.executeWithRetry(operation);
        } finally {
            this.activeRequests--;
        }
    }
} 