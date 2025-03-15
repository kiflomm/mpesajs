import axios from 'axios';
import { ErrorHandler, MpesaError } from './errorHandler';

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
    CommandID: string;        // Command identifier for the registration
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

    /**
     * Creates an instance of RegisterUrl
     * @param apiKey - M-Pesa API key for authentication
     * @param sandbox - Whether to use sandbox environment (default: true)
     */
    constructor(apiKey: string, sandbox: boolean = true) {
        this.apiKey = apiKey;
        this.baseUrl = sandbox
            ? 'https://apisandbox.safaricom.et/v1/c2b-register-url/register'
            : 'https://api.safaricom.et/v1/c2b-register-url/register';
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
        responseType: 'Completed' | 'Cancelled',
        commandId: string,
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
            ErrorHandler.handleRegisterUrlError(response.data);
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
     * @throws MpesaError if registration fails or validation errors occur
     */
    public async register(
        shortCode: string,
        responseType: 'Completed' | 'Cancelled' = 'Completed',
        commandId: string = 'RegisterURL',
        confirmationUrl: string,
        validationUrl: string,
    ): Promise<RegisterUrlResponse> {
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
            ErrorHandler.handleRegisterUrlError(error);
        }
    }
}