import { Auth, StkPush, StkPushError, NetworkError, ValidationError, AuthenticationError, MpesaError } from 'mpesajs';

/**
 * Initiates an STK Push payment request to a customer's phone
 * This example demonstrates how to:
 * 1. Set up the Auth and StkPush instances
 * 2. Send an STK Push request with proper error handling
 * 3. Process the response
 */
async function initiateStkPush(): Promise<void> {
    try {
        // Initialize Auth and StkPush instances
        const auth = new Auth();
        const stkPush = new StkPush(auth);

        // Amount to charge the customer
        const amount = 1; // Minimum amount for testing

        // Description of the transaction (max 13 chars)
        const transactionDesc = "Test Payment";

        // Reference for the customer (max 12 chars)
        const accountReference = "TestAccount";

        // Optional: You can override environment variables by providing these parameters
        // To use these, uncomment and add as parameters to sendStkPush
        // const businessShortCode = "1234567";
        // const passkey = "your-passkey";
        // const phoneNumber = "251700000000";
        // const callbackUrl = "https://example.com/callback";

        console.log('Initiating STK Push payment request...');

        // Send the STK Push request
        // The additional parameters are optional and use environment variables by default
        // @ts-ignore - The actual implementation allows for default values via environment variables
        const response = await stkPush.sendStkPush(
            amount,
            transactionDesc,
            accountReference
            // If you want to override env vars, uncomment and add these parameters:
            // businessShortCode,
            // passkey,
            // phoneNumber,
            // callbackUrl
        );

        console.log('STK Push initiated successfully:');
        console.log('MerchantRequestID:', response.MerchantRequestID);
        console.log('CheckoutRequestID:', response.CheckoutRequestID);
        console.log('ResponseCode:', response.ResponseCode);
        console.log('ResponseDescription:', response.ResponseDescription);
        console.log('CustomerMessage:', response.CustomerMessage);

        console.log('\nPlease check your phone to complete the payment');

    } catch (error) {
        if (error instanceof AuthenticationError) {
            console.error('\nAuthentication Error:');
            console.error('- Name:', error.name);
            console.error('- Message:', error.message);
            console.error('- Error Code:', error.errorCode);
            console.error('\nMake sure your MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET are correct.');
        }
        else if (error instanceof ValidationError) {
            console.error('\nValidation Error:');
            console.error('- Name:', error.name);
            console.error('- Message:', error.message);
            console.error('- Invalid Field:', error.field);
            console.error('\nPlease check the requirements for the field mentioned above.');
        }
        else if (error instanceof StkPushError) {
            console.error('\nSTK Push Error:');
            console.error('- Name:', error.name);
            console.error('- Message:', error.message);
            console.error('- Response Code:', error.responseCode);
            console.error('- Merchant Request ID:', error.merchantRequestId);
            console.error('- Checkout Request ID:', error.checkoutRequestId);
            console.error('\nThis error was returned by the M-Pesa API.');
        }
        else if (error instanceof NetworkError) {
            console.error('\nNetwork Error:');
            console.error('- Message:', error.message);
            console.error('\nPlease check your network connection and try again.');
        }
        else if (error instanceof MpesaError) {
            console.error('\nGeneral M-Pesa Error:');
            console.error('- Name:', error.name);
            console.error('- Message:', error.message);
        }
        else {
            // Handle unexpected errors
            console.error('\nAn unexpected error occurred:', error);
        }
    }
}

// Execute the STK Push example
console.log('=== M-Pesa STK Push Example ===');
initiateStkPush()
    .then(() => {
        console.log('\nSTK Push example completed successfully.');
    })
    .catch(() => {
        console.error('\nSTK Push example failed. Please check the errors above.');
    });
