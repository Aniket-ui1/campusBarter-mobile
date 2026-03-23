-- ============================================================
-- CampusBarter — Phase 2: Reply, Edit, and Pin Messages
-- Adds: Reply threading, Message editing, Pin messages
-- ============================================================

-- ── Reply Threading ──────────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'ConversationMessages' AND COLUMN_NAME = 'replyToMessageId'
)
BEGIN
    ALTER TABLE ConversationMessages ADD replyToMessageId NVARCHAR(128) NULL;
    ALTER TABLE ConversationMessages ADD CONSTRAINT FK_Msg_Reply
        FOREIGN KEY (replyToMessageId) REFERENCES ConversationMessages(messageId);
    CREATE INDEX idx_cmsg_reply ON ConversationMessages(replyToMessageId);
    PRINT 'Added replyToMessageId column with foreign key';
END
ELSE
    PRINT 'replyToMessageId column already exists — skipped';

-- ── Message Editing ──────────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'ConversationMessages' AND COLUMN_NAME = 'isEdited'
)
BEGIN
    ALTER TABLE ConversationMessages ADD isEdited BIT NOT NULL DEFAULT 0;
    ALTER TABLE ConversationMessages ADD editedAt DATETIME2 NULL;
    ALTER TABLE ConversationMessages ADD originalText NVARCHAR(2000) NULL;
    PRINT 'Added edit tracking columns (isEdited, editedAt, originalText)';
END
ELSE
    PRINT 'Edit tracking columns already exist — skipped';

-- ── Pin Messages ─────────────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'ConversationMessages' AND COLUMN_NAME = 'isPinned'
)
BEGIN
    ALTER TABLE ConversationMessages ADD isPinned BIT NOT NULL DEFAULT 0;
    ALTER TABLE ConversationMessages ADD pinnedAt DATETIME2 NULL;
    ALTER TABLE ConversationMessages ADD pinnedBy NVARCHAR(128) NULL;
    PRINT 'Added pin tracking columns (isPinned, pinnedAt, pinnedBy)';
END
ELSE
    PRINT 'Pin tracking columns already exist — skipped';

GO

-- Create index for pinned messages (needs separate batch)
IF NOT EXISTS (
    SELECT * FROM sys.indexes
    WHERE name = 'idx_cmsg_pinned' AND object_id = OBJECT_ID('ConversationMessages')
)
BEGIN
    CREATE INDEX idx_cmsg_pinned ON ConversationMessages(conversationId, isPinned) WHERE isPinned = 1;
    PRINT 'Created index for pinned messages';
END
ELSE
    PRINT 'Pin index already exists — skipped';

-- ── Verification ─────────────────────────────────────────────
SELECT
    'ConversationMessages' AS TableName,
    COUNT(*) AS TotalMessages,
    SUM(CASE WHEN replyToMessageId IS NOT NULL THEN 1 ELSE 0 END) AS RepliesCount,
    SUM(CASE WHEN isEdited = 1 THEN 1 ELSE 0 END) AS EditedCount,
    SUM(CASE WHEN isPinned = 1 THEN 1 ELSE 0 END) AS PinnedCount
FROM ConversationMessages;

PRINT '';
PRINT '=================================================================';
PRINT 'Phase 2 migration completed successfully!';
PRINT 'Added columns: replyToMessageId, isEdited, editedAt, originalText,';
PRINT '               isPinned, pinnedAt, pinnedBy';
PRINT 'Next: Deploy backend API changes and frontend UI';
PRINT '=================================================================';
