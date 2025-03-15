import { Auth } from 'mpesajs';
import { Payout } from 'mpesajs';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Tests the M-Pesa B2C payout functionality
 * @returns Promise containing the payout response
 * @throws Error if payout fails
 */
async function testMpesaPayout() {
    try {
        const consumerKey = process.env.CONSUMER_KEY;
        const consumerSecret = process.env.CONSUMER_SECRET;
        const initiatorName = process.env.INITIATOR_NAME;
        const securityCredential = process.env.SECURITY_CREDENTIAL;
        const shortCode = process.env.BUSINESS_SHORTCODE;
        const queueTimeoutUrl = process.env.QUEUE_TIMEOUT_URL || '';
        const resultUrl = process.env.RESULT_URL || '';

        if (!consumerKey || !consumerSecret || !initiatorName || !securityCredential || !shortCode) {
            throw new Error('Required environment variables are missing');
        }

        // Initialize Auth
        const auth = new Auth(consumerKey, consumerSecret);

        // Initialize Payout with sandbox environment
        const payout = new Payout(auth, initiatorName, securityCredential, true);

        // Sample payout parameters
        const phoneNumber = process.env.PHONE_NUMBER || ''; // Replace with actual test phone number
        const amount = 100; // Amount in ETB
        const commandId = 'BusinessPayment';
        const remarks = 'Test B2C payment';
        const occasion = 'Test Occasion';

        // Send payout
        const response = await payout.send(
            shortCode,
            phoneNumber,
            amount,
            commandId,
            remarks,
            queueTimeoutUrl,
            resultUrl,
            occasion
        );

        console.log('Payout successful:', response);
        return response;

    } catch (error) {
        if (error instanceof Error) {
            console.error('Payout Error:', error.message);
            throw error;
        }
        console.error('An unexpected error occurred:', error);
        throw new Error('Failed to process payout');
    }
}

// Execute the test
testMpesaPayout(); 