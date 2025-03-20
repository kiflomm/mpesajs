import axios, { AxiosError } from 'axios';
import base64 from 'base-64';
import { Auth } from './auth';
import { MpesaError, StkPushError, NetworkError, ValidationError, StkPushErrorHandler, ValidationErrorHandler } from './errors/ErrorHandlers';
import crypto from 'crypto';
import { RateLimiter } from './utils/RateLimiter';
import { getEnvVar } from './utils/env';

/**
 * Response interface for successful STK Push transactions.
 * 
 * @interface StkPushResponse
 * @property {string} MerchantRequestID - Unique identifier for the merchant request
 * @property {string} CheckoutRequestID - Unique identifier for the checkout/payment request
 * @property {string} ResponseCode - Response code from M-Pesa API (0 indicates success)
 * @property {string} ResponseDescription - Description of the response status
 * @property {string} CustomerMessage - Message that can be displayed to the customer
 */
interface StkPushResponse {
    MerchantRequestID: string;
    CheckoutRequestID: string;
    ResponseCode: string;
    ResponseDescription: string;
    CustomerMessage: string;
}

/**
 * STK Push  implementation for M-Pesa payment integration.
 * 
 * This class provides functionality to initiate mobile money payment requests to users
 * via the Safaricom M-Pesa STK Push API. It handles authentication, request validation,
 * rate limiting, and error management for M-Pesa payment processing.
 * 
 * @class StkPush
 */
export class StkPush {
    private auth: Auth;
    private baseUrl: string;
    private readonly rateLimiter: RateLimiter;

    /**
     * Creates an instance of the StkPush class.
     * 
     * @param {Auth} auth - The authentication instance for generating M-Pesa API tokens
     * @param {boolean} sandbox - Whether to use the sandbox (testing) environment 
     *                           (defaults to environment variable or true)
     */
    constructor(auth: Auth, sandbox: boolean = getEnvVar('MPESA_SANDBOX', 'true').toLowerCase() === 'true') {
        this.auth = auth;
        this.baseUrl = sandbox
            ? 'https://apisandbox.safaricom.et/mpesa/stkpush/v3/processrequest'
            : 'https://api.safaricom.et/mpesa/stkpush/v3/processrequest'
        this.rateLimiter = RateLimiter.getInstance();
    }

    /**
     * Validates the phone number format for M-Pesa transactions.
     * 
     * @private
     * @param {string} phoneNumber - The customer phone number to validate
     * @throws {ValidationError} If phone number format is invalid
     */
    private validatePhoneNumber(phoneNumber: string): void {
        if (!phoneNumber.match(/^251[7-9][0-9]{8}$/)) {
            throw new ValidationError('Phone number must start with 251 and be 12 digits long', 'phoneNumber');
        }
    }

    /**
     * Validates that the transaction amount is positive.
     * 
     * @private
     * @param {number} amount - The transaction amount to validate
     * @throws {ValidationError} If amount is not greater than 0
     */
    private validateAmount(amount: number): void {
        if (amount <= 0) {
            throw new ValidationError('Amount must be greater than 0', 'amount');
        }
    }

    /**
     * Validates that the callback URL uses HTTPS protocol.
     * 
     * @private
     * @param {string} callbackUrl - The callback URL to validate
     * @throws {ValidationError} If URL does not use HTTPS protocol
     */
    private validateCallbackUrl(callbackUrl: string): void {
        if (!callbackUrl.startsWith('https://')) {
            throw new ValidationError('Callback URL must use HTTPS protocol', 'callbackUrl');
        }
    }

    /**
     * Validates that the account reference does not exceed maximum length.
     * 
     * @private
     * @param {string} accountReference - The account reference to validate
     * @throws {ValidationError} If account reference exceeds 12 characters
     */
    private validateAccountReference(accountReference: string): void {
        if (accountReference.length > 12) {
            throw new ValidationError('Account reference must not exceed 12 characters', 'accountReference');
        }
    }

    /**
     * Validates that the transaction description does not exceed maximum length.
     * 
     * @private
     * @param {string} transactionDesc - The transaction description to validate
     * @throws {ValidationError} If transaction description exceeds 13 characters
     */
    private validateTransactionDesc(transactionDesc: string): void {
        if (transactionDesc.length > 13) {
            throw new ValidationError('Transaction description must not exceed 13 characters', 'transactionDesc');
        }
    }

    /**
     * Validates all input parameters for an STK Push request.
     * 
     * @private
     * @param {string} businessShortCode - The business short code
     * @param {string} passkey - The passkey for generating the password
     * @param {number} amount - The transaction amount
     * @param {string} phoneNumber - The customer's phone number
     * @param {string} callbackUrl - The callback URL for transaction result
     * @param {string} accountReference - The account reference
     * @param {string} transactionDesc - The transaction description
     * @throws {ValidationError} If any parameter fails validation
     */
    private validateInputs(
        businessShortCode: string,
        passkey: string,
        amount: number,
        phoneNumber: string,
        callbackUrl: string,
        accountReference: string,
        transactionDesc: string
    ): void {
        if (!businessShortCode || !passkey) {
            throw new ValidationError('Business shortcode and passkey are required', 'credentials');
        }

        this.validateAmount(amount);
        this.validatePhoneNumber(phoneNumber);
        this.validateCallbackUrl(callbackUrl);
        this.validateAccountReference(accountReference);
        this.validateTransactionDesc(transactionDesc);
    }

