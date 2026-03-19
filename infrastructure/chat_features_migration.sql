-- ============================================================
-- CampusBarter — Chat Features Enhancement Migration
-- Adds: Reactions, Reply Threading, Edit History, Search Index
-- Run AFTER chat_schema_v2.sql is already applied
-- ============================================================

-- ── PHASE 1: Message Reactions ───────────────────────────
-- Create MessageReactions table for emoji reactions on messages
IF NOT EXISTS (
    SELECT * FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[MessageReactions]') AND type = 'U'
)
BEGIN
    CREATE TABLE MessageReactions (
        reactionId       NVARCHAR(128)  NOT NULL PRIMARY KEY DEFAULT NEWID(),
        messageId        NVARCHAR(128)  NOT NULL,
        userId           NVARCHAR(128)  NOT NULL,
        emoji            NVARCHAR(10)   NOT NULL,  -- Single emoji character (e.g., '👍', '❤️')
        createdAt        DATETIME2      NOT NULL DEFAULT GETUTCDATE(),

        -- Foreign key constraints
        CONSTRAINT FK_Reaction_Message FOREIGN KEY (messageId)
            REFERENCES ConversationMessages(messageId) ON DELETE CASCADE,
        CONSTRAINT FK_Reaction_User FOREIGN KEY (userId)
            REFERENCES Users(id),

        -- One emoji per user per message (prevent duplicates)
        CONSTRAINT UQ_Message_User_Emoji UNIQUE (messageId, userId, emoji)
    );

    -- Indexes for fast lookups
    CREATE INDEX idx_reaction_msg ON MessageReactions(messageId);
    CREATE INDEX idx_reaction_user ON MessageReactions(userId);

    PRINT 'Created MessageReactions table';
END
ELSE
    PRINT 'MessageReactions table already exists — skipped';

-- ── PHASE 2: Reply Threading + Edit History ──────────────
-- (Run this section when implementing Phase 2)
/*
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'ConversationMessages' AND COLUMN_NAME = 'replyToMessageId'
)
BEGIN
    ALTER TABLE ConversationMessages ADD replyToMessageId NVARCHAR(128) NULL;
    ALTER TABLE ConversationMessages ADD CONSTRAINT FK_Msg_Reply
        FOREIGN KEY (replyToMessageId) REFERENCES ConversationMessages(messageId);
    CREATE INDEX idx_cmsg_reply ON ConversationMessages(replyToMessageId);
    PRINT 'Added replyToMessageId column';
END
ELSE
    PRINT 'replyToMessageId column already exists — skipped';

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'ConversationMessages' AND COLUMN_NAME = 'isEdited'
)
BEGIN
    ALTER TABLE ConversationMessages ADD isEdited BIT NOT NULL DEFAULT 0;
    ALTER TABLE ConversationMessages ADD editedAt DATETIME2 NULL;
    ALTER TABLE ConversationMessages ADD originalText NVARCHAR(2000) NULL;
    PRINT 'Added edit tracking columns';
END
ELSE
    PRINT 'Edit tracking columns already exist — skipped';
*/

-- ── PHASE 3: Full-Text Search Index ──────────────────────
-- (Run this section when implementing Phase 3)
/*
-- Check if full-text catalog exists
IF NOT EXISTS (
    SELECT * FROM sys.fulltext_catalogs WHERE name = 'ftCatalog'
)
BEGIN
    CREATE FULLTEXT CATALOG ftCatalog AS DEFAULT;
    PRINT 'Created full-text catalog';
END
ELSE
    PRINT 'Full-text catalog already exists — skipped';

-- Check if full-text index exists on ConversationMessages
IF NOT EXISTS (
    SELECT * FROM sys.fulltext_indexes
    WHERE object_id = OBJECT_ID('ConversationMessages')
)
BEGIN
    -- Get the primary key constraint name dynamically
    DECLARE @pkName NVARCHAR(128);
    SELECT @pkName = kc.CONSTRAINT_NAME
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kc
        ON tc.CONSTRAINT_NAME = kc.CONSTRAINT_NAME
    WHERE tc.TABLE_NAME = 'ConversationMessages'
      AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY';

    IF @pkName IS NOT NULL
    BEGIN
        DECLARE @sql NVARCHAR(MAX);
        SET @sql = N'CREATE FULLTEXT INDEX ON ConversationMessages(textContent) ' +
                   N'KEY INDEX ' + QUOTENAME(@pkName) + N' ' +
                   N'WITH STOPLIST = SYSTEM;';
        EXEC sp_executesql @sql;
        PRINT 'Created full-text index on ConversationMessages';
    END
    ELSE
        PRINT 'Could not find primary key on ConversationMessages';
END
ELSE
    PRINT 'Full-text index already exists — skipped';
*/

-- ── Verify Phase 1 Installation ──────────────────────────────
IF EXISTS (
    SELECT * FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[MessageReactions]') AND type = 'U'
)
BEGIN
    SELECT 'MessageReactions' AS TableName, COUNT(*) AS RowCount
    FROM MessageReactions;
END

PRINT '';
PRINT '=================================================================';
PRINT 'Phase 1 (Message Reactions) migration completed successfully!';
PRINT 'Next steps:';
PRINT '  1. Deploy backend API changes';
PRINT '  2. Deploy frontend UI changes';
PRINT '  3. Test with two users reacting to messages';
PRINT '=================================================================';
