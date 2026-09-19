---
name: Merchant Voice employee auth
description: Why Merchant Voice uses first-party employee-ID sessions instead of managed email authentication.
---

Merchant Voice authentication should remain employee-ID and password based unless the product requirement changes. Use server-issued, HTTP-only sessions and keep all feedback APIs protected.

**Why:** The user explicitly requires an employee ID as the login identifier. The available managed authentication setup is email-oriented and could not represent that requirement honestly without fake email addresses or an external employee directory.

**How to apply:** Extend the existing employee/session model for account administration, roles, password changes, or directory synchronization rather than introducing a second parallel identity system.