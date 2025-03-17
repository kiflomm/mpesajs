import axios, { AxiosError } from 'axios';
import { Auth } from './auth';
import { MpesaError, PayoutErrorHandler } from './errors/ErrorHandlers';
import { randomUUID } from 'crypto';
import { RateLimiter } from './utils/RateLimiter';
import { getEnvVar } from './utils/env';

/**
 * Response interface for successful B2C payout
 */
interface PayoutResponse {
    ConversationID: string;            // Unique identifier for tracking the transaction
    OriginatorConversationID: string;  // The unique request identifier from your system
    ResponseCode: string;              // Response code from M-Pesa
    ResponseDescription: string;       // Description of the response status
}


interface PayoutPayload {
    OriginatorConversationID: string;  // Unique identifier for the request
    InitiatorName: string;             // The name of the initiator initiating the request
    SecurityCredential: string;        // Encrypted security credential
    CommandID: 'BusinessPayment' | 'SalaryPayment' | 'PromotionPayment';  // Type of B2C payment
    PartyA: string;                    // Organization's shortcode initiating the transaction
    PartyB: string;                    // Phone number receiving the transaction
    Amount: number;                    // Amount to be transacted
    Remarks: string;                   // Comments about the transaction
    Occassion?: string;               // Optional comments about the transaction
    QueueTimeOutURL: string;          // Timeout URL for failed requests
    ResultURL: string;                // URL for receiving transaction results
}

/**
 * Class to handle M-Pesa B2C payment functionality
 * Allows businesses to send money to customers
 */
export class Payout {
    private readonly baseUrl: string;
    private readonly auth: Auth;
    private readonly initiatorName: string;
    private readonly securityCredential: string;
    private readonly rateLimiter: RateLimiter;

    /**
     * Creates an instance of Payout
     * @param auth - Instance of Auth class for token generation
     * @param initiatorName - Name of the initiator making the request
     * @param securityCredential - Encrypted security credential
     * @param sandbox - Whether to use sandbox environment
     */
    constructor(
        auth: Auth,
        initiatorName: string = getEnvVar('MPESA_INITIATOR_NAME', ''),
        securityCredential: string = getEnvVar('MPESA_SECURITY_CREDENTIAL', ''),
        sandbox: boolean = getEnvVar('MPESA_SANDBOX', 'true').toLowerCase() === 'true'
    ) {
        this.auth = auth;
        this.initiatorName = initiatorName;
        this.securityCredential = securityCredential;
        this.baseUrl = sandbox
            ? 'https://apisandbox.safaricom.et/mpesa/b2c/v2/paymentrequest'
            : 'https://api.safaricom.et/mpesa/b2c/v2/paymentrequest';
        this.rateLimiter = RateLimiter.getInstance();
    }

    /**
     * Validates the URLs are HTTPS
     * @param queueTimeoutUrl - URL for timeout notifications
     * @param resultUrl - URL for result notifications
     */
    private validateUrls(queueTimeoutUrl: string, resultUrl: string): void {
        if (!queueTimeoutUrl.startsWith('https://') || !resultUrl.startsWith('https://')) {
            throw new MpesaError('Both queue timeout and result URLs must use HTTPS protocol');
        }
    }

    /**
     * Validates the phone number format
     * @param phoneNumber - Customer's phone number
     */
    private validatePhoneNumber(phoneNumber: string): void {
        if (!phoneNumber.match(/^251[7-9][0-9]{8}$/)) {
            throw new MpesaError('Phone number must start with 251 and be 12 digits long');
        }
    }

    /**
     * Builds the payload for payout request
     */
    private buildPayload(
        amount: number,
        remarks: string,
        occasion: string,
        commandId: PayoutPayload['CommandID'],
        shortCode: string,
        phoneNumber: string,
        queueTimeoutUrl: string,
        resultUrl: string,
    ): PayoutPayload {
        return {
            OriginatorConversationID: `Partner name -${randomUUID()}`,
            InitiatorName: this.initiatorName,
            SecurityCredential: this.securityCredential,
            CommandID: commandId,
            PartyA: shortCode,
            PartyB: phoneNumber,
            Amount: amount,
            Remarks: remarks,
            Occassion: occasion,
            QueueTimeOutURL: queueTimeoutUrl,
            ResultURL: resultUrl
        };
    }

    /**
     * Sends money to a customer's M-Pesa account
     * @param shortCode - Organization's shortcode
     * @param phoneNumber - Customer's phone number (must start with 251)
     * @param amount - Amount to send
     * @param commandId - Type of payment (BusinessPayment, SalaryPayment, or PromotionPayment)
     * @param remarks - Comments about the transaction
     * @param queueTimeoutUrl - URL for timeout notifications
     * @param resultUrl - URL for result notifications
     * @param occasion - Optional additional comments
     * @returns Promise containing the payout response
     * @throws MpesaError if the request fails
     */
    public async send(
        amount: number,
        remarks: string,
        shortCode: string = getEnvVar('MPESA_BUSINESS_SHORTCODE', ''),
        phoneNumber: string = getEnvVar('MPESA_PHONE_NUMBER', ''),
        commandId: PayoutPayload['CommandID'] = getEnvVar('MPESA_PAYOUT_COMMAND_ID', 'BusinessPayment') as PayoutPayload['CommandID'],
        queueTimeoutUrl: string = getEnvVar('MPESA_QUEUE_TIMEOUT_URL', ''),
        resultUrl: string = getEnvVar('MPESA_RESULT_URL', ''),
        occasion: string = 'Payout',
    ): Promise<PayoutResponse> {
        return this.rateLimiter.execute(async () => {
            try {
                // Validate inputs
                this.validateUrls(queueTimeoutUrl, resultUrl);
                this.validatePhoneNumber(phoneNumber);

                if (amount <= 0) {
                    throw new MpesaError('Amount must be greater than 0');
                }

                // Get access token
                const { token: accessToken } = await this.auth.generateToken();

                // Prepare and send request
                const payload = this.buildPayload(
                    amount,
                    remarks,
                    occasion,
                    commandId,
                    shortCode,
                    phoneNumber,
                    queueTimeoutUrl,
                    resultUrl,
                );

                const response = await axios.post(this.baseUrl, payload, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                // Handle successful response
                if (response.data?.ResponseCode === '0') {
                    return {
                        ConversationID: response.data.ConversationID,
                        OriginatorConversationID: response.data.OriginatorConversationID,
                        ResponseCode: response.data.ResponseCode,
                        ResponseDescription: response.data.ResponseDescription
                    };
                }


                PayoutErrorHandler.handle(response.data);
            } catch (error) {
                if (error instanceof AxiosError) {
                    // PayoutErrorHandler.handle(error.response?.data);
                }
                PayoutErrorHandler.handle(error);
            }
        });
    }
} 