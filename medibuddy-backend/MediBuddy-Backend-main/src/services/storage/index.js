import {
    uploadFile as uploadBackblaze,
    uploadLargeFile as uploadLargeBackblaze,
    downloadFile as downloadBackblaze,
    getSignedDownloadUrl as getSignedDownloadBackblaze,
    getSignedUploadUrl as getSignedUploadBackblaze,
    deleteFile as deleteBackblaze,
    fileExists as fileExistsBackblaze,
    getFileMetadata as getMetadataBackblaze,
    generateFileKey
} from './backblaze.js';

/**
 * Storage adapter factory
 * Routes storage operations to the configured provider
 */

const getProvider = () => process.env.STORAGE_PROVIDER || 'backblaze';

/**
 * Upload a file to the configured storage provider
 * @param {Object} params - Upload parameters
 * @param {string} params.key - The object key (path in bucket)
 * @param {Buffer} params.buffer - The file buffer
 * @param {string} params.contentType - MIME type of the file
 * @param {Object} params.metadata - Optional metadata
 * @returns {Promise<{key: string, url: string, etag: string}>}
 */
export function uploadFile(params) {
    switch (getProvider()) {
        case 'backblaze':
            return uploadBackblaze(params);
        default:
            throw new Error(`Unknown storage provider: ${getProvider()}`);
    }
}

/**
 * Upload a large file using multipart upload
 * @param {Object} params - Upload parameters
 * @returns {Promise<{key: string, location: string}>}
 */
export function uploadLargeFile(params) {
    switch (getProvider()) {
        case 'backblaze':
            return uploadLargeBackblaze(params);
        default:
            throw new Error(`Unknown storage provider: ${getProvider()}`);
    }
}

/**
 * Download a file from storage
 * @param {string} key - The object key
 * @returns {Promise<{buffer: Buffer, contentType: string}>}
 */
export function downloadFile(key) {
    switch (getProvider()) {
        case 'backblaze':
            return downloadBackblaze(key);
        default:
            throw new Error(`Unknown storage provider: ${getProvider()}`);
    }
}

/**
 * Generate a signed download URL for private file access
 * @param {string} key - The object key
 * @param {number} expiresIn - URL expiration time in seconds
 * @returns {Promise<string>} Signed URL for temporary access
 */
export function getSignedDownloadUrl(key, expiresIn) {
    switch (getProvider()) {
        case 'backblaze':
            return getSignedDownloadBackblaze(key, expiresIn);
        default:
            throw new Error(`Unknown storage provider: ${getProvider()}`);
    }
}

/**
 * Generate a signed upload URL for direct client uploads
 * @param {string} key - The object key
 * @param {string} contentType - Expected content type
 * @param {number} expiresIn - URL expiration time in seconds
 * @returns {Promise<string>} Signed URL for upload
 */
export function getSignedUploadUrl(key, contentType, expiresIn) {
    switch (getProvider()) {
        case 'backblaze':
            return getSignedUploadBackblaze(key, contentType, expiresIn);
        default:
            throw new Error(`Unknown storage provider: ${getProvider()}`);
    }
}

/**
 * Delete a file from the configured storage provider
 * @param {string} key - The object key to delete
 * @returns {Promise<void>}
 */
export function deleteFile(key) {
    switch (getProvider()) {
        case 'backblaze':
            return deleteBackblaze(key);
        default:
            throw new Error(`Unknown storage provider: ${getProvider()}`);
    }
}

/**
 * Check if a file exists
 * @param {string} key - The object key
 * @returns {Promise<boolean>}
 */
export function fileExists(key) {
    switch (getProvider()) {
        case 'backblaze':
            return fileExistsBackblaze(key);
        default:
            throw new Error(`Unknown storage provider: ${getProvider()}`);
    }
}

/**
 * Get file metadata
 * @param {string} key - The object key
 * @returns {Promise<Object>}
 */
export function getFileMetadata(key) {
    switch (getProvider()) {
        case 'backblaze':
            return getMetadataBackblaze(key);
        default:
            throw new Error(`Unknown storage provider: ${getProvider()}`);
    }
}

// Re-export key generator utility
export { generateFileKey };

