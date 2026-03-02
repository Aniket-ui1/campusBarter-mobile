# CampusBarter — Data Retention Policy
**Version:** 1.0 | **Effective Date:** March 2025 | **Owner:** CampusBarter IT Team

---

## 1. Purpose
This policy defines how long CampusBarter retains personal data and how it is securely deleted, in compliance with Canada's **Personal Information Protection and Electronic Documents Act (PIPEDA)**.

---

## 2. Data Categories and Retention Periods

| Data Category | Retention Period | Storage Location | Deletion Method |
|---|---|---|---|
| **User account data** (name, email, program) | Active + 30 days after deletion request | Azure SQL — `Users` table | Hard delete from DB |
| **Skill listings** | Active + 90 days after closed/deleted | Azure SQL — `Listings` table | Hard delete from DB |
| **Chat messages** | 1 year from last message | Azure SQL — `Messages` table | Automated DELETE query |
| **Profile photos** | Active + 30 days after account deletion | Azure Blob Storage — `avatars` | Blob deletion via SDK |
| **Audit logs** | 2 years (regulatory compliance) | Azure SQL — `AuditLog` table | Archived, then purged |
| **Application Insights telemetry** | 30 days | Azure Monitor workspace | Auto-purged by Azure |
| **Notification records** | 90 days | Azure SQL — `Notifications` table | Automated DELETE query |

---

## 3. User Rights (PIPEDA Section 8 — Access)

Users may exercise the following rights at any time:

| Right | How to Exercise | Response Time |
|---|---|---|
| **Access your data** | Settings → "Download My Data" | Within 30 days |
| **Correct inaccurate data** | Edit Profile in app | Immediate |
| **Delete your account** | Settings → "Delete Account" | Within 30 days |
| **Withdraw consent** | Submit request to privacy contact | Within 30 days |

---

## 4. Account Deletion Process

When a user deletes their account:

1. **Day 0:** Account marked as `deleted`, login disabled immediately
2. **Day 1–30:** Data retained in case of dispute or accidental deletion
3. **Day 30:** All personal data hard-deleted from Azure SQL (`Users`, `Listings`, `Messages`, `Notifications`)
4. **Day 30:** Profile photo deleted from Azure Blob Storage (`avatars` container)
5. **Audit logs** remain for 2 years (anonymized after account deletion — userId replaced with `[DELETED]`)

---

## 5. Automated Cleanup

A scheduled Azure Function runs **weekly** to delete:
- Messages older than 1 year from closed chats
- Notifications older than 90 days
- Telemetry older than 30 days (handled automatically by Azure Monitor)

---

## 6. Data Breach Procedures

In the event of a data breach:
- Users affected will be notified **within 72 hours** of discovery
- The Office of the Privacy Commissioner of Canada will be notified if there is a **real risk of significant harm**
- See `docs/incident-response-plan.md` for detailed procedures

---

## 7. Contact

Privacy Officer contact available within the CampusBarter app under **Settings → Privacy Policy**.
