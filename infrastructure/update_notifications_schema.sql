-- ============================================================
-- CampusBarter — Update Notifications Table Schema
-- Adds new columns to existing Notifications table
-- ============================================================

-- Check if we need to update the schema
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Notifications')
BEGIN
    PRINT 'Notifications table exists, checking for missing columns...';

    -- Add actionUrl column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'Notifications' AND COLUMN_NAME = 'actionUrl'
    )
    BEGIN
        ALTER TABLE Notifications ADD actionUrl NVARCHAR(500) NULL;
        PRINT 'Added actionUrl column';
    END
    ELSE
        PRINT 'actionUrl column already exists';

    -- Add relatedEntityType column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'Notifications' AND COLUMN_NAME = 'relatedEntityType'
    )
    BEGIN
        ALTER TABLE Notifications ADD relatedEntityType NVARCHAR(50) NULL;
        PRINT 'Added relatedEntityType column';
    END
    ELSE
        PRINT 'relatedEntityType column already exists';

    -- Rename or map old columns if they exist with different names
    -- Check if old 'id' column exists and 'notificationId' doesn't
    IF EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'Notifications' AND COLUMN_NAME = 'id'
    )
    AND NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'Notifications' AND COLUMN_NAME = 'notificationId'
    )
    BEGIN
        EXEC sp_rename 'Notifications.id', 'notificationId', 'COLUMN';
        PRINT 'Renamed id to notificationId';
    END

    -- Check if old 'body' column exists and 'message' doesn't
    IF EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'Notifications' AND COLUMN_NAME = 'body'
    )
    AND NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'Notifications' AND COLUMN_NAME = 'message'
    )
    BEGIN
        EXEC sp_rename 'Notifications.body', 'message', 'COLUMN';
        PRINT 'Renamed body to message';
    END

    -- Check if old 'read' column exists and 'isRead' doesn't
    IF EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'Notifications' AND COLUMN_NAME = 'read'
    )
    AND NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'Notifications' AND COLUMN_NAME = 'isRead'
    )
    BEGIN
        EXEC sp_rename 'Notifications.read', 'isRead', 'COLUMN';
        PRINT 'Renamed read to isRead';
    END

    -- Check if old 'relatedId' column exists and 'relatedEntityId' doesn't
    IF EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'Notifications' AND COLUMN_NAME = 'relatedId'
    )
    AND NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'Notifications' AND COLUMN_NAME = 'relatedEntityId'
    )
    BEGIN
        EXEC sp_rename 'Notifications.relatedId', 'relatedEntityId', 'COLUMN';
        PRINT 'Renamed relatedId to relatedEntityId';
    END

    PRINT 'Schema update complete!';
END
ELSE
BEGIN
    PRINT 'Notifications table does not exist. Run notifications_migration.sql first.';
END
