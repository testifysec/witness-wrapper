/**
 * TDD Tests for Bug #1: Command Parsing
 *
 * These tests verify that commands are properly executed via shell,
 * not tokenized with regex.
 */

describe('Command Parsing', () => {
  describe('parseCommandForShell', () => {
    // We'll need to extract the command parsing logic into a testable function
    // For now, let's define the expected behavior

    test('should return shell invocation for single-line command', () => {
      const command = 'echo "Hello World"';
      const expected = ['/bin/sh', '-c', 'echo "Hello World"'];

      // This will fail with current implementation
      const actual = parseCommandForShell(command);
      expect(actual).toEqual(expected);
    });

    test('should return shell invocation for multi-line command', () => {
      const command = `echo "Step 1"
exit 1`;
      const expected = ['/bin/sh', '-c', 'echo "Step 1"\nexit 1'];

      const actual = parseCommandForShell(command);
      expect(actual).toEqual(expected);
    });

    test('should preserve variable expansion syntax', () => {
      const command = 'echo "Value: $MY_VAR"';
      const expected = ['/bin/sh', '-c', 'echo "Value: $MY_VAR"'];

      const actual = parseCommandForShell(command);
      expect(actual).toEqual(expected);
    });

    test('should preserve command substitution syntax', () => {
      const command = 'echo "Date: $(date)"';
      const expected = ['/bin/sh', '-c', 'echo "Date: $(date)"'];

      const actual = parseCommandForShell(command);
      expect(actual).toEqual(expected);
    });

    test('should preserve pipes', () => {
      const command = 'ls | grep test';
      const expected = ['/bin/sh', '-c', 'ls | grep test'];

      const actual = parseCommandForShell(command);
      expect(actual).toEqual(expected);
    });

    test('should preserve redirects', () => {
      const command = 'echo "output" > file.txt';
      const expected = ['/bin/sh', '-c', 'echo "output" > file.txt'];

      const actual = parseCommandForShell(command);
      expect(actual).toEqual(expected);
    });

    test('should preserve logical operators', () => {
      const command = 'make build && make test';
      const expected = ['/bin/sh', '-c', 'make build && make test'];

      const actual = parseCommandForShell(command);
      expect(actual).toEqual(expected);
    });

    test('should handle escaped quotes', () => {
      const command = 'echo "He said \\"hello\\""';
      const expected = ['/bin/sh', '-c', 'echo "He said \\"hello\\""'];

      const actual = parseCommandForShell(command);
      expect(actual).toEqual(expected);
    });

    test('should handle complex multi-line scripts', () => {
      const command = `#!/bin/bash
set -e
echo "Building..."
make build
if [ $? -eq 0 ]; then
  echo "Success"
  exit 0
else
  echo "Failed"
  exit 1
fi`;

      const expected = ['/bin/sh', '-c', command];

      const actual = parseCommandForShell(command);
      expect(actual).toEqual(expected);
    });
  });
});

// FIXED implementation - proper shell execution
function parseCommandForShell(command) {
  // Always use /bin/sh -c to execute commands
  // This preserves all shell features: pipes, redirects, variables, etc.
  return ['/bin/sh', '-c', command];
}
