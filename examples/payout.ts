import { Auth, Payout, PayoutError, NetworkError, ValidationError, AuthenticationError } from 'mpesajs';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Interface for payout configuration
 */
interface PayoutConfig {
    consumerKey: string;
    consumerSecret: string;
    shortCode: string;
    queueTimeoutUrl: string;
    resultUrl: string;
}

/**
 * Interface for payout transaction details
 */
interface PayoutDetails {
    phoneNumber: string;
    amount: number;
    remarks: string;
    occasion?: string;
}

/**
 * Validates payout configuration
 * @param config Configuration to validate
 * @throws ValidationError if any required field is missing or invalid
 */
function validateConfig(config: PayoutConfig): void {
    // Check required fields
    const requiredFields = ['consumerKey', 'consumerSecret', 'shortCode', 'queueTimeoutUrl', 'resultUrl'];
    for (const field of requiredFields) {
        if (!config[field as keyof PayoutConfig]) {
            throw new ValidationError(`${field} is required`, field);
        }
    }

    // Validate URLs
    if (!config.queueTimeoutUrl.startsWith('https://')) {
        throw new ValidationError('Queue timeout URL must use HTTPS protocol', 'queueTimeoutUrl');
    }
    if (!config.resultUrl.startsWith('https://')) {
        throw new ValidationError('Result URL must use HTTPS protocol', 'resultUrl');
    }
}

/**
 * Validates payout details
 * @param details Payout details to validate
 * @throws ValidationError if any required field is missing or invalid
 */
function validatePayoutDetails(details: PayoutDetails): void {
    // Validate amount
    if (details.amount <= 0) {
        throw new ValidationError('Amount must be greater than 0', 'amount');
    }

    // Validate phone number format
    if (!/^251[7-9][0-9]{8}$/.test(details.phoneNumber)) {
        throw new ValidationError('Invalid phone number format. Must start with 251 and be 12 digits long', 'phoneNumber');
    }

    // Validate remarks length
    if (!details.remarks || details.remarks.length > 100) {
        throw new ValidationError('Remarks must not be empty and not exceed 100 characters', 'remarks');
    }

    // Validate occasion length if provided
    if (details.occasion && details.occasion.length > 100) {
        throw new ValidationError('Occasion must not exceed 100 characters', 'occasion');
    }
}

/**
 * Loads payout configuration from environment variables
 * @returns Configuration object for payout
 * @throws ValidationError if required environment variables are missing
 */
function loadConfig(): PayoutConfig {
    const config = {
        consumerKey: process.env.CONSUMER_KEY || '',
        consumerSecret: process.env.CONSUMER_SECRET || '',
        shortCode: process.env.BUSINESS_SHORTCODE || '',
        queueTimeoutUrl: process.env.QUEUE_TIMEOUT_URL || 'https://example.com/timeout',
        resultUrl: process.env.RESULT_URL || 'https://example.com/result'
    };

    validateConfig(config);
    return config;
}

/**
 * Creates payout details from environment variables or defaults
 * @returns Payout transaction details
 * @throws ValidationError if payout details are invalid
 */
function createPayoutDetails(): PayoutDetails {
    const details = {
        phoneNumber: process.env.MPESA_TEST_PHONE || '251700404709',
        amount: Number(process.env.MPESA_TEST_AMOUNT) || 100,
        remarks: process.env.MPESA_TEST_REMARKS || 'Test payout',
        occasion: process.env.MPESA_TEST_OCCASION
    };

    validatePayoutDetails(details);
    return details;
}

/**
 * Initiates a B2C payout transaction
 * @returns Promise that resolves when payout is initiated
 * @throws AuthenticationError if authentication fails
 * @throws PayoutError if payout request fails
 * @throws NetworkError if network connection fails
 * @throws ValidationError if required parameters are invalid
 */
async function initiatePayout(): Promise<void> {
    try {
        // Load and validate configuration
        const config = loadConfig();

        // Initialize M-Pesa client with authentication
        const auth = new Auth(config.consumerKey, config.consumerSecret);
        const payout = new Payout(auth, 'TestInitiator', 'TestCredential', true);

        // Get and validate payout details
        const payoutDetails = createPayoutDetails();

        // Send payout request
        const response = await payout.send(
            config.shortCode,
            payoutDetails.phoneNumber,
            payoutDetails.amount,
            'BusinessPayment',
            payoutDetails.remarks,
            config.queueTimeoutUrl,
            config.resultUrl,
            payoutDetails.occasion
        );

        console.log('Payout initiated successfully:', {
            ConversationID: response.ConversationID,
            OriginatorConversationID: response.OriginatorConversationID,
            ResponseDescription: response.ResponseDescription
        });

    } catch (error) {
        if (error instanceof AuthenticationError) {
            console.error('Authentication failed:', error.message);
            console.error('Error code:', error.errorCode);
            throw error;
        }

        if (error instanceof PayoutError) {
            console.error('Payout failed:', error.message);
            console.error('Response code:', error.responseCode);
            console.error('Conversation ID:', error.conversationId);
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
        throw new Error('Failed to initiate payout due to an unexpected error');
    }
}

// Execute the payout
initiatePayout()
    .catch(error => {
        process.exit(1);
    }); 