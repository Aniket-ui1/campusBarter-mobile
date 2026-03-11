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
import crypto from 'crypto';

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
    category?: string;
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

// ── Users ─────────────────────────────────────────────────────

/**
 * Upsert a user row — called automatically by auth middleware on every request.
 * Uses MERGE so it's safe to call repeatedly (idempotent).
 * This ensures the userId Foreign Key always exists before any INSERT into
 * Listings, Chats, Messages, Reviews, etc.
 */
export async function ensureUserExists(user: {
    id: string;
    email: string;
    displayName: string;
    role?: string;
}): Promise<void> {
    try {
        const db = await getPool();
        await db.request()
            .input('id', sql.NVarChar(128), user.id)
            .input('email', sql.NVarChar(256), user.email)
            .input('displayName', sql.NVarChar(128), user.displayName || 'SAIT Student')
            .input('role', sql.NVarChar(20), user.role || 'Student')
            .query(`
                MERGE Users AS target
                USING (SELECT @id AS id) AS source ON target.id = source.id
                WHEN NOT MATCHED THEN
                    INSERT (id, email, displayName, role, credits)
                    VALUES (@id, @email, @displayName, @role, 10);
            `);
    } catch (err: any) {
        // Non-fatal — log but don't crash the request
        console.error('[DB] ensureUserExists failed:', err.message);
    }
}

// ── Listings ─────────────────────────────────────────────────

export async function getOpenListings(): Promise<FSListing[]> {
    const db = await getPool();
    try {
        const result = await db.request().query(`
            SELECT id AS id, 
                   type AS type, 
                   title AS title, 
                   description AS description, 
                   credits AS credits, 
                   userId AS userId, 
                   userName AS userName,
                   category AS category,
                   createdAt AS createdAt, 
                   status AS status
            FROM   Listings
            WHERE  status = 'OPEN'
            ORDER  BY createdAt DESC
        `);
        return result.recordset.map((row: Record<string, unknown>) => ({
            ...row,
            createdAt: row.createdAt ? new Date(row.createdAt as any).toISOString() : new Date().toISOString(),
        } as FSListing));
    } catch (err: any) {
        console.error(`[DB] Failed to fetch open listings:`, err.message);
        throw err;
    }
}

