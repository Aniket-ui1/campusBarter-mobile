// backend/src/db.ts
// ─────────────────────────────────────────────────────────────
// Azure SQL data access layer for CampusBarter.
// Drop-in replacement for lib/firestore.ts — same exported
// function signatures so screens need minimal changes.
//
// Requires: npm install mssql
// Connection string stored in Azure Key Vault → AzureSqlConnectionString
// ─────────────────────────────────────────────────────────────

import crypto from 'crypto';
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
    unreadCount?: number;
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
// Connection string is loaded from environment (set by Azure Key Vault via App Service).
// Uses a singleton promise to prevent race conditions when multiple requests
// call getPool() simultaneously during startup.

let pool: sql.ConnectionPool | null = null;
let poolPromise: Promise<sql.ConnectionPool> | null = null;

async function createPool(): Promise<sql.ConnectionPool> {
    const connectionString = process.env.AZURE_SQL_CONNECTION_STRING;
    if (!connectionString) {
        throw new Error('AZURE_SQL_CONNECTION_STRING is not set. Check Azure Key Vault configuration.');
    }

    // Parse the connection string into a config object, then overlay our settings
    const parsed = sql.ConnectionPool.parseConnectionString(connectionString);
    const config: sql.config = {
        ...parsed,
        pool: { ...parsed.pool, max: 20, min: 2, idleTimeoutMillis: 30_000 },
        options: { ...parsed.options, encrypt: true, trustServerCertificate: false },
        connectionTimeout: 30_000,
        requestTimeout: 30_000,
    };

    // Retry up to 3 times with exponential backoff
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const newPool = await new sql.ConnectionPool(config).connect();
            console.log(`[DB] Connection pool created (attempt ${attempt})`);
            return newPool;
        } catch (err: any) {
            lastError = err;
            console.error(`[DB] Pool connection attempt ${attempt}/3 failed:`, err.message);
            if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
        }
    }
    throw lastError!;
}

export async function getPool(): Promise<sql.ConnectionPool> {
    // Fast path: pool already exists and is connected
    if (pool?.connected) return pool;

    // Singleton promise prevents concurrent callers from creating multiple pools
    if (!poolPromise) {
        poolPromise = createPool().then(p => {
            pool = p;
            // Reset promise if pool closes unexpectedly so next call reconnects
            p.on('close', () => { pool = null; poolPromise = null; });
            return p;
        }).catch(err => {
            poolPromise = null; // allow retry on next call
            throw err;
        });
    }
    return poolPromise;
}

/** Close the pool gracefully — call on SIGTERM/SIGINT */
export async function closePool(): Promise<void> {
    if (pool) {
        await pool.close();
        pool = null;
        poolPromise = null;
        console.log('[DB] Connection pool closed');
    }
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
 * This ensures the userId Foreign Key always exists before any INSERT into
 * Listings, Chats, Messages, Reviews, etc.
 *
 * IMPORTANT: Matches on EMAIL (not id) because the same person can have different
 * ids depending on login method (Azure AD OID vs mock id). Email is the stable
 * identifier. Returns the DB user's id so the caller can use it for FK references.
 */
export async function ensureUserExists(user: {
    id: string;
    email: string;
    displayName: string;
    role?: string;
}): Promise<string> {
    try {
        const db = await getPool();

        // Match on email (UNIQUE) — handles Azure AD login vs mock login for the same person.
        // WHEN MATCHED: update display name + last login (user already exists).
        // WHEN NOT MATCHED: insert new user row.
        // OUTPUT: always return the actual DB id (may differ from the input id).
        const result = await db.request()
            .input('id', sql.NVarChar(128), user.id)
            .input('email', sql.NVarChar(256), user.email)
            .input('displayName', sql.NVarChar(128), user.displayName || 'SAIT Student')
            .input('role', sql.NVarChar(20), user.role || 'Student')
            .query(`
                MERGE Users AS target
                USING (SELECT @email AS email) AS source ON target.email = source.email
                WHEN MATCHED THEN
                    UPDATE SET displayName = @displayName, lastLoginAt = GETUTCDATE()
                WHEN NOT MATCHED THEN
                    INSERT (id, email, displayName, role, credits)
                    VALUES (@id, @email, @displayName, @role, 10)
                OUTPUT inserted.id;
            `);

        // Return the actual DB user id
        return result.recordset?.[0]?.id ?? user.id;
    } catch (err: any) {
        // This MUST propagate — if the user row isn't created, every subsequent
        // INSERT (listings, chats, messages) will fail with a FK violation.
        console.error('[DB] ensureUserExists failed:', err.message);
        throw err;
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

export async function closeListingAsStaff(listingId: string, actorUserId: string): Promise<void> {
    const db = await getPool();
    await db.request()
        .input('id', sql.NVarChar(128), listingId)
        .query(`
            UPDATE Listings SET status = 'CLOSED', updatedAt = GETUTCDATE()
            WHERE id = @id
        `);
    await auditLog(actorUserId, 'CLOSE_LISTING_STAFF', `Listing:${listingId}`);
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

export async function deleteListingAsStaff(listingId: string, actorUserId: string): Promise<void> {
    const db = await getPool();
    await db.request()
        .input('id', sql.NVarChar(128), listingId)
        .query(`
            DELETE FROM Listings WHERE id = @id
        `);
    await auditLog(actorUserId, 'DELETE_LISTING_STAFF', `Listing:${listingId}`);
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
        sentAt: (row.timestamp as Date).toISOString(),
    } as unknown as FSMessage));
}

export async function getMessagesPage(chatId: string, page = 1, limit = 30): Promise<FSMessage[]> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const offset = (safePage - 1) * safeLimit;
    const db = await getPool();
    const result = await db.request()
        .input('chatId', sql.NVarChar(128), chatId)
        .input('offset', sql.Int, offset)
        .input('limit', sql.Int, safeLimit)
        .query(`
            SELECT m.id, m.senderId, m.text, m.timestamp,
                   COALESCE(u.displayName, m.senderId) AS senderName
            FROM   Messages m
            LEFT JOIN Users u ON u.id = m.senderId
            WHERE  m.chatId = @chatId
            ORDER  BY m.timestamp DESC, m.id DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `);
    return result.recordset.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        senderId: row.senderId as string,
        senderName: row.senderName as string,
        text: row.text as string,
        sentAt: (row.timestamp as Date).toISOString(),
    } as unknown as FSMessage));
}

let hasInitiatorColumn: boolean | null = null;
let chatUserStateEnsured = false;

function buildConversationId(userA: string, userB: string): string {
    const [leftUserId, rightUserId] = [userA, userB].sort((left, right) => left.localeCompare(right));
    return `${leftUserId}_${rightUserId}`;
}

