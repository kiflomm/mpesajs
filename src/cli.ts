#!/usr/bin/env node
import { initializeEnv } from './commands/init';

const command = process.argv[2];
const useDefaultEnv = process.argv.includes('--default-env');

async function main() {
    switch (command) {
        case 'init-test':
            await initializeEnv('test', !useDefaultEnv);
            break;
        case 'init-live':
            await initializeEnv('live', !useDefaultEnv);
            break;
        case '--help':
        case '-h':
            console.log(`
Usage: mpesajs <command> [options]

Commands:
  init-test    Initialize test environment variables
  init-live    Initialize live environment variables
  --help, -h   Show this help message
  --version    Show version number

Options:
  --default-env  Use the default .env file instead of .env.mpesajs
                By default, the SDK uses .env.mpesajs to keep settings separate

Examples:
  $ mpesajs init-test              # Initialize test env in .env.mpesajs (default)
  $ mpesajs init-test --default-env # Initialize test env in .env
  $ mpesajs init-live              # Initialize live env in .env.mpesajs (default)
      `);
            break;
        case '--version':
        case '-v':
            console.log('v1.0.0'); // You might want to import this from package.json
            break;
        default:
            console.error('Unknown command. Use --help to see available commands');
            process.exit(1);
    }
}

main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
}); 