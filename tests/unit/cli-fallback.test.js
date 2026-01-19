// NWHA-018: Codex CLI fallback
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to test the actual implementation without mocking the service itself
// Instead, we mock child_process to control CLI behavior
vi.mock('child_process', async () => {
  const actual = await vi.importActual('child_process');
  return {
    ...actual,
    exec: vi.fn()
  };
});

describe('Codex CLI Fallback (NWHA-018)', () => {
  let exec;

  beforeEach(async () => {
    vi.resetModules();
    const cp = await import('child_process');
    exec = cp.exec;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should use Claude as primary engine', async () => {
    // Mock successful Claude response
    exec.mockImplementation((cmd, opts, callback) => {
      if (typeof opts === 'function') {
        callback = opts;
      }
      if (cmd.includes('claude')) {
        callback(null, { stdout: 'Claude response' });
      } else {
        callback(new Error('Unexpected command'));
      }
    });

    // Clear module cache and re-import
    vi.resetModules();
    const { getAIResponse } = await import('../../src/services/cli.js');

    const result = await getAIResponse('Test prompt');

    expect(result.engine).toBe('claude');
    expect(result.response).toBe('Claude response');
  });

  it('should fall back to Codex when Claude fails', async () => {
    // Mock Claude failure, Codex success
    exec.mockImplementation((cmd, opts, callback) => {
      if (typeof opts === 'function') {
        callback = opts;
      }
      if (cmd.includes('claude')) {
        callback(new Error('Claude rate limited'), null);
      } else if (cmd.includes('codex')) {
        callback(null, { stdout: 'Codex response' });
      } else {
        callback(new Error('Unknown command'));
      }
    });

    // Re-import to get fresh module
    vi.resetModules();
    process.env.CLI_FALLBACK_ENABLED = 'true';
    const { getAIResponse } = await import('../../src/services/cli.js');

    const result = await getAIResponse('Test prompt');

    expect(result.engine).toBe('codex');
    expect(result.response).toBe('Codex response');
  });

  it('should throw error when fallback is disabled and Claude fails', async () => {
    // Mock Claude failure
    exec.mockImplementation((cmd, opts, callback) => {
      if (typeof opts === 'function') {
        callback = opts;
      }
      if (cmd.includes('claude')) {
        callback(new Error('Claude failed'), null);
      }
    });

    // Re-import with fallback disabled
    vi.resetModules();
    process.env.CLI_FALLBACK_ENABLED = 'false';
    const { getAIResponse } = await import('../../src/services/cli.js');

    await expect(getAIResponse('Test prompt')).rejects.toThrow('Claude CLI failed');
  });

  it('should throw error when both Claude and Codex fail', async () => {
    // Mock both failures
    exec.mockImplementation((cmd, opts, callback) => {
      if (typeof opts === 'function') {
        callback = opts;
      }
      callback(new Error(`${cmd.includes('claude') ? 'Claude' : 'Codex'} failed`), null);
    });

    // Re-import with fallback enabled
    vi.resetModules();
    process.env.CLI_FALLBACK_ENABLED = 'true';
    const { getAIResponse } = await import('../../src/services/cli.js');

    await expect(getAIResponse('Test prompt')).rejects.toThrow('Both Claude and Codex failed');
  });

  it('should use correct Claude command format', async () => {
    let capturedCommand = '';
    exec.mockImplementation((cmd, opts, callback) => {
      capturedCommand = cmd;
      if (typeof opts === 'function') {
        callback = opts;
      }
      callback(null, { stdout: 'response' });
    });

    vi.resetModules();
    const { runClaude } = await import('../../src/services/cli.js');

    await runClaude('Hello world');

    expect(capturedCommand).toContain('claude');
    expect(capturedCommand).toContain('--dangerously-skip-permissions');
    expect(capturedCommand).toContain('-p');
    expect(capturedCommand).toContain('Hello world');
  });

  it('should use correct Codex command format', async () => {
    let capturedCommand = '';
    exec.mockImplementation((cmd, opts, callback) => {
      capturedCommand = cmd;
      if (typeof opts === 'function') {
        callback = opts;
      }
      callback(null, { stdout: 'response' });
    });

    vi.resetModules();
    const { runCodex } = await import('../../src/services/cli.js');

    await runCodex('Hello world');

    expect(capturedCommand).toContain('codex');
    expect(capturedCommand).toContain('-p');
    expect(capturedCommand).toContain('Hello world');
  });
});
