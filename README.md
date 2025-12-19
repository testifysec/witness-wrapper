# Witness Wrapper Action

A GitHub Action that wraps commands with [Witness](https://github.com/in-toto/witness) to create software supply chain attestations. Works out of the box with [TestifySec Platform](https://www.testifysec.com/).

## Quick Start

Add attestations to your workflow with just 3 lines of configuration:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      id-token: write  # Required for Sigstore signing
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Build with attestation
        uses: testifysec/witness-wrapper@v0.3
        env:
          TESTIFYSEC_API_KEY: ${{ secrets.TESTIFYSEC_API_KEY }}
        with:
          step: build
          command: npm run build
```

That's it! The action automatically:
- Downloads the latest Witness CLI
- Signs attestations using Sigstore (keyless)
- Uploads attestations to TestifySec Platform

## Configuration

### Required Inputs

| Input | Description |
|-------|-------------|
| `step` | Name of the build step (e.g., `build`, `test`, `deploy`) |
| `command` | Command to run (or use `action-ref` to wrap another action) |

### Authentication

Set `TESTIFYSEC_API_KEY` as an environment variable to upload attestations to TestifySec Platform:

```yaml
env:
  TESTIFYSEC_API_KEY: ${{ secrets.TESTIFYSEC_API_KEY }}
```

### Optional Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `attestations` | `environment git github` | Space-separated list of attestors |
| `enable-archivista` | `true` | Upload attestations to Archivista |
| `enable-sigstore` | `true` | Use Sigstore keyless signing |
| `outfile` | - | Save attestation to a local file |
| `key` | - | Path to signing key (instead of Sigstore) |

### Platform Defaults

All TestifySec Platform URLs are preconfigured:
- **Archivista**: `https://web.platform.testifysec.com`
- **Fulcio**: `https://fulcio.platform.testifysec.com`
- **TSA**: `https://tsa.platform.testifysec.com/api/v1/timestamp`

## Examples

### Build and Test Pipeline

```yaml
jobs:
  ci:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        uses: testifysec/witness-wrapper@v0.3
        env:
          TESTIFYSEC_API_KEY: ${{ secrets.TESTIFYSEC_API_KEY }}
        with:
          step: install
          command: npm ci

      - name: Run tests
        uses: testifysec/witness-wrapper@v0.3
        env:
          TESTIFYSEC_API_KEY: ${{ secrets.TESTIFYSEC_API_KEY }}
        with:
          step: test
          command: npm test

      - name: Build
        uses: testifysec/witness-wrapper@v0.3
        env:
          TESTIFYSEC_API_KEY: ${{ secrets.TESTIFYSEC_API_KEY }}
        with:
          step: build
          command: npm run build
```

### Wrap Another Action

```yaml
- name: Setup Node with attestation
  uses: testifysec/witness-wrapper@v0.3
  env:
    TESTIFYSEC_API_KEY: ${{ secrets.TESTIFYSEC_API_KEY }}
  with:
    step: setup-node
    action-ref: actions/setup-node@v4
    input-node-version: '20'
```

### Save Attestation Locally (No Upload)

```yaml
- name: Build with local attestation
  uses: testifysec/witness-wrapper@v0.3
  with:
    step: build
    command: make build
    enable-archivista: false
    enable-sigstore: false
    key: ${{ secrets.SIGNING_KEY_PATH }}
    outfile: build-attestation.json
```

## Development

```bash
npm install
npm run build
npm test
```

## License

Apache 2.0
