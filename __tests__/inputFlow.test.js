/**
 * Test to verify how GitHub Actions inputs flow through the wrapper
 *
 * Key insight: GitHub Actions evaluates ${{ }} expressions BEFORE passing to the action.
 * So INPUT_COMMAND already contains the substituted value.
 */

describe('GitHub Actions Input Flow', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('core.getInput behavior', () => {
    test('reads INPUT_COMMAND with substituted variable value', () => {
      // Simulate what GitHub Actions does:
      // command: make build docker_tag=${{ steps.load-image.outputs.IMAGE_TAG }}
      // becomes:
      // INPUT_COMMAND=make build docker_tag=v1.2.3-abc123
      process.env.INPUT_COMMAND = 'make build docker_tag=v1.2.3-abc123';

      const core = require('@actions/core');
      const command = core.getInput('command');

      expect(command).toBe('make build docker_tag=v1.2.3-abc123');
    });

    test('reads INPUT_COMMAND with empty variable value', () => {
      // If IMAGE_TAG is empty, GitHub passes empty string
      process.env.INPUT_COMMAND = 'make build docker_tag=';

      const core = require('@actions/core');
      const command = core.getInput('command');

      expect(command).toBe('make build docker_tag=');
    });

    test('reads INPUT_COMMAND with complex docker tag', () => {
      // Common pattern: registry/image:tag-sha
      process.env.INPUT_COMMAND = 'make build docker_tag=ghcr.io/myorg/myimage:v1.0.0-sha.abc1234';

      const core = require('@actions/core');
      const command = core.getInput('command');

      expect(command).toBe('make build docker_tag=ghcr.io/myorg/myimage:v1.0.0-sha.abc1234');
    });

    test('preserves multi-line command from GitHub Actions', () => {
      // GitHub Actions preserves newlines in multi-line YAML
      process.env.INPUT_COMMAND = `echo "Starting build"
make build docker_tag=v1.0.0
echo "Build complete"`;

      const core = require('@actions/core');
      const command = core.getInput('command');

      expect(command).toContain('echo "Starting build"');
      expect(command).toContain('make build docker_tag=v1.0.0');
      expect(command).toContain('echo "Build complete"');
    });
  });

  describe('Full command flow simulation', () => {
    test('command flows correctly to witness args', () => {
      // Set up the environment as GitHub Actions would
      process.env.INPUT_COMMAND = 'make build docker_tag=v1.2.3';
      process.env.INPUT_STEP = 'build';
      process.env['INPUT_ENABLE-ARCHIVISTA'] = 'false';
      process.env.INPUT_OUTFILE = 'attestation.json';

      const core = require('@actions/core');
      const assembleWitnessArgs = require('../src/attestation/assembleWitnessArgs');

      // This is what runDirectCommandWithWitness does
      const command = core.getInput('command');
      const commandArray = ['/bin/sh', '-c', command];

      const witnessOptions = {
        step: core.getInput('step'),
        enableArchivista: false,
        outfile: core.getInput('outfile')
      };

      const args = assembleWitnessArgs(witnessOptions, commandArray);

      // Verify the final command structure
      const dashDashIndex = args.indexOf('--');
      expect(args.slice(dashDashIndex)).toEqual([
        '--',
        '/bin/sh',
        '-c',
        'make build docker_tag=v1.2.3'
      ]);
    });

    test('handles special characters in docker tag', () => {
      // Docker tags can have: alphanumerics, periods, hyphens, underscores
      process.env.INPUT_COMMAND = 'make build docker_tag=my-app_v1.0.0-beta.1';

      const core = require('@actions/core');
      const assembleWitnessArgs = require('../src/attestation/assembleWitnessArgs');

      const command = core.getInput('command');
      const commandArray = ['/bin/sh', '-c', command];

      const args = assembleWitnessArgs({ step: 'build' }, commandArray);

      const dashDashIndex = args.indexOf('--');
      expect(args[dashDashIndex + 3]).toBe('make build docker_tag=my-app_v1.0.0-beta.1');
    });
  });
});
