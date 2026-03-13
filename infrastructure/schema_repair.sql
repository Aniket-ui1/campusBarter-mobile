-- ============================================================
-- CampusBarter — Database Repair Script
-- Purpose: Restore missing tables identified during diagnostics.
-- ============================================================

-- ── Chat User State (Unread + Soft Delete) ───────────────────
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ChatUserState]') AND type in (N'U'))
BEGIN
    CREATE TABLE ChatUserState (
        chatId      NVARCHAR(128)   NOT NULL REFERENCES Chats(id) ON DELETE CASCADE,
        userId      NVARCHAR(128)   NOT NULL REFERENCES Users(id),
        lastReadAt  DATETIME2       NULL,
        hiddenAt    DATETIME2       NULL,
        PRIMARY KEY (chatId, userId)
    );

    CREATE INDEX IX_ChatUserState_UserId ON ChatUserState(userId, hiddenAt, lastReadAt);
    PRINT 'Table ChatUserState created successfully.';
END
ELSE
BEGIN
    PRINT 'Table ChatUserState already exists.';
END

-- ── Time Credits (Transaction Ledger) ─────────────────────────
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TimeCredits]') AND type in (N'U'))
BEGIN
    CREATE TABLE TimeCredits (
        id          NVARCHAR(128)   NOT NULL PRIMARY KEY DEFAULT NEWID(),
        fromUserId  NVARCHAR(128)   NOT NULL REFERENCES Users(id),
        toUserId    NVARCHAR(128)   NOT NULL REFERENCES Users(id),
        amount      INT             NOT NULL CHECK (amount > 0),
        reason      NVARCHAR(500)   NOT NULL,
        createdAt   DATETIME2       NOT NULL DEFAULT GETUTCDATE()
    );

    CREATE INDEX IX_TimeCredits_From ON TimeCredits(fromUserId, createdAt);
    CREATE INDEX IX_TimeCredits_To   ON TimeCredits(toUserId, createdAt);
    PRINT 'Table TimeCredits created successfully.';
END
ELSE
BEGIN
    PRINT 'Table TimeCredits already exists.';
END

-- ── Exchanges (QR Code Verification) ──────────────────────────
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Exchanges]') AND type in (N'U'))
BEGIN
    CREATE TABLE Exchanges (
        id               NVARCHAR(128)  NOT NULL PRIMARY KEY DEFAULT NEWID(),
        listingId        NVARCHAR(128)  NOT NULL REFERENCES Listings(id),
        buyerId          NVARCHAR(128)  NOT NULL REFERENCES Users(id),
        sellerId         NVARCHAR(128)  NOT NULL REFERENCES Users(id),
        credits          INT            NOT NULL CHECK (credits > 0),
        qrCode           NVARCHAR(50)   NOT NULL UNIQUE,
        status           NVARCHAR(20)   NOT NULL DEFAULT 'PENDING'
                                        CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED')),
        buyerConfirmed   BIT            NOT NULL DEFAULT 0,
        sellerConfirmed  BIT            NOT NULL DEFAULT 0,
        createdAt        DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
        completedAt      DATETIME2      NULL
    );

    CREATE INDEX IX_Exchanges_QR ON Exchanges(qrCode);
    PRINT 'Table Exchanges created successfully.';
END
ELSE
BEGIN
    PRINT 'Table Exchanges already exists.';
END
