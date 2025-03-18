// Import required dependencies
import axios, { AxiosError } from 'axios';
import { RegisterUrl } from '../src/registerUrl';
import { MpesaError, NetworkError } from '../src/errors/ErrorHandlers';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
// Mock axios module
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('RegisterUrl', () => {
    // Test configuration
    const apiKey = 'test-api-key';
    const validConfirmationUrl = 'https://example.com/confirm';
    const validValidationUrl = 'https://example.com/validate';
    let registerUrl: RegisterUrl;

    beforeEach(() => {
        registerUrl = new RegisterUrl(apiKey, true);
        jest.clearAllMocks();
        mockedAxios.post.mockReset();
    });

    describe('register', () => {
        it('should successfully register URLs', async () => {
            const mockResponse = {
                data: {
                    header: {
                        responseCode: '00000000',
                        responseMessage: 'Success',
                        customerMessage: 'URLs registered successfully',
                        timestamp: '2024-03-20T10:00:00Z'
                    }
                }
            };

            mockedAxios.post.mockResolvedValueOnce(mockResponse);

            const result = await registerUrl.register(
                '123456',
                'Completed',
                'RegisterURL',
                validConfirmationUrl,
                validValidationUrl
            );

            expect(result).toEqual({
                responseCode: '00000000',
                responseMessage: 'Success',
                customerMessage: 'URLs registered successfully',
                timestamp: '2024-03-20T10:00:00Z'
            });

            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://apisandbox.safaricom.et/v1/c2b-register-url/register',
                {
                    ShortCode: '123456',
                    ResponseType: 'Completed',
                    CommandID: 'RegisterURL',
                    ConfirmationURL: validConfirmationUrl,
                    ValidationURL: validValidationUrl
                },
                {
                    params: { apikey: apiKey }
                }
            );
        });

        it('should use production URL when sandbox is false', async () => {
            registerUrl = new RegisterUrl(apiKey, false);
            const mockResponse = {
                data: {
                    header: {
                        responseCode: '00000000',
                        responseMessage: 'Success',
                        customerMessage: 'Success',
                        timestamp: '2024-03-20T10:00:00Z'
                    }
                }
            };

            mockedAxios.post.mockResolvedValueOnce(mockResponse);

            await registerUrl.register(
                '123456',
                'Completed',
                'RegisterURL',
                validConfirmationUrl,
                validValidationUrl
            );

            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://api.safaricom.et/v1/c2b-register-url/register',
                expect.any(Object),
                expect.any(Object)
            );
        });

        it('should throw ValidationError for non-HTTPS confirmation URL', async () => {
            const promise = registerUrl.register(
                '123456',
                'Completed',
                'RegisterURL',
                'http://example.com/confirm',
                validValidationUrl
            );

            await expect(promise).rejects.toThrow(MpesaError);
            await expect(promise).rejects.toThrow('Both confirmation and validation URLs must use HTTPS protocol');
        });

        it('should throw ValidationError for non-HTTPS validation URL', async () => {
            const promise = registerUrl.register(
                '123456',
                'Completed',
                'RegisterURL',
                validConfirmationUrl,
                'http://example.com/validate'
            );

            await expect(promise).rejects.toThrow(MpesaError);
            await expect(promise).rejects.toThrow('Both confirmation and validation URLs must use HTTPS protocol');
        });

        it('should handle network errors', async () => {
            const mockError = new AxiosError(
                'Network Error',
                'ECONNABORTED'
            );
            mockError.code = 'ECONNABORTED';

            mockedAxios.post.mockRejectedValueOnce(mockError);

            const promise = registerUrl.register(
                '123456',
                'Completed',
                'RegisterURL',
                validConfirmationUrl,
                validValidationUrl
            );

            await expect(promise).rejects.toThrow(NetworkError);
            await expect(promise).rejects.toThrow(
                'No response received from the API. Please check your network connection.'
            );
        });

        it('should handle invalid response format', async () => {
            const mockResponse = {
                data: {
                    // Missing header object
                    someOtherField: 'value'
                }
            };

            mockedAxios.post.mockResolvedValueOnce(mockResponse);

            const promise = registerUrl.register(
                '123456',
                'Completed',
                'RegisterURL',
                validConfirmationUrl,
                validValidationUrl
            );

            await expect(promise).rejects.toThrow();
        });

        it('should handle request setup errors', async () => {
            const setupError = new Error('Invalid URL');
            mockedAxios.post.mockRejectedValueOnce(setupError);

            const promise = registerUrl.register(
                '123456',
                'Completed',
                'RegisterURL',
                validConfirmationUrl,
                validValidationUrl
            );

            await expect(promise).rejects.toThrow(MpesaError);
            await expect(promise).rejects.toThrow('Failed to register URLs: Invalid URL');
        });

        it('should use default values for optional parameters', async () => {
            const mockResponse = {
                data: {
                    header: {
                        responseCode: '00000000',
                        responseMessage: 'Success',
                        customerMessage: 'Success',
                        timestamp: '2024-03-20T10:00:00Z'
                    }
                }
            };

            mockedAxios.post.mockResolvedValueOnce(mockResponse);

            await registerUrl.register(
                '123456',
                undefined,
                undefined,
                validConfirmationUrl,
                validValidationUrl
            );

            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.any(String),
                {
                    ShortCode: '123456',
                    ResponseType: 'Completed', // Default value
                    CommandID: 'RegisterURL', // Default value
                    ConfirmationURL: validConfirmationUrl,
                    ValidationURL: validValidationUrl
                },
                expect.any(Object)
            );
        });
    });
}); 