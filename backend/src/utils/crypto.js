const crypto = require('crypto');
const env = require('../config/env');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Encrypt a string using AES-256-CBC
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted string (iv:encrypted in hex)
 */
const encrypt = (text) => {
  if (!text) return text;
  const key = Buffer.from(env.encryptionKey, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
};

/**
 * Decrypt a string encrypted with AES-256-CBC
 * @param {string} encryptedText - Encrypted string (iv:encrypted in hex)
 * @returns {string} - Decrypted plain text
 */
const decrypt = (encryptedText) => {
  if (!encryptedText) return encryptedText;
  const key = Buffer.from(env.encryptionKey, 'hex');
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

/**
 * Verify HMAC-SHA256 webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - X-Hub-Signature-256 header value
 * @param {string} secret - App secret
 * @returns {boolean}
 */
const verifyWebhookSignature = (payload, signature, secret) => {
  if (!signature || !secret) return false;
  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')}`;
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

/**
 * Verify and parse Meta's signed_request parameter
 * Used for data deletion callbacks and deauthorization
 * @param {string} signedRequest - The signed_request from Meta
 * @param {string} appSecret - The Meta App Secret
 * @returns {{ isValid: boolean, payload: object|null }}
 */
const verifySignedRequest = (signedRequest, appSecret) => {
  if (!signedRequest || !appSecret) {
    return { isValid: false, payload: null };
  }

  try {
    const [encodedSig, encodedPayload] = signedRequest.split('.');
    if (!encodedSig || !encodedPayload) {
      return { isValid: false, payload: null };
    }

    // Decode the signature
    const sig = Buffer.from(
      encodedSig.replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    );

    // Compute expected signature
    const expectedSig = crypto
      .createHmac('sha256', appSecret)
      .update(encodedPayload)
      .digest();

    // Timing-safe comparison
    if (sig.length !== expectedSig.length) {
      return { isValid: false, payload: null };
    }
    const isValid = crypto.timingSafeEqual(sig, expectedSig);

    if (!isValid) {
      return { isValid: false, payload: null };
    }

    // Decode payload
    const payload = JSON.parse(
      Buffer.from(
        encodedPayload.replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      ).toString('utf8')
    );

    return { isValid: true, payload };
  } catch {
    return { isValid: false, payload: null };
  }
};

module.exports = { encrypt, decrypt, verifyWebhookSignature, verifySignedRequest };
