const twilio = require('twilio');
const { buildSOSMessage } = require('./safety-service');

/**
 * Sends an emergency SOS SMS to a contact number.
 * @param {string} toPhone 
 * @param {string} userName 
 * @param {string} trainNumber 
 * @param {string} coach 
 * @param {string} berth 
 * @param {number|string} lat 
 * @param {number|string} lng 
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function sendSOS(toPhone, userName, trainNumber, coach, berth, lat, lng) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      const errorMsg = 'Twilio configuration missing (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_FROM_NUMBER)';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    const client = twilio(accountSid, authToken);
    const messageBody = buildSOSMessage(userName, trainNumber, coach, berth, lat, lng);
    const formattedPhone = toPhone.startsWith('+') ? toPhone : `+91${toPhone}`;

    const message = await client.messages.create({
      body: messageBody,
      from: fromNumber,
      to: formattedPhone
    });

    console.log(`SOS SMS successfully sent to ${formattedPhone}. Message SID: ${message.sid}`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to send SOS SMS to ${toPhone}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendSOS
};
