# Chrome Web Store visual assets

## Final assets

- `icons/space-aws-store-icon-1024.png` — high-resolution original planet-and-orbit store icon
- `icons/space-aws-store-icon-128.png` — Chrome Web Store and manifest icon
- `icons/space-aws-store-icon-48.png` — extension management icon
- `icons/space-aws-store-icon-16.png` — size-adapted toolbar icon
- `screenshots/01-virginia-region.png` — US East (N. Virginia) Region header state
- `screenshots/02-tokyo-region.png` — Region switching state
- `screenshots/03-london-region.png` — Europe (London) Region header state
- `screenshots/04-seoul-region.png` — Asia Pacific (Seoul) Region header state
- `screenshots/05-frankfurt-region.png` — Europe (Frankfurt) Region header state
- `promotional/space-aws-small-promo-440x280.png` — final 440×280 small promo tile
- `promotional/space-aws-marquee-promo-1400x560.png` — final 1400×560 marquee promo tile

All store screenshots are 1280×800 pixels.

The screenshots are privacy-checked AWS Console captures. They contain no visible account identifiers, credentials, or resource data.

## Sources

- The final icon source is `source/space-aws-icon-source.png`, created as an original text-free planet-and-orbit design.
- The original registration background is preserved as `source/space-aws-registration-background-original.png`.
- The final promo tiles use `source/space-aws-promo-background-master.png` and composite `source/aws-logo-smile-white-transparent.png` without regenerating the official logo.
- The header artwork is bundled in `extension/assets/regions/`.
- Superseded AWS Dream artwork and intermediate registration renders are excluded from version control and retained only as local references.

Amazon Web Services and AWS are trademarks of Amazon.com, Inc. or its affiliates. SPACE AWS is an independent extension and is not affiliated with, endorsed by, or sponsored by Amazon Web Services.

The release icon contains no AWS logo. The optional registration artwork does contain the AWS Smile Logo at the user's direction. Confirm the applicable AWS license or written permission before public release and do not imply AWS sponsorship, endorsement, or affiliation.

## Rebuild

Run `python3 extension/icons/generate-icons.py` to rebuild the size-adapted extension icons from the approved source.

Open `source/store-screenshot.html` at a 1280×800 viewport with one of these query strings:

- `?scene=seoul`
- `?scene=tokyo`
- `?scene=global`
