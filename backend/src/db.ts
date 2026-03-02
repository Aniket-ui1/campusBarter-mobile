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
    } as FSListing));
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
    } as FSMessage));
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

// ── Chats ─────────────────────────────────────────────────────

export async function getChats(userId: string): Promise<Record<string, unknown>[]> {
    const db = await getPool();
    const result = await db.request()
        .input('userId', sql.NVarChar(128), userId)
        .query(`
            SELECT DISTINCT c.id, c.listingId, c.listingTitle, c.lastMessageAt, c.lastMessage
            FROM   Chats c
            INNER JOIN Messages m ON m.chatId = c.id
            WHERE  m.senderId = @userId
               OR  c.id IN (SELECT chatId FROM Messages WHERE senderId = @userId)
            ORDER BY c.lastMessageAt DESC
        `);
    return result.recordset;
}

export async function createChat(
    listingId: string,
    listingTitle: string,
    initiatorId: string
): Promise<string> {
    const db = await getPool();
    const chatId = crypto.randomUUID();
    await db.request()
        .input('id', sql.NVarChar(128), chatId)
        .input('listingId', sql.NVarChar(128), listingId)
        .input('listingTitle', sql.NVarChar(200), listingTitle)
        .query(`
            INSERT INTO Chats (id, listingId, listingTitle)
            VALUES (@id, @listingId, @listingTitle)
        `);
    await auditLog(initiatorId, 'CREATE_CHAT', `Chat:${chatId}`);
    return chatId;
}

// ── Reviews ───────────────────────────────────────────────────

export async function createReview(
    reviewerId: string,
    revieweeId: string,
    rating: number,
    comment: string
): Promise<string> {
    if (reviewerId === revieweeId) throw new Error('Cannot review yourself');
    if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5');

    const db = await getPool();
    const reviewId = crypto.randomUUID();
    await db.request()
        .input('id', sql.NVarChar(128), reviewId)
        .input('reviewerId', sql.NVarChar(128), reviewerId)
        .input('revieweeId', sql.NVarChar(128), revieweeId)
        .input('rating', sql.Int, rating)
        .input('comment', sql.NVarChar(1000), comment.trim())
        .query(`
            INSERT INTO Reviews (id, reviewerId, revieweeId, rating, comment)
            VALUES (@id, @reviewerId, @revieweeId, @rating, @comment)
        `);
    await auditLog(reviewerId, 'CREATE_REVIEW', `Review:${reviewId}`);
    return reviewId;
}

export async function getReviews(userId: string): Promise<Record<string, unknown>[]> {
    const db = await getPool();
    const result = await db.request()
        .input('userId', sql.NVarChar(128), userId)
        .query(`
            SELECT r.id, r.rating, r.comment, r.createdAt,
                   u.displayName AS reviewerName
            FROM   Reviews r
            JOIN   Users u ON u.id = r.reviewerId
            WHERE  r.revieweeId = @userId
            ORDER  BY r.createdAt DESC
        `);
    return result.recordset;
}

// ── Notifications ─────────────────────────────────────────────

export async function getNotifications(userId: string): Promise<Record<string, unknown>[]> {
    const db = await getPool();
    const result = await db.request()
        .input('userId', sql.NVarChar(128), userId)
        .query(`
            SELECT id, type, title, body, [read], relatedId, createdAt
            FROM   Notifications
            WHERE  userId = @userId
            ORDER  BY createdAt DESC
        `);
    return result.recordset;
}

export async function markNotificationRead(notificationId: string, userId: string): Promise<void> {
    const db = await getPool();
    await db.request()
        .input('id', sql.NVarChar(128), notificationId)
        .input('userId', sql.NVarChar(128), userId)
        .query(`UPDATE Notifications SET [read] = 1 WHERE id = @id AND userId = @userId`);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
    const db = await getPool();
    await db.request()
        .input('userId', sql.NVarChar(128), userId)
        .query(`UPDATE Notifications SET [read] = 1 WHERE userId = @userId`);
}

