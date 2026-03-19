// backend/src/routes/upload.ts
// POST /api/upload — accept a listing image, validate it, upload to Azure Blob Storage
//
// Accepts: multipart/form-data   field name: "image"
// Validates: jpg, jpeg, png, webp only — max 5MB
// Returns: { url: "<public blob URL>" }

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { BlobServiceClient } from '@azure/storage-blob';
import path from 'path';
import crypto from 'crypto';

export const uploadRouter = Router();

// ── Allowed file types ────────────────────────────────────
const ALLOWED_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'audio/m4a',
    'audio/mp4',
    'audio/mpeg',
    'audio/wav',
    'audio/x-m4a',
    'audio/webm',
    'audio/ogg',
    'audio/3gpp',
    'audio/3gpp2',
];
const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB (includes audio)

// Store file in memory (not disk) — we stream directly to Azure Blob Storage
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: MAX_SIZE_BYTES },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only images (jpg, png, webp, gif), documents (pdf, doc, docx), and audio (m4a, mp3, wav, webm, ogg) are allowed'));
        }
    },
});

// ── POST /api/upload ──────────────────────────────────────
uploadRouter.post('/', upload.single('image'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No image file provided. Use field name "image".' });
            return;
        }

        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        if (!connectionString) {
            res.status(500).json({ error: 'Storage not configured' });
            return;
        }

        // Generate a unique, safe filename — never trust the client filename
        const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
        const blobName = `listings/${req.user!.id}/${crypto.randomUUID()}${ext}`;

        // Upload to Azure Blob Storage
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient('listing-images');
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        await blockBlobClient.uploadData(req.file.buffer, {
            blobHTTPHeaders: { blobContentType: req.file.mimetype },
        });

        // Return the public URL
        const url = blockBlobClient.url;
        res.status(201).json({ url });
    } catch (err) {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({ error: 'File too large. Maximum size is 25MB.' });
            return;
        }
        const message = err instanceof Error ? err.message : 'Upload failed';
        res.status(500).json({ error: message });
    }
});
