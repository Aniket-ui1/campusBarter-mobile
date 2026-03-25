-- ============================================================
-- Skill Exchanges Migration
-- Run this in Azure SQL Query Editor (one-time migration)
-- ============================================================

-- 1. Add reservedCredits column to Users (idempotent)
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'reservedCredits'
)
BEGIN
    ALTER TABLE Users ADD reservedCredits INT NOT NULL DEFAULT 0;
    PRINT 'Added reservedCredits column to Users';
END
ELSE
    PRINT 'reservedCredits already exists on Users — skipped';

-- 2. Create SkillExchanges table
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'SkillExchanges')
BEGIN
    CREATE TABLE SkillExchanges (
        id                   NVARCHAR(128) NOT NULL PRIMARY KEY DEFAULT NEWID(),
        listingId            NVARCHAR(128) NOT NULL REFERENCES Listings(id),
        requesterId          NVARCHAR(128) NOT NULL REFERENCES Users(id),
        providerId           NVARCHAR(128) NOT NULL REFERENCES Users(id),
        credits              INT           NOT NULL CHECK (credits > 0),
        status               NVARCHAR(20)  NOT NULL DEFAULT 'REQUESTED'
                             CONSTRAINT CK_SE_Status CHECK (status IN ('REQUESTED','ACCEPTED','COMPLETED','CANCELLED','DISPUTED')),

        -- Confirmation bits
        requesterConfirmed   BIT           NOT NULL DEFAULT 0,
        providerConfirmed    BIT           NOT NULL DEFAULT 0,

        -- Timestamps
        acceptedAt           DATETIME2     NULL,
        requesterConfirmedAt DATETIME2     NULL,
        providerConfirmedAt  DATETIME2     NULL,
        completedAt          DATETIME2     NULL,
        autoCompleted        BIT           NOT NULL DEFAULT 0,

        -- Cancellation
        cancelledBy          NVARCHAR(128) NULL REFERENCES Users(id),
        cancelReason         NVARCHAR(500) NULL,

        createdAt            DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
        updatedAt            DATETIME2     NOT NULL DEFAULT GETUTCDATE()
    );

    -- Prevent duplicate active requests for same listing by same requester
    CREATE UNIQUE INDEX UX_ActiveRequest
        ON SkillExchanges(listingId, requesterId)
        WHERE status IN ('REQUESTED','ACCEPTED','DISPUTED');

    CREATE INDEX IX_SE_Requester ON SkillExchanges(requesterId, status, createdAt DESC);
    CREATE INDEX IX_SE_Provider  ON SkillExchanges(providerId,  status, createdAt DESC);
    CREATE INDEX IX_SE_Expiry    ON SkillExchanges(status, acceptedAt, providerConfirmedAt);

    PRINT 'Created SkillExchanges table with indexes';
END
ELSE
    PRINT 'SkillExchanges already exists — skipped';

-- 3. Create ExchangeDisputes table
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ExchangeDisputes')
BEGIN
    CREATE TABLE ExchangeDisputes (
        id          NVARCHAR(128)  NOT NULL PRIMARY KEY DEFAULT NEWID(),
        exchangeId  NVARCHAR(128)  NOT NULL REFERENCES SkillExchanges(id),
        raisedBy    NVARCHAR(128)  NOT NULL REFERENCES Users(id),
        reason      NVARCHAR(1000) NOT NULL,
        status      NVARCHAR(20)   NOT NULL DEFAULT 'OPEN'
                    CONSTRAINT CK_Dispute_Status CHECK (status IN ('OPEN','RESOLVED','DISMISSED')),
        resolvedBy  NVARCHAR(128)  NULL REFERENCES Users(id),
        resolution  NVARCHAR(1000) NULL,
        outcome     NVARCHAR(20)   NULL CONSTRAINT CK_Dispute_Outcome CHECK (outcome IN ('COMPLETED','CANCELLED')),
        createdAt   DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
        resolvedAt  DATETIME2      NULL
    );

    CREATE INDEX IX_Disputes_Exchange ON ExchangeDisputes(exchangeId);
    CREATE INDEX IX_Disputes_Open     ON ExchangeDisputes(status) WHERE status = 'OPEN';

    PRINT 'Created ExchangeDisputes table with indexes';
END
ELSE
    PRINT 'ExchangeDisputes already exists — skipped';

-- 4. Backfill welcome credits for existing users who have 0 balance
--    (gives 3 credits to anyone who signed up before this fix)

-- Insert ledger entry first, targeting zero-balance users with no prior welcome entry
INSERT INTO TimeCredits (id, fromUserId, toUserId, amount, reason)
SELECT NEWID(), u.id, u.id, 5, 'Welcome bonus (backfill)'
FROM Users u
WHERE u.credits = 0
  AND NOT EXISTS (
    SELECT 1 FROM TimeCredits tc
    WHERE tc.toUserId = u.id AND tc.reason LIKE 'Welcome bonus%'
  );

-- Then update their balance to 5
UPDATE Users
SET credits = 5
WHERE credits = 0;

PRINT 'Backfilled welcome credits for existing zero-balance users.';
PRINT 'Migration complete.';
