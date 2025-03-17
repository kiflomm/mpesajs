import { MpesaError, NetworkError } from './ErrorHandlers';

export class PayoutError extends MpesaError {
    constructor(
        message: string,
        public errorCode?: string,
        public requestId?: string,
        public responseCode?: string,
        public conversationId?: string
    ) {
        super(message);
        this.name = 'PayoutError';
    }
}

export class PayoutErrorHandler {
    public static handle(error: any): never {
        // Handle B2C specific response errors
        if (error?.ResponseCode && error?.ResponseCode !== '0') {
            throw new PayoutError(
                error.ResponseDescription || 'Payout error occurred',
                error.ResponseCode,
                undefined,
                error.ResponseCode,
                error.ConversationID
            );
        }

        // Handle API-level errors
        if (error?.errorCode) {
            const message = error.errorMessage || 'Unknown error occurred';
            throw new PayoutError(
                message,
                error.errorCode,
                error.requestId
            );
        }

        // Handle network errors
        if (error?.request) {
            throw new NetworkError('No response received from the API. Please check your network connection.');
        }

        throw new PayoutError(`Unknown Payout error occurred: ${error?.message || 'No error details available'}`);
    }
} 