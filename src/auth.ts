import axios, { AxiosError } from 'axios';
import base64 from 'base-64';
import { ErrorHandler, MpesaError, AuthenticationError } from './errorHandler';

/**
 * Auth class handles authentication with the M-Pesa API
 * by generating access tokens using consumer credentials.
 * This class provides functionality to generate OAuth tokens
 * required for authenticating API requests to the M-Pesa system.
 */
export class Auth {
    /** Consumer key provided by M-Pesa developer portal */
    private consumerKey: string;

    /** Consumer secret provided by M-Pesa developer portal */
    private consumerSecret: string;

    /** 
     * Base URL for the token generation endpoint.
     * Different URLs are used for sandbox and production environments.
     */
    private baseUrl: string;

    /**
     * Creates an instance of Auth class
     * @param consumerKey - The consumer key obtained from M-Pesa developer portal
     * @param consumerSecret - The consumer secret obtained from M-Pesa developer portal
     * @param sandbox - Boolean flag to determine environment:
     *                  true for sandbox/testing environment (default)
     *                  false for production environment
     */
    constructor(consumerKey: string, consumerSecret: string, sandbox: boolean = true) {
        this.consumerKey = consumerKey;
        this.consumerSecret = consumerSecret;
        this.baseUrl = sandbox
            ? 'https://apisandbox.safaricom.et/v1/token/generate'
            : 'https://api.safaricom.et/v1/token/generate';
    }

    /**
     * Generates an access token for M-Pesa API authentication.
     * The method:
     * 1. Combines consumer key and secret
     * 2. Base64 encodes the credentials
     * 3. Makes HTTP GET request to token endpoint
     * 4. Processes the response to extract token
     * 
     * @returns Promise containing an object with:
     *          - token: The access token string for API authentication
     *          - expiresIn: Token validity period in seconds
     * 
     * @throws MpesaError with specific error codes and messages based on the API response
     * @throws Error for network issues or invalid responses
     * 
     * @example
     * ```typescript
     * const auth = new Auth('your-key', 'your-secret');
     * const {token, expiresIn} = await auth.generateToken();
     * ```
     */

    /**
     * Generates an authentication token for M-Pesa API access.
     * 
     * This method:
     * 1. Combines the consumer key and secret
     * 2. Base64 encodes the credentials
     * 3. Makes an HTTP GET request to the token endpoint
     * 4. Returns the access token and expiry time
     * 
     * @returns Promise containing an object with:
     *          - token: The access token string for API authentication
     *          - expiresIn: Token validity period in seconds
     * 
     * @throws {Error} If network connection fails or no response received
     * @throws {Error} If request setup fails
     * @throws {Error} If API returns error response
     */
    public async generateToken(): Promise<{ token: string; tokenType: string; expiresIn: number }> {
        // Combine consumer key and secret with colon separator
        const credentials = `${this.consumerKey}:${this.consumerSecret}`;
        // Base64 encode the credentials for Basic Auth
        const encodedCredentials = base64.encode(credentials);

        try {
            // Make GET request to/ token endpoint with credentials
            const response = await axios.get(this.baseUrl, {
                params: {
                    grant_type: 'client_credentials', // Required grant type for OAuth 2.0
                },
                headers: {
                    Authorization: `Basic ${encodedCredentials}`, // Add encoded credentials to Authorization header
                },
            });

            // Check if response contains valid token data
            if (response.data && response.data.access_token) {
                // Return token and expiry time if successful
                return { token: response.data.access_token, tokenType: response.data.token_type, expiresIn: response.data.expires_in };
            } else {
                // Handle invalid response format
                throw new AuthenticationError('Unknown authentication error occurred');
            }
        } catch (error) {
            if (error instanceof AxiosError) {
                // Handle API response errors
                if (error.response?.data) {
                    return ErrorHandler.handleAuthError(error.response.data);
                }

                // Handle network errors (no response received)
                if (error.request || error.code === 'ECONNABORTED') {
                    throw new MpesaError('No response received from the API. Please check your network connection.');
                }

                // Handle request setup errors
                throw new MpesaError(`Failed to generate token: ${error.message}`);
            }

            // If it's an AuthenticationError, rethrow it
            if (error instanceof AuthenticationError) {
                throw error;
            }

            // For any other error, wrap it in MpesaError
            throw new MpesaError(`Failed to generate token: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
        }
    }
}