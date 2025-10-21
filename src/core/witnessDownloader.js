/**
 * Functionality for downloading and setting up the witness binary
 * Uses GitHub Actions Tool Cache for efficient reuse
 *
 * Version Priority:
 * 1. Check if witness exists in PATH
 * 2. Check tool cache for specified version
 * 3. Download specified version OR latest version
 */
const core = require("@actions/core");
const fs = require("fs");
const path = require("path");
const tc = require("@actions/tool-cache");
const exec = require("@actions/exec");
const os = require("os");

/**
 * Checks if witness is available in the system PATH
 * @returns {Promise<string|null>} Path to witness executable or null
 */
async function checkWitnessInPath() {
  try {
    const result = await exec.getExecOutput('which', ['witness'], {
      silent: true,
      ignoreReturnCode: true
    });

    if (result.exitCode === 0 && result.stdout.trim()) {
      return result.stdout.trim();
    }
    return null;
  } catch (error) {
    core.debug(`Error checking for witness in PATH: ${error.message}`);
    return null;
  }
}

/**
 * Gets the latest witness version from GitHub releases
 * @returns {Promise<string>} Latest version (e.g., "0.10.1" without 'v' prefix)
 */
async function getLatestVersion() {
  try {
    const response = await fetch('https://api.github.com/repos/in-toto/witness/releases/latest');
    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }
    const data = await response.json();
    // Remove 'v' prefix if present
    const version = data.tag_name.startsWith('v') ? data.tag_name.slice(1) : data.tag_name;
    core.info(`Latest witness version from GitHub: ${version}`);
    return version;
  } catch (error) {
    core.warning(`Failed to fetch latest witness version: ${error.message}`);
    // Fallback to a known recent version
    return "0.10.1";
  }
}

/**
 * Downloads and caches a specific witness version
 * @param {string} version - Version to download (without 'v' prefix)
 * @returns {Promise<string>} Path to witness executable
 */
async function downloadWitnessVersion(version) {
  // Determine OS-specific archive name
  let archiveFile;
  if (process.platform === "win32") {
    archiveFile = `witness_${version}_windows_amd64.tar.gz`;
  } else if (process.platform === "darwin") {
    archiveFile = `witness_${version}_darwin_amd64.tar.gz`;
  } else {
    archiveFile = `witness_${version}_linux_amd64.tar.gz`;
  }

  const downloadUrl = `https://github.com/in-toto/witness/releases/download/v${version}/${archiveFile}`;
  core.info(`Downloading witness from: ${downloadUrl}`);

  // Download the archive
  let downloadPath;
  try {
    downloadPath = await tc.downloadTool(downloadUrl);
    core.info(`📦 Downloaded witness archive to: ${downloadPath}`);
  } catch (error) {
    throw new Error(`Failed to download witness: ${error.message}`);
  }

  // Create a temporary directory for extraction
  const tempDir = path.join(os.tmpdir(), 'witness-extract-' + Math.random().toString(36).substring(7));
  fs.mkdirSync(tempDir, { recursive: true });
  core.info(`📂 Created temporary directory: ${tempDir}`);

  // Extract the archive
  let extractedDir;
  try {
    extractedDir = await tc.extractTar(downloadPath, tempDir);
    core.info(`📤 Extracted witness to: ${extractedDir}`);
  } catch (error) {
    throw new Error(`Failed to extract witness archive: ${error.message}`);
  }

  // Prepare witness executable path
  const witnessExePath = path.join(extractedDir, "witness");
  core.info(`Witness executable path: ${witnessExePath}`);

  // Make the binary executable
  try {
    fs.chmodSync(witnessExePath, '755');
    core.info(`✅ Made witness executable`);
  } catch (error) {
    core.warning(`⚠️ Failed to make witness executable: ${error.message}`);
  }

  // Cache the binary
  let cachedPath;
  try {
    cachedPath = await tc.cacheFile(witnessExePath, "witness", "witness", version);
    core.info(`✅ Cached witness at: ${cachedPath}`);
    core.addPath(path.dirname(cachedPath));
    core.info(`✅ Added witness to PATH: ${path.dirname(cachedPath)}`);
  } catch (error) {
    throw new Error(`Failed to cache witness: ${error.message}`);
  }

  // Clean up the temp directory
  try {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
    core.info(`🧹 Cleaned up temporary directory`);
  } catch (error) {
    core.warning(`⚠️ Failed to clean up temporary directory: ${error.message}`);
  }

  return cachedPath.endsWith('witness') ? cachedPath : path.join(cachedPath, 'witness');
}

/**
 * Gets the path to witness executable, checking PATH first, then cache, then downloading
 * @returns {Promise<string>} Path to witness executable
 */
async function getWitnessPath() {
  // Step 1: Check if witness is already in PATH
  const pathWitness = await checkWitnessInPath();
  if (pathWitness) {
    core.info(`✅ Found witness in PATH: ${pathWitness}`);
    return pathWitness;
  }

  // Step 2: Get version to use (from input or latest)
  const inputVersion = core.getInput("witness_version");
  const version = inputVersion || await getLatestVersion();
  core.info(`Using witness version: ${version}`);

  // Step 3: Check cache for this version
  let cachedPath = tc.find("witness", version);
  if (cachedPath) {
    const witnessExePath = path.join(cachedPath, "witness");
    core.info(`✅ Found cached witness at: ${witnessExePath}`);
    core.addPath(cachedPath);
    return witnessExePath;
  }

  // Step 4: Download and cache the version
  core.info(`⬇️ Witness version ${version} not found in cache, downloading now...`);
  return await downloadWitnessVersion(version);
}

/**
 * Downloads and sets up the witness binary.
 * DEPRECATED: Use getWitnessPath() instead
 * Maintained for backward compatibility
 */
async function downloadAndSetupWitness() {
  return await getWitnessPath();
}

module.exports = {
  downloadAndSetupWitness,
  getWitnessPath,
  checkWitnessInPath,
  getLatestVersion,
  downloadWitnessVersion
};
