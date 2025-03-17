import { Auth, AuthenticationError, NetworkError, ValidationError } from 'mpesajs';

/**
 * Response type for token generation
 */
interface TokenResponse {
    token: string;
    tokenType: string;
    expiresIn: number;
}

/**
 * Generates an authentication token for M-Pesa API access
 * @returns Promise containing the generated token response
 * @throws AuthenticationError if authentication fails
 * @throws NetworkError if network connection fails
 * @throws ValidationError if required parameters are missing
 */
async function generateMpesaToken(): Promise<TokenResponse> {
    try {
        // Create Auth instance without parameters, using environment variables
        const auth = new Auth();
        const token = await auth.generateToken();

        console.log('Token generated successfully:', {
            expiresIn: token.expiresIn,
            tokenType: token.tokenType,
            token: token.token
        });

        return { token: token.token, tokenType: token.tokenType, expiresIn: token.expiresIn };

    } catch (error) {
        if (error instanceof AuthenticationError) {
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error code:', error.errorCode);
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
        throw new Error('Failed to generate token due to an unexpected error');
    }
}

// Execute the token generation
generateMpesaToken()
    .catch(error => {
        process.exit(1);
    });
