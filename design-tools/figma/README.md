# Sekura design-tool starter library

Build with `npm run build && npm run emit:css && npm run build:design-kit`. In Figma Desktop, create a development plugin and use the generated `dist-design-kit/code.js` and manifest settings, retaining the ID Figma assigns. Alternatively import the generated manifest if your Figma version permits a development manifest without an ID. Run in a scratch design file first.

The plugin creates a new page with **six editable component sets and 216 variants**: Button, TextField, Textarea, Select, Checkbox and Switch × four themes × three densities × three relevant states. Frames use Auto Layout; labels are native editable text. Checkbox marks are editable vectors. Button and toggle variants include explicit click/change-state prototype reactions. Every component carries version and implementation metadata, including controller/event/application ownership.

The builder reads computed styles from the actual distributed CSS in Chromium. Colors, borders, radii, control heights and spacing are regenerated on every build. Figma uses Inter as a portable starter font; review font metrics against the web platform's system font. CSS effects, focus/hover behavior, browser-native select popups, indeterminate checkboxes and full composite/overlay widgets are not reproduced. Button busy variants retain their label, as the web control does; prototype transitions are demonstrations, not network requests.

This is a starter component library, not a claim that all 67 web components have production Figma equivalents. The complete web catalog remains available in the documentation and MCP. Import and visual review in Figma, then team-library publication, require a designer with access to the target workspace. The automated build and API typecheck do not establish Figma visual fidelity. Plugin runs append a new page so earlier design work is preserved. No network access is requested.

API references: [component variants](https://developers.figma.com/docs/plugins/api/properties/figma-combineasvariants/), [plugin manifest](https://developers.figma.com/docs/plugins/manifest/).
