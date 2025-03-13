import axios from 'axios';
import base64 from 'base-64';

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
     * @throws Error if token generation fails
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

            if (response.data.access_token) {
                return response.data.access_token;
            } else {
                throw new Error('Failed to generate token: No access token received');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(`Failed to generate token: ${errorMessage}`);
        }
    }
}