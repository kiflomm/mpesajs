import * as fs from 'fs';
import * as path from 'path';

const TEST_ENV = {
    // Related to authentication
    MPESA_CONSUMER_KEY: 'Df1Gg3TtcGdHiNdUcHiMOFnrX76I3b2UG7WMpmNGGDj1medq',
    MPESA_CONSUMER_SECRET: 'B4upVLGoIFMBXpNJMrVCGW5q0ixZsLNCaLJL6cv3X7nngMQMsANdbN2AOwjPvEIx',
    MPESA_SANDBOX: 'true',
    MPESA_BUSINESS_SHORTCODE: '1020',
    MPESA_PASSKEY: '5ab0ecb13d56a1818f182cbe463b84370c3768a5f3e355aa1dd706043d722dee',
    MPESA_PHONE_NUMBER: '251700404709',


    MPESA_CONFIRMATION_URL: 'https://innovation.tugza.tech/',
    MPESA_VALIDATION_URL: 'https://bank.tugza.tech/',


    MPESA_INITIATOR_NAME: 'apitest',
    MPESA_SECURITY_CREDENTIAL: 'lMhf0UqE4ydeEDwpUskmPgkNDZnA6NLi7z3T1TQuWCkH3/ScW8pRRnobq/AcwFvbC961+zDMgOEYGm8Oivb7L/7Y9ED3lhR7pJvnH8B1wYis5ifdeeWI6XE2NSq8X1Tc7QB9Dg8SlPEud3tgloB2DlT+JIv3ebIl/J/8ihGVrq499bt1pz/EA2nzkCtGeHRNbEDxkqkEnbioV0OM//0bv4K++XyV6jUFlIIgkDkmcK6aOU8mPBHs2um9aP+Y+nTJaa6uHDudRFg0+3G6gt1zRCPs8AYbts2IebseBGfZKv5K6Lqk9/W8657gEkrDZE8Mi78MVianqHdY/8d6D9KKhw==',


    MPESA_QUEUE_TIMEOUT_URL: 'https://innovation.tugza.tech/',


    MPESA_RESULT_URL: 'https://bank.tugza.tech/',

    MPESA_PAYOUT_COMMAND_ID: 'BusinessPayment',
    MPESA_REGISTER_URL_COMMAND_ID: 'RegisterURL',
    MPESA_REGISTER_URL_RESPONSE_TYPE: 'Completed',

    // Related to rate limiting
    MPESAJS_MAX_RETRIES: '3',
    MPESAJS_INITIAL_DELAY_MS: '1000',
    MPESAJS_MAX_DELAY_MS: '10000',
    MPESAJS_BACKOFF_FACTOR: '2',
    MPESAJS_MAX_CONCURRENT: '1000',
    MPESAJS_TIME_WINDOW_MS: '60000',


};

const LIVE_ENV = {
    // Related to authentication
    MPESA_CONSUMER_KEY: 'your_live_consumer_key',
    MPESA_CONSUMER_SECRET: 'your_live_consumer_secret',
    MPESA_PASSKEY: 'your_live_passkey',
    MPESA_BUSINESS_SHORTCODE: 'your_live_shortcode',
    MPESA_SANDBOX: 'false',
    MPESA_PHONE_NUMBER: '255712345678',

    // Related to register url
    MPESA_CONFIRMATION_URL: 'your_live_confirmation_url',
    MPESA_VALIDATION_URL: 'your_live_validation_url',

    // Related to authentication
    MPESA_INITIATOR_NAME: 'your_live_initiator_name',
    MPESA_SECURITY_CREDENTIAL: 'your_live_security_credential',

    // Related to queue timeout url
    MPESA_QUEUE_TIMEOUT_URL: 'your_live_queue_timeout_url',

    // Related to result url
    MPESA_RESULT_URL: 'your_live_result_url',


    MPESA_PAYOUT_COMMAND_ID: 'BusinessPayment',
    MPESA_REGISTER_URL_COMMAND_ID: 'RegisterURL',
    MPESA_REGISTER_URL_RESPONSE_TYPE: 'Completed',

    // Related to rate limiting
    MPESAJS_MAX_RETRIES: '3',
    MPESAJS_INITIAL_DELAY_MS: '1000',
    MPESAJS_MAX_DELAY_MS: '10000',
    MPESAJS_BACKOFF_FACTOR: '2',
    MPESAJS_MAX_CONCURRENT: '1000',
    MPESAJS_TIME_WINDOW_MS: '60000'
};

/**
 * Prints information about SDK-specific environment variables
 */
function printEnvInfo() {
    console.log('\nℹ️ SDK Configuration Variables:');
    console.log('- MPESAJS_MAX_RETRIES: Maximum number of retry attempts');
    console.log('- MPESAJS_INITIAL_DELAY_MS: Initial delay before first retry (ms)');
    console.log('- MPESAJS_MAX_DELAY_MS: Maximum delay between retries (ms)');
    console.log('- MPESAJS_BACKOFF_FACTOR: Multiplier for exponential backoff');
    console.log('- MPESAJS_MAX_CONCURRENT: Maximum concurrent requests');
    console.log('- MPESAJS_TIME_WINDOW_MS: Time window for rate limiting (ms)');
}

export async function initializeEnv(mode: 'test' | 'live', useCustomEnv: boolean = true) {
    const envVars = mode === 'test' ? TEST_ENV : LIVE_ENV;
    const envPath = path.resolve(process.cwd(), useCustomEnv ? '.env.mpesajs' : '.env');
    const envType = useCustomEnv ? '.env.mpesajs' : '.env';

    try {
        // Check if env file exists
        let currentEnv = '';
        if (fs.existsSync(envPath)) {
            currentEnv = fs.readFileSync(envPath, 'utf8') + '\n';
        }

        // Prepare new env vars
        const newEnvContent = Object.entries(envVars)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        // Write to file
        fs.writeFileSync(envPath, currentEnv + newEnvContent);

        console.log(`✅ Successfully initialized ${mode} environment in ${envType}`);
        console.log(`⚠️ Please update the values in ${envType} with your actual credentials and settings`);

        // Always show SDK configuration info for .env.mpesajs
        if (useCustomEnv) {
            printEnvInfo();
            console.log('\n💡 Tip: Use --default-env flag if you prefer to use the regular .env file instead');
        } else {
            console.log('\n💡 Tip: Remove --default-env flag to use .env.mpesajs for better separation of SDK settings');
        }

    } catch (error) {
        console.error('❌ Error initializing environment:', error);
        process.exit(1);
    }
} 