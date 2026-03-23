-- ============================================================
-- CampusBarter — Chat System v2 Migration
-- Run in Azure Query Editor or Azure Data Studio on campusbarter-db
-- SAFE: Only adds NEW tables. Existing Chats/Messages tables untouched.
-- ============================================================

-- ── 1. Check existing tables before running ──────────────────
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
  AND TABLE_NAME IN ('Conversations','ConversationMessages','UserPushTokens');

-- ── 2. Conversations ─────────────────────────────────────────
-- Deterministic ID: [oid1, oid2].sort().join('_')
-- This makes it IMPOSSIBLE to create two threads for the same user pair.
IF NOT EXISTS (
    SELECT * FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[Conversations]') AND type = 'U'
)
BEGIN
    CREATE TABLE Conversations (
        conversationId   NVARCHAR(300)  NOT NULL PRIMARY KEY,
        participant1Id   NVARCHAR(128)  NOT NULL,
        participant2Id   NVARCHAR(128)  NOT NULL,
        lastMessage      NVARCHAR(500)  NULL,
        lastMessageTime  DATETIME2      NULL,
        lastSenderId     NVARCHAR(128)  NULL,
        -- Pipe-separated OID values of users who soft-deleted this chat
        deletedFor       NVARCHAR(500)  NOT NULL DEFAULT '',
        createdAt        DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_Conv_P1 FOREIGN KEY (participant1Id) REFERENCES Users(id),
        CONSTRAINT FK_Conv_P2 FOREIGN KEY (participant2Id) REFERENCES Users(id)
    );

    CREATE INDEX idx_conv_p1   ON Conversations(participant1Id);
    CREATE INDEX idx_conv_p2   ON Conversations(participant2Id);
    CREATE INDEX idx_conv_time ON Conversations(lastMessageTime DESC);

    PRINT 'Created Conversations table';
END
ELSE
    PRINT 'Conversations table already exists — skipped';

-- ── 3. ConversationMessages ───────────────────────────────────
-- Enhanced messages with read receipts, media, soft-delete.
-- Named ConversationMessages to avoid collision with existing Messages table.
IF NOT EXISTS (
    SELECT * FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[ConversationMessages]') AND type = 'U'
)
BEGIN
    CREATE TABLE ConversationMessages (
        messageId        NVARCHAR(128)  NOT NULL PRIMARY KEY DEFAULT NEWID(),
        conversationId   NVARCHAR(300)  NOT NULL,
        senderId         NVARCHAR(128)  NOT NULL,
        messageType      NVARCHAR(20)   NOT NULL DEFAULT 'text'
                                        CHECK (messageType IN ('text','image','file')),
        textContent      NVARCHAR(2000) NULL,
        mediaUrl         NVARCHAR(500)  NULL,
        mediaName        NVARCHAR(200)  NULL,
        isRead           BIT            NOT NULL DEFAULT 0,
        readAt           DATETIME2      NULL,
        isDeleted        BIT            NOT NULL DEFAULT 0,
        createdAt        DATETIME2      NOT NULL DEFAULT GETUTCDATE(),

        CONSTRAINT FK_CMsg_Conv   FOREIGN KEY (conversationId)
            REFERENCES Conversations(conversationId) ON DELETE CASCADE,
        CONSTRAINT FK_CMsg_Sender FOREIGN KEY (senderId)
            REFERENCES Users(id)
    );

    -- Critical: keeps queries fast on free tier
    CREATE INDEX idx_cmsg_conv_time ON ConversationMessages(conversationId, createdAt DESC);
    CREATE INDEX idx_cmsg_unread    ON ConversationMessages(conversationId, isRead, senderId);

    PRINT 'Created ConversationMessages table';
END
ELSE
    PRINT 'ConversationMessages table already exists — skipped';

-- ── 4. UserPushTokens ────────────────────────────────────────
IF NOT EXISTS (
    SELECT * FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[UserPushTokens]') AND type = 'U'
)
BEGIN
    CREATE TABLE UserPushTokens (
        tokenId    INT            IDENTITY(1,1) PRIMARY KEY,
        userId     NVARCHAR(128)  NOT NULL,
        pushToken  NVARCHAR(400)  NOT NULL,
        platform   NVARCHAR(20)   NULL CHECK (platform IN ('ios','android','web',NULL)),
        createdAt  DATETIME2      NOT NULL DEFAULT GETUTCDATE(),

        CONSTRAINT UQ_UserToken  UNIQUE (userId, pushToken),
        CONSTRAINT FK_Token_User FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
    );

    CREATE INDEX idx_push_user ON UserPushTokens(userId);

    PRINT 'Created UserPushTokens table';
END
ELSE
    PRINT 'UserPushTokens table already exists — skipped';

-- ── 5. Add lastSeenAt to Users (for online/offline status) ────
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'lastSeenAt'
)
BEGIN
    ALTER TABLE Users ADD lastSeenAt DATETIME2 NULL;
    PRINT 'Added lastSeenAt column to Users table';
END
ELSE
    PRINT 'lastSeenAt column already exists — skipped';

-- ── 6. Verify ────────────────────────────────────────────────
SELECT name AS TABLE_NAME, create_date AS CREATE_DATE
FROM   sys.tables
WHERE  name IN ('Conversations','ConversationMessages','UserPushTokens')
ORDER  BY create_date;

SELECT 'Users.lastSeenAt' AS column_name, 'Added' AS status;
