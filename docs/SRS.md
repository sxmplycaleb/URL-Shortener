# Software Requirements Specification: URL Shortener

## 1. Introduction

This Software Requirements Specification (SRS) defines the functional and non-functional requirements for a URL Shortener application. The system allows users to convert long URLs into compact short links that are easier to share, track, and manage.

The document is intended for product owners, developers, testers, designers, administrators, and other stakeholders involved in planning, building, validating, and maintaining the application.

## 2. Problem Statement

Long URLs are difficult to share, remember, type, and present cleanly in emails, social media posts, printed materials, and messaging platforms. Users need a reliable way to create short, readable links that redirect visitors to the original destination.

Organizations and individuals may also need visibility into link usage, including click counts and basic analytics, so they can understand whether links are being used effectively.

The URL Shortener application solves this problem by generating short aliases for long URLs, redirecting visitors to the original URLs, and optionally providing management and analytics features.

## 3. Scope

### 3.1 In Scope

- Create shortened URLs from valid long URLs.
- Generate unique short codes automatically.
- Allow optional custom aliases when available.
- Redirect short URLs to their original destination URLs.
- Validate submitted URLs before creating short links.
- Block unsafe destinations such as unsupported protocols, localhost, private network ranges, and known abusive domains.
- Store URL mappings persistently.
- Track basic usage metrics such as click count and creation date.
- Provide a user interface or API for creating and retrieving short links.
- Provide meaningful error messages for invalid, expired, missing, or unavailable links.

### 3.2 Out of Scope

- Full marketing campaign management.
- Advanced attribution analytics across multiple channels.
- Built-in payment, billing, or subscription management.
- Native mobile applications.
- Browser extensions.
- Enterprise single sign-on unless added in a future release.
- Advanced malware scanning beyond blocklists, destination safety checks, and abuse reporting unless added as a later release requirement.

## 4. Stakeholders

- End users: Create and share short links.
- Link visitors: Open short links and expect fast, accurate redirection.
- Product owner: Defines priorities, release scope, and business goals.
- Developers: Implement, maintain, and extend the application.
- QA testers: Verify requirements, edge cases, and regression behavior.
- System administrators or DevOps engineers: Deploy, monitor, and operate the system.
- Security reviewers: Evaluate abuse prevention, validation, logging, and data handling.

## 5. Features

### 5.1 URL Shortening

The system shall allow users to submit a long URL and receive a shortened URL.

Requirements:

- The system shall validate that the submitted URL uses an allowed protocol, such as `http` or `https`.
- The system shall reject empty, malformed, or unsupported URLs.
- The system shall reject URLs containing credentials, control characters, localhost hosts, private IP ranges, link-local ranges, or cloud metadata service addresses.
- The system should reject or warn on destinations matching configured abuse or phishing blocklists.
- The system shall generate a unique short code when no custom alias is provided.
- The system shall prevent duplicate active short codes.
- The system shall return the complete shortened URL after successful creation.

### 5.2 Custom Alias

The system should allow users to request a custom short code or alias.

Requirements:

- The system shall validate custom aliases against allowed characters and length limits.
- The system shall reject aliases that are already in use.
- The system shall reject reserved aliases such as `api`, `admin`, `login`, `docs`, and `health`.
- The system shall return a clear error when a requested alias is unavailable.

### 5.3 Redirection

The system shall redirect visitors from a short URL to the original destination URL.

Requirements:

- The system shall look up the short code from the incoming request path.
- The system shall redirect to the stored destination URL when the short code exists and is active.
- The system shall return a not-found response when the short code does not exist.
- The system shall return an expired or unavailable response when the link is no longer active.
- Redirection should be fast and reliable under expected traffic.

### 5.4 Link Management

The system should provide a way to view details for created links.

Requirements:

- The system should display or return the original URL, short URL, short code, creation date, and click count only to an authorized owner, administrator, or holder of a link-specific management token.
- Public preview endpoints, if offered, should reveal only intentionally public metadata and must not expose private analytics or management capabilities.
- The system may allow users to delete, deactivate, or update links if authentication is implemented.
- The system should prevent unauthorized modification of links when user accounts are supported.

### 5.5 Analytics

The system should track basic analytics for short link usage.

Requirements:

- The system shall increment a click count when a short link is visited.
- The system should record the timestamp of each click or the most recent click.
- The system may track additional metadata such as referrer, browser, operating system, country, or device type in future releases.
- Analytics collection shall not block successful redirection unless required by the implementation.
- Detailed analytics shall require ownership, administrator access, or a link-specific management token.
- Analytics storage shall avoid raw IP retention unless explicitly approved by policy and shall define a retention period.

### 5.6 Error Handling

The system shall provide clear and consistent error responses.

Requirements:

