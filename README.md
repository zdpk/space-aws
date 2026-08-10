# AWS Dream

AWS Dream is a Manifest V3 Chrome extension that adds a Region-specific atmospheric panorama to the AWS Management Console header.

The MVP includes 10 standard commercial AWS Regions and one global space state. Unsupported or ambiguous Regions keep the native AWS header.

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

Sync the approved runtime art with:

```bash
bash scripts/sync-region-assets.sh
```

## Chrome Web Store listing metadata

### Product details

- Language: `English (United States)`
- Category: `Developer Tools`
- Category fallback: `Functionality & UI`, if `Developer Tools` is unavailable in the dashboard
- Item name: `AWS Dream`

### Short description

The short description is 104 characters, within Chrome Web Store's 132-character limit.

```text
See your supported AWS Region at a glance with atmospheric landmark panoramas in the AWS Console header.
```

### Detailed description

```text
Recognize your current AWS Region at a glance.

AWS Dream adds a calm, location-inspired panorama to the unused center area of the AWS Management Console header. It automatically detects the current supported Region and displays matching local artwork without moving, hiding, or intercepting native AWS controls.

Highlights

• Distinct atmospheric artwork for 10 supported commercial AWS Regions
• A cinematic Earth, Moon, and satellite scene for supported global AWS services
• Automatic updates during Console navigation and Region switching
• A simple popup switch to enable or disable all decoration
• Safe fallback to the original AWS header for unsupported or ambiguous Regions
• Locally bundled artwork with no external image requests
• No analytics, advertising, AWS resource access, or credential access

Privacy

AWS Dream stores only the enabled or disabled preference in Chrome's local storage. Region detection and rendering happen locally in the browser. The extension does not collect or transmit AWS credentials, AWS resources, account content, or browsing data.

AWS Dream is an independent browser extension and is not affiliated with, endorsed by, or sponsored by Amazon Web Services.
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

### Store visual assets

- Store icon: `store-assets/icons/aws-dream-store-icon-128.png`
- High-resolution icon source: `store-assets/icons/aws-dream-store-icon-1024.png`
- Screenshot 1: `store-assets/screenshots/01-seoul-region.png`
- Screenshot 2: `store-assets/screenshots/02-tokyo-region.png`
- Screenshot 3: `store-assets/screenshots/03-global-space-and-toggle.png`

All screenshots are `1280×800`, which matches the recommended Chrome Web Store screenshot size. The manifest's 128px store icon uses the global space artwork with a centered white AWS logo. The smaller variants are reviewed separately for toolbar legibility.

These screenshots are privacy-safe staged previews rendered from a local Console mock. After signed-in AWS Console QA, compare them against the live interface and replace any materially different view before public submission.

The final icon uses the AWS Smile Logo. Review the current [AWS Trademark Guidelines](https://aws.amazon.com/trademark-guidelines/) and obtain written permission or another applicable AWS license before public submission. AWS Dream must not imply AWS sponsorship, endorsement, or affiliation.

## Manual QA checklist

- [ ] Seoul, Tokyo, Mumbai, Singapore, Sydney, Frankfurt, Ireland, N. Virginia, Oregon, and São Paulo show the matching asset.
- [ ] IAM or another allowlisted global service shows the space asset.
- [ ] An unsupported Region keeps the native AWS header.
- [ ] Ambiguous detection keeps the native AWS header.
- [ ] The popup switch disables and restores all decoration.
- [ ] Region changes work without a full-page reload.
- [ ] Repeated navigation never creates duplicate decorative layers.
- [ ] Header buttons, menus, search, focus, and keyboard input still work.
- [ ] Reduced-motion mode removes the opacity transition.
- [ ] Layout and contrast pass at 1280px, 1440px, and 1920px widths.

The AWS Console selectors in `extension/src/dom-targets.js` are defensive candidates. They still require validation against the current signed-in Console DOM before store release.
