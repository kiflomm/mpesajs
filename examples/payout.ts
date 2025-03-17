import { Auth, Payout, PayoutError, NetworkError, ValidationError, AuthenticationError } from 'mpesajs';

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
        const auth = new Auth();
        const payout = new Payout(auth);

        // Send payout request
        const response = await payout.send(56, "this is a remark");

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