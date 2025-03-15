// Import required dependencies
import { Auth, RegisterUrl, RegisterUrlError, NetworkError, ValidationError, AuthenticationError } from 'mpesajs';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Interface for URL registration configuration
 */
interface UrlRegistrationConfig {
    consumerKey: string;
    consumerSecret: string;
    shortCode: string;
    responseType: 'Completed' | 'Cancelled';
    confirmationUrl: string;
    validationUrl: string;
}

/**
 * Validates URL registration configuration
 * @param config Configuration to validate
 * @throws ValidationError if any required field is missing or invalid
 */
function validateConfig(config: UrlRegistrationConfig): void {
    // Check required fields
    const requiredFields = ['consumerKey', 'consumerSecret', 'shortCode', 'confirmationUrl', 'validationUrl'];
    for (const field of requiredFields) {
        if (!config[field as keyof UrlRegistrationConfig]) {
            throw new ValidationError(`${field} is required`, field);
        }
    }

    // Validate URLs
    if (!config.confirmationUrl.startsWith('https://')) {
        throw new ValidationError('Confirmation URL must use HTTPS protocol', 'confirmationUrl');
    }
    if (!config.validationUrl.startsWith('https://')) {
        throw new ValidationError('Validation URL must use HTTPS protocol', 'validationUrl');
    }
}

/**
 * Loads URL registration configuration from environment variables
 * @returns Configuration object for URL registration
 * @throws ValidationError if required environment variables are missing
 */
function loadConfig(): UrlRegistrationConfig {
    const config = {
        consumerKey: process.env.CONSUMER_KEY || '',
        consumerSecret: process.env.CONSUMER_SECRET || '',
        shortCode: process.env.BUSINESS_SHORTCODE || '',
        responseType: (process.env.RESPONSE_TYPE || 'Completed') as 'Completed' | 'Cancelled',
        confirmationUrl: process.env.CONFIRMATION_URL || 'https://example.com/confirmation',
        validationUrl: process.env.VALIDATION_URL || 'https://example.com/validation'
    };

    validateConfig(config);
    return config;
}

/**
 * Registers URLs with M-Pesa API
 * @returns Promise that resolves when URLs are registered
 * @throws AuthenticationError if authentication fails
 * @throws RegisterUrlError if URL registration fails
 * @throws NetworkError if network connection fails
 * @throws ValidationError if required parameters are invalid
 */
async function registerUrls(): Promise<void> {
    try {
        // Load and validate configuration
        const config = loadConfig();

        // Initialize M-Pesa client with authentication
        const auth = new Auth(config.consumerKey, config.consumerSecret);
        const register = new RegisterUrl(config.consumerKey, true);

        // Register URLs
        const response = await register.register(
            config.shortCode,
            config.responseType,
            'RegisterURL',
            config.confirmationUrl,
            config.validationUrl
        );

        console.log('URLs registered successfully:', {
            responseCode: response.responseCode,
            responseMessage: response.responseMessage,
            customerMessage: response.customerMessage,
            timestamp: response.timestamp
        });

    } catch (error) {
        if (error instanceof AuthenticationError) {
            console.error('Authentication failed:', error.message);
            console.error('Error code:', error.errorCode);
            throw error;
        }

        if (error instanceof RegisterUrlError) {
            console.error('URL registration failed:', error.message);
            console.error('Response code:', error.responseCode);
            throw error;
        }

        if (error instanceof NetworkError) {
            console.error('Network error:', error.message);
            throw error;
        }

        if (error instanceof ValidationError) {
            console.error('Validation error:', error.message);
            console.error('Invalid field:', error.field);
            throw error;
        }

        // Handle unexpected errors
        console.error('An unexpected error occurred:', error);
        throw new Error('Failed to register URLs due to an unexpected error');
    }
}

// Execute URL registration
registerUrls()
    .catch(error => {
        process.exit(1);
    });