async function ensureChatUserStateTable(): Promise<void> {
    if (chatUserStateEnsured) return;

    const db = await getPool();
    await db.request().query(`
        IF NOT EXISTS (
            SELECT * FROM sys.objects
            WHERE object_id = OBJECT_ID(N'[dbo].[ChatUserState]') AND type in (N'U')
        )
        BEGIN
            CREATE TABLE ChatUserState (
                chatId      NVARCHAR(128) NOT NULL REFERENCES Chats(id) ON DELETE CASCADE,
                userId      NVARCHAR(128) NOT NULL REFERENCES Users(id),
                lastReadAt  DATETIME2 NULL,
                hiddenAt    DATETIME2 NULL,
                PRIMARY KEY (chatId, userId)
            );

            CREATE INDEX IX_ChatUserState_UserId ON ChatUserState(userId, hiddenAt, lastReadAt);
        END
    `);

    chatUserStateEnsured = true;
}

async function chatsTableHasInitiatorId(): Promise<boolean> {
    if (hasInitiatorColumn !== null) return hasInitiatorColumn;

    const db = await getPool();
    const result = await db.request().query(`
        SELECT 1 AS hasColumn
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'Chats' AND COLUMN_NAME = 'initiatorId'
    `);

    hasInitiatorColumn = result.recordset.length > 0;
    return hasInitiatorColumn;
}

export async function canAccessChat(chatId: string, userId: string): Promise<boolean> {
    await ensureChatUserStateTable();
    const db = await getPool();
    const hasInitiator = await chatsTableHasInitiatorId();
    const initiatorCheck = hasInitiator ? 'OR c.initiatorId = @userId' : '';

    const result = await db.request()
        .input('chatId', sql.NVarChar(128), chatId)
        .input('userId', sql.NVarChar(128), userId)
        .query(`
            SELECT TOP 1 1 AS allowed
            FROM Chats c
            LEFT JOIN Listings l ON l.id = c.listingId
            LEFT JOIN ChatParticipants cp ON cp.chatId = c.id AND cp.userId = @userId
                        LEFT JOIN ChatUserState cus ON cus.chatId = c.id AND cus.userId = @userId
            WHERE c.id = @chatId
              AND (
                    cp.userId IS NOT NULL
                    OR l.userId = @userId
                    ${initiatorCheck}
                    OR c.id IN (SELECT DISTINCT chatId FROM Messages WHERE senderId = @userId)
                  )
                            AND (cus.hiddenAt IS NULL OR cus.chatId IS NULL)
        `);

    return result.recordset.length > 0;
}

/**
 * Check if a user can access a conversation in Chat System v2.
 * Conversations table uses deterministic IDs: userId1_userId2 (sorted).
 * A user can access a conversation if they are participant1 or participant2.
 */
export async function canAccessConversation(conversationId: string, userId: string): Promise<boolean> {
    try {
        console.log(`[DB] canAccessConversation checking: conversationId=${conversationId}, userId=${userId}`);
        const db = await getPool();
        const result = await db.request()
            .input('conversationId', sql.NVarChar(300), conversationId)
            .input('userId', sql.NVarChar(128), userId)
            .query(`
                SELECT TOP 1 1 AS allowed, c.participant1Id, c.participant2Id
                FROM Conversations c
                WHERE c.conversationId = @conversationId
                  AND (c.participant1Id = @userId OR c.participant2Id = @userId)
            `);

        const hasAccess = result.recordset.length > 0;
        if (hasAccess) {
            console.log(`[DB] ✅ Access granted: user ${userId} is participant in conversation ${conversationId}`);
        } else {
            // Check if conversation exists at all
            const existsResult = await db.request()
                .input('conversationId', sql.NVarChar(300), conversationId)
                .query(`SELECT participant1Id, participant2Id FROM Conversations WHERE conversationId = @conversationId`);

            if (existsResult.recordset.length === 0) {
                console.log(`[DB] ❌ Conversation ${conversationId} does not exist in Conversations table`);
            } else {
                const conv = existsResult.recordset[0];
                console.log(`[DB] ❌ Access denied: user ${userId} is not a participant. Participants are: ${conv.participant1Id}, ${conv.participant2Id}`);
            }
        }

        return hasAccess;
    } catch (error) {
        console.error('[DB] canAccessConversation error:', error);
        return false;
    }
}

