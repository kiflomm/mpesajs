// Import required dependencies from mpesajs library and dotenv
import { Auth, StkPush, StkPushError, NetworkError, ValidationError, AuthenticationError } from 'mpesajs';
import dotenv from 'dotenv';

// Load environment variables from .env file into process.env
dotenv.config();

/**
 * Interface defining required M-Pesa API configuration settings
 * Contains credentials and settings needed to interact with M-Pesa API
 */
interface MpesaConfig {
    consumerKey: string;      // API consumer key for authentication
    consumerSecret: string;   // API consumer secret for authentication
    sandbox: boolean;         // Whether to use sandbox/test environment
    businessShortCode: string; // Business shortcode or till number
    passkey: string;         // API passkey for transaction security
}

/**
 * Interface defining payment transaction parameters
 * Contains details needed to initiate an STK push payment
 */
interface PaymentDetails {
    amount: number;          // Payment amount in KES
    phoneNumber: string;     // Customer phone number to receive STK push
    callbackUrl: string;     // URL to receive payment notification
    reference: string;       // Merchant reference number for the transaction
    description: string;     // Description of what the payment is for
}

/**
 * Validates M-Pesa configuration
 * @param config Configuration object to validate
 * @throws ValidationError if any required field is missing
 */
function validateConfig(config: MpesaConfig): void {
    const requiredFields = ['consumerKey', 'consumerSecret', 'businessShortCode', 'passkey'];
    for (const field of requiredFields) {
        if (!config[field as keyof MpesaConfig]) {
            throw new ValidationError(`${field} is required`, field);
        }
    }
}

/**
 * Validates payment details
 * @param details Payment details to validate
 * @throws ValidationError if any required field is missing or invalid
 */
function validatePaymentDetails(details: PaymentDetails): void {
    // Validate amount
    if (details.amount <= 0) {
        throw new ValidationError('Amount must be greater than 0', 'amount');
    }

    // Validate phone number format
    if (!/^251[7-9][0-9]{8}$/.test(details.phoneNumber)) {
        throw new ValidationError('Invalid phone number format. Must start with 251 and be 12 digits long', 'phoneNumber');
    }

    // Validate callback URL
    if (!details.callbackUrl.startsWith('https://')) {
        throw new ValidationError('Callback URL must use HTTPS protocol', 'callbackUrl');
    }

    // Validate reference and description length
    if (details.reference.length > 12) {
        throw new ValidationError('Reference must not exceed 12 characters', 'reference');
    }

    if (details.description.length > 13) {
        throw new ValidationError('Description must not exceed 13 characters', 'description');
    }
}

/**
 * Loads M-Pesa configuration settings from environment variables
 * @returns {MpesaConfig} Object containing M-Pesa configuration settings
 * @throws ValidationError if required environment variables are missing
 */
function loadMpesaConfig(): MpesaConfig {
    const config = {
        consumerKey: process.env.CONSUMER_KEY || '',
        consumerSecret: process.env.CONSUMER_SECRET || '',
        sandbox: process.env.SANDBOX === 'false' ? false : true,
        businessShortCode: process.env.BUSINESS_SHORTCODE || '',
        passkey: process.env.PASSKEY || ''
    };

    validateConfig(config);
    return config;
}

/**
 * Creates payment details object with test values from env vars
 * @returns {PaymentDetails} Object containing payment transaction details
 * @throws ValidationError if payment details are invalid
 */
function createPaymentDetails(): PaymentDetails {
    const details = {
        amount: Number(process.env.MPESA_TEST_AMOUNT) || 20,
        phoneNumber: process.env.MPESA_TEST_PHONE || '251700404709',
        callbackUrl: process.env.MPESA_CALLBACK_URL || 'https://www.myservice:8080/result',
        reference: process.env.MPESA_TEST_REFERENCE || 'INV001233423',
        description: process.env.MPESA_TEST_DESCRIPTION || 'max 13 chars'
    };

    validatePaymentDetails(details);
    return details;
}

/**
 * Initiates an M-Pesa STK Push payment request
 * @returns {Promise<void>}
 * @throws AuthenticationError if authentication fails
 * @throws StkPushError if STK push request fails
 * @throws NetworkError if network connection fails
 * @throws ValidationError if required parameters are invalid
 */
async function initiatePayment(): Promise<void> {
    try {
        // Load and validate configuration
        const config = loadMpesaConfig();

        // Initialize M-Pesa client with authentication
        const mpesa = new StkPush(new Auth(config.consumerKey, config.consumerSecret));

        // Get and validate payment details
        const paymentDetails = createPaymentDetails();

        // Send STK push request to M-Pesa API
        const response = await mpesa.sendStkPush(
            config.businessShortCode,
            config.passkey,
            paymentDetails.amount,
            paymentDetails.phoneNumber,
            paymentDetails.callbackUrl,
            paymentDetails.reference,
            paymentDetails.description
        );

        console.log('Payment initiated successfully:', {
            MerchantRequestID: response.MerchantRequestID,
            CheckoutRequestID: response.CheckoutRequestID,
            ResponseDescription: response.ResponseDescription,
            CustomerMessage: response.CustomerMessage
        });

    } catch (error) {
        if (error instanceof AuthenticationError) {
            console.error('Authentication failed:', error.message);
            console.error('Error code:', error.errorCode);
            throw error;
        }

        if (error instanceof StkPushError) {
            console.error('STK Push failed:', error.message);
            console.error('Response code:', error.responseCode);
            console.error('Merchant request ID:', error.merchantRequestId);
            console.error('Checkout request ID:', error.checkoutRequestId);
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
        throw new Error('Failed to initiate payment due to an unexpected error');
    }
}

// Execute the payment initiation
initiatePayment()
    .catch(error => {
        process.exit(1);
    });