// Import required dependencies
import { Auth, RegisterUrl, RegisterUrlError, NetworkError, ValidationError, AuthenticationError } from 'mpesajs';

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

        // Initialize M-Pesa client with authentication
        // Using default values from environment variables
        const auth = new Auth();
        const register = new RegisterUrl();

        // Register URLs
        const response = await register.register();

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