- The system shall show or return validation errors for invalid URL submissions.
- The system shall show or return conflict errors for unavailable aliases.
- The system shall show or return not-found errors for unknown short codes.
- The system shall avoid exposing sensitive internal implementation details in error messages.

### 5.7 Administration and Monitoring

The system should support operational monitoring.

Requirements:

- The system should provide health check behavior for deployment monitoring.
- The system should log important events such as URL creation, redirects, validation failures, and unexpected errors.
- The system should support basic operational observability, such as error rates and request counts.

## 6. Use Cases

### UC-1: Create a Short URL

Actor: End user

Preconditions:

- The user has access to the application interface or API.

Main flow:

1. The user submits a valid long URL.
2. The system validates the URL.
3. The system generates a unique short code.
4. The system stores the long URL and short code mapping.
5. The system returns the shortened URL.

Postconditions:

- A short URL exists and can redirect visitors to the original URL.

### UC-2: Create a Short URL with a Custom Alias

Actor: End user

Preconditions:

- The requested alias is valid and not already in use.

Main flow:

1. The user submits a long URL and requested alias.
2. The system validates the URL and alias.
3. The system checks alias availability.
4. The system stores the mapping using the requested alias.
5. The system returns the shortened URL.

Alternate flow:

- If the alias is unavailable or invalid, the system returns an error and does not create the link.

### UC-3: Visit a Short URL

Actor: Link visitor

Preconditions:

- The short code exists and is active.

Main flow:

1. The visitor opens the short URL.
2. The system extracts the short code.
3. The system retrieves the matching original URL.
4. The system records the click.
5. The system redirects the visitor to the original URL.

Postconditions:

- The visitor reaches the original destination URL.
- The link usage metrics are updated.

### UC-4: View Link Details

Actor: End user or administrator

Preconditions:

- The short link exists.

Main flow:

1. The actor requests details for a short link.
2. The system retrieves the link record.
3. The system displays or returns link details and basic analytics.

Postconditions:

- The actor can review the link destination and usage information.

### UC-5: Handle an Unknown Short URL

Actor: Link visitor

Preconditions:

- The requested short code does not exist.

Main flow:

1. The visitor opens an unknown short URL.
2. The system fails to find a matching link record.
3. The system returns a not-found response.

Postconditions:

- The visitor is informed that the link does not exist.

## 7. Acceptance Criteria

### 7.1 URL Creation

- Given a valid long URL, when the user submits it, then the system creates and returns a shortened URL.
- Given an invalid URL, when the user submits it, then the system rejects the request with a validation error.
- Given an empty URL, when the user submits it, then the system rejects the request with a validation error.
- Given an already used custom alias, when the user submits it, then the system rejects the request with a conflict error.
- Given a valid available custom alias, when the user submits it, then the system creates a short URL using that alias.

### 7.2 Redirection

- Given an active short URL, when a visitor opens it, then the system redirects the visitor to the original URL.
- Given an unknown short URL, when a visitor opens it, then the system returns a not-found response.
- Given an inactive or expired short URL, when a visitor opens it, then the system returns an appropriate unavailable or expired response.
- Given a successful redirect, when the redirect is processed, then the click count is incremented.

### 7.3 Link Details

- Given an existing short link, when authorized details are requested, then the system returns the original URL, short URL, short code, creation date, and click count.
- Given an existing short link, when unauthorized details are requested, then the system does not expose the destination URL, private analytics, or management metadata.
- Given a missing short link, when details are requested, then the system returns a not-found response.

### 7.4 Reliability and Security

- The system shall not create duplicate active short codes.
- The system shall sanitize and validate user input.
- The system shall prevent destination URLs from targeting internal services, private networks, or unsafe schemes.
- The system shall not expose stack traces, database errors, secrets, or internal implementation details to users.
- The system shall handle expected validation, conflict, and not-found conditions gracefully.

## 8. Assumptions

- The application will be accessible through a web interface, an API, or both.
- Short URLs will use a configured base domain.
- Persistent storage will be available for URL mappings and analytics data.
- The initial release will support anonymous URL creation unless authentication is added separately.
- Basic analytics are sufficient for the initial release.
- The system clock is reliable enough for timestamps, expiration behavior, and analytics.
- Users are responsible for ensuring that submitted destination URLs are lawful and appropriate.

## 9. Constraints

- The system must use only approved protocols for destination URLs, such as `http` and `https`.
- Destination validation must block localhost, private network ranges, link-local ranges, and cloud metadata service addresses to reduce SSRF and phishing abuse risk.
- Short codes must be unique among active links.
- Custom aliases must comply with configured character and length restrictions.
- Reserved paths must not be available as custom aliases.
- The system must protect sensitive configuration values such as database credentials, API keys, and application secrets.
- The system must be designed to avoid open-ended growth of logs and analytics data without retention planning.
- The system should be deployable in the target hosting environment selected for the project.
- The system should meet reasonable performance expectations for URL creation and redirection under expected traffic.
