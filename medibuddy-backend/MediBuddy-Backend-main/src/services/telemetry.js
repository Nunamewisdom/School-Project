import logger from '../utils/logger.js';

/**
 * Telemetry Service
 *
 * Server-side event tracking per BACKEND_SKILL.md:
 *   - reminder_sent, reminder_ack, symptom_logged,
 *     summary_generated, caregiver_alert_sent
 *
 * Supports PostHog, Segment, or plain structured logging.
 * Toggleable via TELEMETRY_ENABLED env var (defaults to false in dev).
 */

const TELEMETRY_ENABLED = process.env.TELEMETRY_ENABLED === 'true';
const POSTHOG_API_KEY  = process.env.POSTHOG_API_KEY || '';
const POSTHOG_HOST     = process.env.POSTHOG_HOST || 'https://us.i.posthog.com';

// Lazy-loaded PostHog client
let posthogClient = null;

/**
 * Initialise the PostHog client if credentials are present.
 * Called once on first track() invocation.
 */
async function getPosthogClient() {
    if (posthogClient) return posthogClient;
    if (!POSTHOG_API_KEY) return null;

    try {
        // Dynamic import so the package is optional
        const { PostHog } = await import('posthog-node');
        posthogClient = new PostHog(POSTHOG_API_KEY, { host: POSTHOG_HOST });
        return posthogClient;
    } catch {
        logger.warn('posthog-node not installed — telemetry will use structured logs only');
        return null;
    }
}

/**
 * Track a server-side telemetry event.
 *
 * @param {string} event  - Event name (e.g. 'reminder_sent')
 * @param {object} properties - Event properties (profileId, medId, etc.)
 * @param {string} [distinctId] - User/profile identifier for PostHog
 */
export async function track(event, properties = {}, distinctId = 'server') {
    // Always write a structured log line (useful for debugging / DataDog / ELK)
    logger.info({ event, ...properties, _telemetry: true });

    if (!TELEMETRY_ENABLED) return;

    try {
        const client = await getPosthogClient();
        if (client) {
            client.capture({
                distinctId,
                event,
                properties: {
                    ...properties,
                    $set: undefined,              // avoid accidental user property clobber
                    source: 'medibuddy-backend'
                }
            });
        }
    } catch (err) {
        // Telemetry must never crash the app
        logger.error({ message: 'Telemetry capture failed', error: err.message, event });
    }
}

/* ─── Convenience helpers matching BACKEND_SKILL.md events ─── */

export function trackReminderSent({ profileId, medId, channel }) {
    return track('reminder_sent', { profileId, medId, channel }, String(profileId));
}

export function trackReminderAck({ profileId, medId, reminderId, action }) {
    return track('reminder_ack', { profileId, medId, reminderId, action }, String(profileId));
}

export function trackSymptomLogged({ profileId, symptomId, severity }) {
    return track('symptom_logged', { profileId, symptomId, severity }, String(profileId));
}

export function trackSummaryGenerated({ profileId, summaryId }) {
    return track('summary_generated', { profileId, summaryId }, String(profileId));
}

export function trackCaregiverAlertSent({ caregiverId, reason }) {
    return track('caregiver_alert_sent', { caregiverId, reason }, String(caregiverId));
}

/**
 * Flush any buffered events (call on graceful shutdown).
 */
export async function flushTelemetry() {
    try {
        if (posthogClient) {
            await posthogClient.shutdown();
        }
    } catch (err) {
        logger.error({ message: 'Telemetry flush failed', error: err.message });
    }
}

export default {
    track,
    trackReminderSent,
    trackReminderAck,
    trackSymptomLogged,
    trackSummaryGenerated,
    trackCaregiverAlertSent,
    flushTelemetry
};
