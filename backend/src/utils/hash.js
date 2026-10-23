const crypto = require('crypto');
const fs = require('fs');

/**
 * Compute SHA-256 hash of a file.
 * @param {string} filePath - Absolute path to file
 * @returns {Promise<string>} Hex digest
 */
const hashFile = (filePath) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });

/**
 * Compute SHA-256 of a string or buffer.
 * @param {string|Buffer} data
 * @returns {string} Hex digest
 */
const hashString = (data) => crypto.createHash('sha256').update(data).digest('hex');

module.exports = { hashFile, hashString };
