// Base error class for all M-Pesa related errors
export class MpesaError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MpesaError';
    }
}

// Authentication specific errors
export class AuthenticationError extends MpesaError {
    constructor(message: string, public errorCode?: string) {
        super(message);
        this.name = 'AuthenticationError';
    }
}

// Network related errors
export class NetworkError extends MpesaError {
    constructor(message: string) {
        super(message);
        this.name = 'NetworkError';
    }
}

// Validation errors for input parameters
export class ValidationError extends MpesaError {
    constructor(message: string, public field?: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

// STK Push specific errors
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

// B2C Payout specific errors
export class PayoutError extends MpesaError {
    constructor(
        message: string,
        public responseCode?: string,
        public conversationId?: string
    ) {
        super(message);
        this.name = 'PayoutError';
    }
}

// URL Registration specific errors
export class RegisterUrlError extends MpesaError {
    constructor(
        message: string,
        public responseCode?: string,
        public shortCode?: string
    ) {
        super(message);
        this.name = 'RegisterUrlError';
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
                    throw new AuthenticationError(
                        `Invalid client id passed. Please input the correct username.`,
                        error.resultCode
                    );
                case '999996':
                    throw new AuthenticationError(
                        `Invalid Authentication passed. Please select type as Basic Auth.`,
                        error.resultCode
                    );
                case '999997':
                    throw new AuthenticationError(
                        `Invalid Authorization Header. Please input the correct password.`,
                        error.resultCode
                    );
                case '999998':
                    throw new AuthenticationError(
                        `Required parameter [grant_type] is invalid or empty. Please select grant type as client credentials.`,
                        error.resultCode
                    );
                default:
                    throw new AuthenticationError(`Unknown Auth Error: ${error.resultDesc}`, error.resultCode);
            }
        }
        throw new AuthenticationError('Unknown authentication error occurred');
    }

    /**
     * Handles STK Push errors
     * @param error The error response from the API
     */
    public static handleStkError(error: any): never {
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

    /**
     * Handles Register URL API errors
     * @param error The error response from the API
     */
    public static handleRegisterUrlError(error: any): never {
        // Handle response data errors
        if (error?.header) {
            const { responseCode, responseMessage } = error.header;
            throw new RegisterUrlError(
                responseMessage || 'Register URL error occurred',
                responseCode
            );
        }

        // Handle API-level errors
        if (error?.errorCode) {
            throw new RegisterUrlError(
                error.errorMessage || 'Unknown error occurred',
                error.errorCode
            );
        }

        // Handle network errors
        if (error?.request) {
            throw new NetworkError('No response received from the API. Please check your network connection.');
        }

        throw new RegisterUrlError(`Register URL error occurred: ${error?.message || 'No error details available'}`);
    }

    /**
     * Handles B2C Payout API errors
     * @param error The error response from the API
     */
    public static handlePayoutError(error: any): never {
        // Handle B2C specific response errors
        if (error?.ResponseCode && error?.ResponseCode !== '0') {
            throw new PayoutError(
                error.ResponseDescription || 'Payout error occurred',
                error.ResponseCode,
                error.ConversationID
            );
        }

        // Handle API-level errors
        if (error?.errorCode) {
            let message = '';
            switch (error.errorCode) {
                case '401.002.01':
                    message = 'Invalid Access Token';
                    break;
                case '500.001.1001':
                    message = 'System Error';
                    break;
                case '403.001.01':
                    message = 'Access Denied - Invalid Credentials';
                    break;
                default:
                    message = error.errorMessage || 'Unknown error occurred';
            }

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

    /**
     * Validates input parameters
     * @param params Parameters to validate
     * @param rules Validation rules
     */
    public static validateInput(params: Record<string, any>, rules: Record<string, (value: any) => boolean>): void {
        for (const [field, validator] of Object.entries(rules)) {
            if (!validator(params[field])) {
                throw new ValidationError(`Invalid ${field}`, field);
            }
        }
    }
}