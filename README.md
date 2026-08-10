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
