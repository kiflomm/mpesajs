// Import required dependencies
import { RegisterUrl } from 'mpesajs';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Configuration type for M-Pesa URL registration
 * Contains API credentials and callback URLs needed for registration
 */
interface MpesaUrlConfig {
    apiKey: string;      // M-Pesa API key for authentication
    shortCode: string;   // Business short code or PayBill number
    urls: {
        confirmation: string;  // URL to receive successful transaction confirmations
        validation: string;   // URL to validate transactions before processing
    };
}

/**
 * Registers validation and confirmation URLs for M-Pesa transaction notifications
 * This is required to receive callbacks for transaction events
 * 
 * @returns Promise containing the registration response with:
 *  - responseCode: Status code of the registration
 *  - responseMessage: Detailed message about registration status
 *  - customerMessage: User-friendly message
 *  - timestamp: When registration was processed
 * @throws Error if registration fails or environment variables are missing
 */
async function registerMpesaUrl() {
    try {
        // Get credentials from environment variables
        const apiKey: string = process.env.CONSUMER_KEY || '';
        const shortCode: string = process.env.BUSINESS_SHORTCODE || '';

        // Create configuration object with credentials and URLs
        const config: MpesaUrlConfig = {
            apiKey: apiKey,
            shortCode: shortCode,
            urls: {
                confirmation: process.env.CONFIRMATION_URL || '', // URL for successful transaction notifications
                validation: process.env.VALIDATION_URL || ''     // URL for transaction validation
            }
        };

        // Initialize RegisterUrl instance with API key
        // Second parameter 'true' enables sandbox/test mode
        const registerUrl = new RegisterUrl(config.apiKey, true);

        // Send registration request to M-Pesa API
        const result = await registerUrl.register(
            config.shortCode,
            'Completed',      // Response type when transaction is completed
            'RegisterURL',    // Command ID for URL registration
            config.urls.confirmation,
            config.urls.validation
        );

        // Log registration response details
        console.log('Registration Details:', {
            responseCode: result.responseCode,
            responseMessage: result.responseMessage,
            customerMessage: result.customerMessage,
            timestamp: result.timestamp
        });

        return result;

    } catch (error) {
        // Log and re-throw any errors that occur
        console.error(error.message);
        throw error;
    }
}

// Execute the URL registration
registerMpesaUrl();