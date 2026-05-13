#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const targetDir = process.cwd();
const args = process.argv.slice(2);

function log(msg) {
  console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
}

function err(msg) {
  console.error(`  \x1b[31m✗\x1b[0m ${msg}`);
}

function usage() {
  console.log('Usage: devground-adr new "<title>"');
  console.log('');
  console.log('Creates a new ADR file in docs/adr/ with the next available number.');
  console.log('');
  console.log('Example:');
  console.log('  devground-adr new "Use Postgres for transactional data"');
  console.log('  → docs/adr/0001-use-postgres-for-transactional-data.md');
}

function slugify(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function nextNumber(adrDir) {
  if (!fs.existsSync(adrDir)) return 1;
  const nums = fs
    .readdirSync(adrDir)
    .map((f) => /^(\d{4})-/.exec(f))
    .filter(Boolean)
    .map((m) => parseInt(m[1], 10));
  return nums.length === 0 ? 1 : Math.max(...nums) + 1;
}

function pad(n) {
  return String(n).padStart(4, '0');
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

if (args[0] !== 'new' || !args[1]) {
  usage();
  process.exit(args[0] === 'new' ? 1 : 0);
}

const title = args[1];
const adrDir = path.join(targetDir, 'docs', 'adr');
fs.mkdirSync(adrDir, { recursive: true });

const num = nextNumber(adrDir);
const slug = slugify(title);
const filename = `${pad(num)}-${slug}.md`;
const filepath = path.join(adrDir, filename);

if (fs.existsSync(filepath)) {
  err(`File already exists: docs/adr/${filename}`);
  process.exit(1);
}

const templatePath = path.join(__dirname, 'templates', 'adr.md');
let template;
if (fs.existsSync(templatePath)) {
  template = fs.readFileSync(templatePath, 'utf8');
} else {
  template = `# ADR-{{NUMBER}}: {{TITLE}}

- **Estado**: Propuesto
- **Fecha**: {{DATE}}
- **Decisor**: <tu nombre>
- **Aplica a**: <ámbito>

## Contexto

<Por qué surge esta decisión. Restricciones, requisitos, fuerzas en juego.>

## Decisión

<La regla concreta que se adopta. Imperativa.>

## Consecuencias

**Positivas**
- <qué ganamos>

**Negativas / Trade-offs**
- <qué sacrificamos>

## Alternativas consideradas

1. **<Alternativa A>**: <por qué se descarta>
2. **<Alternativa B>**: <por qué se descarta>

## Referencias

- <enlaces, RFCs, ADRs relacionados>
`;
}

const content = template
  .replace(/{{NUMBER}}/g, pad(num))
  .replace(/{{TITLE}}/g, title)
  .replace(/{{DATE}}/g, today());

fs.writeFileSync(filepath, content, 'utf8');
log(`Created docs/adr/${filename}`);
