# Witness Wrapper Action

A lightweight GitHub Action that wraps other actions or commands to capture attestations with [Witness](https://github.com/in-toto/witness). Pre-configured with TestifySec Platform defaults for zero-config Sigstore signing and timestamping.

## Quick Start

With the new defaults, you only need to provide your step name, command, and API token:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      id-token: write  # Required for OIDC authentication with Fulcio
      contents: read
    steps:
      - uses: testifysec/witness-wrapper@main
        with:
          step: build
          command: npm run build
        env:
          ARCHIVISTA_HEADERS: 'Authorization: Token ${{ secrets.WITNESS_API_TOKEN }}'
```

That's it! The action automatically:
- Signs attestations using TestifySec's Fulcio CA (keyless signing via OIDC)
- Timestamps with TestifySec's TSA for long-term verification
- Uploads attestations to TestifySec's Archivista

## Wrapping Other Actions

You can wrap existing GitHub Actions to capture attestations for their execution:

```yaml
- uses: testifysec/witness-wrapper@main
  with:
    step: checkout
    action-ref: actions/checkout@v4
    attestations: 'git github environment'
  env:
    ARCHIVISTA_HEADERS: 'Authorization: Token ${{ secrets.WITNESS_API_TOKEN }}'

- uses: testifysec/witness-wrapper@main
  with:
    step: setup-node
    action-ref: actions/setup-node@v4
  env:
    ARCHIVISTA_HEADERS: 'Authorization: Token ${{ secrets.WITNESS_API_TOKEN }}'
```

## Platform Defaults

This action is pre-configured with TestifySec Platform URLs:

| Setting | Default Value |
|---------|---------------|
| `archivista-server` | `https://archivista.platform.testifysec.com` |
| `fulcio` | `https://fulcio.platform.testifysec.com` |
| `fulcio-oidc-issuer` | `https://token.actions.githubusercontent.com` |
| `fulcio-oidc-client-id` | `sigstore` |
| `timestamp-servers` | `https://tsa.platform.testifysec.com/api/v1/timestamp` |
| `enable-sigstore` | `true` |
| `enable-archivista` | `true` |

## Custom Configuration

Override any defaults as needed:

```yaml
- uses: testifysec/witness-wrapper@main
  with:
    step: build
    command: make build
    # Override defaults for self-hosted infrastructure
    archivista-server: 'https://archivista.mycompany.com'
    fulcio: 'https://fulcio.mycompany.com'
    timestamp-servers: 'https://tsa.mycompany.com/api/v1/timestamp'
  env:
    ARCHIVISTA_HEADERS: 'Authorization: Token ${{ secrets.WITNESS_API_TOKEN }}'
```

## Inputs

### Required

| Input | Description |
|-------|-------------|
| `step` | Name of the step being run |
| `command` or `action-ref` | Command to run, or reference to a GitHub Action (format: `owner/repo@ref`) |

### Common Options

| Input | Description | Default |
|-------|-------------|---------|
| `attestations` | Attestations to record | `environment git github` |
| `witness_version` | Version of Witness CLI | Latest |
| `outfile` | File to write signed data | - |
| `workingdir` | Working directory for commands | - |

### Sigstore Options

| Input | Description | Default |
|-------|-------------|---------|
| `enable-sigstore` | Enable Sigstore signing | `true` |
| `fulcio` | Fulcio CA address | `https://fulcio.platform.testifysec.com` |
| `fulcio-oidc-issuer` | OIDC issuer URL | `https://token.actions.githubusercontent.com` |
| `fulcio-oidc-client-id` | OIDC client ID | `sigstore` |
| `timestamp-servers` | TSA server URL | `https://tsa.platform.testifysec.com/api/v1/timestamp` |

### Archivista Options

| Input | Description | Default |
|-------|-------------|---------|
| `enable-archivista` | Enable Archivista storage | `true` |
| `archivista-server` | Archivista server URL | `https://archivista.platform.testifysec.com` |

See [action.yml](action.yml) for the complete list of inputs including KMS, Vault, and SPIFFE signer options.

## Permissions

For OIDC authentication with Fulcio, your workflow needs the `id-token: write` permission:

```yaml
permissions:
  id-token: write
  contents: read
```

## Development

- Install dependencies: `npm install`
- Build the bundled action: `npm run build`
- Run locally: `node index.js` (with required inputs set in environment)
