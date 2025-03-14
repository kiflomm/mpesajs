import axios from 'axios';
import base64 from 'base-64';
import { ErrorHandler } from './errorHandler';

/**
 * Auth class handles authentication with the M-Pesa API
 * by generating access tokens using consumer credentials
 */
export class Auth {
    /** Consumer key provided by M-Pesa */
    private consumerKey: string;

    /** Consumer secret provided by M-Pesa */
    private consumerSecret: string;

    /** Base URL for the token generation endpoint */
    private baseUrl: string;

    /**
     * Creates an instance of Auth class
     * @param consumerKey - The consumer key from M-Pesa
     * @param consumerSecret - The consumer secret from M-Pesa  
     * @param sandbox - Whether to use sandbox environment (default: true)
     */
    constructor(consumerKey: string, consumerSecret: string, sandbox: boolean = true) {
        this.consumerKey = consumerKey;
        this.consumerSecret = consumerSecret;
        this.baseUrl = sandbox
            ? 'https://apisandbox.safaricom.et/v1/token/generate'
            : 'https://api.safaricom.et/v1/token/generate';
    }

    /**
     * Generates an access token for M-Pesa API authentication
     * @returns Promise containing the access token string
     * @throws MpesaError with specific error codes and messages based on the API response
     */
    public async generateToken(): Promise<string> {
        const credentials = `${this.consumerKey}:${this.consumerSecret}`;
        const encodedCredentials = base64.encode(credentials);

        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    grant_type: 'client_credentials',
                },
                headers: {
                    Authorization: `Basic ${encodedCredentials}`,
                },
            });

            if (response.data && response.data.access_token) {
                return response.data.access_token;
            } else {
                ErrorHandler.handleAuthError(response.data);
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    ErrorHandler.handleAuthError(error.response.data);
                } else if (error.request) {
                    throw new Error('No response received from the API. Please check your network connection.');
                } else {
                    throw new Error(`Request setup error: ${error.message}`);
                }
            }

            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(`Failed to generate token: ${errorMessage}`);
        }
    }
}