export async function sendMessage(
    chatId: string,
    senderId: string,
    text: string
): Promise<void> {
    if (!text?.trim()) throw new Error('Message cannot be empty');

    await ensureChatUserStateTable();
    const db = await getPool();
    const msgId = crypto.randomUUID();

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

            MERGE ChatUserState AS target
            USING (
                SELECT cp.chatId, cp.userId
                FROM ChatParticipants cp
                WHERE cp.chatId = @chatId
            ) AS source
            ON target.chatId = source.chatId AND target.userId = source.userId
            WHEN MATCHED THEN
                UPDATE SET
                    hiddenAt = NULL,
                    lastReadAt = CASE
                        WHEN source.userId = @senderId THEN GETUTCDATE()
                        ELSE target.lastReadAt
                    END
            WHEN NOT MATCHED THEN
                INSERT (chatId, userId, lastReadAt, hiddenAt)
                VALUES (
                    source.chatId,
                    source.userId,
                    CASE WHEN source.userId = @senderId THEN GETUTCDATE() ELSE NULL END,
                    NULL
                );
        `);

    await auditLog(senderId, 'SEND_MESSAGE', `Chat:${chatId}`);
}

export async function markChatAsRead(chatId: string, userId: string): Promise<void> {
    await ensureChatUserStateTable();
    const db = await getPool();
    await db.request()
        .input('chatId', sql.NVarChar(128), chatId)
        .input('userId', sql.NVarChar(128), userId)
        .query(`
            MERGE ChatUserState AS target
            USING (SELECT @chatId AS chatId, @userId AS userId) AS source
            ON target.chatId = source.chatId AND target.userId = source.userId
            WHEN MATCHED THEN
                UPDATE SET lastReadAt = GETUTCDATE(), hiddenAt = NULL
            WHEN NOT MATCHED THEN
                INSERT (chatId, userId, lastReadAt, hiddenAt)
                VALUES (@chatId, @userId, GETUTCDATE(), NULL);
        `);
}

export async function hideChatForUser(chatId: string, userId: string): Promise<void> {
    await ensureChatUserStateTable();
    const db = await getPool();
    await db.request()
        .input('chatId', sql.NVarChar(128), chatId)
        .input('userId', sql.NVarChar(128), userId)
        .query(`
            MERGE ChatUserState AS target
            USING (SELECT @chatId AS chatId, @userId AS userId) AS source
            ON target.chatId = source.chatId AND target.userId = source.userId
            WHEN MATCHED THEN
                UPDATE SET hiddenAt = GETUTCDATE()
            WHEN NOT MATCHED THEN
                INSERT (chatId, userId, lastReadAt, hiddenAt)
                VALUES (@chatId, @userId, NULL, GETUTCDATE());
        `);

    await auditLog(userId, 'HIDE_CHAT', `Chat:${chatId}`);
}

export async function getChatParticipantIds(chatId: string): Promise<string[]> {
    const db = await getPool();
    const result = await db.request()
        .input('chatId', sql.NVarChar(128), chatId)
        .query(`
            SELECT userId
            FROM ChatParticipants
            WHERE chatId = @chatId
        `);

    return result.recordset.map((row: { userId: string }) => row.userId);
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
        // First time login — CREATE user record with 3 welcome credits
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
                    INSERT INTO Users (id, email, displayName, bio, program, semester, avatarUrl, profileComplete, creditsBalance)
                    VALUES (@id, @email, @name, @bio, @program, @semester, @avatarUrl, @profileComplete, 5)
                `);
            // Log welcome bonus to TimeCredits ledger
            const welcomeId = require('crypto').randomUUID();
            await db.request()
                .input('id', sql.NVarChar(128), welcomeId)
                .input('userId', sql.NVarChar(128), userId)
                .query(`
                    INSERT INTO TimeCredits (id, fromUserId, toUserId, amount, reason)
                    VALUES (@id, @userId, @userId, 5, 'Welcome bonus')
                `);
            console.log(`[DB] Successfully created user ${userId} with 3 welcome credits`);
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
    await ensureChatUserStateTable();
    const db = await getPool();

    const hasInitiator = await chatsTableHasInitiatorId();

    if (!hasInitiator) {
        const legacyResult = await db.request()
            .input('userId', sql.NVarChar(128), userId)
            .query(`
                WITH LegacyChatRows AS (
                    SELECT c.id, c.listingId, c.listingTitle, c.lastMessageAt, c.lastMessage,
                           CAST(NULL AS NVARCHAR(128)) AS initiatorId,
                           l.userId AS listingOwnerId,
                           COALESCE(lo.displayName, l.userName, 'CampusBarter User') AS otherUserName,
                           l.userId AS otherUserId,
                           0 AS unreadCount,
                           ROW_NUMBER() OVER (
                               PARTITION BY l.userId
                               ORDER BY COALESCE(c.lastMessageAt, c.createdAt) DESC, c.createdAt DESC
                           ) AS pairRank
                    FROM   Chats c
                    LEFT JOIN Listings l ON l.id = c.listingId
                    LEFT JOIN Users lo  ON lo.id = l.userId
                    LEFT JOIN ChatParticipants cp ON cp.chatId = c.id AND cp.userId = @userId
                    LEFT JOIN ChatUserState cus ON cus.chatId = c.id AND cus.userId = @userId
                    WHERE (cp.userId = @userId
                       OR l.userId = @userId
                       OR c.id IN (
                           SELECT DISTINCT chatId FROM Messages WHERE senderId = @userId
                       ))
                      AND (cus.hiddenAt IS NULL OR cus.chatId IS NULL)
                )
                SELECT id, listingId, listingTitle, lastMessageAt, lastMessage,
                       initiatorId, listingOwnerId, otherUserName, otherUserId, unreadCount,
                       CAST(NULL AS NVARCHAR(500)) AS otherUserAvatarUrl
                FROM LegacyChatRows
                WHERE pairRank = 1
                ORDER BY COALESCE(lastMessageAt, GETUTCDATE()) DESC
            `);
        return legacyResult.recordset;
    }

    const result = await db.request()
        .input('userId', sql.NVarChar(128), userId)
        .query(`
                        WITH ChatRows AS (
                                SELECT c.id, c.listingId, c.listingTitle, c.lastMessageAt, c.lastMessage,
                                             c.initiatorId,
                                             l.userId AS listingOwnerId,
                                             COALESCE(otherUser.displayName, otherParticipant.userId, 'CampusBarter User') AS otherUserName,
                                             otherParticipant.userId AS otherUserId,
                                             otherUser.avatarUrl AS otherUserAvatarUrl,
                                             COUNT(CASE
                                                        WHEN m.senderId <> @userId
                                                         AND (cus.lastReadAt IS NULL OR m.timestamp > cus.lastReadAt)
                                                        THEN 1
                                             END) AS unreadCount,
                                             ROW_NUMBER() OVER (
                                                     PARTITION BY COALESCE(otherParticipant.userId, c.initiatorId, l.userId)
                                                     ORDER BY COALESCE(c.lastMessageAt, c.createdAt) DESC, c.createdAt DESC
                                             ) AS pairRank
                                FROM   Chats c
                                LEFT JOIN Listings l ON l.id = c.listingId
                                LEFT JOIN ChatParticipants myParticipant ON myParticipant.chatId = c.id AND myParticipant.userId = @userId
                                LEFT JOIN ChatParticipants otherParticipant ON otherParticipant.chatId = c.id AND otherParticipant.userId <> @userId
                                LEFT JOIN Users otherUser ON otherUser.id = otherParticipant.userId
                                LEFT JOIN ChatUserState cus ON cus.chatId = c.id AND cus.userId = @userId
                                LEFT JOIN Messages m ON m.chatId = c.id
                                WHERE  myParticipant.userId = @userId
                                    AND (cus.hiddenAt IS NULL OR cus.chatId IS NULL)
                                GROUP BY c.id, c.listingId, c.listingTitle, c.lastMessageAt, c.lastMessage,
                                                 c.initiatorId, l.userId, otherUser.displayName, otherParticipant.userId, otherUser.avatarUrl, c.createdAt
                        )
                        SELECT id, listingId, listingTitle, lastMessageAt, lastMessage,
                                     initiatorId, listingOwnerId, otherUserName, otherUserId, unreadCount, otherUserAvatarUrl
                        FROM ChatRows
                        WHERE pairRank = 1
                        ORDER BY COALESCE(lastMessageAt, GETUTCDATE()) DESC
        `);
    return result.recordset;
}

