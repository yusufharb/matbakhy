#!/usr/bin/env node
/**
 * ==============================================================================
 * NEXUS Marketplace Core — Automated White-Label Fork Initializer
 * ==============================================================================
 * Usage:
 *   node scripts/create-fork.mjs
 *   node scripts/create-fork.mjs --name "BasketPort" --slug "basketport" --preset "b2b_wholesale" --currency "SAR"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const coreRoot = path.resolve(__dirname, '..');

// Helper for CLI arguments
function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, val] = arg.slice(2).split('=');
      args[key] = val || true;
    }
  });
  return args;
}

const args = parseArgs();

function askQuestion(rl, query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function run() {
  console.log('\x1b[36m=================================================================\x1b[0m');
  console.log('\x1b[33m   NEXUS Marketplace Core — White-Label Fork Initializer         \x1b[0m');
  console.log('\x1b[36m=================================================================\x1b[0m\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    let name = args.name;
    if (!name) {
      name = await askQuestion(rl, '1. Enter New Marketplace Name (e.g. BasketPort, SouqGlobal): ');
      if (!name.trim()) name = 'MyMarketplace';
    }

    let slug = args.slug;
    if (!slug) {
      const defaultSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      slug = await askQuestion(rl, `2. Enter Project Slug [${defaultSlug}]: `);
      if (!slug.trim()) slug = defaultSlug;
    }

    let preset = args.preset;
    if (!preset) {
      console.log('\nSelect Business Vertical Preset:');
      console.log('  1) b2b_wholesale   - B2B Bulk Marketplace (MOQ active, Price Tiers, Escrow, RFQ Quotes)');
      console.log('  2) b2c_retail      - B2C Multi-Vendor Retail (MOQ off, Fast Checkout, Reviews, Cards)');
      console.log('  3) food_grocery    - Food & Quick Commerce (Dark stores, Immediate routing, Fresh items)');
      console.log('  4) services_custom - Services & Freelance (Milestone escrow, Custom proposals)');
      const choice = await askQuestion(rl, 'Choose [1-4] (Default: 1): ');
      switch (choice.trim()) {
        case '2': preset = 'b2c_retail'; break;
        case '3': preset = 'food_grocery'; break;
        case '4': preset = 'services_custom'; break;
        default: preset = 'b2b_wholesale'; break;
      }
    }

    let currency = args.currency;
    if (!currency) {
      currency = await askQuestion(rl, '3. Default Base Currency (SAR / USD / EGP / AED / EUR) [SAR]: ');
      if (!currency.trim()) currency = 'SAR';
    }

    let locale = args.locale || 'ar';

    let outputDir = args.output || args.outputDir;
    if (!outputDir) {
      const suggested = path.resolve(coreRoot, '..', name);
      outputDir = await askQuestion(rl, `4. Target Directory for New Project [${suggested}]: `);
      if (!outputDir.trim()) outputDir = suggested;
    }

    rl.close();

    const resolvedOutput = path.resolve(outputDir);

    console.log('\n-----------------------------------------------------------------');
    console.log('\x1b[36mInitializing Fork Configuration:\x1b[0m');
    console.log(`  • Platform Name    : \x1b[32m${name}\x1b[0m`);
    console.log(`  • Platform Slug    : \x1b[32m${slug}\x1b[0m`);
    console.log(`  • Business Preset  : \x1b[33m${preset}\x1b[0m`);
    console.log(`  • Base Currency    : \x1b[32m${currency}\x1b[0m`);
    console.log(`  • Primary Language : \x1b[32m${locale === 'ar' ? 'العربية (Cairo Font)' : 'English'}\x1b[0m`);
    console.log(`  • Target Path      : \x1b[34m${resolvedOutput}\x1b[0m`);
    console.log('-----------------------------------------------------------------\n');

    // Create target dir
    if (!fs.existsSync(resolvedOutput)) {
      fs.mkdirSync(resolvedOutput, { recursive: true });
    }

    console.log('Step 1/5: Copying core engine files (excluding build artifacts)...');

    const exclude = [
      'node_modules',
      '.git',
      'bin',
      'dist',
      'pgdata',
      '.vscode',
      '.idea',
      'scratch'
    ];

    fs.cpSync(coreRoot, resolvedOutput, {
      recursive: true,
      filter: (src) => {
        const basename = path.basename(src);
        if (exclude.includes(basename)) return false;
        if (basename.endsWith('.exe')) return false;
        if (basename.startsWith('test_') && basename.endsWith('.json')) return false;
        if (basename.startsWith('patch_') && basename.endsWith('.json')) return false;
        return true;
      }
    });

    console.log('Step 2/5: Generating tailored environment files (.env)...');

    // Root .env
    const rootEnv = [
      `PLATFORM_NAME="${name}"`,
      `PLATFORM_SLUG="${slug}"`,
      `BUSINESS_PRESET="${preset}"`,
      `DEFAULT_CURRENCY="${currency}"`,
      `DEFAULT_LOCALE="${locale}"`,
      '',
      `POSTGRES_USER=postgres`,
      `POSTGRES_PASSWORD=postgres`,
      `POSTGRES_DB=marketplace_${slug}`,
      `POSTGRES_PORT=5432`,
      '',
      `API_PORT=8080`,
      `DATABASE_URL=postgres://postgres:postgres@localhost:5432/marketplace_${slug}?sslmode=disable`,
      '',
      `FRONTEND_PORT=5173`,
      `VITE_API_URL=http://localhost:8080/api/v1`
    ].join('\n');
    fs.writeFileSync(path.join(resolvedOutput, '.env'), rootEnv, 'utf8');

    // Backend .env
    const backendEnv = [
      `PORT=8080`,
      `ENV=development`,
      `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/marketplace_${slug}?sslmode=disable`,
      `DB_MAX_CONNS=25`,
      `DB_MIN_CONNS=5`,
      `DB_MAX_IDLE_TIME=30m`,
      `REDIS_URL=redis://127.0.0.1:6379/0`,
      `NATS_URL=nats://127.0.0.1:4222`,
      `JWT_SECRET=${slug}-enterprise-marketplace-secret-change-in-prod-2026`,
      `JWT_EXPIRATION_HOURS=24`
    ].join('\n');
    fs.writeFileSync(path.join(resolvedOutput, 'backend', '.env'), backendEnv, 'utf8');

    // Frontend .env
    const frontendEnv = [
      `VITE_API_URL=http://localhost:8080/api/v1`,
      `VITE_DEFAULT_PORTAL=merchant`,
      `VITE_DEFAULT_LOCALE=${locale}`,
      `VITE_APP_TITLE="${name} Marketplace"`
    ].join('\n');
    fs.writeFileSync(path.join(resolvedOutput, 'frontend', '.env'), frontendEnv, 'utf8');

    console.log('Step 3/5: Configuring business preset feature flags in database seeds...');

    const moqVal = preset === 'b2b_wholesale' ? 'true' : 'false';
    const rfqVal = (preset === 'b2b_wholesale' || preset === 'services_custom') ? 'true' : 'false';
    const reviewsVal = (preset === 'b2c_retail' || preset === 'services_custom') ? 'true' : 'true';
    const multiWhVal = (preset === 'food_grocery' || preset === 'b2b_wholesale') ? 'true' : 'false';

    const presetSql = `
-- ==============================================================================
-- FORK SPECIFIC OVERRIDES: ${name} (${preset})
-- ==============================================================================
UPDATE platform.configurations SET value = '${name}' WHERE key = 'marketplace.name';
UPDATE platform.configurations SET value = '${currency}' WHERE key = 'marketplace.base_currency';
UPDATE platform.configurations SET value = '${locale}' WHERE key = 'marketplace.default_language';
UPDATE platform.configurations SET value = '${moqVal}' WHERE key = 'features.moq';
UPDATE platform.configurations SET value = '${rfqVal}' WHERE key = 'features.rfq';
UPDATE platform.configurations SET value = '${reviewsVal}' WHERE key = 'features.reviews';
UPDATE platform.configurations SET value = '${multiWhVal}' WHERE key = 'features.multi_warehouse';
`;

    const seedPath = path.join(resolvedOutput, 'backend', 'db', 'seeds', 'seed_data.sql');
    if (fs.existsSync(seedPath)) {
      fs.appendFileSync(seedPath, presetSql, 'utf8');
    }

    console.log('Step 4/5: Generating tailored README for this fork...');

    const forkReadme = `# ${name} — Marketplace Platform

> **Tailored deployment based on NEXUS Marketplace Core**
> **Business Vertical:** \`${preset}\`
> **Base Currency:** \`${currency}\` | **Primary Language:** \`${locale === 'ar' ? 'العربية (Cairo Font)' : 'English'}\`

---

## 🚀 Quick Start for This Project

### 1. Start Infrastructure (PostgreSQL 16, Redis, NATS)
\`\`\`bash
docker compose -f deploy/docker-compose.yml up -d
\`\`\`

### 2. Start Backend API (Go Modular Monolith)
\`\`\`bash
cd backend
go run ./cmd/api
# API listening at http://localhost:8080
\`\`\`

### 3. Start Frontend Dashboard & Storefront (React 19 + TypeScript + Cairo)
\`\`\`bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
\`\`\`

---

## 🔄 Syncing Upstream Core Updates
To pull new features and security fixes from the central Marketplace Core:
\`\`\`bash
git remote add upstream "${coreRoot}"
git fetch upstream
git merge upstream/main --allow-unrelated-histories
\`\`\`
`;
    fs.writeFileSync(path.join(resolvedOutput, 'README.md'), forkReadme, 'utf8');

    console.log('Step 5/5: Initializing Git repository and linking upstream...');

    try {
      const gitDir = path.join(resolvedOutput, '.git');
      if (!fs.existsSync(gitDir)) {
        execSync('git init -b main', { cwd: resolvedOutput, stdio: 'ignore' });
        execSync('git add .', { cwd: resolvedOutput, stdio: 'ignore' });
        execSync(`git commit -m "feat: initial commit for ${name} (${preset}) from Marketplace Core"`, { cwd: resolvedOutput, stdio: 'ignore' });
        execSync(`git remote add upstream "${coreRoot}"`, { cwd: resolvedOutput, stdio: 'ignore' });
        console.log('  ✓ Git repository initialized on branch "main"');
        console.log('  ✓ "upstream" remote linked to Marketplace Core');
      }
    } catch (e) {
      console.log('  (Git initialization skipped or completed)');
    }

    console.log('\n\x1b[32m=================================================================\x1b[0m');
    console.log(`\x1b[32m   SUCCESS: ${name} is ready at: ${resolvedOutput}\x1b[0m`);
    console.log('\x1b[32m=================================================================\x1b[0m\n');
    console.log('\x1b[33mNext steps to launch on GitHub:\x1b[0m');
    console.log(`  1. cd "${resolvedOutput}"`);
    console.log('  2. Create a new GitHub repo: https://github.com/new');
    console.log(`  3. git remote add origin https://github.com/<your-org>/${slug}.git`);
    console.log('  4. git push -u origin main\n');

  } catch (err) {
    console.error('\x1b[31mError during fork creation:\x1b[0m', err);
    rl.close();
    process.exit(1);
  }
}

run();
