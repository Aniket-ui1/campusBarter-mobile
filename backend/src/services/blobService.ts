// backend/src/services/blobService.ts
// ─────────────────────────────────────────────────────────────
// Azure Blob Storage helper for chat media uploads.
// Uses the existing AZURE_STORAGE_CONNECTION_STRING env var.
// ─────────────────────────────────────────────────────────────

import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import crypto from 'crypto';
import path from 'path';

const CONTAINER_NAME = process.env.AZURE_STORAGE_CHAT_CONTAINER ?? 'chat-media';

function getBlobClient(): BlobServiceClient {
    const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connStr) {
        throw new Error('AZURE_STORAGE_CONNECTION_STRING is not configured');
    }
    return BlobServiceClient.fromConnectionString(connStr);
}

/**
 * Upload a Buffer to Azure Blob Storage and return the public URL.
 * The blob name is a UUID + original extension to prevent path traversal.
 */
export async function uploadChatMedia(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string
): Promise<{ url: string; blobName: string }> {
    const ext = path.extname(originalName).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 10);
    const blobName = `${crypto.randomUUID()}${ext}`;

    const client = getBlobClient();
    const containerClient = client.getContainerClient(CONTAINER_NAME);

    // Create container if it doesn't exist (idempotent)
    await containerClient.createIfNotExists({ access: 'blob' });

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
        blobHTTPHeaders: { blobContentType: mimeType },
    });

    return { url: blockBlobClient.url, blobName };
}

/**
 * Delete a blob by name — called when a message is hard-deleted.
 * Silently ignores missing blobs.
 */
export async function deleteChatMedia(blobName: string): Promise<void> {
    try {
        const client = getBlobClient();
        const containerClient = client.getContainerClient(CONTAINER_NAME);
        await containerClient.getBlockBlobClient(blobName).deleteIfExists();
    } catch (err) {
        console.error('[BlobService] Failed to delete media:', err);
    }
}
