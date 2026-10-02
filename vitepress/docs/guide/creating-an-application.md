# Creating an Application

The repository demo keeps its HTML entry in `demo_app/index.html`, application source in `demo_app/src/`, and framework files in `framework/`. Its `vite.config.js` installs the `.page` compiler plugin, and `demo_app/src/main.js` mounts the app:

```
import AppShell from './AppShell.comp';
import { mount, Nodula } from 'nodula-framework';
import appCss from './assets/app.css?url';

Nodula.css(appCss);
mount('#app', AppShell);
```

Build the framework bundles before an app-only build; `npm run dev` and `npm run build` do this automatically. The `.page` compiler plugin is currently a repository source module, so the checkout is the reference integration rather than a public compiler-plugin install recipe. Optional integrations, such as [Progressive Web Apps](/guide/pwa), can be added to the app's Vite config. See [Quick Start](/guide/quick-start) and [Production Deployment](/guide/production-deployment).