export async function createChat(
    listingId: string,
    listingTitle: string,
    initiatorId: string,
    listingOwnerId: string
): Promise<string> {
    await ensureChatUserStateTable();
    const db = await getPool();
    const chatId = buildConversationId(initiatorId, listingOwnerId);
    const normalizedListingTitle = (listingTitle || 'Direct conversation').trim().slice(0, 200);

    // Chats.listingId is still FK-constrained to Listings in production.
    // Resolve a safe, real listingId for direct/profile conversations.
    let effectiveListingId = listingId?.trim() ?? '';
    if (effectiveListingId) {
        const existingListing = await db.request()
            .input('listingId', sql.NVarChar(128), effectiveListingId)
            .query(`SELECT TOP 1 id FROM Listings WHERE id = @listingId`);
        if (existingListing.recordset.length === 0) {
            effectiveListingId = '';
        }
    }

    if (!effectiveListingId) {
        const fallbackListing = await db.request()
            .input('ownerId', sql.NVarChar(128), listingOwnerId)
            .input('initiatorId', sql.NVarChar(128), initiatorId)
            .query(`
                SELECT TOP 1 id
                FROM Listings
                WHERE userId IN (@ownerId, @initiatorId)
                ORDER BY
                    CASE WHEN userId = @ownerId THEN 0 ELSE 1 END,
                    CASE WHEN status = 'OPEN' THEN 0 ELSE 1 END,
                    createdAt DESC
            `);

        if (fallbackListing.recordset.length > 0) {
            effectiveListingId = String(fallbackListing.recordset[0].id);
        }
    }

    if (!effectiveListingId) {
        const ownerResult = await db.request()
            .input('ownerId', sql.NVarChar(128), listingOwnerId)
            .input('initiatorId', sql.NVarChar(128), initiatorId)
            .query(`
                SELECT TOP 1 id, displayName
                FROM Users
                WHERE id IN (@ownerId, @initiatorId)
                ORDER BY CASE WHEN id = @ownerId THEN 0 ELSE 1 END
            `);

        if (ownerResult.recordset.length === 0) {
            throw new Error('No valid user found to create direct conversation placeholder listing');
        }

        const owner = ownerResult.recordset[0] as { id: string; displayName?: string };
        const syntheticListingId = crypto.randomUUID();
        const syntheticTitle = normalizedListingTitle || 'Direct conversation';

        await db.request()
            .input('id', sql.NVarChar(128), syntheticListingId)
            .input('type', sql.NVarChar(10), 'REQUEST')
            .input('title', sql.NVarChar(200), syntheticTitle)
            .input('description', sql.NVarChar(2000), 'System-generated placeholder listing for direct conversations.')
            .input('credits', sql.Int, 1)
            .input('userId', sql.NVarChar(128), owner.id)
            .input('userName', sql.NVarChar(128), owner.displayName || 'User')
            .input('status', sql.NVarChar(10), 'CLOSED')
            .query(`
                INSERT INTO Listings (id, type, title, description, credits, userId, userName, status)
                VALUES (@id, @type, @title, @description, @credits, @userId, @userName, @status)
            `);

        effectiveListingId = syntheticListingId;
    }

    const hasInitiator = await chatsTableHasInitiatorId();

    // Create the chat with initiatorId
    if (hasInitiator) {
        await db.request()
            .input('id', sql.NVarChar(128), chatId)
            .input('listingId', sql.NVarChar(128), effectiveListingId)
            .input('listingTitle', sql.NVarChar(200), normalizedListingTitle)
            .input('initiatorId', sql.NVarChar(128), initiatorId)
            .query(`
                INSERT INTO Chats (id, listingId, listingTitle, initiatorId, lastMessageAt, lastMessage)
                VALUES (@id, @listingId, @listingTitle, @initiatorId, GETUTCDATE(), N'Chat started')
            `);
    } else {
        await db.request()
            .input('id', sql.NVarChar(128), chatId)
            .input('listingId', sql.NVarChar(128), effectiveListingId)
            .input('listingTitle', sql.NVarChar(200), normalizedListingTitle)
            .query(`
                INSERT INTO Chats (id, listingId, listingTitle, lastMessageAt, lastMessage)
                VALUES (@id, @listingId, @listingTitle, GETUTCDATE(), N'Chat started')
            `);
    }

    await db.request()
        .input('chatId', sql.NVarChar(128), chatId)
        .input('userId', sql.NVarChar(128), initiatorId)
        .query(`
            IF NOT EXISTS (
                SELECT 1 FROM ChatParticipants WHERE chatId = @chatId AND userId = @userId
            )
            INSERT INTO ChatParticipants (chatId, userId) VALUES (@chatId, @userId)
        `);

    if (listingOwnerId && listingOwnerId !== initiatorId) {
        await db.request()
            .input('chatId', sql.NVarChar(128), chatId)
            .input('userId', sql.NVarChar(128), listingOwnerId)
            .query(`
                IF NOT EXISTS (
                    SELECT 1 FROM ChatParticipants WHERE chatId = @chatId AND userId = @userId
                )
                INSERT INTO ChatParticipants (chatId, userId) VALUES (@chatId, @userId)
            `);
    }

    await db.request()
        .input('chatId', sql.NVarChar(128), chatId)
        .input('initiatorId', sql.NVarChar(128), initiatorId)
        .input('listingOwnerId', sql.NVarChar(128), listingOwnerId)
        .query(`
            MERGE ChatUserState AS target
            USING (
                SELECT @chatId AS chatId, @initiatorId AS userId, GETUTCDATE() AS lastReadAt, CAST(NULL AS DATETIME2) AS hiddenAt
                UNION ALL
                SELECT @chatId, @listingOwnerId, NULL, NULL
            ) AS source
            ON target.chatId = source.chatId AND target.userId = source.userId
            WHEN MATCHED THEN
                UPDATE SET hiddenAt = NULL, lastReadAt = COALESCE(target.lastReadAt, source.lastReadAt)
            WHEN NOT MATCHED THEN
                INSERT (chatId, userId, lastReadAt, hiddenAt)
                VALUES (source.chatId, source.userId, source.lastReadAt, source.hiddenAt);
        `);

    // Insert a system welcome message so the chat is immediately visible
    const welcomeId = crypto.randomUUID();
    await db.request()
        .input('msgId', sql.NVarChar(128), welcomeId)
        .input('chatId', sql.NVarChar(128), chatId)
        .input('senderId', sql.NVarChar(128), initiatorId)
        .input('text', sql.NVarChar(4000), `Hi! I'm interested in "${normalizedListingTitle}"`)
        .query(`
            INSERT INTO Messages (id, chatId, senderId, text)
            VALUES (@msgId, @chatId, @senderId, @text)
        `);

    await auditLog(initiatorId, 'CREATE_CHAT', `Chat:${chatId}`);
    return chatId;
}

