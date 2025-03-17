import axios, { AxiosError } from 'axios';
import { MpesaError, ValidationError, NetworkError, RegisterUrlError, RegisterUrlErrorHandler } from './errors/ErrorHandlers';
import { RateLimiter } from './utils/RateLimiter';
import { getEnvVar } from './utils/env';

/**
 * Response interface for URL registration containing status details
 */
interface RegisterUrlResponse {
    responseCode: string;      // Status code from the M-Pesa API
    responseMessage: string;   // Detailed message about the registration status
    customerMessage: string;   // User-friendly message about the registration
    timestamp: string;        // When the registration was processed
}

/**
 * Payload interface for URL registration request
 */
interface RegisterUrlPayload {
    ShortCode: string;        // Business short code or PayBill number
    ResponseType: 'Completed' | 'Cancelled';  // Type of response expected from M-Pesa
    CommandID: 'BusinessPayment' | 'SalaryPayment' | 'PromotionPayment';        // Command identifier for the registration
    ConfirmationURL: string;  // URL to receive successful transaction confirmations
    ValidationURL: string;    // URL to validate transactions before processing
}

/**
 * Class to handle M-Pesa URL registration functionality
 * Allows businesses to register their confirmation and validation URLs
 */
export class RegisterUrl {
    private readonly baseUrl: string;
    private readonly apiKey: string;
    private readonly rateLimiter: RateLimiter;

    /**
     * Creates an instance of RegisterUrl
     * @param apiKey - M-Pesa API key for authentication
     * @param sandbox - Whether to use sandbox environment
     */
    constructor(apiKey: string = getEnvVar('MPESA_CONSUMER_KEY', ''), sandbox: boolean = getEnvVar('MPESA_SANDBOX', 'true').toLowerCase() === 'true') {
        this.apiKey = apiKey;
        this.baseUrl = sandbox
            ? 'https://apisandbox.safaricom.et/v1/c2b-register-url/register'
            : 'https://api.safaricom.et/v1/c2b-register-url/register';
        this.rateLimiter = RateLimiter.getInstance();
    }

    /**
     * Validates that both URLs use HTTPS protocol
     * @param confirmationUrl - URL for successful transaction notifications
     * @param validationUrl - URL for transaction validation
     * @throws Error if URLs don't use HTTPS
     */
    private validateUrls(confirmationUrl: string, validationUrl: string): void {
        if (!confirmationUrl.startsWith('https://') || !validationUrl.startsWith('https://')) {
            throw new MpesaError('Both confirmation and validation URLs must use HTTPS protocol');
        }
    }

    /**
     * Builds the payload for URL registration request
     * @param shortCode - Business short code
     * @param responseType - Type of response expected
     * @param commandId - Command identifier
     * @param confirmationUrl - URL for confirmations
     * @param validationUrl - URL for validations
     * @returns Formatted payload object
     */
    private buildPayload(
        shortCode: string,
        responseType: RegisterUrlPayload['ResponseType'],
        commandId: RegisterUrlPayload['CommandID'],
        confirmationUrl: string,
        validationUrl: string
    ): RegisterUrlPayload {
        return {
            ShortCode: shortCode,
            ResponseType: responseType,
            CommandID: commandId,
            ConfirmationURL: confirmationUrl,
            ValidationURL: validationUrl
        };
    }

    /**
     * Parses and validates the API response
     * @param response - Raw API response
     * @returns Formatted RegisterUrlResponse object
     * @throws Error if response format is invalid
     */
    private parseResponse(response: any): RegisterUrlResponse {
        if (!response.data?.header) {
            RegisterUrlErrorHandler.handle(response.data);
        }

        const { responseCode, responseMessage, customerMessage, timestamp } = response.data.header;
        return { responseCode, responseMessage, customerMessage, timestamp };
    }

    /**
     * Registers validation and confirmation URLs with M-Pesa
     * @param shortCode - Business short code or PayBill number
     * @param responseType - Type of response expected (default: 'Completed')
     * @param commandId - Command identifier (default: 'RegisterURL')
     * @param confirmationUrl - HTTPS URL to receive successful transaction confirmations
     * @param validationUrl - HTTPS URL to validate transactions before processing
     * @returns Promise containing registration response details
     * @throws RegisterUrlError if registration fails
     * @throws NetworkError if network connection fails
     * @throws ValidationError if URLs are invalid
     * @throws MpesaError for other API errors
     */
    public async register(
        shortCode: string = getEnvVar('MPESA_BUSINESS_SHORTCODE', ''),
        responseType: RegisterUrlPayload['ResponseType'] = getEnvVar('MPESA_REGISTER_URL_RESPONSE_TYPE', '') as RegisterUrlPayload['ResponseType'],
        commandId: RegisterUrlPayload['CommandID'] = getEnvVar('MPESA_REGISTER_URL_COMMAND_ID', '') as RegisterUrlPayload['CommandID'],
        confirmationUrl: string = getEnvVar('MPESA_CONFIRMATION_URL', ''),
        validationUrl: string = getEnvVar('MPESA_VALIDATION_URL', '')
    ): Promise<RegisterUrlResponse> {
        return this.rateLimiter.execute(async () => {
            try {
                this.validateUrls(confirmationUrl, validationUrl);

                const payload = this.buildPayload(
                    shortCode,
                    responseType,
                    commandId,
                    confirmationUrl,
                    validationUrl
                );

                const response = await axios.post(this.baseUrl, payload, {
                    params: { apikey: this.apiKey }
                });

                return this.parseResponse(response);
            } catch (error) {
                if (error instanceof ValidationError) {
                    throw error;
                }

                if (error instanceof AxiosError) {
                    // Handle API response errors
                    if (error.response?.data) {
                        return RegisterUrlErrorHandler.handle(error.response.data);
                    }

                    // Handle network errors (no response received)
                    if (error.request || error.code === 'ECONNABORTED') {
                        throw new NetworkError('No response received from the API. Please check your network connection.');
                    }

                    // Handle request setup errors
                    throw new MpesaError(`Failed to register URLs: ${error.message}`);
                }

                // If it's already a RegisterUrlError, rethrow it
                if (error instanceof RegisterUrlError) {
                    throw error;
                }

                // For any other error, wrap it in MpesaError
                throw new MpesaError(`Failed to register URLs: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
            }
        });
    }
}