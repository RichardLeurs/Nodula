# Framework Stylesheet

The combined source stylesheet is `framework/assets/nodula-framework.css`. It contains the default styles used by the optional dialog, notification, modal, and drawer add-ons. The framework build copies it to `dist/nodula/nodula-framework.css` and publishes it as `nodula-framework/nodula-framework.css`. 

Also available are the individual add-on stylesheet from `nodula-framework/dialog.css`, `nodula-framework/notifications.css`, `nodula-framework/modal.css`, `nodula-framework/drawer.css`, or `nodula-framework/cookieconsent.css`. 

The stylesheet includes the `.ui-dialog`, `.ui-notification`, `.ui-modal`, `.ui-drawer` and `.ui-cookie-consent` styles, including the default dark theme, `[data-theme="light"]` overrides, and reduced-motion rules. 

You don't have to import this stylesheet in your app, it is just a basic stylesheet as a starting point. If you want to override the framework styles, just add the needed css styles to your application stylesheet and change them.

Styles from your own `.page` or `.comp` `<style>` blocks are still processed by the Vite compiler and are not included in this shared framework stylesheet. 


