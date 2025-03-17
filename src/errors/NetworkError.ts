import { MpesaError } from './ErrorHandlers';

export class NetworkError extends MpesaError {
    constructor(message: string) {
        super(message);
        this.name = 'NetworkError';
    }
} 