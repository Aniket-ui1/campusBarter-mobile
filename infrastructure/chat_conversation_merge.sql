-- ============================================================
-- CampusBarter — Chat Conversation Consolidation Migration
-- Purpose: Merge legacy duplicate chats for the same user pair
-- into a single canonical Azure SQL conversation.
--
-- What it does:
-- 1. Creates/uses a deterministic hashed conversation id per user pair.
-- 2. Moves all messages from duplicate chats into the canonical chat.
-- 3. Merges ChatParticipants and ChatUserState.
-- 4. Updates canonical chat metadata to the newest conversation context.
-- 5. Deletes redundant chat rows.
--
-- Safe to re-run: pairs already consolidated are skipped.
-- ============================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;

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
END;

IF OBJECT_ID('tempdb..#PairChats') IS NOT NULL DROP TABLE #PairChats;
IF OBJECT_ID('tempdb..#PairsToProcess') IS NOT NULL DROP TABLE #PairsToProcess;

WITH PairChats AS (
    SELECT
        c.id AS chatId,
        c.listingId,
        c.listingTitle,
        c.lastMessageAt,
        c.lastMessage,
        c.createdAt,
        MIN(cp.userId) AS userA,
        MAX(cp.userId) AS userB,
        COUNT(*) AS participantCount
    FROM Chats c
    JOIN ChatParticipants cp ON cp.chatId = c.id
    GROUP BY c.id, c.listingId, c.listingTitle, c.lastMessageAt, c.lastMessage, c.createdAt
),
PairChatsWithCanonical AS (
    SELECT
        chatId,
        listingId,
        listingTitle,
        lastMessageAt,
        lastMessage,
        createdAt,
        userA,
        userB,
        CONCAT(
            N'pair_',
            LOWER(CONVERT(NVARCHAR(64), HASHBYTES('SHA2_256', CONCAT(userA, N'|', userB)), 2))
        ) AS canonicalChatId,
        ROW_NUMBER() OVER (
            PARTITION BY userA, userB
            ORDER BY COALESCE(lastMessageAt, createdAt) DESC, createdAt DESC, chatId ASC
        ) AS latestRank
    FROM PairChats
    WHERE participantCount = 2
      AND userA <> userB
)
SELECT *
INTO #PairChats
FROM PairChatsWithCanonical;

WITH PairSummary AS (
    SELECT
        userA,
        userB,
        canonicalChatId,
        COUNT(*) AS pairChatCount,
        MAX(CASE WHEN chatId = canonicalChatId THEN 1 ELSE 0 END) AS hasCanonicalChat
    FROM #PairChats
    GROUP BY userA, userB, canonicalChatId
)
SELECT *
INTO #PairsToProcess
FROM PairSummary
WHERE pairChatCount > 1 OR hasCanonicalChat = 0;

