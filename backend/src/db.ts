// backend/src/db.ts
// ─────────────────────────────────────────────────────────────
// Azure SQL data access layer for CampusBarter.
// Drop-in replacement for lib/firestore.ts — same exported
// function signatures so screens need minimal changes.
//
// Requires: npm install mssql
// Connection string stored in Azure Key Vault → AzureSqlConnectionString
// ─────────────────────────────────────────────────────────────

import sql from 'mssql';

// ── Types (same as firestore.ts) ─────────────────────────────

export interface FSListing {
    id: string;
    type: 'OFFER' | 'REQUEST';
    title: string;
    description: string;
    credits: number;
    userId: string;
    userName: string;
    createdAt: string;
    status: 'OPEN' | 'CLOSED';
}

export interface FSMessage {
    id: string;
    senderId: string;
    text: string;
    timestamp: string;
}

export interface FSChat {
    id: string;
    listingId: string;
    listingTitle: string;
    participants: string[];
    lastMessageAt: string;
    lastMessage?: string;
}

export interface FSNotification {
    id: string;
    type: 'request' | 'accepted' | 'message' | 'review' | 'match';
    title: string;
    body: string;
    read: boolean;
    relatedId?: string;
    createdAt: string;
}

// ── Connection Pool ──────────────────────────────────────────
// Connection string is loaded from environment (set by Azure Key Vault via App Service)

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
    if (pool && pool.connected) return pool;

    const connectionString = process.env.AZURE_SQL_CONNECTION_STRING;
    if (!connectionString) {
        throw new Error('AZURE_SQL_CONNECTION_STRING is not set. Check Azure Key Vault configuration.');
    }

    pool = await sql.connect(connectionString);
    return pool;
}

// ── Audit Logging ────────────────────────────────────────────
// Every data-mutating action is logged for compliance (ITS requirement)

export async function auditLog(
    userId: string | null,
    action: string,
    resource?: string,
    ipAddress?: string,
    statusCode?: number
): Promise<void> {
    try {
        const db = await getPool();
        await db.request()
            .input('userId', sql.NVarChar(128), userId)
            .input('action', sql.NVarChar(100), action)
            .input('resource', sql.NVarChar(200), resource ?? null)
            .input('ipAddress', sql.NVarChar(64), ipAddress ?? null)
            .input('statusCode', sql.Int, statusCode ?? null)
            .query(`
                INSERT INTO AuditLog (userId, action, resource, ipAddress, statusCode)
                VALUES (@userId, @action, @resource, @ipAddress, @statusCode)
            `);
    } catch (err) {
        // Audit log failures should never crash the app — just log to console
        console.error('[AuditLog] Failed to write audit entry:', err);
    }
}

// ── Listings ─────────────────────────────────────────────────

export async function getOpenListings(): Promise<FSListing[]> {
    const db = await getPool();
    const result = await db.request().query(`
        SELECT id, type, title, description, credits, userId, userName,
               createdAt, status
        FROM   Listings
        WHERE  status = 'OPEN'
        ORDER  BY createdAt DESC
    `);
    return result.recordset.map((row: Record<string, unknown>) => ({
        ...row,
        createdAt: (row.createdAt as Date).toISOString(),
    }));
}

export async function createListing(
    data: Omit<FSListing, 'id' | 'createdAt' | 'status'>
): Promise<string> {
    // Input validation — prevents SQL injection via parameterized queries
    if (!data.title?.trim()) throw new Error('Title is required');
    if (!data.description?.trim()) throw new Error('Description is required');
    if (data.credits < 1) throw new Error('Credits must be at least 1');

    const db = await getPool();
    const id = crypto.randomUUID();
    await db.request()
        .input('id', sql.NVarChar(128), id)
        .input('type', sql.NVarChar(10), data.type)
        .input('title', sql.NVarChar(200), data.title.trim())
        .input('description', sql.NVarChar(2000), data.description.trim())
        .input('credits', sql.Int, data.credits)
        .input('userId', sql.NVarChar(128), data.userId)
        .input('userName', sql.NVarChar(128), data.userName)
        .query(`
            INSERT INTO Listings (id, type, title, description, credits, userId, userName)
            VALUES (@id, @type, @title, @description, @credits, @userId, @userName)
        `);

    await auditLog(data.userId, 'CREATE_LISTING', `Listing:${id}`);
    return id;
}

