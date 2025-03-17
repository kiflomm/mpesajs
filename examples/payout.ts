import { Auth, Payout, PayoutError, NetworkError, ValidationError, AuthenticationError } from 'mpesajs';

async function initiatePayout(): Promise<void> {
    try {
        const auth = new Auth();
        const payout = new Payout(auth);

        const response = await payout.send(56, "this is a remark");

        console.log('Payout initiated successfully:', {
            ConversationID: response.ConversationID,
            OriginatorConversationID: response.OriginatorConversationID,
            ResponseDescription: response.ResponseDescription
        });

    } catch (error) {
        if (error instanceof AuthenticationError) {
            console.error('Error Name:', error.name);
            console.error('Error Message:', error.message);
            console.error('Error code:', error.errorCode);
            throw error;
        }

        if (error instanceof ValidationError) {
            console.error('Error Name:', error.name);
            console.error('Error Message:', error.message);
            console.error('Invalid field:', error.field);
            throw error;
        }

        if (error instanceof PayoutError) {
            console.error('Error Name:', error.name);
            console.error('Error Message:', error.message);
            console.error('Error code:', error.errorCode);
            console.error('Error requestId:', error.requestId);
            console.error('Error responseCode:', error.responseCode);
            console.error('Error conversationId:', error.conversationId);
            throw error;
        }

        if (error instanceof NetworkError) {
            console.error('Network error:', error.message);
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