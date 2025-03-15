// Import required dependencies from mpesajs library and dotenv
import { Auth, StkPush } from 'mpesajs';
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
 * Loads M-Pesa configuration settings from environment variables
 * Provides fallback empty strings if env vars are not set
 * 
 * @returns {MpesaConfig} Object containing M-Pesa configuration settings
 */
function loadMpesaConfig(): MpesaConfig {
    return {
        consumerKey: process.env.CONSUMER_KEY || '',
        consumerSecret: process.env.CONSUMER_SECRET || '',
        // Default to sandbox mode unless explicitly set to 'false'
        sandbox: process.env.SANDBOX === 'false' ? false : true,
        businessShortCode: process.env.BUSINESS_SHORTCODE || '',
        passkey: process.env.PASSKEY || ''
    };
}

/**
 * Creates payment details object with test values from env vars
 * Falls back to default test values if env vars not set
 * 
 * @returns {PaymentDetails} Object containing payment transaction details
 */
function createPaymentDetails(): PaymentDetails {
    return {
        // Convert amount to number, default to 20 if not set
        amount: Number(process.env.MPESA_TEST_AMOUNT) || 20,
        // Default test phone number if not provided
        phoneNumber: process.env.MPESA_TEST_PHONE || '251700404709',
        // Callback URL for receiving payment notification
        callbackUrl: process.env.MPESA_CALLBACK_URL || 'https://www.myservice:8080/result',
        // Reference number for merchant records
        reference: process.env.MPESA_TEST_REFERENCE || 'INV001233423',
        // Payment description shown to customer
        description: process.env.MPESA_TEST_DESCRIPTION || 'Payment for goods'
    };
}

/**
 * Initiates an M-Pesa STK Push payment request
 * Creates M-Pesa client, loads config and payment details,
 * then sends the STK push request to customer's phone
 * 
 * @returns {Promise<void>}
 */
async function initiatePayment(): Promise<void> {
    // Load configuration from environment
    const config = loadMpesaConfig();

    // Initialize M-Pesa client with authentication
    const mpesa = new StkPush(new Auth(config.consumerKey, config.consumerSecret));

    try {
        // Get payment details
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

        console.log('Payment initiated successfully:', response);
    } catch (error) {
        console.error('Failed to initiate payment:', error);
    }
}

// Execute the payment initiation
initiatePayment();