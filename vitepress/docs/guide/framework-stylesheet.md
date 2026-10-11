# Framework Stylesheet

The framework build emits each optional add-on stylesheet separately under `dist/nodula/css/`. Import only styles your application uses:

Also available are the individual add-on stylesheet from `nodula-framework/dialog.css`, `nodula-framework/notifications.css`, `nodula-framework/modal.css`, `nodula-framework/drawer.css`, or `nodula-framework/cookieconsent.css`. 

Each stylesheet contains the styles for its corresponding add-on, including its theme and reduced-motion rules where applicable.

Add-on styles are injected by their runtime modules when used. You can also import an individual stylesheet explicitly to control CSS loading or override its styles in your application stylesheet.

Styles from your own `.page` or `.comp` `<style>` blocks are processed by the Vite compiler and remain separate from add-on stylesheets.


