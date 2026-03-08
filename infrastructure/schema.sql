-- ============================================================
-- CampusBarter — Azure SQL Database Schema
-- Resource: campusbarter-sql (Azure SQL Database)
-- Resource Group: campusbarter-rg
-- ============================================================
-- Run this script in Azure Portal → SQL Database → Query editor
-- after creating the database in Phase 2.
-- ============================================================

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE Users (
    id              NVARCHAR(128)   NOT NULL PRIMARY KEY,  -- Azure AD Object ID
    email           NVARCHAR(256)   NOT NULL UNIQUE,
    displayName     NVARCHAR(128)   NOT NULL,
    bio             NVARCHAR(500)   NULL,
    program         NVARCHAR(128)   NULL,
    semester        INT             NULL,
    avatarUrl       NVARCHAR(500)   NULL,
    role            NVARCHAR(20)    NOT NULL DEFAULT 'Student'
                                    CHECK (role IN ('Student', 'Moderator', 'Admin')),
    credits         INT             NOT NULL DEFAULT 10,
    rating          FLOAT           NULL,
    ratingCount     INT             NOT NULL DEFAULT 0,
    profileComplete BIT             NOT NULL DEFAULT 0,
    createdAt       DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
    lastLoginAt     DATETIME2       NULL
);

-- ── Listings ─────────────────────────────────────────────────
CREATE TABLE Listings (
    id          NVARCHAR(128)   NOT NULL PRIMARY KEY DEFAULT NEWID(),
    type        NVARCHAR(10)    NOT NULL CHECK (type IN ('OFFER', 'REQUEST')),
    title       NVARCHAR(200)   NOT NULL,
    description NVARCHAR(2000)  NOT NULL,
    credits     INT             NOT NULL CHECK (credits > 0),
    userId      NVARCHAR(128)   NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    userName    NVARCHAR(128)   NOT NULL,
    status      NVARCHAR(10)    NOT NULL DEFAULT 'OPEN'
                                CHECK (status IN ('OPEN', 'CLOSED')),
    category    NVARCHAR(64)    NULL,
    createdAt   DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
    updatedAt   DATETIME2       NOT NULL DEFAULT GETUTCDATE()
);

CREATE INDEX IX_Listings_Status ON Listings(status);
CREATE INDEX IX_Listings_UserId ON Listings(userId);

-- ── Chats ────────────────────────────────────────────────────
CREATE TABLE Chats (
    id              NVARCHAR(128)   NOT NULL PRIMARY KEY DEFAULT NEWID(),
    listingId       NVARCHAR(128)   NOT NULL REFERENCES Listings(id),
    listingTitle    NVARCHAR(200)   NOT NULL,
    lastMessageAt   DATETIME2       NULL,
    lastMessage     NVARCHAR(500)   NULL,
    createdAt       DATETIME2       NOT NULL DEFAULT GETUTCDATE()
);

-- Many-to-many: Users ↔ Chats
CREATE TABLE ChatParticipants (
    chatId  NVARCHAR(128)   NOT NULL REFERENCES Chats(id) ON DELETE CASCADE,
    userId  NVARCHAR(128)   NOT NULL REFERENCES Users(id),
    PRIMARY KEY (chatId, userId)
);

-- ── Messages ─────────────────────────────────────────────────
CREATE TABLE Messages (
    id          NVARCHAR(128)   NOT NULL PRIMARY KEY DEFAULT NEWID(),
    chatId      NVARCHAR(128)   NOT NULL REFERENCES Chats(id) ON DELETE CASCADE,
    senderId    NVARCHAR(128)   NOT NULL REFERENCES Users(id),
    text        NVARCHAR(4000)  NOT NULL,
    timestamp   DATETIME2       NOT NULL DEFAULT GETUTCDATE()
);

CREATE INDEX IX_Messages_ChatId ON Messages(chatId, timestamp);

-- ── Notifications ─────────────────────────────────────────────
CREATE TABLE Notifications (
    id          NVARCHAR(128)   NOT NULL PRIMARY KEY DEFAULT NEWID(),
    userId      NVARCHAR(128)   NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    type        NVARCHAR(20)    NOT NULL
                                CHECK (type IN ('request','accepted','message','review','match')),
    title       NVARCHAR(200)   NOT NULL,
    body        NVARCHAR(500)   NOT NULL,
    isRead      BIT             NOT NULL DEFAULT 0,
    relatedId   NVARCHAR(128)   NULL,
    createdAt   DATETIME2       NOT NULL DEFAULT GETUTCDATE()
);

CREATE INDEX IX_Notifications_UserId ON Notifications(userId, isRead);

-- ── Audit Log (Security / ITS requirement) ────────────────────
-- Every significant action is recorded here for compliance
CREATE TABLE AuditLog (
    id          BIGINT          NOT NULL PRIMARY KEY IDENTITY(1,1),
    userId      NVARCHAR(128)   NULL,           -- NULL if unauthenticated attempt
    action      NVARCHAR(100)   NOT NULL,       -- e.g. 'LOGIN', 'CREATE_LISTING', 'DELETE_USER'
    resource    NVARCHAR(200)   NULL,           -- e.g. 'Listing:abc123'
    ipAddress   NVARCHAR(64)    NULL,
    userAgent   NVARCHAR(500)   NULL,
    statusCode  INT             NULL,
    timestamp   DATETIME2       NOT NULL DEFAULT GETUTCDATE()
);

CREATE INDEX IX_AuditLog_UserId ON AuditLog(userId, timestamp);
CREATE INDEX IX_AuditLog_Timestamp ON AuditLog(timestamp);

-- ── Reviews ───────────────────────────────────────────────────
CREATE TABLE Reviews (
    id          NVARCHAR(128)   NOT NULL PRIMARY KEY DEFAULT NEWID(),
    reviewerId  NVARCHAR(128)   NOT NULL REFERENCES Users(id),
    revieweeId  NVARCHAR(128)   NOT NULL REFERENCES Users(id),
    listingId   NVARCHAR(128)   NULL REFERENCES Listings(id),
    rating      INT             NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     NVARCHAR(1000)  NULL,
    createdAt   DATETIME2       NOT NULL DEFAULT GETUTCDATE()
);

-- ── Time Credits (Transaction Ledger) ─────────────────────────
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

-- ── Exchanges (QR Code Verification) ──────────────────────────
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
