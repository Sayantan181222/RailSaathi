/**
 * Derives masked initials from a user's full name.
 * e.g., "Raj Kumar" -> "R.K.", "Sita" -> "S.", null/undefined -> "U.U."
 * @param {string} name 
 * @returns {string}
 */
function deriveMaskedInitials(name) {
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return 'U.U.';
  }
  const parts = name.trim().split(/\s+/);
  return parts.map(part => part[0].toUpperCase() + '.').join('');
}

/**
 * Assigns severity priority based on the event type.
 * @param {string} eventType 
 * @returns {{ priority: string }}
 */
function assignPriorityAndType(eventType) {
  switch (eventType) {
    case 'SOS':
      return { priority: 'CRITICAL' };
    case 'COMPARTMENT_VIOLATION':
      return { priority: 'HIGH' };
    case 'HAZARD_REPORT':
      return { priority: 'MEDIUM' };
    default:
      return { priority: 'MEDIUM' };
  }
}

/**
 * Builds the emergency SOS SMS message body.
 * @param {string} userName 
 * @param {string} trainNumber 
 * @param {string} coach 
 * @param {string} berth 
 * @param {number|string} lat 
 * @param {number|string} lng 
 * @returns {string}
 */
function buildSOSMessage(userName, trainNumber, coach, berth, lat, lng) {
  return `EMERGENCY ALERT via RailSaathi:\n${userName} needs help on:\nTrain: ${trainNumber}\nCoach: ${coach}, Berth: ${berth}\nLocation: https://maps.google.com/?q=${lat},${lng}\nPlease call them or contact RPF at 182.`;
}

/**
 * Sanitizes a safety event for the public map view.
 * @param {object} event 
 * @returns {object|null}
 */
function sanitizeForPublicMap(event) {
  if (!event) return null;
  const { id, event_type, alert_subtype, lat, lng, status, train_number, station_code, created_at } = event;
  return { id, event_type, alert_subtype, lat, lng, status, train_number, station_code, created_at };
}

module.exports = {
  deriveMaskedInitials,
  assignPriorityAndType,
  buildSOSMessage,
  sanitizeForPublicMap
};
