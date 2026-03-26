SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.Reports', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.Reports (
            reportId           BIGINT         NOT NULL IDENTITY(1,1),
            reporterUserId     NVARCHAR(128)  NOT NULL,
            targetType         NVARCHAR(20)   NOT NULL,
            targetId           NVARCHAR(128)  NOT NULL,
            reason             NVARCHAR(500)  NOT NULL,
            details            NVARCHAR(2000) NULL,
            status             NVARCHAR(20)   NOT NULL CONSTRAINT DF_Reports_Status DEFAULT ('OPEN'),
            assignedToUserId   NVARCHAR(128)  NULL,
            reviewedByUserId   NVARCHAR(128)  NULL,
            resolutionAction   NVARCHAR(40)   NULL,
            resolutionNote     NVARCHAR(2000) NULL,
            createdAt          DATETIME2      NOT NULL CONSTRAINT DF_Reports_CreatedAt DEFAULT (GETUTCDATE()),
            updatedAt          DATETIME2      NOT NULL CONSTRAINT DF_Reports_UpdatedAt DEFAULT (GETUTCDATE()),
            resolvedAt         DATETIME2      NULL,
            CONSTRAINT PK_Reports PRIMARY KEY CLUSTERED (reportId),
            CONSTRAINT FK_Reports_Reporter FOREIGN KEY (reporterUserId) REFERENCES dbo.Users(id),
            CONSTRAINT FK_Reports_AssignedTo FOREIGN KEY (assignedToUserId) REFERENCES dbo.Users(id),
            CONSTRAINT FK_Reports_ReviewedBy FOREIGN KEY (reviewedByUserId) REFERENCES dbo.Users(id),
            CONSTRAINT CK_Reports_TargetType CHECK (targetType IN ('LISTING','USER','CHAT','MESSAGE','REVIEW','OTHER')),
            CONSTRAINT CK_Reports_Status CHECK (status IN ('OPEN','IN_REVIEW','RESOLVED','DISMISSED')),
            CONSTRAINT CK_Reports_ResolvedAt CHECK (
                (status IN ('RESOLVED','DISMISSED') AND resolvedAt IS NOT NULL)
                OR
                (status IN ('OPEN','IN_REVIEW') AND resolvedAt IS NULL)
            )
        );
    END;

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Reports_Status_CreatedAt' AND object_id = OBJECT_ID('dbo.Reports'))
        CREATE INDEX IX_Reports_Status_CreatedAt ON dbo.Reports(status, createdAt DESC);

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Reports_Target' AND object_id = OBJECT_ID('dbo.Reports'))
        CREATE INDEX IX_Reports_Target ON dbo.Reports(targetType, targetId);

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Reports_Assigned_Status' AND object_id = OBJECT_ID('dbo.Reports'))
        CREATE INDEX IX_Reports_Assigned_Status ON dbo.Reports(assignedToUserId, status, createdAt DESC);

    IF OBJECT_ID(N'dbo.ReportActions', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.ReportActions (
            actionId           BIGINT         NOT NULL IDENTITY(1,1),
            reportId           BIGINT         NOT NULL,
            actorUserId        NVARCHAR(128)  NOT NULL,
            actionType         NVARCHAR(40)   NOT NULL,
            fromStatus         NVARCHAR(20)   NULL,
            toStatus           NVARCHAR(20)   NULL,
            note               NVARCHAR(2000) NULL,
            createdAt          DATETIME2      NOT NULL CONSTRAINT DF_ReportActions_CreatedAt DEFAULT (GETUTCDATE()),
            CONSTRAINT PK_ReportActions PRIMARY KEY CLUSTERED (actionId),
            CONSTRAINT FK_ReportActions_Report FOREIGN KEY (reportId) REFERENCES dbo.Reports(reportId) ON DELETE CASCADE,
            CONSTRAINT FK_ReportActions_Actor FOREIGN KEY (actorUserId) REFERENCES dbo.Users(id),
            CONSTRAINT CK_ReportActions_ActionType CHECK (actionType IN ('STATUS_CHANGED','ASSIGNED','LISTING_DELETED','USER_ANONYMIZED','DISMISSED','NOTE_ADDED','OTHER')),
            CONSTRAINT CK_ReportActions_Status CHECK (
                (fromStatus IS NULL OR fromStatus IN ('OPEN','IN_REVIEW','RESOLVED','DISMISSED'))
                AND
                (toStatus IS NULL OR toStatus IN ('OPEN','IN_REVIEW','RESOLVED','DISMISSED'))
            )
        );
    END;

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ReportActions_Report_CreatedAt' AND object_id = OBJECT_ID('dbo.ReportActions'))
        CREATE INDEX IX_ReportActions_Report_CreatedAt ON dbo.ReportActions(reportId, createdAt DESC);

    EXEC('
        CREATE OR ALTER TRIGGER dbo.TR_Reports_SetUpdatedAt
        ON dbo.Reports
        AFTER UPDATE
        AS
        BEGIN
            SET NOCOUNT ON;
            UPDATE r
            SET updatedAt = GETUTCDATE()
            FROM dbo.Reports r
            INNER JOIN inserted i ON i.reportId = r.reportId;
        END
    ');

    COMMIT TRANSACTION;
    PRINT 'Reports migration complete.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @ErrLine INT = ERROR_LINE();
    DECLARE @ErrNum INT = ERROR_NUMBER();
    RAISERROR('Reports migration failed. Error %d at line %d: %s', 16, 1, @ErrNum, @ErrLine, @ErrMsg);
END CATCH;
GO
