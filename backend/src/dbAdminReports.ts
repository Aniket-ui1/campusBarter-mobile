import sql from 'mssql';
import { auditLog, getPool } from './db';

let reportsTablesEnsured = false;

async function ensureReportsTables(): Promise<void> {
    if (reportsTablesEnsured) return;

    const db = await getPool();
    await db.request().query(`
        IF OBJECT_ID(N'[dbo].[Reports]', N'U') IS NULL
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
        END

        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Reports_Status_CreatedAt' AND object_id = OBJECT_ID('dbo.Reports'))
            CREATE INDEX IX_Reports_Status_CreatedAt ON dbo.Reports(status, createdAt DESC);

        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Reports_Target' AND object_id = OBJECT_ID('dbo.Reports'))
            CREATE INDEX IX_Reports_Target ON dbo.Reports(targetType, targetId);

        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Reports_Assigned_Status' AND object_id = OBJECT_ID('dbo.Reports'))
            CREATE INDEX IX_Reports_Assigned_Status ON dbo.Reports(assignedToUserId, status, createdAt DESC);

        IF OBJECT_ID(N'[dbo].[ReportActions]', N'U') IS NULL
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
        END

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
    `);

    reportsTablesEnsured = true;
}

export async function createReport(params: {
    reporterUserId: string;
    targetType: 'LISTING' | 'USER' | 'CHAT' | 'MESSAGE' | 'REVIEW' | 'OTHER';
    targetId: string;
    reason: string;
    details?: string;
}): Promise<number> {
    await ensureReportsTables();

    const db = await getPool();
    const result = await db.request()
        .input('reporterUserId', sql.NVarChar(128), params.reporterUserId)
        .input('targetType', sql.NVarChar(20), params.targetType)
        .input('targetId', sql.NVarChar(128), params.targetId)
        .input('reason', sql.NVarChar(500), params.reason)
        .input('details', sql.NVarChar(2000), params.details?.trim() || null)
        .query(`
            INSERT INTO Reports (reporterUserId, targetType, targetId, reason, details)
            OUTPUT INSERTED.reportId
            VALUES (@reporterUserId, @targetType, @targetId, @reason, @details)
        `);

    const reportId = Number(result.recordset?.[0]?.reportId ?? 0);
    await auditLog(params.reporterUserId, 'CREATE_REPORT', `Report:${reportId}`);
    return reportId;
}

export async function getReportsByReporter(reporterUserId: string, limit = 100): Promise<Record<string, unknown>[]> {
    await ensureReportsTables();

    const safeLimit = Math.max(1, Math.min(200, limit));
    const db = await getPool();
    const result = await db.request()
        .input('reporterUserId', sql.NVarChar(128), reporterUserId)
        .input('limit', sql.Int, safeLimit)
        .query(`
            SELECT TOP (@limit)
                reportId, targetType, targetId, reason, details,
                status, resolutionAction, resolutionNote,
                createdAt, updatedAt, resolvedAt
            FROM Reports
            WHERE reporterUserId = @reporterUserId
            ORDER BY createdAt DESC
        `);

    return result.recordset;
}

export async function getAdminReports(filters: { status?: string; limit?: number } = {}): Promise<Record<string, unknown>[]> {
    await ensureReportsTables();

    const safeLimit = Math.max(1, Math.min(300, Number(filters.limit) || 100));
    const db = await getPool();

    const request = db.request().input('limit', sql.Int, safeLimit);
    const where = filters.status ? 'WHERE r.status = @status' : '';
    if (filters.status) request.input('status', sql.NVarChar(20), filters.status);

    const result = await request.query(`
        SELECT TOP (@limit)
            r.reportId,
            r.reporterUserId,
            reporter.displayName AS reporterName,
            r.targetType,
            r.targetId,
            r.reason,
            r.details,
            r.status,
            r.assignedToUserId,
            assigned.displayName AS assignedToName,
            r.reviewedByUserId,
            reviewer.displayName AS reviewedByName,
            r.resolutionAction,
            r.resolutionNote,
            r.createdAt,
            r.updatedAt,
            r.resolvedAt
        FROM Reports r
        LEFT JOIN Users reporter ON reporter.id = r.reporterUserId
        LEFT JOIN Users assigned ON assigned.id = r.assignedToUserId
        LEFT JOIN Users reviewer ON reviewer.id = r.reviewedByUserId
        ${where}
        ORDER BY r.createdAt DESC
    `);

    return result.recordset;
}

