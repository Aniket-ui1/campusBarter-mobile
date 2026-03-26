-- CampusBarter - fractional credits migration
-- Enables 0.5 credit increments across skill exchanges and user balances.

SET XACT_ABORT ON;
BEGIN TRAN;

-- Users balances
ALTER TABLE dbo.Users ALTER COLUMN credits DECIMAL(10,2) NOT NULL;
ALTER TABLE dbo.Users ALTER COLUMN reservedCredits DECIMAL(10,2) NULL;

-- Skill exchange escrow amount
ALTER TABLE dbo.SkillExchanges ALTER COLUMN credits DECIMAL(10,2) NOT NULL;

-- Ledger amount
ALTER TABLE dbo.TimeCredits ALTER COLUMN amount DECIMAL(10,2) NOT NULL;

COMMIT TRAN;
