# Add User Account Concept

## What I want

Introduce user accounts to the plants watering application. Plants should be scoped per user, and the app should require authentication before accessing any feature.

### 1. Login page

A login page that appears when the user is not authenticated. It should be simple — email and password fields with a submit button. No registration flow needed for now; use a few hardcoded mock users in the MSW layer (e.g., "alice@example.com" / "password", "bob@example.com" / "password"). On successful login, redirect to the home page.

### 2. Per-user plants

Plants should belong to the authenticated user. The MSW handlers should filter plants by the logged-in user's ID so each user sees only their own plants. Switching users (log out, log in as someone else) should show a different set of plants.

### 3. User ribbon

A persistent top-right ribbon (visible on all pages once authenticated) showing:

- The user's name
- An avatar placeholder (initials or generic icon — no real image upload needed)
- A "Log out" action that clears the session and returns to the login page

### 4. Session management

Use a simple session mechanism — a token or user ID stored in sessionStorage. No real JWT or OAuth needed.

## ADLC

Build this feature using the `_adlc` skill.
