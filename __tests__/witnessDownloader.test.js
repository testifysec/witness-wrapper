/**
 * TDD Tests for witnessDownloader
 *
 * These tests verify that witness binary is correctly detected and downloaded:
 * 1. Check PATH first before downloading
 * 2. Use system-installed version if available
 * 3. Download latest version (not default to 0.8.1)
 * 4. Respect version input when provided
 */

const { getWitnessPath, checkWitnessInPath } = require('../src/core/witnessDownloader');
const exec = require('@actions/exec');
const core = require('@actions/core');
const tc = require('@actions/tool-cache');

// Mock dependencies
jest.mock('@actions/exec');
jest.mock('@actions/core');
jest.mock('@actions/tool-cache');

describe('Witness Downloader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkWitnessInPath', () => {
    test('should return path if witness is in PATH', async () => {
      exec.exec.mockResolvedValue(0);
      exec.getExecOutput = jest.fn().mockResolvedValue({
        exitCode: 0,
        stdout: '/usr/local/bin/witness\n',
        stderr: ''
      });

      const witnessPath = await checkWitnessInPath();

      expect(witnessPath).toBe('/usr/local/bin/witness');
      expect(exec.getExecOutput).toHaveBeenCalledWith('which', ['witness'], {
        silent: true,
        ignoreReturnCode: true
      });
    });

    test('should return null if witness is not in PATH', async () => {
      exec.getExecOutput = jest.fn().mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: ''
      });

      const witnessPath = await checkWitnessInPath();

      expect(witnessPath).toBeNull();
    });

    test('should return null on error', async () => {
      exec.getExecOutput = jest.fn().mockRejectedValue(new Error('Command failed'));

      const witnessPath = await checkWitnessInPath();

      expect(witnessPath).toBeNull();
    });
  });

  describe('getWitnessPath', () => {
    test('should use witness from PATH if available', async () => {
      // Mock witness in PATH
      exec.getExecOutput = jest.fn().mockResolvedValue({
        exitCode: 0,
        stdout: '/usr/local/bin/witness\n',
        stderr: ''
      });

      const witnessPath = await getWitnessPath();

      expect(witnessPath).toBe('/usr/local/bin/witness');
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Found witness in PATH'));
    });

    test('should download latest version if not in PATH and no version specified', async () => {
      // Mock witness NOT in PATH
      exec.getExecOutput = jest.fn().mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: ''
      });

      // Mock no cached version
      tc.find.mockReturnValue('');

      // Mock GitHub API for latest version
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ tag_name: 'v0.10.1' })
      });

      // Mock download and extraction
      tc.downloadTool.mockResolvedValue('/tmp/witness.tar.gz');
      tc.extractTar.mockResolvedValue('/tmp/witness-extract');
      tc.cacheFile.mockResolvedValue('/opt/hostedtoolcache/witness/0.10.1/x64');

      core.getInput.mockReturnValue(''); // No version specified

      const witnessPath = await getWitnessPath();

      expect(witnessPath).toContain('witness');
      expect(tc.downloadTool).toHaveBeenCalled();
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('0.10.1'));
    });

    test('should respect witness_version input when specified', async () => {
      // Mock witness NOT in PATH
      exec.getExecOutput = jest.fn().mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: ''
      });

      // Mock no cached version
      tc.find.mockReturnValue('');

      // Mock download and extraction
      tc.downloadTool.mockResolvedValue('/tmp/witness.tar.gz');
      tc.extractTar.mockResolvedValue('/tmp/witness-extract');
      tc.cacheFile.mockResolvedValue('/opt/hostedtoolcache/witness/0.9.0/x64');

      core.getInput.mockReturnValue('0.9.0'); // Specific version requested

      const witnessPath = await getWitnessPath();

      expect(witnessPath).toContain('witness');
      expect(tc.downloadTool).toHaveBeenCalledWith(
        expect.stringContaining('v0.9.0')
      );
    });

    test('should use cached version if available', async () => {
      // Mock witness NOT in PATH
      exec.getExecOutput = jest.fn().mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: ''
      });

      // Mock cached version exists
      tc.find.mockReturnValue('/opt/hostedtoolcache/witness/0.10.1/x64');
      core.getInput.mockReturnValue('0.10.1');

      const witnessPath = await getWitnessPath();

      expect(witnessPath).toContain('witness');
      expect(tc.downloadTool).not.toHaveBeenCalled();
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('cached'));
    });

    test('should NOT default to 0.8.1', async () => {
      // Mock witness NOT in PATH
      exec.getExecOutput = jest.fn().mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: ''
      });

      // Mock no cached version
      tc.find.mockReturnValue('');

      // Mock GitHub API for latest version
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ tag_name: 'v0.10.1' })
      });

      // Mock download and extraction
      tc.downloadTool.mockResolvedValue('/tmp/witness.tar.gz');
      tc.extractTar.mockResolvedValue('/tmp/witness-extract');
      tc.cacheFile.mockResolvedValue('/opt/hostedtoolcache/witness/0.10.1/x64');

      core.getInput.mockReturnValue(''); // No version specified

      const witnessPath = await getWitnessPath();

      expect(tc.downloadTool).not.toHaveBeenCalledWith(
        expect.stringContaining('v0.8.1')
      );
      expect(tc.downloadTool).toHaveBeenCalledWith(
        expect.stringContaining('v0.10.1')
      );
    });
  });
});
