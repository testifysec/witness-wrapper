/**
 * TDD Tests for Bug #2: Step Parameter Propagation
 *
 * These tests verify that the step parameter is correctly:
 * 1. Read from GitHub Actions inputs
 * 2. Passed to witness CLI via -s flag
 * 3. Included in the final attestation
 */

const assembleWitnessArgs = require('../src/attestation/assembleWitnessArgs');

describe('Step Parameter Propagation', () => {
  describe('assembleWitnessArgs', () => {
    test('should include step parameter in witness command', () => {
      const witnessOptions = {
        step: 'build-application',
        outfile: 'test.att',
        attestations: ['command-run'],
        key: '/path/to/key.pem'
      };

      const commandArgs = ['echo', 'test'];
      const args = assembleWitnessArgs(witnessOptions, commandArgs);

      // Verify that -s=build-application is in the arguments
      expect(args).toContain('-s=build-application');
    });

    test('should handle step parameter with special characters', () => {
      const witnessOptions = {
        step: 'my-build-step-v1.2.3',
        outfile: 'test.att',
        attestations: ['command-run']
      };

      const args = assembleWitnessArgs(witnessOptions, []);

      expect(args).toContain('-s=my-build-step-v1.2.3');
    });

    test('should not add step flag if step is empty', () => {
      const witnessOptions = {
        step: '',
        outfile: 'test.att',
        attestations: ['command-run']
      };

      const args = assembleWitnessArgs(witnessOptions, []);

      // Should not have any -s= flag
      const stepArgs = args.filter(arg => arg.startsWith('-s='));
      expect(stepArgs).toHaveLength(0);
    });

    test('should not add step flag if step is undefined', () => {
      const witnessOptions = {
        step: undefined,
        outfile: 'test.att',
        attestations: ['command-run']
      };

      const args = assembleWitnessArgs(witnessOptions, []);

      // Should not have any -s= flag
      const stepArgs = args.filter(arg => arg.startsWith('-s='));
      expect(stepArgs).toHaveLength(0);
    });

    test('should place step parameter before the -- separator', () => {
      const witnessOptions = {
        step: 'test-step',
        outfile: 'test.att',
        attestations: ['command-run']
      };

      const commandArgs = ['echo', 'hello'];
      const args = assembleWitnessArgs(witnessOptions, commandArgs);

      const stepIndex = args.indexOf('-s=test-step');
      const separatorIndex = args.indexOf('--');

      // Step should come before the -- separator
      expect(stepIndex).toBeGreaterThan(-1);
      expect(separatorIndex).toBeGreaterThan(-1);
      expect(stepIndex).toBeLessThan(separatorIndex);
    });
  });

  describe('getWitnessOptions', () => {
    // Mock @actions/core
    let mockCore;
    let getWitnessOptions;

    beforeEach(() => {
      // Reset the module cache to get a fresh import
      jest.resetModules();

      // Create mock for @actions/core
      mockCore = {
        getInput: jest.fn((name) => {
          const inputs = {
            'step': 'test-build-step',
            'outfile': 'output.att',
            'attestations': 'command-run environment',
            'witness_version': '0.8.1',
            'enable-archivista': 'false',
            'enable-sigstore': 'false'
          };
          return inputs[name] || '';
        })
      };

      // Mock the @actions/core module
      jest.mock('@actions/core', () => mockCore, { virtual: true });

      // Now require the function
      getWitnessOptions = require('../src/attestation/getWitnessOptions');
    });

    afterEach(() => {
      jest.unmock('@actions/core');
    });

    test('should read step from GitHub Actions input', () => {
      const options = getWitnessOptions();

      expect(mockCore.getInput).toHaveBeenCalledWith('step');
      expect(options.step).toBe('test-build-step');
    });

    test('should include step in returned options object', () => {
      const options = getWitnessOptions();

      expect(options).toHaveProperty('step');
      expect(options.step).toBe('test-build-step');
    });
  });

  describe('Integration: Full Step Parameter Flow', () => {
    test('should pass step from options through to witness CLI arguments', () => {
      // Simulate the full flow
      const witnessOptions = {
        step: 'integration-test-step',
        outfile: 'integration.att',
        attestations: ['command-run', 'environment'],
        key: '/test/key.pem',
        enableArchivista: false,
        enableSigstore: false
      };

      const command = ['go', 'build', '-o', 'app'];
      const witnessArgs = assembleWitnessArgs(witnessOptions, command);

      // Verify the complete witness command structure
      expect(witnessArgs[0]).toBe('run'); // First arg should be 'run'
      expect(witnessArgs).toContain('-a=command-run');
      expect(witnessArgs).toContain('-a=environment');
      expect(witnessArgs).toContain('-s=integration-test-step'); // Step should be present
      expect(witnessArgs).toContain('-o=integration.att');
      expect(witnessArgs).toContain('--signer-file-key-path=/test/key.pem');
      expect(witnessArgs).toContain('--');

      // Everything after -- should be the command
      const separatorIndex = witnessArgs.indexOf('--');
      expect(witnessArgs.slice(separatorIndex + 1)).toEqual(['go', 'build', '-o', 'app']);
    });
  });
});
