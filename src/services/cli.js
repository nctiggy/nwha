// CLI service for running Claude and Codex commands
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const CLI_PRIMARY = process.env.CLI_PRIMARY || 'claude';
const CLI_FALLBACK_ENABLED = process.env.CLI_FALLBACK_ENABLED !== 'false';

/**
 * Execute Claude CLI with the given prompt
 * @param {string} prompt - The prompt to send to Claude
 * @returns {Promise<string>} - The AI response
 */
export async function runClaude(prompt) {
  // Escape the prompt for shell
  const escapedPrompt = prompt.replace(/'/g, "'\"'\"'");
  const command = `claude --dangerously-skip-permissions -p '${escapedPrompt}'`;

  const { stdout } = await execAsync(command, {
    timeout: 120000, // 2 minute timeout
    maxBuffer: 10 * 1024 * 1024 // 10MB buffer
  });

  return stdout.trim();
}

/**
 * Execute Codex CLI with the given prompt (fallback)
 * @param {string} prompt - The prompt to send to Codex
 * @returns {Promise<string>} - The AI response
 */
export async function runCodex(prompt) {
  // Escape the prompt for shell
  const escapedPrompt = prompt.replace(/'/g, "'\"'\"'");
  const command = `codex -p '${escapedPrompt}'`;

  const { stdout } = await execAsync(command, {
    timeout: 120000, // 2 minute timeout
    maxBuffer: 10 * 1024 * 1024 // 10MB buffer
  });

  return stdout.trim();
}

/**
 * Get AI response with automatic fallback
 * @param {string} prompt - The prompt to send
 * @returns {Promise<{response: string, engine: string}>} - The AI response and which engine was used
 */
export async function getAIResponse(prompt) {
  try {
    const response = await runClaude(prompt);
    return { response, engine: 'claude' };
  } catch (claudeError) {
    if (!CLI_FALLBACK_ENABLED) {
      throw new Error(`Claude CLI failed: ${claudeError.message}`);
    }

    // Try Codex as fallback
    try {
      const response = await runCodex(prompt);
      return { response, engine: 'codex' };
    } catch (codexError) {
      throw new Error(`Both Claude and Codex failed. Claude: ${claudeError.message}, Codex: ${codexError.message}`);
    }
  }
}
