import { Auth } from 'mpesajs';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Response type for token generation
 */
interface TokenResponse {
    token: string;
    expiresIn: number;
}

/**
 * Generates an authentication token for M-Pesa API access
 * @returns Promise containing the generated token response
 * @throws Error if token generation fails
 */
async function generateMpesaToken(): Promise<TokenResponse> {
    try {
        const consumerKey = process.env.CONSUMER_KEY;
        const consumerSecret = process.env.CONSUMER_SECRET;

        if (!consumerKey || !consumerSecret) {
            throw new Error('Consumer key and secret are required');
        }

        const auth = new Auth(consumerKey, consumerSecret);
        const token = await auth.generateToken();

        console.log('Successfully generated token:', token);
        return { token: token.token, expiresIn: token.expiresIn };

    } catch (error) {
        if (error instanceof Error) {
            console.error('Token Generation Error:', error.message);
            throw error;
        }
        console.error('An unexpected error occurred:', error);
        throw new Error('Failed to generate token');
    }
}

generateMpesaToken();
