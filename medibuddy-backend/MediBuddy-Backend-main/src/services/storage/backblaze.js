import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';

/**
 * Backblaze B2 S3-compatible client
 * Uses AWS SDK v3 with custom endpoint for B2
 */
export const backblazeClient = new S3Client({
    region: process.env.B2_REGION,
    endpoint: process.env.B2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.B2_KEY_ID || process.env.B2_ACCESS_KEY,
        secretAccessKey: process.env.B2_APP_KEY || process.env.B2_SECRET_KEY
    },
    forcePathStyle: true // Required for B2 S3 compatibility
});

/**
 * Upload a file to Backblaze B2
 * @param {Object} params - Upload parameters
 * @param {string} params.key - The object key (path in bucket)
 * @param {Buffer} params.buffer - The file buffer
 * @param {string} params.contentType - MIME type of the file
 * @param {Object} params.metadata - Optional file metadata
 * @returns {Promise<{key: string, url: string, etag: string}>}
 */
export async function uploadFile({ key, buffer, contentType, metadata = {} }) {
    const result = await backblazeClient.send(
        new PutObjectCommand({
            Bucket: process.env.B2_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            Metadata: metadata
        })
    );

    return {
        key,
        url: `${process.env.B2_ENDPOINT}/${process.env.B2_BUCKET}/${key}`,
        etag: result.ETag
    };
}

/**
 * Upload a large file using multipart upload
 * @param {Object} params - Upload parameters
 * @param {string} params.key - The object key
 * @param {ReadableStream|Buffer} params.body - File content
 * @param {string} params.contentType - MIME type
 * @param {Function} params.onProgress - Progress callback
 * @returns {Promise<{key: string, location: string}>}
 */
export async function uploadLargeFile({ key, body, contentType, onProgress }) {
    const upload = new Upload({
        client: backblazeClient,
        params: {
            Bucket: process.env.B2_BUCKET,
            Key: key,
            Body: body,
            ContentType: contentType
        },
        queueSize: 4,
        partSize: 5 * 1024 * 1024 // 5MB parts
    });

    if (onProgress) {
        upload.on('httpUploadProgress', (progress) => {
            onProgress({
                loaded: progress.loaded,
                total: progress.total,
                percent: Math.round((progress.loaded / progress.total) * 100)
            });
        });
    }

    const result = await upload.done();

    return {
        key,
        location: result.Location
    };
}

/**
 * Download a file from Backblaze B2
 * @param {string} key - The object key
 * @returns {Promise<{buffer: Buffer, contentType: string}>}
 */
export async function downloadFile(key) {
    const response = await backblazeClient.send(
        new GetObjectCommand({
            Bucket: process.env.B2_BUCKET,
            Key: key
        })
    );

    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of response.Body) {
        chunks.push(chunk);
    }

    return {
        buffer: Buffer.concat(chunks),
        contentType: response.ContentType
    };
}

/**
 * Generate a signed download URL for private file access
 * @param {string} key - The object key
 * @param {number} expiresIn - URL expiration time in seconds (default: 10 minutes)
 * @returns {Promise<string>} Signed URL for temporary access
 */
export async function getSignedDownloadUrl(key, expiresIn = 60 * 10) {
    const command = new GetObjectCommand({
        Bucket: process.env.B2_BUCKET,
        Key: key
    });

    return await getSignedUrl(backblazeClient, command, { expiresIn });
}

/**
 * Generate a signed upload URL for direct client uploads
 * @param {string} key - The object key
 * @param {string} contentType - Expected content type
 * @param {number} expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns {Promise<string>} Signed URL for upload
 */
export async function getSignedUploadUrl(key, contentType, expiresIn = 3600) {
    const command = new PutObjectCommand({
        Bucket: process.env.B2_BUCKET,
        Key: key,
        ContentType: contentType
    });

    return await getSignedUrl(backblazeClient, command, { expiresIn });
}

/**
 * Delete a file from Backblaze B2
 * @param {string} key - The object key to delete
 * @returns {Promise<void>}
 */
export async function deleteFile(key) {
    await backblazeClient.send(
        new DeleteObjectCommand({
            Bucket: process.env.B2_BUCKET,
            Key: key
        })
    );
}

/**
 * Check if a file exists in B2
 * @param {string} key - The object key
 * @returns {Promise<boolean>}
 */
export async function fileExists(key) {
    try {
        await backblazeClient.send(
            new HeadObjectCommand({
                Bucket: process.env.B2_BUCKET,
                Key: key
            })
        );
        return true;
    } catch (error) {
        if (error.name === 'NotFound') {
            return false;
        }
        throw error;
    }
}

/**
 * Get file metadata from B2
 * @param {string} key - The object key
 * @returns {Promise<Object>}
 */
export async function getFileMetadata(key) {
    const response = await backblazeClient.send(
        new HeadObjectCommand({
            Bucket: process.env.B2_BUCKET,
            Key: key
        })
    );

    return {
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        etag: response.ETag,
        metadata: response.Metadata
    };
}

/**
 * Generate a unique file key
 * @param {string} prefix - Key prefix (e.g., 'voice-notes', 'summaries')
 * @param {string} profileId - Profile ID
 * @param {string} extension - File extension
 * @returns {string}
 */
export function generateFileKey(prefix, profileId, extension) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `${prefix}/${profileId}/${timestamp}-${random}.${extension}`;
}
