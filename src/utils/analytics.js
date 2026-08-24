export function trackEvent(eventName, properties = {}) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics Event]:', eventName, properties);
  }
}
