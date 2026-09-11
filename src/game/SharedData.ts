/**
 * Client-side entry point to the engine.
 *
 * The implementation lives in `shared/` because the server runs the very same code
 * to validate what this client reports. Nothing browser specific belongs there, so
 * anything client-only would be added here instead.
 */
export * from '../../shared/ShareData.ts'