export async function updateAdminReport(params: {
    reportId: number;
    actorUserId: string;
    status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';
    resolutionAction?: string;
    resolutionNote?: string;
    assignToSelf?: boolean;
}): Promise<boolean> {
    await ensureReportsTables();

    const db = await getPool();
    const txn = new sql.Transaction(db);
    await txn.begin();

    try {
        const current = await new sql.Request(txn)
            .input('reportId', sql.BigInt, params.reportId)
            .query(`SELECT reportId, status FROM Reports WHERE reportId = @reportId`);

        if (current.recordset.length === 0) {
            await txn.rollback();
            return false;
        }

        const fromStatus = String(current.recordset[0].status);
        const isResolved = params.status === 'RESOLVED' || params.status === 'DISMISSED';

        await new sql.Request(txn)
            .input('reportId', sql.BigInt, params.reportId)
            .input('status', sql.NVarChar(20), params.status)
            .input('reviewedByUserId', sql.NVarChar(128), params.actorUserId)
            .input('resolutionAction', sql.NVarChar(40), params.resolutionAction || null)
            .input('resolutionNote', sql.NVarChar(2000), params.resolutionNote?.trim() || null)
            .input('assignedToUserId', sql.NVarChar(128), params.assignToSelf ? params.actorUserId : null)
            .query(`
                UPDATE Reports
                SET
                    status = @status,
                    reviewedByUserId = @reviewedByUserId,
                    resolutionAction = CASE WHEN @status IN ('RESOLVED','DISMISSED') THEN @resolutionAction ELSE NULL END,
                    resolutionNote = CASE WHEN @status IN ('RESOLVED','DISMISSED') THEN @resolutionNote ELSE NULL END,
                    assignedToUserId = COALESCE(@assignedToUserId, assignedToUserId),
                    resolvedAt = CASE WHEN @status IN ('RESOLVED','DISMISSED') THEN GETUTCDATE() ELSE NULL END
                WHERE reportId = @reportId
            `);

        await new sql.Request(txn)
            .input('reportId', sql.BigInt, params.reportId)
            .input('actorUserId', sql.NVarChar(128), params.actorUserId)
            .input('actionType', sql.NVarChar(40), params.assignToSelf ? 'ASSIGNED' : 'STATUS_CHANGED')
            .input('fromStatus', sql.NVarChar(20), fromStatus)
            .input('toStatus', sql.NVarChar(20), params.status)
            .input('note', sql.NVarChar(2000), params.resolutionNote?.trim() || null)
            .query(`
                INSERT INTO ReportActions (reportId, actorUserId, actionType, fromStatus, toStatus, note)
                VALUES (@reportId, @actorUserId, @actionType, @fromStatus, @toStatus, @note)
            `);

        await txn.commit();
        await auditLog(params.actorUserId, isResolved ? 'ADMIN_RESOLVE_REPORT' : 'ADMIN_UPDATE_REPORT', `Report:${params.reportId}`);
        return true;
    } catch (err) {
        await txn.rollback();
        throw err;
    }
}

export async function getAdminUsers(limit = 300): Promise<Record<string, unknown>[]> {
    const safeLimit = Math.max(1, Math.min(500, limit));
    const db = await getPool();
    const result = await db.request()
        .input('limit', sql.Int, safeLimit)
        .query(`
            SELECT TOP (@limit)
                id, displayName, email, role, credits, profileComplete, createdAt, lastLoginAt
            FROM Users
            ORDER BY createdAt DESC
        `);

    return result.recordset;
}
