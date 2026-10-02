# Accessibility

Nodula uses native HTML elements, attributes, and browser events; semantic markup and accessible interaction remain the application's responsibility. The framework does not include an accessibility automation layer or built-in audit suite.

Use associated labels for inputs, meaningful button text, valid focus behavior, status/error text where appropriate, and test keyboard and assistive-technology behavior in the app. If adding motion, respect reduced-motion preferences; the animation add-on does so by default. Automated accessibility checks remain a project target, not a shipped guarantee.
