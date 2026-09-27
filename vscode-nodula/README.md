# Nodula Language Support for VS Code

A small VS Code language extension that provides syntax highlighting and basic editor language configuration for Nodula single-file components.

## Supported files

The extension recognizes:

- `.page` — Nodula route pages
- `.comp` — reusable Nodula components

It highlights JavaScript inside `<script>` blocks, HTML inside `<template>` blocks, and CSS inside `<style>` blocks. Nodula template directives such as `@if`, `@for`, `@click`, `:value`, and `{{ expressions }}` receive Nodula-specific highlighting. Embedded code uses the colors from the active VS Code theme.

The extension also configures bracket matching, comment commands, and automatic closing/surrounding pairs. It provides syntax highlighting and editor language configuration; it does not compile Nodula files or provide language-server features such as diagnostics, completion, or go-to-definition.

## Try it from this repository

1. Open the repository root in VS Code.
2. Open **Run and Debug** and select **Run Nodula Language Extension**.
3. Press **F5** to launch a separate Extension Development Host window with the local extension loaded.
4. Open a `.page` or `.comp` file in that new window and confirm the language indicator says **Nodula**.

The launch configuration is in the repository's `.vscode/launch.json`. Opening this extension's `package.json` by itself and pressing F5 does not provide the workspace launch configuration.

## Package and install locally

From the repository root, run:

```sh
cd vscode-nodula
npx --yes @vscode/vsce package --allow-missing-repository --skip-license
code --install-extension nodula-language-0.1.0.vsix
```

If the `code` command is unavailable, use the VS Code Command Palette's **Extensions: Install from VSIX...** command and select `vscode-nodula/nodula-language-0.1.0.vsix` from the repository root. Reload VS Code after installation. Rebuild and reinstall the VSIX after changing the extension files, or use the Extension Development Host while developing.

The packaging flags are for local use because the extension manifest does not currently specify a repository URL or license. Add accurate metadata before publishing or distributing the extension.

## Extension files

- `package.json` — extension metadata and language/grammar contributions
- `syntaxes/nodula.tmLanguage.json` — TextMate grammar
- `language-configuration.json` — comments, brackets, and auto-closing pairs