export async function createListing(
    data: Omit<FSListing, 'id' | 'createdAt' | 'status'>
): Promise<string> {
    // Input validation — prevents SQL injection via parameterized queries
    if (!data.title?.trim()) throw new Error('Title is required');
    if (!data.description?.trim()) throw new Error('Description is required');
    if (data.credits < 1) throw new Error('Credits must be at least 1');

    console.log(`[DB] Creating listing for user ${data.userId} (userName: ${data.userName})`);
    const db = await getPool();
    const id = crypto.randomUUID();
    try {
        await db.request()
            .input('id', sql.NVarChar(128), id)
            .input('type', sql.NVarChar(10), data.type)
            .input('title', sql.NVarChar(200), data.title.trim())
            .input('description', sql.NVarChar(2000), data.description.trim())
            .input('credits', sql.Int, data.credits)
            .input('userId', sql.NVarChar(128), data.userId)
            .input('userName', sql.NVarChar(128), data.userName)
            .input('category', sql.NVarChar(64), data.category || null)
            .query(`
                INSERT INTO Listings (id, type, title, description, credits, userId, userName, category)
                VALUES (@id, @type, @title, @description, @credits, @userId, @userName, @category)
            `);
        console.log(`[DB] Successfully created listing ${id}`);
    } catch (err: any) {
        console.error(`[DB] Failed to create listing:`, err.message);
        if (err.message.includes('FOREIGN KEY')) {
            console.error(`[DB] CRITICAL: User ${data.userId} does not exist in Users table!`);
        }
        throw err;
    }

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
            SELECT m.id, m.senderId, m.text, m.timestamp,
                   COALESCE(u.displayName, m.senderId) AS senderName
            FROM   Messages m
            LEFT JOIN Users u ON u.id = m.senderId
            WHERE  m.chatId = @chatId
            ORDER  BY m.timestamp ASC
        `);
    return result.recordset.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        senderId: row.senderId as string,
        senderName: row.senderName as string,
        text: row.text as string,
        // Map DB 'timestamp' → 'sentAt' to match frontend ApiMessage type
        sentAt: (row.timestamp as Date).toISOString(),
    } as unknown as FSMessage));
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
    updates: Partial<{
        displayName: string;
        bio: string;
        program: string;
        major: string;
        semester: number;
        skills: string[];
        weaknesses: string[];
        interests: string[];
        profileComplete: boolean;
        avatarUrl: string;
    }>
): Promise<void> {
    const db = await getPool();

    // Build dynamic SET clauses based on what was provided
    const setClauses: string[] = [];
    const request = db.request().input('id', sql.NVarChar(128), userId);

    if (updates.displayName?.trim()) {
        setClauses.push('displayName = @displayName');
        request.input('displayName', sql.NVarChar(128), updates.displayName.trim());
    }
    if (updates.bio !== undefined) {
        setClauses.push('bio = @bio');
        request.input('bio', sql.NVarChar(500), updates.bio?.trim() ?? null);
    }
    if (updates.program !== undefined) {
        setClauses.push('program = @program');
        request.input('program', sql.NVarChar(128), updates.program);
    }
    if (updates.semester !== undefined) {
        setClauses.push('semester = @semester');
        request.input('semester', sql.Int, updates.semester);
    }
    if (updates.profileComplete !== undefined) {
        setClauses.push('profileComplete = @profileComplete');
        request.input('profileComplete', sql.Bit, updates.profileComplete ? 1 : 0);
    }
    if (updates.avatarUrl !== undefined) {
        setClauses.push('avatarUrl = @avatarUrl');
        request.input('avatarUrl', sql.NVarChar(500), updates.avatarUrl);
    }

    if (setClauses.length === 0) return;

    await request.query(`
        UPDATE Users
        SET ${setClauses.join(', ')}
        WHERE id = @id
    `);
    await auditLog(userId, 'UPDATE_PROFILE', `User:${userId}`);
}

/**
 * Sync user profile to the SQL database.
 * If the user doesn't exist (first login), they are created with 10 default credits.
 * If they exist, provided fields are updated.
 */
export async function upsertUserProfile(
    userId: string,
    data: Partial<{
        email: string;
        displayName: string;
        bio: string;
        program: string;
        major: string;
        semester: number;
        avatarUrl: string;
        profileComplete: boolean;
    }>
): Promise<void> {
    const db = await getPool();

    // Check if user exists
    const existing = await db.request()
        .input('id', sql.NVarChar(128), userId)
        .query('SELECT id FROM Users WHERE id = @id');

    if (existing.recordset.length === 0) {
        console.log(`[DB] Creating NEW user record for ${userId} (${data.email})`);
        // First time login — CREATE user record
        // Default credits = 10 (per schema.sql)
        try {
            await db.request()
                .input('id', sql.NVarChar(128), userId)
                .input('email', sql.NVarChar(256), data.email || 'user@edu.sait.ca')
                .input('name', sql.NVarChar(128), data.displayName || 'SAIT Student')
                .input('bio', sql.NVarChar(500), data.bio || null)
                .input('program', sql.NVarChar(128), data.program || null)
                .input('semester', sql.Int, data.semester || null)
                .input('avatarUrl', sql.NVarChar(500), data.avatarUrl || null)
                .input('profileComplete', sql.Bit, data.profileComplete ? 1 : 0)
                .query(`
                    INSERT INTO Users (id, email, displayName, bio, program, semester, avatarUrl, profileComplete)
                    VALUES (@id, @email, @name, @bio, @program, @semester, @avatarUrl, @profileComplete)
                `);
            console.log(`[DB] Successfully created user ${userId}`);
        } catch (err: any) {
            console.error(`[DB] Failed to create user ${userId}:`, err.message);
            throw err;
        }
        await auditLog(userId, 'CREATE_USER', `User:${userId}`);
    } else {
        console.log(`[DB] Updating existing user record for ${userId}`);
        await updateUserProfile(userId, data);
    }
}

// ── Chats ─────────────────────────────────────────────────────

export async function getChats(userId: string): Promise<Record<string, unknown>[]> {
    const db = await getPool();

    // Ensure initiatorId column exists (one-time migration)
    try {
        await db.request().query(`
            IF NOT EXISTS (
                SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'Chats' AND COLUMN_NAME = 'initiatorId'
            )
            ALTER TABLE Chats ADD initiatorId NVARCHAR(128) NULL;
        `);
    } catch { /* column may already exist */ }

    const result = await db.request()
        .input('userId', sql.NVarChar(128), userId)
        .query(`
            SELECT c.id, c.listingId, c.listingTitle, c.lastMessageAt, c.lastMessage,
                   c.initiatorId,
                   l.userId AS listingOwnerId,
                   -- Determine the other user's name
                   CASE
                       WHEN c.initiatorId = @userId THEN COALESCE(lo.displayName, l.userName)
                       ELSE COALESCE(init.displayName, c.initiatorId)
                   END AS otherUserName,
                   CASE
                       WHEN c.initiatorId = @userId THEN l.userId
                       ELSE c.initiatorId
                   END AS otherUserId
            FROM   Chats c
            LEFT JOIN Listings l ON l.id = c.listingId
            LEFT JOIN Users lo  ON lo.id = l.userId           -- listing owner
            LEFT JOIN Users init ON init.id = c.initiatorId   -- chat initiator
            WHERE  c.initiatorId = @userId           -- I started this chat
               OR  l.userId = @userId                -- someone chatted on my listing
               OR  c.id IN (
                       SELECT DISTINCT chatId FROM Messages WHERE senderId = @userId
                   )                                 -- I sent a message in this chat
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

    // Ensure initiatorId column exists
    try {
        await db.request().query(`
            IF NOT EXISTS (
                SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'Chats' AND COLUMN_NAME = 'initiatorId'
            )
            ALTER TABLE Chats ADD initiatorId NVARCHAR(128) NULL;
        `);
    } catch { /* already exists */ }

    // Create the chat with initiatorId
    await db.request()
        .input('id', sql.NVarChar(128), chatId)
        .input('listingId', sql.NVarChar(128), listingId)
        .input('listingTitle', sql.NVarChar(200), listingTitle)
        .input('initiatorId', sql.NVarChar(128), initiatorId)
        .query(`
            INSERT INTO Chats (id, listingId, listingTitle, initiatorId, lastMessageAt, lastMessage)
            VALUES (@id, @listingId, @listingTitle, @initiatorId, GETUTCDATE(), N'Chat started')
        `);

    // Insert a system welcome message so the chat is immediately visible
    const welcomeId = crypto.randomUUID();
    await db.request()
        .input('msgId', sql.NVarChar(128), welcomeId)
        .input('chatId', sql.NVarChar(128), chatId)
        .input('senderId', sql.NVarChar(128), initiatorId)
        .input('text', sql.NVarChar(4000), `👋 Hi! I'm interested in "${listingTitle}"`)
        .query(`
            INSERT INTO Messages (id, chatId, senderId, text)
            VALUES (@msgId, @chatId, @senderId, @text)
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

// ── Smart Matching ─────────────────────────────────────────────

/**
 * Find users whose open listings match a set of keywords and opposite type.
 * Returns distinct user IDs (excluding the poster).
 */
export async function findMatchingUsers(params: {
    keywords: string[];
    oppositeType: 'OFFER' | 'REQUEST';
    excludeUserId: string;
}): Promise<Record<string, unknown>[]> {
    const { keywords, oppositeType, excludeUserId } = params;
    if (keywords.length === 0) return [];

    const db = await getPool();
    const req = db.request()
        .input('type', sql.NVarChar(20), oppositeType)
        .input('exclude', sql.NVarChar(128), excludeUserId);

    // Build OR conditions dynamically — one LIKE per keyword
    // This is safe: keywords are already sanitized (alphanumeric only from regex)
    const likeConditions = keywords.map((kw, i) => {
        const paramName = `kw${i}`;
        req.input(paramName, sql.NVarChar(100), `%${kw}%`);
        return `(l.title LIKE @${paramName} OR l.description LIKE @${paramName})`;
    }).join(' OR ');

    const result = await req.query(`
        SELECT DISTINCT l.userId
        FROM   Listings l
        WHERE  l.type   = @type
          AND  l.status = 'OPEN'
          AND  l.userId != @exclude
          AND  (${likeConditions})
    `);

    return result.recordset;
}

// ── Leaderboard (Task 4) ──────────────────────────────────────

/**
 * Get top helpers this week — users who earned the most credits
 * by receiving transfers (i.e., helping others).
 */
export async function getWeeklyLeaderboard(limit = 10): Promise<Record<string, unknown>[]> {
    const db = await getPool();
    const result = await db.request()
        .input('limit', sql.Int, limit)
        .query(`
            SELECT TOP (@limit)
                u.id, u.displayName, u.avatarUrl,
                ISNULL(SUM(tc.amount), 0) AS weeklyCredits
            FROM   Users u
            LEFT JOIN TimeCredits tc ON tc.toUserId = u.id
                AND tc.createdAt >= DATEADD(DAY, -DATEPART(DW, GETUTCDATE()) + 1, CAST(GETUTCDATE() AS DATE))
            GROUP BY u.id, u.displayName, u.avatarUrl
            ORDER BY weeklyCredits DESC
        `);
    return result.recordset;
}

// ── Market Insights (Task 7) ──────────────────────────────────

export async function getMarketInsights(): Promise<{
    trendingThisWeek: Record<string, unknown>[];
    mostWantedCategories: Record<string, unknown>[];
    avgCreditsByType: Record<string, unknown>[];
    totalListings: number;
    totalExchanges: number;
}> {
    const db = await getPool();

    // Trending: most-viewed/recently-posted listings this week
    const trending = await db.request().query(`
        SELECT TOP 10 id, type, title, credits, userName, createdAt
        FROM   Listings
        WHERE  status = 'OPEN'
          AND  createdAt >= DATEADD(DAY, -7, GETUTCDATE())
        ORDER BY createdAt DESC
    `);

    // Most wanted: top categories in REQUEST listings
    const mostWanted = await db.request().query(`
        SELECT TOP 5
            CASE
                WHEN LOWER(title) LIKE '%math%' OR LOWER(title) LIKE '%calc%' THEN 'Mathematics'
                WHEN LOWER(title) LIKE '%code%' OR LOWER(title) LIKE '%program%' THEN 'Programming'
                WHEN LOWER(title) LIKE '%tutor%' OR LOWER(title) LIKE '%study%' THEN 'Tutoring'
                WHEN LOWER(title) LIKE '%note%' OR LOWER(title) LIKE '%textbook%' THEN 'Study Materials'
                WHEN LOWER(title) LIKE '%design%' OR LOWER(title) LIKE '%graphic%' THEN 'Design'
                ELSE 'Other'
            END AS category,
            COUNT(*) AS count
        FROM  Listings
        WHERE type = 'REQUEST' AND status = 'OPEN'
        GROUP BY
            CASE
                WHEN LOWER(title) LIKE '%math%' OR LOWER(title) LIKE '%calc%' THEN 'Mathematics'
                WHEN LOWER(title) LIKE '%code%' OR LOWER(title) LIKE '%program%' THEN 'Programming'
                WHEN LOWER(title) LIKE '%tutor%' OR LOWER(title) LIKE '%study%' THEN 'Tutoring'
                WHEN LOWER(title) LIKE '%note%' OR LOWER(title) LIKE '%textbook%' THEN 'Study Materials'
                WHEN LOWER(title) LIKE '%design%' OR LOWER(title) LIKE '%graphic%' THEN 'Design'
                ELSE 'Other'
            END
        ORDER BY count DESC
    `);

    // Average credits by type
    const avgCredits = await db.request().query(`
        SELECT type, AVG(credits) AS avgCredits, COUNT(*) AS count
        FROM   Listings WHERE status = 'OPEN'
        GROUP BY type
    `);

    // Totals
    const totals = await db.request().query(`
        SELECT
            (SELECT COUNT(*) FROM Listings) AS totalListings,
            (SELECT COUNT(*) FROM TimeCredits) AS totalExchanges
    `);

    return {
        trendingThisWeek: trending.recordset,
        mostWantedCategories: mostWanted.recordset,
        avgCreditsByType: avgCredits.recordset,
        totalListings: totals.recordset[0]?.totalListings ?? 0,
        totalExchanges: totals.recordset[0]?.totalExchanges ?? 0,
    };
}

// ── QR Exchange (Task 3) ──────────────────────────────────────

export async function createExchange(
    listingId: string,
    buyerId: string,
    sellerId: string,
    credits: number
): Promise<string> {
    const db = await getPool();
    const id = crypto.randomUUID();
    const qrCode = `CB-${id.slice(0, 8).toUpperCase()}`;

    await db.request()
        .input('id', sql.NVarChar(128), id)
        .input('listingId', sql.NVarChar(128), listingId)
        .input('buyerId', sql.NVarChar(128), buyerId)
        .input('sellerId', sql.NVarChar(128), sellerId)
        .input('credits', sql.Int, credits)
        .input('qrCode', sql.NVarChar(50), qrCode)
        .query(`
            INSERT INTO Exchanges (id, listingId, buyerId, sellerId, credits, qrCode, status)
            VALUES (@id, @listingId, @buyerId, @sellerId, @credits, @qrCode, 'PENDING')
        `);

    return qrCode;
}

export async function confirmExchange(qrCode: string, userId: string): Promise<{ credits: number; otherParty: string }> {
    const db = await getPool();

    // Find the exchange
    const result = await db.request()
        .input('qrCode', sql.NVarChar(50), qrCode)
        .query(`SELECT * FROM Exchanges WHERE qrCode = @qrCode AND status = 'PENDING'`);

    if (result.recordset.length === 0) throw new Error('Exchange not found or already completed');

    const exchange = result.recordset[0];
    const isBuyer = exchange.buyerId === userId;
    const isSeller = exchange.sellerId === userId;

    if (!isBuyer && !isSeller) throw new Error('You are not part of this exchange');

    // Mark the user's confirmation
    const confirmField = isBuyer ? 'buyerConfirmed' : 'sellerConfirmed';
    await db.request()
        .input('qrCode', sql.NVarChar(50), qrCode)
        .query(`UPDATE Exchanges SET ${confirmField} = 1 WHERE qrCode = @qrCode`);

    // Check if both confirmed
    const updated = await db.request()
        .input('qrCode', sql.NVarChar(50), qrCode)
        .query(`SELECT * FROM Exchanges WHERE qrCode = @qrCode`);

    const ex = updated.recordset[0];
    if (ex.buyerConfirmed && ex.sellerConfirmed) {
        // Both confirmed — transfer credits
        await transferCredits(ex.buyerId, ex.sellerId, ex.credits, `Exchange: ${ex.listingId}`);
        await db.request()
            .input('qrCode', sql.NVarChar(50), qrCode)
            .query(`UPDATE Exchanges SET status = 'COMPLETED', completedAt = GETUTCDATE() WHERE qrCode = @qrCode`);
    }

    return { credits: ex.credits, otherParty: isBuyer ? ex.sellerId : ex.buyerId };
}
