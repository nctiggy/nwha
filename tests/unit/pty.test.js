// NWHA-021: PTY process spawn
// NWHA-022: Terminal socket events
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';

// Mock node-pty since it requires native bindings
vi.mock('node-pty', () => ({
  spawn: vi.fn(() => ({
    pid: 12345,
    on: vi.fn(),
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn()
  }))
}));

describe('PTY Process Spawn (NWHA-021)', () => {
  let PTYManager;

  beforeAll(async () => {
    const mod = await import('../../src/services/pty.js');
    PTYManager = mod.PTYManager;
  });

  it('should spawn bash shell with node-pty', async () => {
    const manager = new PTYManager();
    const pty = await import('node-pty');

    const session = manager.create('test-session-1');

    expect(pty.spawn).toHaveBeenCalled();
    const spawnCall = pty.spawn.mock.calls[0];
    // Should spawn bash or sh
    expect(spawnCall[0]).toMatch(/bash|sh/);

    manager.destroy('test-session-1');
  });

  it('should associate PTY with session ID', async () => {
    const manager = new PTYManager();

    const session1 = manager.create('session-1');
    const session2 = manager.create('session-2');

    expect(manager.get('session-1')).toBeDefined();
    expect(manager.get('session-2')).toBeDefined();
    expect(manager.get('session-1')).not.toBe(manager.get('session-2'));

    manager.destroy('session-1');
    manager.destroy('session-2');
  });

  it('should clean up PTY on destroy', async () => {
    const manager = new PTYManager();

    const session = manager.create('test-session');
    expect(manager.get('test-session')).toBeDefined();

    manager.destroy('test-session');
    expect(manager.get('test-session')).toBeUndefined();
  });
});

describe('Terminal Socket Events (NWHA-022)', () => {
  let PTYManager;
  let mockPty;

  beforeAll(async () => {
    const mod = await import('../../src/services/pty.js');
    PTYManager = mod.PTYManager;
  });

  it('should support write method for terminal input', async () => {
    const manager = new PTYManager();
    const session = manager.create('input-test');
    const ptyInstance = manager.get('input-test');

    // PTY should have write method
    expect(typeof ptyInstance.pty.write).toBe('function');

    manager.destroy('input-test');
  });

  it('should support on method for terminal output', async () => {
    const manager = new PTYManager();
    const session = manager.create('output-test');
    const ptyInstance = manager.get('output-test');

    // PTY should have on method for listening to data
    expect(typeof ptyInstance.pty.on).toBe('function');

    manager.destroy('output-test');
  });

  it('should support resize method', async () => {
    const manager = new PTYManager();
    const session = manager.create('resize-test');
    const ptyInstance = manager.get('resize-test');

    // PTY should have resize method
    expect(typeof ptyInstance.pty.resize).toBe('function');

    manager.destroy('resize-test');
  });
});
