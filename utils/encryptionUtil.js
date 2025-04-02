const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Doit être une clé de 32 caractères
const IV_LENGTH = 16; // Longueur de l'IV pour AES

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  throw new Error('La clé de chiffrement (ENCRYPTION_KEY) doit être définie et avoir 32 caractères.');
}

exports.encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

exports.decrypt = (encryptedText) => {
  const [iv, encrypted] = encryptedText.split(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(Buffer.from(encrypted, 'hex'));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};
