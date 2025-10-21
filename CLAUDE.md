# Witness-Wrapper Development Notes

## Critical Findings

### Attestation Structure: Step Name Location (2025-10-21)

**IMPORTANT**: The witness CLI `-s` flag works correctly, but the step name is stored in `.predicate.name`, NOT `.predicate.step`.

#### Discovery Process:

Testing revealed that even running witness CLI directly produces `step: null`:
```bash
witness run -s simple-command -a=command-run --signer-file-key-path=key.pem -o=test.att -- echo "test"
jq -r '.payload' test.att | base64 -d | jq -r '.predicate.step'
# Output: null
```

However, the step IS captured correctly in a different field:
```bash
jq -r '.payload' test.att | base64 -d | jq -r '.predicate.name'
# Output: simple-command
```

#### Attestation Structure:

The `.predicate` object contains:
- `name` (string) - The step name from `-s` flag
- `attestations` (array) - All attestation data

There is NO `.predicate.step` field.

#### Testing:
- ✅ Tested with witness v0.9.2 (homebrew)
- ✅ Tested with witness dev (latest from main branch)
- ✅ Tested with witness v0.10.1 (GitHub releases)

All versions store step name in `.predicate.name`.

#### Implications:

When writing tests or validation logic for witness attestations:
```bash
# ❌ WRONG
STEP=$(jq -r '.payload' attestation.att | base64 -d | jq -r '.predicate.step')

# ✅ CORRECT
STEP=$(jq -r '.payload' attestation.att | base64 -d | jq -r '.predicate.name')
```

## TDD Workflow Used

### Bug Fix: Witness Version Detection (2025-10-21)

**Problem**: witness-wrapper defaulted to version 0.8.1 and checked tool cache BEFORE checking system PATH, causing it to use cached 0.8.1 even when v0.10.1 was installed to `/usr/local/bin/`.

**TDD Approach**:

1. **RED**: Created `__tests__/witnessDownloader.test.js` with 8 failing tests
   - checkWitnessInPath() should return path if witness in PATH
   - getWitnessPath() should use PATH before downloading
   - Should NOT default to 0.8.1
   - Should respect version input

2. **GREEN**: Refactored `src/core/witnessDownloader.js`
   - New: `checkWitnessInPath()` - checks PATH using `which witness`
   - New: `getLatestVersion()` - fetches from GitHub API
   - New: `downloadWitnessVersion()` - downloads specific version
   - Modified: `getWitnessPath()` - orchestrates PATH → cache → download

3. **REFACTOR**:
   - Removed hardcoded `default: "0.8.1"` from `action.yml`
   - Cleaned up CI workflow (removed cache-clearing workaround)
   - All 25 tests passing

**Version Priority** (after fix):
1. ✅ Check system PATH first
2. ✅ Check tool cache for specified version
3. ✅ Download latest OR specified version (no 0.8.1 default)

## Common Pitfalls

### 1. action.yml Defaults Override Environment

If `action.yml` has:
```yaml
witness_version:
  default: "0.8.1"
```

Then `core.getInput("witness_version")` returns `"0.8.1"` even if the user didn't specify it!

**Solution**: Remove the default value from action.yml to allow true "unspecified" state.

### 2. Tool Cache Priority

`tc.find("witness", version)` checks cache BEFORE system PATH.

**Solution**: Explicitly check PATH first using `which witness` before checking cache.

### 3. Command Parsing with Shell Features

NEVER tokenize commands with regex. Always use shell execution for multi-line commands, pipes, redirects, etc.

```javascript
// ❌ WRONG - breaks on pipes, redirects, variables
const args = command.split(' ');

// ✅ CORRECT - preserves all shell features
const commandArray = ['/bin/sh', '-c', command];
```

## Testing Witness Attestations Locally

### Quick Test Script
```bash
# Generate test key
openssl genrsa -out testkey.pem 2048 2>/dev/null

# Run witness with step name
witness run \
  -s my-step \
  -a command-run \
  --signer-file-key-path=testkey.pem \
  -o=test.att \
  -- echo "test"

# Verify step name (use .predicate.name!)
jq -r '.payload' test.att | base64 -d | jq -r '.predicate.name'
# Should output: my-step

# View full attestation structure
jq -r '.payload' test.att | base64 -d | jq .
```

### Validating Wrapper Behavior

```bash
# Check if wrapper uses correct witness
# Should find /usr/local/bin/witness if installed
grep "Found witness in PATH" logs

# Check args being passed to witness
grep "Complete args array" logs

# Verify -s flag is in args
grep "\-s=step-name" logs
```

## Links

- [Witness CLI Docs](https://github.com/in-toto/witness)
- [DSSE Envelope Spec](https://github.com/secure-systems-lab/dsse)
