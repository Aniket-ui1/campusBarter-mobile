-- ============================================================
-- CampusBarter — Diagnose Credits Schema Columns
-- Run this in Azure SQL Query Editor to check column types
-- ============================================================

SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    NUMERIC_SCALE,
    NUMERIC_PRECISION
FROM INFORMATION_SCHEMA.COLUMNS
WHERE (TABLE_NAME = 'Users' AND COLUMN_NAME IN ('credits', 'reservedCredits'))
   OR (TABLE_NAME = 'SkillExchanges' AND COLUMN_NAME = 'credits')
   OR (TABLE_NAME = 'TimeCredits' AND COLUMN_NAME = 'amount')
ORDER BY TABLE_NAME, COLUMN_NAME;

-- ============================================================
-- Expected output after migration:
-- ============================================================
-- Users.credits           = DECIMAL(10,2)
-- Users.reservedCredits   = DECIMAL(10,2) or NULL
-- SkillExchanges.credits  = DECIMAL(10,2)
-- TimeCredits.amount      = DECIMAL(10,2)
--
-- If you see INT instead of DECIMAL, run the migration:
-- ============================================================

-- If columns are still INT, apply this migration:
/*
SET XACT_ABORT ON;
BEGIN TRAN;

ALTER TABLE dbo.Users ALTER COLUMN credits DECIMAL(10,2) NOT NULL;
ALTER TABLE dbo.Users ALTER COLUMN reservedCredits DECIMAL(10,2) NULL;
ALTER TABLE dbo.SkillExchanges ALTER COLUMN credits DECIMAL(10,2) NOT NULL;
ALTER TABLE dbo.TimeCredits ALTER COLUMN amount DECIMAL(10,2) NOT NULL;

COMMIT TRAN;
*/
