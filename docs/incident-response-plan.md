# CampusBarter — Incident Response Plan (IRP)
**Version:** 1.0 | **Classification:** Internal | **Owner:** CampusBarter IT Team

---

## 1. Purpose
This plan defines how the CampusBarter team detects, responds to, and recovers from security incidents, in alignment with **NIST SP 800-61** and **PIPEDA breach notification requirements**.

---

## 2. Incident Severity Levels

| Level | Description | Examples | Response Time |
|---|---|---|---|
| **P1 — Critical** | Data breach, unauthorized access to user data | Database compromised, credentials leaked | Immediate (< 1 hour) |
| **P2 — High** | Service unavailable, suspected attack | API down > 30 min, spike in failed logins | < 4 hours |
| **P3 — Medium** | Security misconfiguration, vulnerability found | Firewall rule misconfigured, dependency CVE | < 24 hours |
| **P4 — Low** | Policy violation, minor anomaly | Single suspicious login, AUP breach | < 72 hours |

---

## 3. Incident Response Phases

### Phase 1 — Detection
**Sources that trigger alerts:**
- Azure Application Insights: Error rate spike, unusual response times
- Azure Monitor: Failed login attempts > 10/minute
- GitHub Dependabot: Critical CVE discovered in dependency
- User report: Submitted via GitHub Issues (labeled `security`)

---

### Phase 2 — Containment

**Immediate actions (P1/P2):**

1. **Isolate** the affected resource:
   - SQL Database: Enable "Deny all" firewall temporarily
   - App Service: Stop the service in Azure Portal
   - Key Vault: Disable compromised secrets immediately

2. **Preserve evidence:**
   - Export Azure SQL Audit Logs before any changes
   - Screenshot Azure Monitor alert dashboard
   - Export Application Insights logs for the incident window

3. **Notify stakeholders** (within 1 hour for P1):
   - Internal team via GitHub Issue (label: `incident`, `P1`)
   - SAIT IT Security team if student data is at risk

---

### Phase 3 — Eradication

| Issue Type | Eradication Steps |
|---|---|
| **Compromised credentials** | Rotate all Key Vault secrets, invalidate all active sessions, regenerate App Registration client secret |
| **SQL injection attempt** | Review AuditLog for affected queries, patch input validation, update parameterized queries |
| **Unauthorized access** | Revoke Azure AD tokens, audit Role Assignments in Key Vault and App Service |
| **Vulnerable dependency** | Merge Dependabot PR, trigger CI/CD pipeline, verify new build passes security scan |

---

### Phase 4 — Recovery

1. Restore service with confirmed-clean configuration
2. Re-enable SQL firewall rules (Selected networks only)
3. Verify health endpoints: `GET /health` and `GET /health/db`
4. Monitor Application Insights for 24 hours post-recovery
5. Confirm all AuditLog entries are recording correctly

---

### Phase 5 — Post-Incident Review

Within **5 business days** of resolution:
- Document what happened, timeline, and root cause
- Update security controls to prevent recurrence
- If personal data was exposed: notify affected users within **72 hours** (PIPEDA requirement)
- If "real risk of significant harm" exists: notify **Office of the Privacy Commissioner of Canada**

---

## 4. PIPEDA Breach Notification Checklist

When personal data is breached:
- [ ] Determine if there is a "real risk of significant harm" to individuals
- [ ] Document the breach: what data, how many users, how it happened
- [ ] Notify affected users within **72 hours** of discovery
- [ ] Notify the **Privacy Commissioner of Canada** (if RROSH confirmed)
- [ ] Maintain breach records for **24 months**

---

## 5. Key Contacts and Resources

| Resource | Location |
|---|---|
| Azure Monitor Alerts | portal.azure.com → Monitor → Alerts |
| Application Insights | portal.azure.com → campusbarter-insights |
| AuditLog Query | Azure SQL Query Editor: `SELECT * FROM AuditLog ORDER BY timestamp DESC` |
| GitHub Security Tab | github.com/Aniket-ui1/campusBarter-mobile/security |
| Privacy Commissioner | [priv.gc.ca](https://www.priv.gc.ca) |
