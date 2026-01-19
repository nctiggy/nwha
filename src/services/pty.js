// PTY Manager for terminal sessions
import * as pty from 'node-pty';
import { platform } from 'os';

const shell = platform() === 'win32' ? 'powershell.exe' : 'bash';

/**
 * PTY Manager - handles spawning and managing PTY processes
 */
export class PTYManager {
  constructor() {
    this.sessions = new Map();
  }

  /**
   * Create a new PTY session
   * @param {string} sessionId - Unique session identifier
   * @param {object} options - PTY options (cols, rows, cwd, env)
   * @returns {object} - Session info with PTY instance
   */
  create(sessionId, options = {}) {
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId);
    }

    const {
      cols = 80,
      rows = 24,
      cwd = process.cwd(),
      env = process.env
    } = options;

    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd,
      env
    });

    const session = {
      id: sessionId,
      pty: ptyProcess,
      pid: ptyProcess.pid,
      createdAt: new Date()
    };

    this.sessions.set(sessionId, session);

    // Auto-cleanup on exit
    ptyProcess.on('exit', () => {
      this.sessions.delete(sessionId);
    });

    return session;
  }

  /**
   * Get an existing PTY session
   * @param {string} sessionId - Session identifier
   * @returns {object|undefined} - Session info or undefined
   */
  get(sessionId) {
    return this.sessions.get(sessionId);
  }

  /**
   * Destroy a PTY session
   * @param {string} sessionId - Session identifier
   */
  destroy(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      try {
        session.pty.kill();
      } catch (e) {
        // PTY may already be dead
      }
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Write data to PTY stdin
   * @param {string} sessionId - Session identifier
   * @param {string} data - Data to write
   */
  write(sessionId, data) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.pty.write(data);
    }
  }

  /**
   * Resize PTY terminal
   * @param {string} sessionId - Session identifier
   * @param {number} cols - Number of columns
   * @param {number} rows - Number of rows
   */
  resize(sessionId, cols, rows) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.pty.resize(cols, rows);
    }
  }

  /**
   * List all active sessions
   * @returns {Array} - Array of session info objects
   */
  list() {
    return Array.from(this.sessions.values()).map(s => ({
      id: s.id,
      pid: s.pid,
      createdAt: s.createdAt
    }));
  }

  /**
   * Destroy all sessions
   */
  destroyAll() {
    for (const sessionId of this.sessions.keys()) {
      this.destroy(sessionId);
    }
  }
}

// Singleton instance for global PTY management
export const ptyManager = new PTYManager();