export async function createNotification(
    userId: string,
    type: string,
    title: string,
    body: string,
    relatedId?: string
): Promise<void> {
    const db = await getPool();
    const id = crypto.randomUUID();
    await db.request()
        .input('id', sql.NVarChar(128), id)
        .input('userId', sql.NVarChar(128), userId)
        .input('type', sql.NVarChar(50), type)
        .input('title', sql.NVarChar(200), title)
        .input('body', sql.NVarChar(500), body)
        .input('relatedId', sql.NVarChar(128), relatedId ?? null)
        .query(`
            INSERT INTO Notifications (id, userId, type, title, body, relatedId)
            VALUES (@id, @userId, @type, @title, @body, @relatedId)
        `);
}

// ── Time Credits ──────────────────────────────────────────────

export async function getCreditsBalance(userId: string): Promise<number> {
    const db = await getPool();
    const result = await db.request()
        .input('userId', sql.NVarChar(128), userId)
        .query(`SELECT creditsBalance FROM Users WHERE id = @userId`);
    return (result.recordset[0]?.creditsBalance as number) ?? 0;
}

export async function getCreditsHistory(
    userId: string,
    page = 1,
    pageSize = 20
): Promise<Record<string, unknown>[]> {
    const offset = (page - 1) * pageSize;
    const db = await getPool();
    const result = await db.request()
        .input('userId', sql.NVarChar(128), userId)
        .input('pageSize', sql.Int, pageSize)
        .input('offset', sql.Int, offset)
        .query(`
            SELECT id, fromUserId, toUserId, amount, reason, createdAt
            FROM   TimeCredits
            WHERE  fromUserId = @userId OR toUserId = @userId
            ORDER  BY createdAt DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
        `);
    return result.recordset;
}

export async function transferCredits(
    fromUserId: string,
    toUserId: string,
    amount: number,
    reason: string
): Promise<void> {
    if (fromUserId === toUserId) throw new Error('Cannot transfer credits to yourself');
    if (amount < 1 || !Number.isInteger(amount)) throw new Error('Amount must be a positive integer');

    const db = await getPool();
    // Atomic SQL transaction — debit + credit + log happen together, or none at all
    const txn = new sql.Transaction(db);
    await txn.begin();
    try {
        // Check sender has enough balance
        const balanceResult = await new sql.Request(txn)
            .input('fromUserId', sql.NVarChar(128), fromUserId)
            .query(`SELECT creditsBalance FROM Users WHERE id = @fromUserId`);
        const currentBalance = (balanceResult.recordset[0]?.creditsBalance as number) ?? 0;
        if (currentBalance < amount) throw new Error('Insufficient credits');

        // Debit sender
        await new sql.Request(txn)
            .input('amount', sql.Int, amount)
            .input('fromUserId', sql.NVarChar(128), fromUserId)
            .query(`UPDATE Users SET creditsBalance = creditsBalance - @amount WHERE id = @fromUserId`);

        // Credit receiver
        await new sql.Request(txn)
            .input('amount', sql.Int, amount)
            .input('toUserId', sql.NVarChar(128), toUserId)
            .query(`UPDATE Users SET creditsBalance = creditsBalance + @amount WHERE id = @toUserId`);

        // Log the transaction
        const txId = crypto.randomUUID();
        await new sql.Request(txn)
            .input('id', sql.NVarChar(128), txId)
            .input('fromUserId', sql.NVarChar(128), fromUserId)
            .input('toUserId', sql.NVarChar(128), toUserId)
            .input('amount', sql.Int, amount)
            .input('reason', sql.NVarChar(500), reason)
            .query(`
                INSERT INTO TimeCredits (id, fromUserId, toUserId, amount, reason)
                VALUES (@id, @fromUserId, @toUserId, @amount, @reason)
            `);

        await txn.commit();
        await auditLog(fromUserId, 'TRANSFER_CREDITS', `${amount} credits to ${toUserId}`);
    } catch (err) {
        await txn.rollback();
        throw err;
    }
}

// ── Push Tokens ───────────────────────────────────────────────

export async function savePushToken(userId: string, token: string): Promise<void> {
    const db = await getPool();
    await db.request()
        .input('userId', sql.NVarChar(128), userId)
        .input('token', sql.NVarChar(500), token)
        .query(`UPDATE Users SET pushToken = @token WHERE id = @userId`);
}

export async function getPushToken(userId: string): Promise<string | null> {
    const db = await getPool();
    const result = await db.request()
        .input('userId', sql.NVarChar(128), userId)
        .query(`SELECT pushToken FROM Users WHERE id = @userId`);
    return (result.recordset[0]?.pushToken as string) ?? null;
}
