export class MpesaError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MpesaError';
    }
}

export class ErrorHandler {
    /**
     * Handles authentication errors
     * @param error The error response from the API
     */
    public static handleAuthError(error: any): never {
        if (error?.resultCode) {
            switch (error.resultCode) {
                case '999991':
                    throw new MpesaError(
                        `\nError: ${error.resultCode}\n` +
                        `Description: Invalid client id passed\n` +
                        `Possible Cause: Incorrect basic Authorization username\n` +
                        `Mitigation: Input the correct username\n`
                    );
                case '999996':
                    throw new MpesaError(
                        `\nError: ${error.resultCode}\n` +
                        `Description: Invalid Authentication passed\n` +
                        `Possible Cause: Incorrect authorization type\n` +
                        `Mitigation: Select type as Basic Auth\n`
                    );
                case '999997':
                    throw new MpesaError(
                        `\nError: ${error.resultCode}\n` +
                        `Description: Invalid Authorization Header\n` +
                        `Possible Cause: Incorrect basic authorization password\n` +
                        `Mitigation: Input the correct password\n`
                    );
                case '999998':
                    throw new MpesaError(
                        `\nError: ${error.resultCode}\n` +
                        `Description: Required parameter [grant_type] is invalid or empty\n` +
                        `Possible Cause: Incorrect grant type\n` +
                        `Mitigation: Select grant type as client credentials\n`
                    );
                default:
                    throw new MpesaError(`\nUnknown Auth Error: ${error.resultDesc}\n`);
            }
        }
        throw new MpesaError('\nUnknown authentication error occurred\n');
    }

    /**
     * Handles STK Push errors
     * @param error The error response from the API
     */
    public static handleStkError(error: any): never {
        // Handle STK Push initiation errors
        if (error?.ResponseCode) {
            switch (error.ResponseCode) {
                case '3007':
                    throw new MpesaError(
                        `\nError: ${error.ResponseCode}\n` +
                        `MerchantRequestID: ${error.MerchantRequestID}\n` +
                        `CheckoutRequestID: ${error.CheckoutRequestID}\n` +
                        `ResponseDescription: ${error.ResponseDescription}\n` +
                        `CustomerMessage: ${error.CustomerMessage}\n`
                    );
                case 'SVC0403':
                    throw new MpesaError(
                        `\nError: ${error.ResponseCode}\n` +
                        `MerchantRequestID: ${error.MerchantRequestID}\n` +
                        `CheckoutRequestID: ${error.CheckoutRequestID}\n` +
                        `ResponseDescription: ${error.ResponseDescription}\n` +
                        `CustomerMessage: ${error.CustomerMessage}\n`
                    );
                case '1':
                    throw new MpesaError(
                        `\nError: ${error.ResponseCode}\n` +
                        `MerchantRequestID: ${error.MerchantRequestID}\n` +
                        `CheckoutRequestID: ${error.CheckoutRequestID}\n` +
                        `ResponseDescription: ${error.ResponseDescription}\n` +
                        `CustomerMessage: ${error.CustomerMessage}\n`
                    );
                default:
                    throw new MpesaError(`\nSTK Push Error: ${error.ResponseDescription}\n`);
            }
        }

        // Handle STK Push callback errors
        if (error?.Envelope?.Body?.stkCallback) {
            const callback = error.Envelope.Body.stkCallback;
            switch (callback.ResultCode) {
                case 'TP40087':
                    throw new MpesaError(
                        `\nError: ${callback.ResultCode}\n` +
                        `ResultDesc: ${callback.ResultDesc}\n` +
                        `Possible Cause: User entered wrong M-PESA PIN\n` +
                        `Solution: Ask user to try again with correct PIN\n`
                    );
                case '17':
                    throw new MpesaError(
                        `\nError: ${callback.ResultCode}\n` +
                        `ResultDesc: ${callback.ResultDesc}\n` +
                        `Possible Cause: M-PESA system internal error\n` +
                        `Solution: Please try again after a few minutes\n`
                    );
                default:
                    throw new MpesaError(`\nSTK Callback Error: ${callback.ResultDesc}\n`);
            }
        }

        // Handle general API errors
        if (error?.errorCode) {
            switch (error.errorCode) {
                case '404.001.03':
                    throw new MpesaError(
                        `\nError: ${error.errorCode}\n` +
                        `RequestId: ${error.requestId}\n` +
                        `ErrorMessage: ${error.errorMessage}\n` +
                        `Possible Cause: Access token has expired or is invalid\n` +
                        `Solution: Generate a new access token\n`
                    );
                case '500.002.1001':
                    throw new MpesaError(
                        `\nError: ${error.errorCode}\n` +
                        `RequestId: ${error.requestId}\n` +
                        `ErrorMessage: ${error.errorMessage}\n` +
                        `Possible Cause: Service is currently under maintenance. Please try again later\n` +
                        `Solution: Please try again later\n`
                    );
                default:
                    throw new MpesaError(`\nAPI Error: ${error.errorMessage}\n`);
            }
        }

        throw new MpesaError(`\nUnknown error occurred\n`);
    }
}