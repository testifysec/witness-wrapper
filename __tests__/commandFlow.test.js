/**
 * Test to verify command flow through the wrapper
 * Specifically testing that variables and complex commands are preserved
 */

const assembleWitnessArgs = require('../src/attestation/assembleWitnessArgs');

describe('Command Flow Tests', () => {
  describe('assembleWitnessArgs with shell commands', () => {
    const baseOptions = {
      step: 'build',
      outfile: 'attestation.json',
      enableArchivista: false,
      attestations: ['git', 'github']
    };

    test('preserves variable-like strings in command', () => {
      // Simulating what GitHub Actions would pass after substitution
      // ${{ steps.load-image.outputs.IMAGE_TAG }} becomes the actual value
      const command = 'make build docker_tag=v1.2.3-abc123';
      const commandArray = ['/bin/sh', '-c', command];

      const args = assembleWitnessArgs(baseOptions, commandArray);

      // Find the command in the args (after --)
      const dashDashIndex = args.indexOf('--');
      expect(dashDashIndex).toBeGreaterThan(-1);

      const shellArgs = args.slice(dashDashIndex + 1);
      expect(shellArgs).toEqual(['/bin/sh', '-c', 'make build docker_tag=v1.2.3-abc123']);
    });

    test('preserves command with equals sign and special chars', () => {
      const command = 'make build docker_tag=my-image:v1.0.0-sha.abc123';
      const commandArray = ['/bin/sh', '-c', command];

      const args = assembleWitnessArgs(baseOptions, commandArray);

      const dashDashIndex = args.indexOf('--');
      const shellArgs = args.slice(dashDashIndex + 1);

      // The exact command should be preserved
      expect(shellArgs[2]).toBe('make build docker_tag=my-image:v1.0.0-sha.abc123');
    });

    test('preserves command with spaces in quoted values', () => {
      const command = 'echo "hello world" && make build TAG="my tag with spaces"';
      const commandArray = ['/bin/sh', '-c', command];

      const args = assembleWitnessArgs(baseOptions, commandArray);

      const dashDashIndex = args.indexOf('--');
      const shellArgs = args.slice(dashDashIndex + 1);

      expect(shellArgs[2]).toBe('echo "hello world" && make build TAG="my tag with spaces"');
    });

    test('preserves multi-line commands', () => {
      const command = `cd /tmp
echo "line 1"
echo "line 2"`;
      const commandArray = ['/bin/sh', '-c', command];

      const args = assembleWitnessArgs(baseOptions, commandArray);

      const dashDashIndex = args.indexOf('--');
      const shellArgs = args.slice(dashDashIndex + 1);

      // Multi-line should be preserved as single string
      expect(shellArgs[2]).toContain('cd /tmp');
      expect(shellArgs[2]).toContain('echo "line 1"');
      expect(shellArgs[2]).toContain('echo "line 2"');
    });

    test('preserves pipes and redirects', () => {
      const command = 'ls -la | grep foo > output.txt 2>&1';
      const commandArray = ['/bin/sh', '-c', command];

      const args = assembleWitnessArgs(baseOptions, commandArray);

      const dashDashIndex = args.indexOf('--');
      const shellArgs = args.slice(dashDashIndex + 1);

      expect(shellArgs[2]).toBe('ls -la | grep foo > output.txt 2>&1');
    });

    test('preserves environment variable syntax (for runtime expansion)', () => {
      // Note: $VAR syntax should be preserved for shell to expand at runtime
      const command = 'echo $HOME && make build TAG=$MY_TAG';
      const commandArray = ['/bin/sh', '-c', command];

      const args = assembleWitnessArgs(baseOptions, commandArray);

      const dashDashIndex = args.indexOf('--');
      const shellArgs = args.slice(dashDashIndex + 1);

      expect(shellArgs[2]).toBe('echo $HOME && make build TAG=$MY_TAG');
    });

    test('full args structure is correct', () => {
      const command = 'make build docker_tag=v1.0.0';
      const commandArray = ['/bin/sh', '-c', command];

      const args = assembleWitnessArgs(baseOptions, commandArray);

      // Should start with 'run'
      expect(args[0]).toBe('run');

      // Should have step and outfile
      expect(args).toContain('-s=build');
      expect(args).toContain('-o=attestation.json');

      // Should have -- separator
      expect(args).toContain('--');

      // Command should come after --
      const dashDashIndex = args.indexOf('--');
      expect(args[dashDashIndex + 1]).toBe('/bin/sh');
      expect(args[dashDashIndex + 2]).toBe('-c');
      expect(args[dashDashIndex + 3]).toBe('make build docker_tag=v1.0.0');
    });
  });

  describe('Edge cases', () => {
    const baseOptions = {
      step: 'test',
      enableArchivista: false
    };

    test('handles empty command gracefully', () => {
      const commandArray = ['/bin/sh', '-c', ''];
      const args = assembleWitnessArgs(baseOptions, commandArray);

      const dashDashIndex = args.indexOf('--');
      const shellArgs = args.slice(dashDashIndex + 1);

      expect(shellArgs[2]).toBe('');
    });

    test('handles command with only whitespace', () => {
      const commandArray = ['/bin/sh', '-c', '   '];
      const args = assembleWitnessArgs(baseOptions, commandArray);

      const dashDashIndex = args.indexOf('--');
      const shellArgs = args.slice(dashDashIndex + 1);

      expect(shellArgs[2]).toBe('   ');
    });

    test('handles null in extraArgs', () => {
      const commandArray = ['/bin/sh', '-c', null];
      const args = assembleWitnessArgs(baseOptions, commandArray);

      const dashDashIndex = args.indexOf('--');
      const shellArgs = args.slice(dashDashIndex + 1);

      // null should be converted to empty string
      expect(shellArgs[2]).toBe('');
    });
  });
});
