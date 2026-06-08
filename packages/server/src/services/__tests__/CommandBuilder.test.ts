import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildSpawnArgs } from '../CommandBuilder.js';

const CLI = '/usr/local/bin/cliTool';
const PROJECT = '/home/user/project';

describe('CommandBuilder.buildSpawnArgs', () => {
  test('normal request produces correct args array', () => {
    const { command, args } = buildSpawnArgs(CLI, 'fix the bug', PROJECT);
    assert.strictEqual(command, CLI);
    assert.deepStrictEqual(args, ['--prompt', 'fix the bug', '--project', PROJECT]);
  });

  test('request with spaces stays as a single args element', () => {
    const request = 'add unit tests for the login module';
    const { args } = buildSpawnArgs(CLI, request, PROJECT);
    // --prompt value is exactly one element regardless of internal spaces
    assert.strictEqual(args[0], '--prompt');
    assert.strictEqual(args[1], request);
    assert.strictEqual(args.length, 4);
  });

  test('request with semicolons does not inject additional args', () => {
    const request = 'echo hello; rm -rf /';
    const { args } = buildSpawnArgs(CLI, request, PROJECT);
    assert.strictEqual(args[1], request);
    assert.strictEqual(args.length, 4);
  });

  test('request with backticks does not inject additional args', () => {
    const request = 'describe `the thing`';
    const { args } = buildSpawnArgs(CLI, request, PROJECT);
    assert.strictEqual(args[1], request);
    assert.strictEqual(args.length, 4);
  });

  test('request with $() subshell syntax does not inject additional args', () => {
    const request = 'fix $(cat /etc/passwd)';
    const { args } = buildSpawnArgs(CLI, request, PROJECT);
    assert.strictEqual(args[1], request);
    assert.strictEqual(args.length, 4);
  });

  test('request starting with -- is treated as literal content', () => {
    const request = '--verbose --help';
    const { args } = buildSpawnArgs(CLI, request, PROJECT);
    assert.strictEqual(args[0], '--prompt');
    assert.strictEqual(args[1], request);
    assert.strictEqual(args.length, 4);
  });

  test('project path with spaces is a single args element', () => {
    const pathWithSpaces = '/home/user/my project folder/code';
    const { args } = buildSpawnArgs(CLI, 'do something', pathWithSpaces);
    assert.strictEqual(args[2], '--project');
    assert.strictEqual(args[3], pathWithSpaces);
    assert.strictEqual(args.length, 4);
  });

  test('model option appended as separate args pair', () => {
    const { args } = buildSpawnArgs(CLI, 'fix bug', PROJECT, { model: 'claude-opus-4-7' });
    assert.deepStrictEqual(args, ['--prompt', 'fix bug', '--project', PROJECT, '--model', 'claude-opus-4-7']);
  });

  test('extraArgs appended after standard args', () => {
    const { args } = buildSpawnArgs(CLI, 'fix bug', PROJECT, { extraArgs: ['--verbose'] });
    assert.deepStrictEqual(args, ['--prompt', 'fix bug', '--project', PROJECT, '--verbose']);
  });

  test('command is exactly the cliPath passed in', () => {
    const customPath = '/custom/path/to/tool';
    const { command } = buildSpawnArgs(customPath, 'task', PROJECT);
    assert.strictEqual(command, customPath);
  });

  test('injection via newline does not split into multiple args', () => {
    const request = 'task\nrm -rf /';
    const { args } = buildSpawnArgs(CLI, request, PROJECT);
    assert.strictEqual(args[1], request);
    assert.strictEqual(args.length, 4);
  });
});
