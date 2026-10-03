# Framework Stylesheet

The combined source stylesheet is `framework/assets/nodula-framework.css`. It contains the default styles used by the optional dialog, notification, modal, and drawer add-ons. The framework build copies it to `dist/nodula/nodula-framework.css` and publishes it as `nodula-framework/nodula-framework.css`. You can also import an individual add-on stylesheet from `nodula-framework/dialog.css`, `nodula-framework/notifications.css`, `nodula-framework/modal.css`, or `nodula-framework/drawer.css`. Import the combined stylesheet:

```
import 'nodula-framework/nodula-framework.css';
```

It includes the `.ui-dialog`, `.ui-notification`, `.ui-modal`, and `.ui-drawer` styles, including the default dark theme, `[data-theme="light"]` overrides, and reduced-motion rules. The JavaScript add-ons no longer inject or remove style tags when opening and closing UI; include the stylesheet if you use these components.

Styles from your own `.page` `<style>` blocks are still processed by the Vite compiler and are not included in this shared framework stylesheet. You may override the shared rules in your app's CSS.

The demo app's shared shell uses `demo_app/src/assets/Leaves-background.png` as a decorative background image. In `demo_app/src/assets/app.css`, the app background and header navigation/toggle surfaces are styled for light and dark modes; these demo styles are separate from this shared add-on stylesheet.

The demo app uses Highlight.js to detect JavaScript, HTML, and CSS in its route examples, including code text inserted after the element mounts. Highlight.js is used only by the demo app, not by the framework runtime, and is declared as a development dependency. Syntax token spans use theme-aware palettes: brighter colors in dark mode and darker colors in light mode. Unclassified code text uses the shared global `--green` color. These app styles are separate from the published framework stylesheet.
