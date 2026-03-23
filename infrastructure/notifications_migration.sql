-- ============================================================
-- CampusBarter — In-App Notifications System
-- Adds: Notifications table for all app events
-- ============================================================

-- ── Notifications Table ──────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_NAME = 'Notifications'
)
BEGIN
    CREATE TABLE Notifications (
        notificationId       NVARCHAR(128) PRIMARY KEY DEFAULT NEWID(),
        userId               NVARCHAR(128) NOT NULL,
        type                 NVARCHAR(50)  NOT NULL,  -- 'chat', 'marketplace', 'transaction', 'social', 'system'
        title                NVARCHAR(200) NOT NULL,
        message              NVARCHAR(500) NOT NULL,
        relatedEntityId      NVARCHAR(128) NULL,      -- messageId, listingId, transactionId, etc.
        relatedEntityType    NVARCHAR(50)  NULL,      -- 'message', 'listing', 'transaction', 'review', etc.
        actionUrl            NVARCHAR(500) NULL,      -- Deep link: '/chat/123', '/skill/456', etc.
        isRead               BIT           NOT NULL DEFAULT 0,
        createdAt            DATETIME2     DEFAULT GETUTCDATE(),

        CONSTRAINT FK_Notification_User FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
    );

    -- Index for fetching user's notifications (sorted by recent)
    CREATE INDEX idx_notification_user ON Notifications(userId, createdAt DESC);

    -- Index for unread count queries
    CREATE INDEX idx_notification_unread ON Notifications(userId, isRead) WHERE isRead = 0;

    PRINT 'Created Notifications table with indexes';
END
ELSE
    PRINT 'Notifications table already exists — skipped';

GO

-- ── Verification ─────────────────────────────────────────────
SELECT
    'Notifications' AS TableName,
    COUNT(*) AS TotalNotifications,
    SUM(CASE WHEN isRead = 0 THEN 1 ELSE 0 END) AS UnreadCount,
    SUM(CASE WHEN type = 'chat' THEN 1 ELSE 0 END) AS ChatNotifications,
    SUM(CASE WHEN type = 'marketplace' THEN 1 ELSE 0 END) AS MarketplaceNotifications,
    SUM(CASE WHEN type = 'transaction' THEN 1 ELSE 0 END) AS TransactionNotifications
FROM Notifications;

PRINT '';
PRINT '================================================================='
PRINT 'Notifications migration completed successfully!'
PRINT 'Created table: Notifications with indexes for performance'
PRINT 'Next: Deploy backend API and notification triggers'
PRINT '================================================================='
