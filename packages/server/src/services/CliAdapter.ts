export interface ExecutionOptions {
  model?: string;
  extraArgs?: string[];
}

export interface ApprovalRequest {
  type: 'approval_request';
  action_type: 'file_modify' | 'package_install' | 'command_exec';
  target: string;
  risk_level: 'low' | 'medium' | 'high';
  description: string;
}

export interface ExecutionSummary {
  summary: string;
  fileChanges?: string[];
  commandsRun?: string[];
}

export interface CliAdapter {
  buildArgs(request: string, projectPath: string, options: ExecutionOptions): string[];
  parseApprovalRequest(line: string): ApprovalRequest | null;
  parseResult(lines: string[]): ExecutionSummary;
}

export class OpenClawAdapter implements CliAdapter {
  buildArgs(request: string, projectPath: string, options: ExecutionOptions): string[] {
    const args: string[] = ['--prompt', request, '--project', projectPath];

    if (options.model) {
      args.push('--model', options.model);
    }

    if (options.extraArgs && options.extraArgs.length > 0) {
      args.push(...options.extraArgs);
    }

    return args;
  }

  parseApprovalRequest(line: string): ApprovalRequest | null {
    try {
      const parsed: unknown = JSON.parse(line);
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        (parsed as Record<string, unknown>)['type'] === 'approval_request' &&
        typeof (parsed as Record<string, unknown>)['action_type'] === 'string' &&
        typeof (parsed as Record<string, unknown>)['target'] === 'string' &&
        typeof (parsed as Record<string, unknown>)['risk_level'] === 'string' &&
        typeof (parsed as Record<string, unknown>)['description'] === 'string'
      ) {
        return parsed as ApprovalRequest;
      }
    } catch {
      // Not valid JSON — not an approval request
    }
    return null;
  }

  parseResult(lines: string[]): ExecutionSummary {
    // Basic implementation — refined when OpenClaw output spec confirmed (OQ1)
    const tail = lines.filter(l => l.trim()).slice(-5).join('\n');
    return {
      summary: tail || '작업이 완료되었습니다.',
    };
  }
}
