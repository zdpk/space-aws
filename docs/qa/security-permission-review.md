# Security and permission review

- Date: `2026-08-10`
- Result: Pass for static review and automated tests

## Permissions

- Manifest V3
- `permissions` contains only `storage`
- No `host_permissions`, `tabs`, `activeTab`, or `<all_urls>`
- Content scripts and local image resources are limited to `https://*.console.aws.amazon.com/*`

## Data handling

- Stores one local `enabled` boolean
- Does not read AWS credentials, page resources, API responses, or account data
- No analytics, telemetry, remote configuration, remote code, or runtime network request

## DOM safety

- Adds one namespaced decorative layer and one namespaced style element
- Decorative content is non-interactive and hidden from assistive technology
- Unsupported, ambiguous, missing-header, and failed-image states restore the native header

## Remaining live check

- Confirm the candidate AWS header selectors against the current signed-in AWS Console DOM before store release
