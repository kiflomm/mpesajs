import { MpesaError, NetworkError } from './ErrorHandlers';

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

export class RegisterUrlErrorHandler {
    public static handle(error: any): never {
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
} 