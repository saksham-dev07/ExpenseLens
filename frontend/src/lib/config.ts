/**
 * Global application configuration.
 * Using an environment variable allows the API URL to be configured per environment (e.g. localhost for dev, actual domain for prod).
 * Falls back to http://127.0.0.1:5000 if the env var is not set.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
