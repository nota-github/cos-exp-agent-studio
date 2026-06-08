import { OpenClawAdapter, type ExecutionOptions } from './CliAdapter.js';

export type { ExecutionOptions } from './CliAdapter.js';

const adapter = new OpenClawAdapter();

/**
 * Builds injection-safe spawn args for CLI execution.
 *
 * ONLY pass the returned {command, args} to:
 *   child_process.spawn(command, args, { shell: false })
 *
 * Never use exec, execSync, or shell: true. User input is always placed
 * as a discrete args array element — never interpolated into a shell string.
 */
export function buildSpawnArgs(
  cliPath: string,
  request: string,
  projectPath: string,
  options: ExecutionOptions = {}
): { command: string; args: string[] } {
  const args = adapter.buildArgs(request, projectPath, options);
  return { command: cliPath, args };
}
