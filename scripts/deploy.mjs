#!/usr/bin/env node
// Stages a copy of the repo excluding the local-only admin/ tool, then
// deploys that staged copy via wrangler. Deploying "." directly would
// publish admin/ as public (but non-functional, since its backend is a
// local Node process) static files - .assetsignore and _redirects were
// both tried and don't reliably exclude/block it on this project's Pages
// deploy path, so the only sure fix is to never upload the files at all.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = process.cwd();
const staging = mkdtempSync(join(tmpdir(), 'tusensii-deploy-'));

try {
  execFileSync('rsync', [
    '-a',
    '--exclude=.git',
    '--exclude=admin',
    '--exclude=.playwright-mcp',
    '--exclude=docs',
    ROOT + '/',
    staging + '/',
  ]);
  execFileSync('npx', ['wrangler', 'pages', 'deploy', staging], { stdio: 'inherit' });
} finally {
  rmSync(staging, { recursive: true, force: true });
}
