# Global Active Client Selector Implementation Details

## Overview

A professional, non-breaking **Global Active Client Selector** dropdown has been integrated into the top navigation header of **Tecla Payroll** between the Notification Panel and User Profile avatar menu.

---

## Architectural Changes

1. **`app/Http/Middleware/HandleInertiaRequests.php`**:
   - Shared `activeClients`: List of active client IDs, names, and codes for Admin and Manager roles.
   - Shared `activeClientId`: Currently selected active client ID stored in session (default: `'all'`).

2. **`routes/web.php`**:
   - `POST /active-client/switch`: Updates `active_client_id` in user's session and redirects back to preserve state.

3. **`resources/js/Layouts/AuthenticatedLayout.jsx`**:
   - Rendered sleek, styled `<select>` element in top header navbar (`user-actions` container) formatted as:
     `Notifications → Global Active Client Selector ▼ → User / Profile`.
   - On change, dispatches Inertia `router.post('/active-client/switch', { client_id: value })`.

---

## Verification Results

* **Playwright E2E Spec**: [tests/e2e/global-client-selector.spec.ts](file:///f:/xampp/htdocs/tecla-payroll/tests/e2e/global-client-selector.spec.ts) (**PASSED**)
* **Header Navbar Layout**: Preserved existing navigation, branding, and notification panel.
* **Client Isolation Security**: Preserved server-side authorization checks and tenant boundaries.
