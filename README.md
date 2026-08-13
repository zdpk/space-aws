# SPACE AWS

SPACE AWS is a Manifest V3 Chrome extension that adds a Region-specific atmospheric panorama to the AWS Management Console header.

SPACE AWS includes all 34 standard commercial AWS Regions and one global space state. Separate AWS partitions and ambiguous states keep the native AWS header.

## Load unpacked

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Select **Load unpacked**.
4. Choose the repository's `extension/` directory.
5. Open or refresh an AWS Console page.

## Development

```bash
npm install
npm test
```

Regenerate icons with:

```bash
python3 extension/icons/generate-icons.py
```

Create the Chrome Web Store upload package with:

```bash
npm run package
```

Sync the approved runtime art with:

```bash
bash scripts/sync-region-assets.sh
```

## Chrome Web Store listing metadata

### Product details

- Language: `English (United States)`
- Category: `Developer Tools`
- Category fallback: `Functionality & UI`, if `Developer Tools` is unavailable in the dashboard
- Item name: `SPACE AWS`

### Short description

The short description is 104 characters, within Chrome Web Store's 132-character limit.

```text
See your supported AWS Region at a glance with atmospheric landmark panoramas in the AWS Console header.
```

### Detailed description

```text
Recognize your current AWS Region at a glance.

SPACE AWS adds a calm, location-inspired panorama to the unused center area of the AWS Management Console header. It automatically detects the current supported Region and displays matching local artwork without moving, hiding, or intercepting native AWS controls.

Highlights

• Distinct atmospheric artwork for all 34 standard commercial AWS Regions
• A cinematic Earth, Moon, and satellite scene for supported global AWS services
• Automatic updates during Console navigation and Region switching
• A simple popup switch to enable or disable all decoration
• Safe fallback to the original AWS header for separate partitions or ambiguous Regions
• Locally bundled artwork with no external image requests
• No analytics, advertising, AWS resource access, or credential access

Privacy

SPACE AWS locally processes the current AWS Console URL and visible Region selector text only to choose the matching artwork. It stores only the enabled or disabled preference in Chrome's local storage. It does not retain or transmit browsing data, AWS credentials, AWS resources, or account content.

SPACE AWS is an independent browser extension and is not affiliated with, endorsed by, or sponsored by Amazon Web Services.
```

### Single-purpose statement

```text
Customize the AWS Management Console header with local atmospheric artwork based on the currently active supported AWS Region.
```

### Permission justifications

`storage`:

```text
Stores only the user's local enabled or disabled preference.
```

AWS Console site access:

```text
Runs only on AWS Management Console pages to detect the active supported Region and render the corresponding bundled header artwork.
```

### Privacy practices

Use the following data-use disclosures in the Chrome Web Store dashboard:

- Website content: the visible AWS Region selector text is processed locally to identify the active supported Region.
- Web history: the current AWS Console page URL is processed locally to identify the active supported Region.
- No other data types are processed.
- No data is retained, transmitted, sold, shared, or used for advertising or analytics.
- No remote code is used.

Use the public URL of [`PRIVACY.md`](PRIVACY.md) for the Privacy Policy field after publishing it on an accessible website.

### Store visual assets

- Store icon: `store-assets/icons/space-aws-store-icon-128.png`
- High-resolution icon source: `store-assets/icons/space-aws-store-icon-1024.png`
- Small promo tile: `store-assets/promotional/space-aws-small-promo-440x280.png`
- Marquee promo tile: `store-assets/promotional/space-aws-marquee-promo-1400x560.png`
- Screenshot 1: `store-assets/screenshots/01-virginia-region.png`
- Screenshot 2: `store-assets/screenshots/02-tokyo-region.png`
- Screenshot 3: `store-assets/screenshots/03-london-region.png`
- Screenshot 4: `store-assets/screenshots/04-seoul-region.png`
- Screenshot 5: `store-assets/screenshots/05-frankfurt-region.png`

All screenshots are `1280×800`, which matches the recommended Chrome Web Store screenshot size. The manifest and store icons use an original text-free planet-and-orbit design. The 16px toolbar icon is simplified for legibility.

These screenshots are privacy-checked AWS Console captures. They contain no visible account identifiers, credentials, or resource data.

The product name contains the AWS plain-text mark. Review the current [AWS Trademark Guidelines](https://aws.amazon.com/trademark-guidelines/) before public submission. SPACE AWS must not imply AWS sponsorship, endorsement, or affiliation.

## Manual QA checklist

- [ ] Every Region in the AWS Region menu shows its matching image, code, and country or territory flag.
- [ ] Enabled-by-default Regions including Ohio, N. California, Osaka, Canada Central, London, Paris, and Stockholm render without a native-header gap.
- [ ] An enabled opt-in Region renders its matching image and badge.
- [ ] IAM or another allowlisted global service shows the space asset.
- [ ] A separate-partition Region keeps the native AWS header.
- [ ] Ambiguous detection keeps the native AWS header.
- [ ] The popup switch disables and restores all decoration.
- [ ] Region changes work without a full-page reload.
- [ ] Repeated navigation never creates duplicate decorative layers.
- [ ] Header buttons, menus, search, focus, and keyboard input still work.
- [ ] Reduced-motion mode removes the opacity transition.
- [ ] Layout and contrast pass at 1280px, 1440px, and 1920px widths.

The AWS Console selectors in `extension/src/dom-targets.js` are defensive candidates. They still require validation against the current signed-in Console DOM before store release.
