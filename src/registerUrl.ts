import axios from 'axios';
/**
 * Response type for Register URL API
 */
interface RegisterUrlResponse {
    responseCode: string;
    responseMessage: string;
    customerMessage: string;
    timestamp: string;
}

/**
 * RegisterUrl class handles the registration of validation and confirmation URLs
 * for handling transaction notifications from M-PESA
 */
export class RegisterUrl {
    private baseUrl: string;
    private apiKey: string;

    /**
     * Creates an instance of RegisterUrl class
     * @param apiKey - The customer key (API key) for authentication
     * @param sandbox - Whether to use sandbox environment (default: true)
     */
    constructor(apiKey: string, sandbox: boolean = true) {
        this.apiKey = apiKey;
        this.baseUrl = sandbox
            ? 'https://apisandbox.safaricom.et/v1/c2b-register-url/register'
            : 'https://api.safaricom.et/v1/c2b-register-url/register';
    }

    /**
     * Registers validation and confirmation URLs for receiving payment notifications
     * @param shortCode - The organization's shortcode (till number)
     * @param confirmationUrl - URL that receives the confirmation request from API upon payment completion
     * @param validationUrl - URL that receives the validation request from the API upon payment submission
     * @param responseType - Response type for validation URL (Completed or Cancelled)
     * @returns Promise containing the registration response
     * @throws Error if the request fails
     */
    public async register(
        shortCode: string,
        responseType: 'Completed' | 'Cancelled' = 'Completed',
        commandId: string = 'RegisterURL',
        confirmationUrl: string,
        validationUrl: string,
    ): Promise<RegisterUrlResponse> {
        try {
            // Validate URLs are HTTPS
            if (!confirmationUrl.startsWith('https://') || !validationUrl.startsWith('https://')) {
                throw new Error('Both confirmation and validation URLs must use HTTPS protocol');
            }

            // Prepare request payload
            const payload = {
                ShortCode: shortCode,
                ResponseType: responseType,
                CommandID: commandId,
                ConfirmationURL: confirmationUrl,
                ValidationURL: validationUrl
            };

            // Send registration request
            const response = await axios.post(this.baseUrl, payload, {
                params: {
                    apikey: this.apiKey
                }
            });
            // Handle successful response
            if (response.data) {
                return {
                    responseCode: response.data.header.responseCode,
                    responseMessage: response.data.header.responseMessage,
                    customerMessage: response.data.header.customerMessage,
                    timestamp: response.data.header.timestamp
                };
            }

            throw new Error('Invalid response received from the API');

        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    // Handle API errors
                    const data = error.response.data;
                    if (data.responseCode === '400') {
                        throw new Error('Short Code already Registered');
                    }
                    throw new Error(`API Error: ${data.responseMessage || 'Unknown error occurred'}`);
                } else if (error.request) {
                    throw new Error('No response received from the API. Please check your network connection.');
                }
                throw new Error(`Request failed: ${error.message}`);
            }
            throw error;
        }
    }
} 