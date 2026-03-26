-- CampusBarter - Notifications exchange type migration
-- Ensures Notifications.type allows 'exchange' values.

SET XACT_ABORT ON;
BEGIN TRAN;

DECLARE @dropSql NVARCHAR(MAX) = N'';

;WITH check_constraints AS (
    SELECT cc.name AS constraint_name
    FROM sys.check_constraints cc
    INNER JOIN sys.columns c
        ON c.object_id = cc.parent_object_id
       AND c.column_id = cc.parent_column_id
    INNER JOIN sys.tables t
        ON t.object_id = cc.parent_object_id
    WHERE t.name = 'Notifications'
      AND c.name = 'type'
)
SELECT @dropSql = @dropSql + N'ALTER TABLE dbo.Notifications DROP CONSTRAINT [' + constraint_name + N'];'
FROM check_constraints;

IF (LEN(@dropSql) > 0)
BEGIN
    EXEC sp_executesql @dropSql;
END

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID('dbo.Notifications')
      AND name = 'CK_Notifications_Type'
)
BEGIN
    ALTER TABLE dbo.Notifications
    ADD CONSTRAINT CK_Notifications_Type
    CHECK ([type] IN ('request','accepted','message','review','match','exchange'));
END

COMMIT TRAN;
