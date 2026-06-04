# AUTH_GUIDELINES.md

## Authentication Guideline

Authentication ensures identity validation across services. All authentication mechanisms must follow these rules:

1. **Stateless Session Management**: Use session tokens or JSON Web Tokens (JWT) stored in secure, `HttpOnly`, `Secure`, and `SameSite=Strict` cookies. Do not store tokens in `localStorage` or `sessionStorage` to prevent Cross-Site Scripting (XSS) exploits.
2. **Password Hashing**: Store passwords hashed using Argon2id or bcrypt. Never store plaintext passwords or use weak hash algorithms (MD5, SHA1).
3. **Token Lifetime and Revocation**: Tokens must expire. Define an active token lifecycle (e.g., access tokens valid for 15 minutes, refresh tokens valid for 7 days). Store refresh tokens in a database to support explicit revocation.
4. **Service Boundary Security**: Services must validate authentication tokens at their boundary. Define the shared data structures for session context in a unified contract repository under `contracts/auth/`.
5. **No Framework Lock-in**: Implement authentication checks using standard HTTP headers and request-context objects. Do not tie authentication logic to specific web application frameworks.

## Inviting Users Guideline

The invitation flow allows existing users or administrators to onboard new users securely:

1. **Invitation Flow**:
   - The sender generates an invitation by specifying the target email address and role.
   - The service creates a cryptographically secure, random invitation token (minimum 32 bytes from a secure random source).
   - Store the token in the database with the associated email, role, expiration timestamp (default 48 hours), and a `used` status.
2. **Delivery**: Send the invitation link containing the token to the user via a verified transactional mail service.
3. **Validation**: When the recipient visits the onboarding page, validate the token against the database:
   - Ensure the token exists and is not used.
   - Check if the current time is before the expiration timestamp.
   - Reject invalid or expired invitations with clear error messages.
4. **Consumption**: Mark the token as `used` immediately upon successful registration. Do not allow reuse of invitation tokens.

## Users Guideline

User records store identity and authorization details. Treat user data with high security:

1. **Schema Design**: Define the user record with the minimum required fields: `id`, `email`, `password_hash`, `role`, `status` (e.g., pending, active, suspended), and timestamps (`created_at`, `updated_at`).
2. **PII Protection**: Encrypt Personally Identifiable Information (PII) at rest if required by privacy policies.
3. **Role-Based Access Control (RBAC)**: Define explicit, static roles (e.g., `admin`, `member`, `viewer`). Check roles at the API gateway or service boundary. Do not hardcode complex permission check trees inside business logic.
4. **Identity Verification**: Mark new users as unverified until they confirm their email or complete onboarding.

## Onboarding Guideline

Onboarding manages the steps required to transition a new user from registered to fully operational:

1. **Onboarding State Machine**: Maintain the user's onboarding state in the database using an explicit state tracking column (e.g., `onboarding_state`).
2. **States**: Define clear, sequential steps:
   - `REGISTERED`: Account created.
   - `PROFILE_COMPLETED`: User provided profile details.
   - `ORGANIZATION_SET`: User created or joined an organization.
   - `COMPLETED`: Onboarding finished, full system access granted.
3. **Idempotency**: Ensure each onboarding step is idempotent. Retrying a step must update the user record without creating duplicate resources or failing.
4. **Fallback Handling**: If an onboarding step fails, preserve the user's current state and present a retry mechanism. Do not lock users in a state where they cannot proceed.

## Logging Guideline

Logging provides observability for authentication and identity events:

1. **Structured Logging**: Write logs as JSON objects. Include standard fields: `timestamp`, `level`, `message`, `service_name`, and `trace_id`.
2. **Trace ID Propagation**: Propagate correlation and trace IDs through request contexts to link operations across services.
3. **Security Scrubbing**: Never log sensitive data. Implement a sanitization filter to scrub:
   - Plaintext passwords.
   - Session tokens or API keys.
   - Credit card numbers.
   - Personal email addresses and telephone numbers (use hashed identifiers if needed for tracking).
4. **Audit Logging**: Write audit logs for critical events. These events must record:
   - `user_id` (who performed the action).
   - `action` (e.g., `user.login`, `user.invite`, `password.change`, `user.role_update`).
   - `ip_address` (origin of the request).
   - `timestamp`.
   - `status` (success or failure).

## Non-Negotiable Rules

1. **Tests and Evals**: Every authentication change, invitation flow, and onboarding state change must ship with integration tests. These tests must run locally in less than 2 seconds.
2. **Metrics**: Track metrics for authentication failures, invitation rates, and onboarding drop-offs to monitor system health.
