# Witness Run Wrapper Action

A lightweight GitHub Action that reuses the Witness run action's wrapper flow so you can capture attestation for steps that run other actions or ad-hoc commands.

This repository pulls the wrapper-related pieces from the `feature/complete-rewrite-squashed` branch of [`testifysec/witness-run-action`](https://github.com/testifysec/witness-run-action) and keeps the Witness integration intact. The result is a slimmer action dedicated to wrapping other actions while still downloading Witness, constructing the correct CLI arguments, and handling environment propagation.

## Usage

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Wrap a downstream action
        uses: colek42/witness-run-wrapper-action@main
        with:
          step: wrap-npm-test
          action-ref: actions/setup-node@v4
          witness_version: 0.8.1
          attestations: "environment git github"
```

Inputs mirror the original Witness run action so you can continue to configure attestors, Archivista, signer settings, and other Witness flags. Either `action-ref` or `command` must be provided (use `docker://` references when you need both).

## Development

- Install dependencies with `npm install`
- Build the bundled action with `npm run build`
- Run locally via `node index.js` (ensuring required inputs are set in the environment)

After making changes, commit and push to publish a new version tag for GitHub Actions consumers.