export async function findExistingChatBetweenUsers(
    userA: string,
    userB: string
): Promise<string | null> {
    const db = await getPool();
    const deterministicId = buildConversationId(userA, userB);
    const existingById = await db.request()
        .input('chatId', sql.NVarChar(128), deterministicId)
        .query(`SELECT TOP 1 id FROM Chats WHERE id = @chatId`);

    if (existingById.recordset.length > 0) {
        return existingById.recordset[0].id as string;
    }

    const participantMatch = await db.request()
        .input('userA', sql.NVarChar(128), userA)
        .input('userB', sql.NVarChar(128), userB)
        .query(`
            SELECT TOP 1 c.id
            FROM Chats c
            WHERE EXISTS (
                    SELECT 1 FROM ChatParticipants cp1
                    WHERE cp1.chatId = c.id AND cp1.userId = @userA
                )
              AND EXISTS (
                    SELECT 1 FROM ChatParticipants cp2
                    WHERE cp2.chatId = c.id AND cp2.userId = @userB
                )
            ORDER BY COALESCE(c.lastMessageAt, c.createdAt) DESC, c.createdAt DESC
        `);

    if (participantMatch.recordset.length > 0) {
        return participantMatch.recordset[0].id as string;
    }

    return null;
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

export async function hasCompletedExchangeBetweenUsers(userA: string, userB: string): Promise<boolean> {
    const db = await getPool();
    const result = await db.request()
        .input('userA', sql.NVarChar(128), userA)
        .input('userB', sql.NVarChar(128), userB)
        .query(`
            SELECT TOP 1 1 AS hasExchange
            FROM Exchanges
            WHERE status = 'COMPLETED'
              AND (
                    (buyerId = @userA AND sellerId = @userB)
                    OR
                    (buyerId = @userB AND sellerId = @userA)
                  )
        `);

    return result.recordset.length > 0;
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
            SELECT notificationId, userId, type, title, message,
                   relatedEntityId, relatedEntityType, actionUrl,
                   isRead, createdAt
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
        .query(`UPDATE Notifications SET isRead = 1 WHERE notificationId = @id AND userId = @userId`);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
    const db = await getPool();
    await db.request()
        .input('userId', sql.NVarChar(128), userId)
        .query(`UPDATE Notifications SET isRead = 1 WHERE userId = @userId`);
}

export async function createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    relatedEntityId?: string,
    relatedEntityType?: string,
    actionUrl?: string
): Promise<string> {
    const db = await getPool();
    const result = await db.request()
        .input('userId', sql.NVarChar(128), userId)
        .input('type', sql.NVarChar(50), type)
        .input('title', sql.NVarChar(200), title)
        .input('message', sql.NVarChar(500), message)
        .input('relatedEntityId', sql.NVarChar(128), relatedEntityId ?? null)
        .input('relatedEntityType', sql.NVarChar(50), relatedEntityType ?? null)
        .input('actionUrl', sql.NVarChar(500), actionUrl ?? null)
        .query(`
            INSERT INTO Notifications (userId, type, title, message, relatedEntityId, relatedEntityType, actionUrl)
            OUTPUT INSERTED.notificationId
            VALUES (@userId, @type, @title, @message, @relatedEntityId, @relatedEntityType, @actionUrl)
        `);
    return result.recordset[0].notificationId;
}

// ── Time Credits ──────────────────────────────────────────────

export async function getCreditsBalance(userId: string): Promise<{ balance: number; reserved: number }> {
    const db = await getPool();
    // Try with reservedCredits column (post-migration); fall back to just creditsBalance if column doesn't exist yet
    let result: any;
    try {
        result = await db.request()
            .input('userId', sql.NVarChar(128), userId)
            .query(`SELECT creditsBalance, ISNULL(reservedCredits, 0) AS reservedCredits FROM Users WHERE id = @userId`);
    } catch {
        result = await db.request()
            .input('userId', sql.NVarChar(128), userId)
            .query(`SELECT creditsBalance, 0 AS reservedCredits FROM Users WHERE id = @userId`);
    }
    return {
        balance:  (result.recordset[0]?.creditsBalance  as number) ?? 0,
        reserved: (result.recordset[0]?.reservedCredits as number) ?? 0,
    };
}

// Grant 5 welcome credits to any user who has 0 balance and no prior credit history.
// Called at server startup to backfill users who registered before this feature.
export async function backfillWelcomeCredits(): Promise<number> {
    const db = await getPool();
    const users = await db.request().query(`
        SELECT u.id FROM Users u
        WHERE u.creditsBalance = 0
          AND NOT EXISTS (SELECT 1 FROM TimeCredits tc WHERE tc.toUserId = u.id)
    `);
    if (users.recordset.length === 0) return 0;
    for (const row of users.recordset) {
        const uid = row.id as string;
        const txId = require('crypto').randomUUID();
        await db.request()
            .input('id',  sql.NVarChar(128), txId)
            .input('uid', sql.NVarChar(128), uid)
            .query(`
                UPDATE Users SET creditsBalance = 5 WHERE id = @uid;
                INSERT INTO TimeCredits (id, fromUserId, toUserId, amount, reason)
                VALUES (@id, @uid, @uid, 5, 'Welcome bonus');
            `);
    }
    console.log(`[Credits] Backfilled welcome credits for ${users.recordset.length} user(s)`);
    return users.recordset.length;
}

