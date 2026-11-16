/**
 * Build-time switch for the notification service (netlify/notify, see its
 * README). It is off unless the app is built with
 * REACT_APP_NOTIFY_ENABLED=true. While it is off, the app never calls
 * /api/notify, never registers the notification service worker, and shows no
 * bell, Notifications settings, prompts or follow buttons.
 *
 * Turn it on only together with the server side (NOTIFY_ENABLED=true), which
 * deploys the functions this app would call.
 */
export const NOTIFY_ENABLED = import.meta.env.REACT_APP_NOTIFY_ENABLED === 'true'