    /**
     * Generates the secure password required for STK Push API requests.
     * 
     * The password is generated by concatenating the business short code, passkey, and timestamp,
     * then applying SHA-256 hashing and Base64 encoding.
     * 
     * @private
     * @param {string} businessShortCode - The business short code
     * @param {string} passkey - The passkey provided by M-Pesa
     * @param {string} timestamp - The transaction timestamp
     * @returns {string} The generated Base64-encoded password
     */
    private generatePassword(businessShortCode: string, passkey: string, timestamp: string): string {
        const password = `${businessShortCode}${passkey}${timestamp}`;
        const hashedPassword = crypto
            .createHash('sha256')
            .update(password)
            .digest();
        return base64.encode(hashedPassword.toString());
    }

    /**
     * Initiates an STK Push transaction to request payment from a customer.
     * 
     * This method handles the entire STK Push process:
     * - Validates all input parameters
     * - Generates the required security credentials
     * - Obtains an access token for the M-Pesa API
     * - Creates and sends the API request with proper rate limiting
     * - Handles success and error responses
     * 
     * The method uses environment variables for optional parameters if not explicitly provided.
     * 
     * @param {number} amount - The amount to be paid
     * @param {string} transactionDesc - Description of the transaction (max 13 chars)
     * @param {string} accountReference - Reference for the transaction (max 12 chars)
     * @param {string} [businessShortCode] - The business short code (defaults to env var)
     * @param {string} [passkey] - The passkey for password generation (defaults to env var)
     * @param {string} [phoneNumber] - The customer's phone number (defaults to env var)
     * @param {string} [callbackUrl] - The callback URL for results (defaults to env var)
     * @returns {Promise<StkPushResponse>} A promise resolving to the M-Pesa API response
     * @throws {ValidationError} If any input parameter is invalid
     * @throws {NetworkError} If there are connectivity issues
     * @throws {StkPushError} If the M-Pesa API returns an error
     * @throws {MpesaError} For other failures during the process
     */
    public async sendStkPush(
        amount: number,
        transactionDesc: string,
        accountReference: string,
        businessShortCode: string = getEnvVar('MPESA_BUSINESS_SHORTCODE', ''),
        passkey: string = getEnvVar('MPESA_PASSKEY', ''),
        phoneNumber: string = getEnvVar('MPESA_PHONE_NUMBER', ''),
        callbackUrl: string = getEnvVar('MPESA_CALLBACK_URL', ''),
    ): Promise<StkPushResponse> {
        return this.rateLimiter.execute(async () => {
            try {
                this.validateInputs(
                    businessShortCode,
                    passkey,
                    amount,
                    phoneNumber,
                    callbackUrl,
                    accountReference,
                    transactionDesc
                );

                const timestamp = new Date()
                    .toISOString()
                    .replace(/[^0-9]/g, '')
                    .slice(0, 14);
                const password = this.generatePassword(businessShortCode, passkey, timestamp);

                const { token: accessToken } = await this.auth.generateToken();

                const payload = {
                    MerchantRequestID: crypto.randomUUID().replace(/-/g, '').slice(0, 20),
                    BusinessShortCode: businessShortCode,
                    Password: password,
                    Timestamp: timestamp,
                    TransactionType: "CustomerPayBillOnline",
                    Amount: Math.round(amount),
                    PartyA: phoneNumber.replace(/^0/, '251'),
                    PartyB: businessShortCode,
                    PhoneNumber: phoneNumber.replace(/^0/, '251'),
                    CallBackURL: callbackUrl,
                    AccountReference: accountReference.slice(0, 12),
                    TransactionDesc: transactionDesc.slice(0, 13)
                };

                const response = await axios.post(this.baseUrl, payload, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.data?.ResponseCode === '0') {
                    return response.data as StkPushResponse;
                }

                StkPushErrorHandler.handle(response.data);
            } catch (error) {
                if (error instanceof ValidationError) {
                    throw error;
                }

                if (error instanceof AxiosError) {
                    if (error.response?.data) {
                        StkPushErrorHandler.handle(error.response.data);
                    }

                    if (error.request || error.code === 'ECONNABORTED') {
                        throw new NetworkError('No response received from the API. Please check your network connection.');
                    }

                    throw new MpesaError(`Failed to send STK Push request: ${error.message}`);
                }

                if (error instanceof StkPushError) {
                    throw error;
                }

                throw new MpesaError(`Failed to send STK Push request: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
            }
        });
    }
}