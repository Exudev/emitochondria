#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// ============================================================
// CONSTANTS
// ============================================================

const CONFIG_FILENAME = 'emitochondria.config.json';
const SCHEMA_URL = 'https://unpkg.com/emitochondria/schema.json';

const DEFAULT_CONFIG = {
  $schema: SCHEMA_URL,
  maxListeners: 10,
  logging: {
    timestamps: false,
    timestampFormat: 'iso',
    timezone: 'utc',
    persist: false,
    path: './logs/emitochondria.log',
    format: 'text',
    maxSize: '10MB',
    logEvents: false,
    logErrors: true,
    logWarnings: true,
  },
};

// ============================================================
// COLORS (no dependencies needed)
// ============================================================

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
};

function log(icon: string, color: string, msg: string): void {
  console.log(`${color}${icon}${c.reset} ${msg}`);
}

const info = (msg: string) => log('ℹ', c.blue, msg);
const success = (msg: string) => log('✓', c.green, msg);
const warn = (msg: string) => log('⚠ ', c.yellow, msg);
const error = (msg: string) => log('✗', c.red, msg);

// ============================================================
// HELPERS
// ============================================================

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

function printHelp(): void {
  console.log(`
${c.bold}🧬 Emitochondria CLI${c.reset}
${c.dim}The powerhouse of your events${c.reset}

${c.bold}Usage:${c.reset}
  npx emitochondria <command>

${c.bold}Commands:${c.reset}
  init          Create emitochondria.config.json
  init --force  Overwrite existing config file
  help          Show this help message

${c.bold}Examples:${c.reset}
  ${c.dim}# Create config file${c.reset}
  npx emitochondria init

  ${c.dim}# Overwrite existing config${c.reset}
  npx emitochondria init --force

${c.bold}Documentation:${c.reset}
  https://github.com/Exudev/emitochondria
`);
}

function printVersion(): void {
  try {
    const pkg = require('../../package.json');
    console.log(`v${pkg.version}`);
  } catch {
    console.log('unknown');
  }
}

// ============================================================
// INIT COMMAND
// ============================================================

async function initCommand(force: boolean): Promise<void> {
  const configPath = path.join(process.cwd(), CONFIG_FILENAME);

  console.log(`\n${c.bold}🧬 Emitochondria${c.reset}\n`);

  // Check if config already exists
  if (fs.existsSync(configPath)) {
    if (!force) {
      warn(`${CONFIG_FILENAME} already exists.`);

      const answer = await prompt(`   Overwrite? ${c.dim}(y/N)${c.reset} `);

      if (answer !== 'y' && answer !== 'yes') {
        info('Aborted. No changes made.');
        process.exit(0);
      }
    } else {
      warn('Overwriting existing config file.');
    }
  }

  // Write config file
  try {
    const content = JSON.stringify(DEFAULT_CONFIG, null, 2);
    fs.writeFileSync(configPath, content + '\n', 'utf8');

    success(`Created ${c.bold}${CONFIG_FILENAME}${c.reset}`);
    console.log(`\n${c.dim}   Location: ${configPath}${c.reset}`);

    console.log(`
${c.bold}Next steps:${c.reset}

  1. Edit the config file to match your needs
  2. Import and use emitochondria:

     ${c.cyan}import { createEmitochondria } from 'emitochondria';${c.reset}

     ${c.cyan}type MyEvents = {${c.reset}
       ${c.cyan}'user:login': { userId: string };${c.reset}
     ${c.cyan}};${c.reset}

     ${c.cyan}const events = createEmitochondria<MyEvents>();${c.reset}

${c.dim}📖 Docs: https://github.com/Exudev/emitochondria${c.reset}
`);
  } catch (err) {
    error(`Failed to create config file: ${err}`);
    process.exit(1);
  }
}

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  const flags = args.slice(1);

  const hasForce = flags.includes('--force') || flags.includes('-f');

  switch (command) {
    case 'init':
      await initCommand(hasForce);
      break;

    case 'help':
    case '--help':
    case '-h':
    case undefined:
      printHelp();
      break;

    case 'version':
    case '--version':
    case '-v':
      printVersion();
      break;

    default:
      error(`Unknown command: ${command}`);
      console.log(`\nRun ${c.cyan}npx emitochondria help${c.reset} for usage.\n`);
      process.exit(1);
  }
}

main().catch((err) => {
  error(`Unexpected error: ${err}`);
  process.exit(1);
});