export async function closeListing(listingId: string, userId: string): Promise<void> {
    const db = await getPool();
    await db.request()
        .input('id', sql.NVarChar(128), listingId)
        .input('userId', sql.NVarChar(128), userId)
        .query(`
            UPDATE Listings SET status = 'CLOSED', updatedAt = GETUTCDATE()
            WHERE  id = @id AND userId = @userId   -- userId check prevents unauthorized updates
        `);
    await auditLog(userId, 'CLOSE_LISTING', `Listing:${listingId}`);
}

export async function deleteListing(listingId: string, userId: string): Promise<void> {
    const db = await getPool();
    await db.request()
        .input('id', sql.NVarChar(128), listingId)
        .input('userId', sql.NVarChar(128), userId)
        .query(`
            DELETE FROM Listings WHERE id = @id AND userId = @userId
        `);
    await auditLog(userId, 'DELETE_LISTING', `Listing:${listingId}`);
}

// ── Messages ─────────────────────────────────────────────────

export async function getMessages(chatId: string): Promise<FSMessage[]> {
    const db = await getPool();
    const result = await db.request()
        .input('chatId', sql.NVarChar(128), chatId)
        .query(`
            SELECT id, senderId, text, timestamp
            FROM   Messages
            WHERE  chatId = @chatId
            ORDER  BY timestamp ASC
        `);
    return result.recordset.map((row: Record<string, unknown>) => ({
        ...row,
        timestamp: (row.timestamp as Date).toISOString(),
    }));
}

export async function sendMessage(
    chatId: string,
    senderId: string,
    text: string
): Promise<void> {
    if (!text?.trim()) throw new Error('Message cannot be empty');

    const db = await getPool();
    const msgId = crypto.randomUUID();
    const now = new Date();

    await db.request()
        .input('id', sql.NVarChar(128), msgId)
        .input('chatId', sql.NVarChar(128), chatId)
        .input('senderId', sql.NVarChar(128), senderId)
        .input('text', sql.NVarChar(4000), text.trim())
        .query(`
            INSERT INTO Messages (id, chatId, senderId, text)
            VALUES (@id, @chatId, @senderId, @text);

            UPDATE Chats
            SET lastMessageAt = GETUTCDATE(), lastMessage = @text
            WHERE id = @chatId;
        `);

    await auditLog(senderId, 'SEND_MESSAGE', `Chat:${chatId}`);
}

// ── User Profiles ─────────────────────────────────────────────

export async function getUserProfile(userId: string): Promise<Record<string, unknown> | null> {
    const db = await getPool();
    const result = await db.request()
        .input('id', sql.NVarChar(128), userId)
        .query(`SELECT * FROM Users WHERE id = @id`);
    return result.recordset[0] ?? null;
}

export async function updateUserProfile(
    userId: string,
    updates: Partial<{ displayName: string; bio: string }>
): Promise<void> {
    if (!updates.displayName?.trim() && !updates.bio?.trim()) return;

    const db = await getPool();
    await db.request()
        .input('id', sql.NVarChar(128), userId)
        .input('displayName', sql.NVarChar(128), updates.displayName?.trim() ?? null)
        .input('bio', sql.NVarChar(500), updates.bio?.trim() ?? null)
        .query(`
            UPDATE Users
            SET displayName = ISNULL(@displayName, displayName),
                bio         = ISNULL(@bio, bio)
            WHERE id = @id
        `);
    await auditLog(userId, 'UPDATE_PROFILE', `User:${userId}`);
}
