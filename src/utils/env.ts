import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Loads environment variables from .env.mpesajs or falls back to .env
 * @returns The loaded environment variables
 */
export function loadEnvVariables(): NodeJS.ProcessEnv {
    const mpesajsPath = path.resolve(process.cwd(), '.env.mpesajs');
    const defaultEnvPath = path.resolve(process.cwd(), '.env');

    // Try to load .env.mpesajs first
    if (fs.existsSync(mpesajsPath)) {
        dotenv.config({ path: mpesajsPath });
    }
    // Then load .env (values won't override existing ones from .env.mpesajs)
    if (fs.existsSync(defaultEnvPath)) {
        dotenv.config({ path: defaultEnvPath });
    }

    return process.env;
}

/**
 * Gets an environment variable with a fallback value
 * Returns the raw string value, allowing the importing file to handle parsing
 * @param key The environment variable key
 * @param defaultValue The default value if the environment variable is not set
 * @returns The environment variable value as a string or the default value
 */
export function getEnvVar(key: string, defaultValue: string): string {
    const env = loadEnvVariables();
    return env[key] || defaultValue;
}

/**
 * Gets a numeric environment variable with a fallback value
 * @param key The environment variable key
 * @param defaultValue The default value if the environment variable is not set
 * @returns The parsed numeric value or the default value
 */
export function getNumericEnvVar(key: string, defaultValue: number): number {
    const value = getEnvVar(key, defaultValue.toString());
    return parseInt(value, 10);
}

/**
 * Gets a boolean environment variable with a fallback value
 * @param key The environment variable key
 * @param defaultValue The default value if the environment variable is not set
 * @returns The parsed boolean value or the default value
 */
export function getBooleanEnvVar(key: string, defaultValue: boolean): boolean {
    const value = getEnvVar(key, defaultValue.toString()).toLowerCase();
    return value === 'true' || value === '1';
} 