import { MpesaError, NetworkError } from './ErrorHandlers';

export class StkPushError extends MpesaError {
    constructor(
        message: string,
        public responseCode?: string,
        public merchantRequestId?: string,
        public checkoutRequestId?: string
    ) {
        super(message);
        this.name = 'StkPushError';
    }
}

export class StkPushErrorHandler {
    public static handle(error: any): never {
        // Handle STK Push initiation errors
        if (error?.ResponseCode) {
            throw new StkPushError(
                error.ResponseDescription || error.CustomerMessage || 'STK Push error occurred',
                error.ResponseCode,
                error.MerchantRequestID,
                error.CheckoutRequestID
            );
        }

        // Handle STK Push callback errors
        if (error?.Envelope?.Body?.stkCallback) {
            const callback = error.Envelope.Body.stkCallback;
            let message = '';

            switch (callback.ResultCode) {
                case 'TP40087':
                    message = 'User entered wrong M-PESA PIN. Please try again with correct PIN.';
                    break;
                case '17':
                    message = 'M-PESA system internal error. Please try again after a few minutes.';
                    break;
                default:
                    message = callback.ResultDesc;
            }

            throw new StkPushError(
                message,
                callback.ResultCode,
                callback.MerchantRequestID,
                callback.CheckoutRequestID
            );
        }

        // Handle network errors
        if (error?.request) {
            throw new NetworkError('No response received from the API. Please check your network connection.');
        }

        throw new StkPushError('Unknown STK Push error occurred');
    }
} 