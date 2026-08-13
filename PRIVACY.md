# SPACE AWS Privacy Policy

Last updated: August 13, 2026

SPACE AWS is a Chrome extension that adds Region-specific atmospheric artwork to the AWS Management Console header.

## Data handled locally by the extension

To identify the active supported AWS Region, SPACE AWS locally accesses and processes:

- **Web browsing activity:** the current AWS Management Console page URL.
- **Website content:** the visible AWS Region selector text.

This information is used only in memory to select the matching artwork bundled with the extension. It is not retained, transmitted, or used to build a browsing history or user profile.

## Local storage and retention

SPACE AWS stores one setting in `chrome.storage.local`: a Boolean value indicating whether the decorative header theme is enabled. This setting remains on the user's device until the user changes it, removes the extension, or clears the extension's local storage.

The current page URL and visible Region selector text are not written to storage. They are discarded when they are no longer needed by the active page.

## Data not transmitted or collected by the developer

The developer does not receive or collect the page URL, Region selector text, or locally stored enabled or disabled preference.

SPACE AWS does not access, retain, or transmit AWS credentials, authentication information, account identifiers, AWS resource data, form data, financial information, personal communications, or user-generated content.

SPACE AWS does not use analytics, telemetry, advertising, tracking, remote configuration, or remotely hosted code. All artwork and executable code are bundled with the extension.

## Data sharing

SPACE AWS does not sell, share, or transfer the page URL, Region selector text, or local preference to the developer or to third parties. None of this information leaves the user's device.

## Permissions

SPACE AWS uses Chrome's `storage` permission only to save the local enabled or disabled preference. Its site access is limited to AWS Management Console pages so it can detect the active supported Region and render the corresponding bundled artwork.

## User control and deletion

Users can enable or disable the decorative theme from the extension popup. Users can delete the stored preference by removing the extension or clearing the extension's local storage. The page URL and Region selector text are never retained and therefore require no separate deletion request.

## Limited Use

SPACE AWS's handling of information complies with the Chrome Web Store User Data Policy, including the Limited Use requirements. Any information processed by the extension is used only to provide its single user-facing purpose: selecting and displaying the matching local Region artwork.

## Changes

If SPACE AWS's data practices change, this policy and the Chrome Web Store disclosures will be updated before the changed practices take effect.

## Contact

Privacy questions can be submitted through the [SPACE AWS GitHub issue tracker](https://github.com/zdpk/space-aws/issues/new). Do not include AWS credentials or other sensitive information in a public issue.

SPACE AWS is an independent browser extension and is not affiliated with, endorsed by, or sponsored by Amazon Web Services.
