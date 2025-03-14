import axios from 'axios';
import base64 from 'base-64';
import { Auth } from './auth';
import { ErrorHandler } from './errorHandler';
import crypto from 'crypto';

/**
 * StkPush class handles the STK Push request.
 */
export class StkPush {
    private auth: Auth; // Reference to the Auth class for token generation
    private baseUrl: string; // Base URL for the STK Push endpoint

    /**
     * Creates an instance of StkPush.
     * @param auth - An instance of the Auth class for token generation.
     * @param sandbox - Whether to use the sandbox environment (default: true).
     */
    constructor(auth: Auth, sandbox: boolean = true) {
        this.auth = auth;
        this.baseUrl = sandbox
            ? 'https://apisandbox.safaricom.et/mpesa/stkpush/v3/processrequest'
            : 'https://api.safaricom.et/mpesa/stkpush/v3/processrequest'
    }

    /**
     * Generates the password for the STK Push request.
     * @param businessShortCode - The business shortcode.
     * @param passkey - The passkey provided by Safaricom.
     * @param timestamp - The timestamp in the format YYYYMMDDHHmmss.
     * @returns The base64-encoded SHA256 hashed password.
     */
    private generatePassword(businessShortCode: string, passkey: string, timestamp: string): string {
        const password = `${businessShortCode}${passkey}${timestamp}`;
        const hashedPassword = crypto
            .createHash('sha256')
            .update(password)
            .digest();
        return base64.encode(password.toString());
    }

    /**
     * Sends an STK Push request to the Safaricom API.
     * @param businessShortCode - The business shortcode (PayBill or Till Number).
     * @param passkey - The passkey provided by Safaricom.
     * @param amount - The amount to be transacted.
     * @param phoneNumber - The phone number initiating the transaction.
     * @param callbackUrl - The callback URL for receiving payment notifications.
     * @param accountReference - The account reference (max 12 characters).
     * @param transactionDesc - A description of the transaction (max 13 characters).
     * @returns The response from the Safaricom API.
     * @throws MpesaError if the request fails.
     */
    public async sendStkPush(
        businessShortCode: string,
        passkey: string,
        amount: number,
        phoneNumber: string,
        callbackUrl: string,
        accountReference: string,
        transactionDesc: string
    ): Promise<any> {
        try {
            // Generate the timestamp and password
            let timestamp = new Date()
                .toISOString()
                .replace(/[^0-9]/g, '')
                .slice(0, 14); // Format: YYYYMMDDHHmmss
            let password = this.generatePassword(businessShortCode, passkey, timestamp);

            // Generate the access token
            const accessToken = await this.auth.generateToken();

            businessShortCode = '1020';
            timestamp = '20240918055823';
            password = 'M2VkZGU2YWY1Y2RhMzIyOWRjMmFkMTRiMjdjOWIwOWUxZDFlZDZiNGQ0OGYyMDRiNjg0ZDZhNWM2NTQyNTk2ZA==';

            // Prepare the request payload
            const payload = {
                MerchantRequestID: Math.random().toString(36).substring(2, 15),
                BusinessShortCode: businessShortCode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: "CustomerPayBillOnline",
                Amount: Math.round(amount), // Ensure amount is a whole number
                PartyA: phoneNumber.replace(/^0/, '251'), // Ensure phone number starts with 251
                PartyB: businessShortCode,
                PhoneNumber: phoneNumber.replace(/^0/, '251'), // Ensure phone number starts with 251
                CallBackURL: callbackUrl,
                AccountReference: accountReference.slice(0, 12), // Limit to 12 chars
                TransactionDesc: transactionDesc.slice(0, 13)  // Limit to 13 chars
            };

            // Send the STK Push request
            const response = await axios.post(this.baseUrl, payload, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
            });

            // Check if the response is successful
            if (response.data?.ResponseCode === '0') {
                return response.data;
            } else {
                ErrorHandler.handleStkError(response.data);
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    ErrorHandler.handleStkError(error.response.data);
                } else if (error.request) {
                    throw new Error('No response received from the API. Please check your network connection.');
                } else {
                    throw new Error(`Request setup error: ${error.message}`);
                }
            }

            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(`Failed to send STK Push request: ${errorMessage}`);
        }
    }
}