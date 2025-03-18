// Import required dependencies
import axios, { AxiosError } from 'axios';
import { Auth } from '../src/auth';
import { MpesaError, AuthenticationError } from '../src/errors/ErrorHandlers';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
// Mock the axios module to control API responses in tests
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Auth', () => {
    // Test credentials
    const consumerKey = 'test-consumer-key';
    const consumerSecret = 'test-consumer-secret';
    let auth: Auth;

    // Reset the Auth instance and clear mocks before each test
    beforeEach(() => {
        auth = new Auth(consumerKey, consumerSecret, true);
        jest.clearAllMocks();
    });

    describe('generateToken', () => {
        // Test successful token generation
        it('should successfully generate a token', async () => {
            // Mock successful API response
            const mockResponse = {
                data: {
                    access_token: 'test-access-token',
                    token_type: 'Bearer',
                    expires_in: 3599,
                }
            };

            mockedAxios.get.mockResolvedValueOnce(mockResponse);

            const result = await auth.generateToken();

            // Verify the returned token data
            expect(result).toEqual({
                token: 'test-access-token',
                tokenType: 'Bearer',
                expiresIn: 3599,
            });

            // Verify the API was called with correct parameters
            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://apisandbox.safaricom.et/v1/token/generate',
                {
                    params: {
                        grant_type: 'client_credentials',
                    },
                    headers: {
                        Authorization: expect.stringContaining('Basic '),
                    },
                }
            );
        });

        // Test production URL usage
        it('should use production URL when sandbox is false', async () => {
            auth = new Auth(consumerKey, consumerSecret, false);
            const mockResponse = {
                data: {
                    access_token: 'test-access-token',
                    token_type: 'Bearer',
                    expires_in: 3599
                }
            };

            mockedAxios.get.mockResolvedValueOnce(mockResponse);

            await auth.generateToken();

            // Verify production URL is used
            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://api.safaricom.et/v1/token/generate',
                expect.any(Object)
            );
        });

        // Test handling of invalid client ID error
        it('should handle invalid client ID error', async () => {
            // Mock API error response for invalid client ID
            const mockError = new AxiosError();
            mockError.response = {
                data: {
                    resultCode: '999991',
                    resultDesc: 'Invalid client id'
                },
                status: 400,
                statusText: 'Bad Request',
                headers: {},
                config: {} as any
            };

            mockedAxios.get.mockRejectedValueOnce(mockError);

            const promise = auth.generateToken();
            await expect(promise).rejects.toThrow(AuthenticationError);
            await expect(promise).rejects.toMatchObject({
                message: 'Invalid client id passed. Please input the correct username.',
                errorCode: '999991'
            });
        });

        // Test handling of invalid authentication error
        it('should handle invalid authentication error', async () => {
            // Mock API error response for invalid authentication
            const mockError = new AxiosError();
            mockError.response = {
                data: {
                    resultCode: '999996',
                    resultDesc: 'Invalid Authentication'
                },
                status: 401,
                statusText: 'Unauthorized',
                headers: {},
                config: {} as any
            };

            mockedAxios.get.mockRejectedValueOnce(mockError);

            const promise = auth.generateToken();
            await expect(promise).rejects.toThrow(AuthenticationError);
            await expect(promise).rejects.toMatchObject({
                message: 'Invalid Authentication passed. Please select type as Basic Auth.',
                errorCode: '999996'
            });
        });

        // Test handling of invalid authorization header
        it('should handle invalid authorization header error', async () => {
            const mockError = new AxiosError();
            mockError.response = {
                data: {
                    resultCode: '999997',
                    resultDesc: 'Invalid Authorization Header'
                },
                status: 401,
                statusText: 'Unauthorized',
                headers: {},
                config: {} as any
            };

            mockedAxios.get.mockRejectedValueOnce(mockError);

            const promise = auth.generateToken();
            await expect(promise).rejects.toThrow(AuthenticationError);
            await expect(promise).rejects.toMatchObject({
                message: 'Invalid Authorization Header. Please input the correct password.',
                errorCode: '999997'
            });
        });

        // Test handling of invalid grant type
        it('should handle invalid grant type error', async () => {
            const mockError = new AxiosError();
            mockError.response = {
                data: {
                    resultCode: '999998',
                    resultDesc: 'Invalid grant type'
                },
                status: 400,
                statusText: 'Bad Request',
                headers: {},
                config: {} as any
            };

            mockedAxios.get.mockRejectedValueOnce(mockError);

            const promise = auth.generateToken();
            await expect(promise).rejects.toThrow(AuthenticationError);
            await expect(promise).rejects.toMatchObject({
                message: 'Required parameter [grant_type] is invalid or empty. Please select grant type as client credentials.',
                errorCode: '999998'
            });
        });

        // Test handling of network errors
        it('should handle network errors', async () => {
            // Mock network connection error
            const mockError = new AxiosError(
                'Network Error',
                'ECONNABORTED'
            );
            mockError.code = 'ECONNABORTED';

            mockedAxios.get.mockRejectedValue(mockError);

            const result = auth.generateToken();
            await expect(result).rejects.toThrow(MpesaError);
            await expect(result).rejects.toThrow(
                'No response received from the API. Please check your network connection.'
            );
        });

        // Test handling of invalid response format
        it('should handle invalid response format', async () => {
            // Mock API response with missing required fields
            const mockResponse = {
                data: {
                    // Missing access_token and expires_in
                    someOtherField: 'value'
                }
            };

            mockedAxios.get.mockResolvedValue(mockResponse);

            const result = auth.generateToken();
            await expect(result).rejects.toThrow(AuthenticationError);
            await expect(result).rejects.toThrow('Unknown authentication error occurred');
        });

        // Test handling of request setup errors
        it('should handle request setup errors', async () => {
            const setupError = new Error('Invalid URL');
            mockedAxios.get.mockRejectedValue(setupError);

            const result = auth.generateToken();
            await expect(result).rejects.toThrow(MpesaError);
            await expect(result).rejects.toThrow('Failed to generate token: Invalid URL');
        });
    });
}); 