IF EXISTS (SELECT 1 FROM #PairsToProcess)
BEGIN
    INSERT INTO Chats (id, listingId, listingTitle, lastMessageAt, lastMessage, createdAt)
    SELECT
        process.canonicalChatId,
        latestPair.listingId,
        latestPair.listingTitle,
        latestPair.lastMessageAt,
        latestPair.lastMessage,
        latestPair.createdAt
    FROM #PairsToProcess process
    JOIN #PairChats latestPair
        ON latestPair.userA = process.userA
       AND latestPair.userB = process.userB
       AND latestPair.canonicalChatId = process.canonicalChatId
       AND latestPair.latestRank = 1
    LEFT JOIN Chats existingChat ON existingChat.id = process.canonicalChatId
    WHERE existingChat.id IS NULL;

    UPDATE canonical
    SET
        canonical.listingId = latestPair.listingId,
        canonical.listingTitle = latestPair.listingTitle,
        canonical.lastMessageAt = latestPair.lastMessageAt,
        canonical.lastMessage = latestPair.lastMessage,
        canonical.createdAt = CASE
            WHEN canonical.createdAt > latestPair.createdAt THEN latestPair.createdAt
            ELSE canonical.createdAt
        END
    FROM Chats canonical
    JOIN #PairsToProcess process ON process.canonicalChatId = canonical.id
    JOIN #PairChats latestPair
        ON latestPair.userA = process.userA
       AND latestPair.userB = process.userB
       AND latestPair.canonicalChatId = process.canonicalChatId
       AND latestPair.latestRank = 1;

    UPDATE messageRow
    SET messageRow.chatId = pairChat.canonicalChatId
    FROM Messages messageRow
    JOIN #PairChats pairChat ON pairChat.chatId = messageRow.chatId
    JOIN #PairsToProcess process
        ON process.userA = pairChat.userA
       AND process.userB = pairChat.userB
       AND process.canonicalChatId = pairChat.canonicalChatId
    WHERE messageRow.chatId <> pairChat.canonicalChatId;

    INSERT INTO ChatParticipants (chatId, userId)
    SELECT DISTINCT pairChat.canonicalChatId, participant.userId
    FROM #PairChats pairChat
    JOIN #PairsToProcess process
        ON process.userA = pairChat.userA
       AND process.userB = pairChat.userB
       AND process.canonicalChatId = pairChat.canonicalChatId
    JOIN ChatParticipants participant ON participant.chatId = pairChat.chatId
    LEFT JOIN ChatParticipants existingParticipant
        ON existingParticipant.chatId = pairChat.canonicalChatId
       AND existingParticipant.userId = participant.userId
    WHERE existingParticipant.chatId IS NULL;

    MERGE ChatUserState AS target
    USING (
        SELECT
            pairChat.canonicalChatId AS chatId,
            state.userId,
            MAX(state.lastReadAt) AS lastReadAt,
            CASE
                WHEN SUM(CASE WHEN state.hiddenAt IS NULL THEN 1 ELSE 0 END) > 0 THEN NULL
                ELSE MAX(state.hiddenAt)
            END AS hiddenAt
        FROM #PairChats pairChat
        JOIN #PairsToProcess process
            ON process.userA = pairChat.userA
           AND process.userB = pairChat.userB
           AND process.canonicalChatId = pairChat.canonicalChatId
        JOIN ChatUserState state ON state.chatId = pairChat.chatId
        GROUP BY pairChat.canonicalChatId, state.userId
    ) AS source
    ON target.chatId = source.chatId AND target.userId = source.userId
    WHEN MATCHED THEN
        UPDATE SET
            lastReadAt = CASE
                WHEN target.lastReadAt IS NULL THEN source.lastReadAt
                WHEN source.lastReadAt IS NULL THEN target.lastReadAt
                WHEN target.lastReadAt >= source.lastReadAt THEN target.lastReadAt
                ELSE source.lastReadAt
            END,
            hiddenAt = CASE
                WHEN source.hiddenAt IS NULL THEN NULL
                WHEN target.hiddenAt IS NULL THEN NULL
                WHEN target.hiddenAt >= source.hiddenAt THEN target.hiddenAt
                ELSE source.hiddenAt
            END
    WHEN NOT MATCHED THEN
        INSERT (chatId, userId, lastReadAt, hiddenAt)
        VALUES (source.chatId, source.userId, source.lastReadAt, source.hiddenAt);

    INSERT INTO ChatUserState (chatId, userId, lastReadAt, hiddenAt)
    SELECT DISTINCT canonical.chatId, canonical.userId, NULL, NULL
    FROM (
        SELECT process.canonicalChatId AS chatId, participant.userId
        FROM #PairsToProcess process
        JOIN ChatParticipants participant ON participant.chatId = process.canonicalChatId
    ) canonical
    LEFT JOIN ChatUserState existingState
        ON existingState.chatId = canonical.chatId
       AND existingState.userId = canonical.userId
    WHERE existingState.chatId IS NULL;

    ;WITH LatestMessage AS (
        SELECT
            messageRow.chatId,
            messageRow.text,
            messageRow.[timestamp],
            ROW_NUMBER() OVER (
                PARTITION BY messageRow.chatId
                ORDER BY messageRow.[timestamp] DESC, messageRow.id DESC
            ) AS messageRank
        FROM Messages messageRow
        JOIN #PairsToProcess process ON process.canonicalChatId = messageRow.chatId
    )
    UPDATE canonical
    SET
        canonical.lastMessageAt = latestMessage.[timestamp],
        canonical.lastMessage = latestMessage.text
    FROM Chats canonical
    JOIN LatestMessage latestMessage
        ON latestMessage.chatId = canonical.id
       AND latestMessage.messageRank = 1;

    DELETE duplicateChat
    FROM Chats duplicateChat
    JOIN #PairChats pairChat ON pairChat.chatId = duplicateChat.id
    JOIN #PairsToProcess process
        ON process.userA = pairChat.userA
       AND process.userB = pairChat.userB
       AND process.canonicalChatId = pairChat.canonicalChatId
    WHERE duplicateChat.id <> process.canonicalChatId;
END;

DECLARE @processedPairs INT = (SELECT COUNT(*) FROM #PairsToProcess);
PRINT CONCAT('Chat conversation consolidation complete. Pairs processed: ', @processedPairs);

COMMIT TRANSACTION;