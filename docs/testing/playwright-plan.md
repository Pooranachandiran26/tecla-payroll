# Playwright Client-Based Testing Plan

## Overview

This testing framework provides automated end-to-end (E2E) and security testing for the **Tecla Payroll** application using **Playwright**. The architecture uses a multi-tenant client isolation model anchored around `client_id`.

---

## Architecture Hierarchy

```text
                           SUPER ADMIN
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
      Client A              Client B              Client C
     (client_id)           (client_id)           (client_id)
          │                     │                     │
   Client Admin A        Client Admin B        Client Admin C
          │                     │                     │
    Employees (A)         Employees (B)         Employees (C)
```

---

## Test Execution Scope

### Phase 1: Core E2E Workflows

1. **Authentication & Session Lifecycle**:
   - Valid Login (Super Admin, Client Admin, Employee).
   - Session Logout and invalidated session navigation.
   - Password reset and force-password-change flows.

2. **Super Admin Operations**:
   - Access to global dashboard.
   - Client onboarding (Create Client, view client list, update client statutory settings).

3. **Client Admin Operations**:
   - Access to client-scoped dashboard (`/client/dashboard`).
   - Management of client-specific settings, attendance verification, and employee rosters.

4. **Employee CRUD Lifecycle**:
   - Employee onboarding & registration (`/employees/create`).
   - Viewing employee profile, salary revisions, and tax declarations.
   - Employee update & document management.

---

### Phase 2: Critical Multi-Tenant Security & Isolation Testing

Verify strict boundary isolation where Client A cannot view, mutate, search, or export Client B records.

```text
Client User A ───► Request Client A Data ───► GRANTED (200 OK)
Client User A ───► Request Client B Data ───► DENIED (403 Forbidden / 404 Not Found)
```

#### Security Test Vectors Covered:
1. **Direct URL Manipulation**: Navigating directly to `/clients/{client_b_id}`, `/employees/{client_b_employee_id}`, `/payroll/{client_b_run_id}`.
2. **Record ID Manipulation (IDOR)**: Swapping `id` parameters in forms, modals, and route endpoints.
3. **Global Search & Autosuggest Leakage**: Querying `/employees/suggestions` or global search endpoints while authenticated as Client A to check if Client B names/codes leak.
4. **AJAX & API Endpoint Isolation**: Invoking internal REST endpoints (`/api/v1/...`, `/clients/{id}/active-employees`) cross-tenant.
5. **Export & File Download Security**: Attempting cross-client requests to `/export/employees`, `/payroll/{id}/download-payslips`, `/pf-ecr/{id}/download`.
6. **Route & Action Access Controls**: Testing POST, PUT, DELETE operations on Client B resources from a Client A authenticated session.

---

## Playwright Configuration Summary

* **Base URL**: `http://localhost:8000` (or `http://127.0.0.1:8000`)
* **Test Directory**: `tests/e2e/`
* **Test Runners**: Chromium, Firefox, WebKit
* **Storage State Authentication**: Pre-authenticated browser contexts saved in `.auth/` for Super Admin, Client Admin A, and Client Admin B.
