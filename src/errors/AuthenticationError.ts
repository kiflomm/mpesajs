import { MpesaError } from './ErrorHandlers';

export class AuthenticationError extends MpesaError {
    constructor(message: string, public errorCode?: string) {
        super(message);
        this.name = 'AuthenticationError';
    }
}

export class AuthenticationErrorHandler {
    public static handle(error: any): never {
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
} 