// Grant 3 monthly credits to every user who hasn't received them in the last 30 days.
// Returns the number of users credited.
export async function grantMonthlyCredits(): Promise<number> {
    const db = await getPool();
    const eligible = await db.request().query(`
        SELECT id FROM Users
        WHERE NOT EXISTS (
            SELECT 1 FROM TimeCredits tc
            WHERE tc.toUserId = Users.id
              AND tc.reason = 'Monthly credit'
              AND tc.createdAt >= DATEADD(DAY, -30, GETUTCDATE())
        )
    `);
    if (eligible.recordset.length === 0) return 0;
    for (const row of eligible.recordset) {
        const uid = row.id as string;
        const txId = require('crypto').randomUUID();
        await db.request()
            .input('id',  sql.NVarChar(128), txId)
            .input('uid', sql.NVarChar(128), uid)
            .query(`
                UPDATE Users SET creditsBalance = creditsBalance + 3 WHERE id = @uid;
                INSERT INTO TimeCredits (id, fromUserId, toUserId, amount, reason)
                VALUES (@id, @uid, @uid, 3, 'Monthly credit');
            `);
    }
    console.log(`[Credits] Granted 3 monthly credits to ${eligible.recordset.length} user(s)`);
    return eligible.recordset.length;
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

/**
 * Return all Expo push tokens registered for a user (multi-device table).
 */
export async function getUserPushTokens(userId: string): Promise<string[]> {
    try {
        const db = await getPool();
        const result = await db.request()
            .input('uid', sql.NVarChar(128), userId)
            .query('SELECT pushToken FROM UserPushTokens WHERE userId = @uid');
        return result.recordset.map((r: { pushToken: string }) => r.pushToken);
    } catch {
        return [];
    }
}

/**
 * Upsert an Expo push token into UserPushTokens (multi-device table).
 * Safe to call repeatedly — duplicate (userId, pushToken) pairs are ignored.
 */
export async function saveUserPushToken(
    userId: string,
    token: string,
    platform: string
): Promise<void> {
    const db = await getPool();
    await db.request()
        .input('uid',   sql.NVarChar(128), userId)
        .input('token', sql.NVarChar(500), token)
        .input('plat',  sql.NVarChar(20),  platform || 'unknown')
        .query(`
            MERGE UserPushTokens AS target
            USING (SELECT @uid AS userId, @token AS pushToken) AS source
            ON target.userId = source.userId AND target.pushToken = source.pushToken
            WHEN MATCHED THEN
                UPDATE SET platform = @plat
            WHEN NOT MATCHED THEN
                INSERT (userId, pushToken, platform)
                VALUES (@uid, @token, @plat);
        `);
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

export async function getListingById(listingId: string): Promise<Record<string, unknown> | null> {
    const db = await getPool();
    const result = await db.request()
        .input('listingId', sql.NVarChar(128), listingId)
        .query(`
            SELECT id, userId, credits, status, title
            FROM Listings
            WHERE id = @listingId
        `);
    return result.recordset[0] ?? null;
}

export async function getAuditLogEntries(limit = 200): Promise<Record<string, unknown>[]> {
    const safeLimit = Math.min(Math.max(1, limit), 1000);
    const db = await getPool();
    const result = await db.request()
        .input('limit', sql.Int, safeLimit)
        .query(`
            SELECT TOP (@limit)
                id, userId, action, resource, ipAddress, userAgent, statusCode, timestamp
            FROM AuditLog
            ORDER BY timestamp DESC
        `);
    return result.recordset;
}

export async function adminAnonymizeUser(userId: string, actorUserId: string): Promise<boolean> {
    const db = await getPool();
    const deletedEmail = `deleted-${userId}@invalid.local`;

    const result = await db.request()
        .input('id', sql.NVarChar(128), userId)
        .input('deletedEmail', sql.NVarChar(256), deletedEmail)
        .query(`
            UPDATE Users
            SET
                email = @deletedEmail,
                displayName = 'Deleted User',
                bio = NULL,
                avatarUrl = NULL,
                profileComplete = 0,
                role = 'Student'
            WHERE id = @id
        `);

    if ((result.rowsAffected?.[0] ?? 0) < 1) {
        return false;
    }

    await auditLog(actorUserId, 'ADMIN_ANONYMIZE_USER', `User:${userId}`);
    return true;
}

// ── Skill Exchange System ─────────────────────────────────────

export interface SkillExchangeRow {
    id: string;
    listingId: string;
    listingTitle: string;
    requesterId: string;
    requesterName: string;
    providerId: string;
    providerName: string;
    credits: number;
    status: 'REQUESTED' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
    requesterConfirmed: boolean;
    providerConfirmed: boolean;
    acceptedAt: string | null;
    requesterConfirmedAt: string | null;
    providerConfirmedAt: string | null;
    completedAt: string | null;
    autoCompleted: boolean;
    cancelledBy: string | null;
    cancelReason: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ExchangeDisputeRow {
    id: string;
    exchangeId: string;
    listingTitle: string;
    requesterId: string;
    requesterName: string;
    providerId: string;
    providerName: string;
    credits: number;
    raisedBy: string;
    raisedByName: string;
    reason: string;
    status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
    resolvedBy: string | null;
    resolution: string | null;
    outcome: 'COMPLETED' | 'CANCELLED' | null;
    createdAt: string;
    resolvedAt: string | null;
}

const SE_SELECT = `
    SELECT
        se.id, se.listingId, l.title AS listingTitle,
        se.requesterId, ur.displayName AS requesterName,
        se.providerId,  up.displayName AS providerName,
        se.credits, se.status,
        se.requesterConfirmed, se.providerConfirmed,
        se.acceptedAt, se.requesterConfirmedAt, se.providerConfirmedAt,
        se.completedAt, se.autoCompleted,
        se.cancelledBy, se.cancelReason,
        se.createdAt, se.updatedAt
    FROM SkillExchanges se
    JOIN Listings l  ON l.id  = se.listingId
    JOIN Users   ur  ON ur.id = se.requesterId
    JOIN Users   up  ON up.id = se.providerId
`;

export async function createSkillExchange(
    listingId: string,
    requesterId: string,
    providerId: string,
    credits: number
): Promise<string> {
    if (requesterId === providerId) throw new Error('Cannot exchange with yourself');
    const db = await getPool();
    const id = crypto.randomUUID();
    const txn = new sql.Transaction(db);
    await txn.begin();
    try {
        const esc = await new sql.Request(txn)
            .input('requesterId', sql.NVarChar(128), requesterId)
            .input('credits', sql.Int, credits)
            .query(`
                UPDATE Users
                SET creditsBalance  = creditsBalance  - @credits,
                    reservedCredits = ISNULL(reservedCredits, 0) + @credits,
                    updatedAt       = GETUTCDATE()
                WHERE id = @requesterId AND creditsBalance >= @credits
            `);
        if (esc.rowsAffected[0] === 0) throw new Error('Insufficient credits');

        await new sql.Request(txn)
            .input('id',          sql.NVarChar(128), id)
            .input('listingId',   sql.NVarChar(128), listingId)
            .input('requesterId', sql.NVarChar(128), requesterId)
            .input('providerId',  sql.NVarChar(128), providerId)
            .input('credits',     sql.Int, credits)
            .query(`
                INSERT INTO SkillExchanges (id, listingId, requesterId, providerId, credits, status)
                VALUES (@id, @listingId, @requesterId, @providerId, @credits, 'REQUESTED')
            `);

        await txn.commit();
        return id;
    } catch (err) {
        await txn.rollback();
        throw err;
    }
}

export async function getSkillExchanges(userId: string): Promise<SkillExchangeRow[]> {
    const db = await getPool();
    const result = await db.request()
        .input('userId', sql.NVarChar(128), userId)
        .query(`${SE_SELECT} WHERE se.requesterId = @userId OR se.providerId = @userId ORDER BY se.createdAt DESC`);
    return result.recordset as SkillExchangeRow[];
}

export async function getSkillExchangeById(id: string, userId: string): Promise<SkillExchangeRow | null> {
    const db = await getPool();
    const result = await db.request()
        .input('id',     sql.NVarChar(128), id)
        .input('userId', sql.NVarChar(128), userId)
        .query(`${SE_SELECT} WHERE se.id = @id AND (se.requesterId = @userId OR se.providerId = @userId)`);
    return (result.recordset[0] as SkillExchangeRow) ?? null;
}

export async function acceptSkillExchange(id: string, providerId: string): Promise<void> {
    const db = await getPool();
    const r = await db.request()
        .input('id',         sql.NVarChar(128), id)
        .input('providerId', sql.NVarChar(128), providerId)
        .query(`
            UPDATE SkillExchanges
            SET status = 'ACCEPTED', acceptedAt = GETUTCDATE(), updatedAt = GETUTCDATE()
            WHERE id = @id AND providerId = @providerId AND status = 'REQUESTED'
        `);
    if (r.rowsAffected[0] === 0) throw new Error('Exchange not found or cannot be accepted');
}

export async function confirmSkillExchange(
    id: string,
    userId: string
): Promise<{ completed: boolean; requesterId: string; providerId: string; credits: number }> {
    const db = await getPool();
    const txn = new sql.Transaction(db);
    await txn.begin();
    try {
        const fetch = await new sql.Request(txn)
            .input('id',     sql.NVarChar(128), id)
            .input('userId', sql.NVarChar(128), userId)
            .query(`
                SELECT requesterId, providerId, credits, requesterConfirmed, providerConfirmed
                FROM SkillExchanges
                WHERE id = @id AND (requesterId = @userId OR providerId = @userId) AND status = 'ACCEPTED'
            `);
        const ex = fetch.recordset[0];
        if (!ex) throw new Error('Exchange not found or not in ACCEPTED state');

        const isRequester = ex.requesterId === userId;
        if (isRequester  && ex.requesterConfirmed) throw new Error('Already confirmed');
        if (!isRequester && ex.providerConfirmed)  throw new Error('Already confirmed');

        const now = new Date();
        await new sql.Request(txn)
            .input('id',  sql.NVarChar(128), id)
            .input('now', sql.DateTime2, now)
            .query(isRequester
                ? `UPDATE SkillExchanges SET requesterConfirmed = 1, requesterConfirmedAt = @now, updatedAt = @now WHERE id = @id`
                : `UPDATE SkillExchanges SET providerConfirmed  = 1, providerConfirmedAt  = @now, updatedAt = @now WHERE id = @id`
            );

        const bothConfirmed = isRequester ? !!ex.providerConfirmed : !!ex.requesterConfirmed;
        if (bothConfirmed) {
            await new sql.Request(txn)
                .input('credits',     sql.Int,          ex.credits)
                .input('requesterId', sql.NVarChar(128), ex.requesterId)
                .query(`UPDATE Users SET reservedCredits = ISNULL(reservedCredits,0) - @credits, updatedAt = GETUTCDATE() WHERE id = @requesterId`);
            await new sql.Request(txn)
                .input('credits',    sql.Int,          ex.credits)
                .input('providerId', sql.NVarChar(128), ex.providerId)
                .query(`UPDATE Users SET creditsBalance = creditsBalance + @credits, updatedAt = GETUTCDATE() WHERE id = @providerId`);
            const txId = crypto.randomUUID();
            await new sql.Request(txn)
                .input('id',   sql.NVarChar(128), txId)
                .input('from', sql.NVarChar(128), ex.requesterId)
                .input('to',   sql.NVarChar(128), ex.providerId)
                .input('amt',  sql.Int,           ex.credits)
                .query(`INSERT INTO TimeCredits (id, fromUserId, toUserId, amount, reason) VALUES (@id, @from, @to, @amt, 'Skill exchange completed')`);
            await new sql.Request(txn)
                .input('id',  sql.NVarChar(128), id)
                .input('now', sql.DateTime2, now)
                .query(`UPDATE SkillExchanges SET status = 'COMPLETED', completedAt = @now, updatedAt = @now WHERE id = @id`);
        }

        await txn.commit();
        return { completed: bothConfirmed, requesterId: ex.requesterId, providerId: ex.providerId, credits: ex.credits };
    } catch (err) {
        await txn.rollback();
        throw err;
    }
}

export async function cancelSkillExchange(
    id: string,
    userId: string,
    reason?: string
): Promise<{ requesterId: string; providerId: string; credits: number }> {
    const db = await getPool();
    const txn = new sql.Transaction(db);
    await txn.begin();
    try {
        const fetch = await new sql.Request(txn)
            .input('id',     sql.NVarChar(128), id)
            .input('userId', sql.NVarChar(128), userId)
            .query(`
                SELECT requesterId, providerId, credits
                FROM SkillExchanges
                WHERE id = @id AND (requesterId = @userId OR providerId = @userId)
                  AND status IN ('REQUESTED','ACCEPTED')
            `);
        const ex = fetch.recordset[0];
        if (!ex) throw new Error('Exchange not found or cannot be cancelled');

        await new sql.Request(txn)
            .input('credits',     sql.Int,          ex.credits)
            .input('requesterId', sql.NVarChar(128), ex.requesterId)
            .query(`UPDATE Users SET creditsBalance = creditsBalance + @credits, reservedCredits = ISNULL(reservedCredits,0) - @credits, updatedAt = GETUTCDATE() WHERE id = @requesterId`);
        await new sql.Request(txn)
            .input('id',     sql.NVarChar(128), id)
            .input('userId', sql.NVarChar(128), userId)
            .input('reason', sql.NVarChar(500), reason ?? null)
            .query(`UPDATE SkillExchanges SET status = 'CANCELLED', cancelledBy = @userId, cancelReason = @reason, updatedAt = GETUTCDATE() WHERE id = @id`);

        await txn.commit();
        return { requesterId: ex.requesterId, providerId: ex.providerId, credits: ex.credits };
    } catch (err) {
        await txn.rollback();
        throw err;
    }
}

export async function raiseDispute(exchangeId: string, userId: string, reason: string): Promise<void> {
    const db = await getPool();
    const txn = new sql.Transaction(db);
    await txn.begin();
    try {
        const check = await new sql.Request(txn)
            .input('exchangeId', sql.NVarChar(128), exchangeId)
            .input('userId',     sql.NVarChar(128), userId)
            .query(`SELECT id FROM SkillExchanges WHERE id = @exchangeId AND (requesterId = @userId OR providerId = @userId) AND status = 'ACCEPTED'`);
        if (!check.recordset[0]) throw new Error('Exchange not found or not in ACCEPTED state');

        await new sql.Request(txn)
            .input('exchangeId', sql.NVarChar(128), exchangeId)
            .query(`UPDATE SkillExchanges SET status = 'DISPUTED', updatedAt = GETUTCDATE() WHERE id = @exchangeId`);

        await new sql.Request(txn)
            .input('id',         sql.NVarChar(128), crypto.randomUUID())
            .input('exchangeId', sql.NVarChar(128), exchangeId)
            .input('raisedBy',   sql.NVarChar(128), userId)
            .input('reason',     sql.NVarChar(1000), reason)
            .query(`INSERT INTO ExchangeDisputes (id, exchangeId, raisedBy, reason, status) VALUES (@id, @exchangeId, @raisedBy, @reason, 'OPEN')`);

        await txn.commit();
    } catch (err) {
        await txn.rollback();
        throw err;
    }
}

export async function getOpenDisputes(): Promise<ExchangeDisputeRow[]> {
    const db = await getPool();
    const result = await db.request().query(`
        SELECT d.id, d.exchangeId, l.title AS listingTitle,
               se.requesterId, ur.displayName AS requesterName,
               se.providerId,  up.displayName AS providerName,
               se.credits, d.raisedBy, ub.displayName AS raisedByName,
               d.reason, d.status, d.resolvedBy, d.resolution, d.outcome,
               d.createdAt, d.resolvedAt
        FROM ExchangeDisputes d
        JOIN SkillExchanges se ON se.id = d.exchangeId
        JOIN Listings l        ON l.id  = se.listingId
        JOIN Users ur          ON ur.id = se.requesterId
        JOIN Users up          ON up.id = se.providerId
        JOIN Users ub          ON ub.id = d.raisedBy
        WHERE d.status = 'OPEN'
        ORDER BY d.createdAt DESC
    `);
    return result.recordset as ExchangeDisputeRow[];
}

export async function resolveDispute(
    disputeId: string,
    adminId: string,
    outcome: 'COMPLETED' | 'CANCELLED',
    resolution: string
): Promise<{ requesterId: string; providerId: string; credits: number }> {
    const db = await getPool();
    const txn = new sql.Transaction(db);
    await txn.begin();
    try {
        const fetch = await new sql.Request(txn)
            .input('disputeId', sql.NVarChar(128), disputeId)
            .query(`
                SELECT d.exchangeId, se.requesterId, se.providerId, se.credits
                FROM ExchangeDisputes d JOIN SkillExchanges se ON se.id = d.exchangeId
                WHERE d.id = @disputeId AND d.status = 'OPEN'
            `);
        const d = fetch.recordset[0];
        if (!d) throw new Error('Dispute not found or already resolved');

        if (outcome === 'COMPLETED') {
            await new sql.Request(txn).input('credits', sql.Int, d.credits).input('req', sql.NVarChar(128), d.requesterId)
                .query(`UPDATE Users SET reservedCredits = ISNULL(reservedCredits,0) - @credits, updatedAt = GETUTCDATE() WHERE id = @req`);
            await new sql.Request(txn).input('credits', sql.Int, d.credits).input('pro', sql.NVarChar(128), d.providerId)
                .query(`UPDATE Users SET creditsBalance = creditsBalance + @credits, updatedAt = GETUTCDATE() WHERE id = @pro`);
            await new sql.Request(txn)
                .input('id', sql.NVarChar(128), crypto.randomUUID())
                .input('from', sql.NVarChar(128), d.requesterId).input('to', sql.NVarChar(128), d.providerId).input('amt', sql.Int, d.credits)
                .query(`INSERT INTO TimeCredits (id, fromUserId, toUserId, amount, reason) VALUES (@id, @from, @to, @amt, 'Dispute resolved - exchange completed')`);
            await new sql.Request(txn).input('eid', sql.NVarChar(128), d.exchangeId)
                .query(`UPDATE SkillExchanges SET status = 'COMPLETED', completedAt = GETUTCDATE(), updatedAt = GETUTCDATE() WHERE id = @eid`);
        } else {
            await new sql.Request(txn).input('credits', sql.Int, d.credits).input('req', sql.NVarChar(128), d.requesterId)
                .query(`UPDATE Users SET creditsBalance = creditsBalance + @credits, reservedCredits = ISNULL(reservedCredits,0) - @credits, updatedAt = GETUTCDATE() WHERE id = @req`);
            await new sql.Request(txn).input('eid', sql.NVarChar(128), d.exchangeId).input('adminId', sql.NVarChar(128), adminId)
                .query(`UPDATE SkillExchanges SET status = 'CANCELLED', cancelledBy = @adminId, cancelReason = 'Dispute resolved - cancelled by admin', updatedAt = GETUTCDATE() WHERE id = @eid`);
        }

        await new sql.Request(txn)
            .input('disputeId',  sql.NVarChar(128),  disputeId)
            .input('adminId',    sql.NVarChar(128),  adminId)
            .input('outcome',    sql.NVarChar(20),   outcome)
            .input('resolution', sql.NVarChar(1000), resolution)
            .query(`UPDATE ExchangeDisputes SET status = 'RESOLVED', resolvedBy = @adminId, outcome = @outcome, resolution = @resolution, resolvedAt = GETUTCDATE() WHERE id = @disputeId`);

        await txn.commit();
        return { requesterId: d.requesterId, providerId: d.providerId, credits: d.credits };
    } catch (err) {
        await txn.rollback();
        throw err;
    }
}

export async function autoCompleteStaleExchanges(): Promise<Array<{ requesterId: string; providerId: string; credits: number }>> {
    const db = await getPool();
    const stale = await db.request().query(`
        SELECT id, requesterId, providerId, credits FROM SkillExchanges
        WHERE status = 'ACCEPTED' AND providerConfirmed = 1 AND requesterConfirmed = 0
          AND providerConfirmedAt < DATEADD(HOUR, -48, GETUTCDATE())
    `);
    const completed: Array<{ requesterId: string; providerId: string; credits: number }> = [];
    for (const ex of stale.recordset) {
        const txn = new sql.Transaction(db);
        await txn.begin();
        try {
            await new sql.Request(txn).input('c', sql.Int, ex.credits).input('req', sql.NVarChar(128), ex.requesterId)
                .query(`UPDATE Users SET reservedCredits = ISNULL(reservedCredits,0) - @c, updatedAt = GETUTCDATE() WHERE id = @req`);
            await new sql.Request(txn).input('c', sql.Int, ex.credits).input('pro', sql.NVarChar(128), ex.providerId)
                .query(`UPDATE Users SET creditsBalance = creditsBalance + @c, updatedAt = GETUTCDATE() WHERE id = @pro`);
            await new sql.Request(txn)
                .input('id', sql.NVarChar(128), crypto.randomUUID())
                .input('from', sql.NVarChar(128), ex.requesterId).input('to', sql.NVarChar(128), ex.providerId).input('c', sql.Int, ex.credits)
                .query(`INSERT INTO TimeCredits (id, fromUserId, toUserId, amount, reason) VALUES (@id, @from, @to, @c, 'Auto-completed: provider confirmed, requester silent 48h')`);
            await new sql.Request(txn).input('id', sql.NVarChar(128), ex.id)
                .query(`UPDATE SkillExchanges SET status='COMPLETED', completedAt=GETUTCDATE(), autoCompleted=1, requesterConfirmed=1, updatedAt=GETUTCDATE() WHERE id=@id`);
            await txn.commit();
            completed.push({ requesterId: ex.requesterId, providerId: ex.providerId, credits: ex.credits });
        } catch { await txn.rollback(); }
    }
    return completed;
}

export async function autoCancelAbandonedExchanges(): Promise<Array<{ requesterId: string; credits: number }>> {
    const db = await getPool();
    const abandoned = await db.request().query(`
        SELECT id, requesterId, credits FROM SkillExchanges
        WHERE status = 'ACCEPTED' AND acceptedAt < DATEADD(DAY, -7, GETUTCDATE())
          AND requesterConfirmed = 0 AND providerConfirmed = 0
    `);
    const cancelled: Array<{ requesterId: string; credits: number }> = [];
    for (const ex of abandoned.recordset) {
        const txn = new sql.Transaction(db);
        await txn.begin();
        try {
            await new sql.Request(txn).input('c', sql.Int, ex.credits).input('req', sql.NVarChar(128), ex.requesterId)
                .query(`UPDATE Users SET creditsBalance = creditsBalance + @c, reservedCredits = ISNULL(reservedCredits,0) - @c, updatedAt = GETUTCDATE() WHERE id = @req`);
            await new sql.Request(txn).input('id', sql.NVarChar(128), ex.id)
                .query(`UPDATE SkillExchanges SET status='CANCELLED', cancelReason='Auto-cancelled: no activity for 7 days', updatedAt=GETUTCDATE() WHERE id=@id`);
            await txn.commit();
            cancelled.push({ requesterId: ex.requesterId, credits: ex.credits });
        } catch { await txn.rollback(); }
    }
    return cancelled;
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
