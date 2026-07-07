# Build resources

electron-builder reads packaging assets from this folder (`buildResources`).

- `icon.ico` — Windows app / installer icon (256×256 or larger recommended).
  Drop one here to brand the app; without it the default Electron icon is used.
- `installerHeader.bmp`, `installerSidebar.bmp` — optional NSIS installer art.

These are optional. The build succeeds without them.
