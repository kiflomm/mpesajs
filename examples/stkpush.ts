// Import required dependencies from mpesajs library and dotenv
import { Auth, StkPush, StkPushError, NetworkError, ValidationError, AuthenticationError, MpesaError } from 'mpesajs';
import { getEnvVar } from '../src/utils/env';

// Load environment variables from .env file into process.env
// This is now handled by the env.ts utility functions

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
        consumerKey: getEnvVar('CONSUMER_KEY', ''),
        consumerSecret: getEnvVar('CONSUMER_SECRET', ''),
        sandbox: getEnvVar('SANDBOX', 'true').toLowerCase() === 'true' || getEnvVar('SANDBOX', 'true') === '1',
        businessShortCode: getEnvVar('BUSINESS_SHORTCODE', ''),
        passkey: getEnvVar('PASSKEY', '')
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
        amount: parseInt(getEnvVar('MPESA_TEST_AMOUNT', '20'), 10),
        phoneNumber: getEnvVar('MPESA_TEST_PHONE', '251700404709'),
        callbackUrl: getEnvVar('MPESA_CALLBACK_URL', 'https://www.myservice:8080/result'),
        reference: getEnvVar('MPESA_TEST_REFERENCE', 'INV001233423'),
        description: getEnvVar('MPESA_TEST_DESCRIPTION', 'max 13 chars')
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
 * @throws MpesaError for other M-Pesa related errors
 */
async function initiatePayment(): Promise<void> {
    try {
        // Load and validate configuration
        const config = loadMpesaConfig();

        // Initialize M-Pesa client with authentication
        // Using default values from environment variables
        const auth = new Auth();
        const mpesa = new StkPush(auth);

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

        // Log success response with detailed information
        console.log('Payment initiated successfully:', {
            MerchantRequestID: response.MerchantRequestID,
            CheckoutRequestID: response.CheckoutRequestID,
            ResponseDescription: response.ResponseDescription,
            CustomerMessage: response.CustomerMessage,
            ResponseCode: response.ResponseCode,
        });

    } catch (error) {
        // Handle authentication errors
        if (error instanceof AuthenticationError) {
            console.error('Authentication failed:');
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error code:', error.errorCode);
            throw error;
        }

        // Handle STK Push specific errors
        if (error instanceof StkPushError) {
            console.error('STK Push failed:');
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Response code:', error.responseCode);
            console.error('Merchant request ID:', error.merchantRequestId);
            console.error('Checkout request ID:', error.checkoutRequestId);
            throw error;
        }

        // Handle network connectivity errors
        if (error instanceof NetworkError) {
            console.error('Network error:');
            console.error('Error message:', error.message);
            console.error('Please check your internet connection and try again');
            throw error;
        }

        // Handle validation errors
        if (error instanceof ValidationError) {
            console.error('Validation error:');
            console.error('Error message:', error.message);
            console.error('Invalid field:', error.field);
            console.error('Please check your input parameters and try again');
            throw error;
        }

        // Handle general M-Pesa errors
        if (error instanceof MpesaError) {
            console.error('M-Pesa error:');
            console.error('Error message:', error.message);
            throw error;
        }

        // Handle unexpected errors
        console.error('An unexpected error occurred:');
        console.error('Error:', error);
        throw new Error('Failed to initiate payment due to an unexpected error');
    }
}

// Execute the payment initiation with proper error handling
initiatePayment()
    .catch(error => {
        process.exit(1);
    });