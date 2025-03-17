import { MpesaError } from './ErrorHandlers';

export class ValidationError extends MpesaError {
    constructor(message: string, public field?: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class ValidationErrorHandler {
    public static validateInput(params: Record<string, any>, rules: Record<string, (value: any) => boolean>): void {
        for (const [field, validator] of Object.entries(rules)) {
            if (!validator(params[field])) {
                throw new ValidationError(`Invalid ${field}`, field);
            }
        }
    }
} 