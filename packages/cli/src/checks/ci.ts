import type { Check, ScanContext } from '../types.js';
import { safeJsonParse } from '../util.js';
import { expandCiWithComposerScripts } from './composer.js';

// Every provider is matched depth-independently: in a workspace layout the
// agent harness lives in a control repo at the root and the code repos are
// subfolders, each carrying its own pipeline file. Matching only at depth 0
// scored those repos 0/14 on CI while the harness itself was complete.
const WORKFLOW_RE = /(^|\/)\.(github|forgejo)\/workflows\/[^/]+\.(yml|yaml)$/;
const BUILDKITE_RES = [/(^|\/)\.?buildkite\/pipeline\.(yml|yaml)$/, /(^|\/)buildkite\.(yml|yaml)$/];
const OTHER_CI_RES = [
  /(^|\/)\.gitlab-ci\.yml$/,
  /(^|\/)azure-pipelines\.yml$/,
  /(^|\/)\.circleci\/config\.yml$/,
  /(^|\/)Jenkinsfile$/,
  /(^|\/)bitbucket-pipelines\.yml$/,
  /(^|\/)cloudbuild\/.+\.(yml|yaml)$/,
  ...BUILDKITE_RES,
];

function ciFiles(ctx: ScanContext): string[] {
  return [...new Set([WORKFLOW_RE, ...OTHER_CI_RES].flatMap((re) => ctx.matching(re)))];
}

const CI_COMMAND_KEYS = {
  workflow: ['run'],
  gitlab: ['script', 'before_script', 'after_script'],
  azure: ['script', 'bash', 'pwsh', 'powershell', 'command', 'customCommand'],
  bitbucket: ['script', 'after-script'],
  cloudbuild: ['args', 'entrypoint', 'script'],
  buildkite: ['command', 'commands'],
} as const;

function extractYamlCommands(content: string, keys: readonly string[], emptyValueIsBlock = true): string {
  const commandKey = new RegExp(`^\\s*(?:-\\s*)?(?:${keys.join('|')})\\s*:\\s*(.*)$`, 'i');
  const commands: string[] = [];
  let blockIndent: number | null = null;

  for (const line of content.split(/\r?\n/)) {
    const indent = line.match(/^\s*/)?.[0].length ?? 0;
    if (blockIndent !== null) {
      if (line.trim() === '') {
        commands.push('');
        continue;
      }
      if (line.trim() !== '' && indent > blockIndent) {
        commands.push(line.slice(blockIndent + 1));
        continue;
      }
      blockIndent = null;
    }

    const match = commandKey.exec(line);
    if (!match) continue;

    const value = match[1]!.trim();
    if (value === '' || /^[|>][+-]?$/.test(value)) {
      if (value !== '' || emptyValueIsBlock) blockIndent = indent;
    } else {
      commands.push(value);
    }
  }

  return commands.join('\n');
}

function extractJenkinsCommands(content: string): string {
  const commands: string[] = [];
  const shellStep =
    /\b(?:sh|bat|powershell|pwsh)\s*(?:\(\s*(?:[^)]*?\bscript\s*:\s*)?)?(?:'''([\s\S]*?)'''|"""([\s\S]*?)"""|'([^']*)'|"([^"]*)")/g;
  for (const match of content.matchAll(shellStep)) {
    commands.push(match[1] ?? match[2] ?? match[3] ?? match[4] ?? '');
  }
  return commands.join('\n');
}

function extractCircleCiCommands(content: string): string {
  return [extractYamlCommands(content, ['command']), extractYamlCommands(content, ['run'], false)].join('\n');
}

function ciCommandContent(ctx: ScanContext): string {
  return ciFiles(ctx)
    .map((file) => {
      const content = ctx.read(file) ?? '';
      if (/(^|\/)Jenkinsfile$/.test(file)) return extractJenkinsCommands(content);

      const keys = BUILDKITE_RES.some((re) => re.test(file))
        ? CI_COMMAND_KEYS.buildkite
        : file.startsWith('cloudbuild/')
          ? CI_COMMAND_KEYS.cloudbuild
          : file.endsWith('.gitlab-ci.yml')
            ? CI_COMMAND_KEYS.gitlab
            : file.endsWith('azure-pipelines.yml')
              ? CI_COMMAND_KEYS.azure
              : file.endsWith('.circleci/config.yml')
                ? null
                : file.endsWith('bitbucket-pipelines.yml')
                  ? CI_COMMAND_KEYS.bitbucket
                  : CI_COMMAND_KEYS.workflow;

      return keys === null ? extractCircleCiCommands(content) : extractYamlCommands(content, keys);
    })
    .join('\n');
}

function ciInspectableContent(ctx: ScanContext): string {
  return expandCiWithComposerScripts(ciCommandContent(ctx), ctx);
}

const TEST_CMD_RE =
  /((npm|pnpm|yarn|bun)\s+(run\s+)?test)|vitest|\bjest\b|pytest|go\s+test|cargo\s+test|mvn\s+(test|verify)|gradle\w*\s+(test|check)|rake\s+test|phpunit|\bpest\b|paratest|codeception|behat|dotnet\s+test|\btest\b/i;
const LINT_CMD_RE =
  /\blint\b|eslint|biome|ruff|flake8|pylint|clippy|golangci|tsc\b|typecheck|type-check|mypy|pyright|(?:uv\s+run\s+|uvx\s+)?\bty(?:@\S+)?\s+check\b|rubocop|phpstan|psalm|\bphpcs\b|\bpint\b|php-cs-fixer|rector|\becs\b|checkstyle/i;

export const ciChecks: Check[] = [
  {
    id: 'CI-01',
    dimension: 'ci',
    title: 'CI pipeline configured',
    points: 4,
    remediation:
      'Add a CI workflow (.github/workflows/ci.yml) — CI is the harness sensor that catches what slipped past local checks, on every push.',
    run(ctx) {
      const files = ciFiles(ctx);
      return files.length > 0
        ? { passed: true, evidence: `Found: ${files.slice(0, 3).join(', ')}.` }
        : {
            passed: false,
            evidence: 'No CI configuration detected (GitHub Actions, GitLab CI, CircleCI, Buildkite, etc.).',
          };
    },
  },
  {
    id: 'CI-02',
    dimension: 'ci',
    title: 'CI runs the test suite',
    points: 4,
    remediation:
      'Make CI execute the test suite (npm test, pytest, go test…) so no agent-authored change can merge without the sensors firing.',
    run(ctx) {
      if (ciFiles(ctx).length === 0) {
        return { passed: false, evidence: 'No CI configuration to inspect.' };
      }
      const match = ciInspectableContent(ctx).match(TEST_CMD_RE);
      return match
        ? { passed: true, evidence: `CI invokes tests ("${match[0]}").` }
        : { passed: false, evidence: 'CI configuration does not appear to run tests.' };
    },
  },
  {
    id: 'CI-03',
    dimension: 'ci',
    title: 'CI runs lint / type checks',
    points: 3,
    remediation:
      'Add lint and typecheck steps to CI — cheap computational sensors belong on every push ("keep quality left").',
    run(ctx) {
      if (ciFiles(ctx).length === 0) {
        return { passed: false, evidence: 'No CI configuration to inspect.' };
      }
      const match = ciInspectableContent(ctx).match(LINT_CMD_RE);
      return match
        ? { passed: true, evidence: `CI invokes static checks ("${match[0]}").` }
        : { passed: false, evidence: 'CI configuration does not appear to run lint or type checks.' };
    },
  },
  {
    id: 'CI-04',
    dimension: 'ci',
    title: 'Pre-commit checks installed',
    points: 3,
    remediation:
      'Add pre-commit tooling (husky + lint-staged, pre-commit, lefthook) so fast checks run before a commit exists — the earliest possible feedback loop.',
    run(ctx) {
      const evidence: string[] = [];
      const preCommitConfigs = ctx.matching(/(^|\/)\.pre-commit-config\.yaml$/);
      if (preCommitConfigs.length > 0) {
        evidence.push(...preCommitConfigs.slice(0, 3).map((file) => `pre-commit config (${file})`));
      }
      if (ctx.matching(/(^|\/)\.husky\/[^/]+$/).length > 0) evidence.push('.husky/');
      if (ctx.has('.githooks/pre-commit')) evidence.push('.githooks/pre-commit');
      if (ctx.has('lefthook.yml') || ctx.has('.lefthook.yml')) evidence.push('lefthook.yml');
      const pkgContent = ctx.read('package.json');
      const pkg = pkgContent ? (safeJsonParse(pkgContent) as Record<string, any> | null) : null;
      for (const key of ['husky', 'simple-git-hooks', 'lint-staged']) {
        if (pkg?.[key] !== undefined || pkg?.devDependencies?.[key] !== undefined) {
          evidence.push(`${key} in package.json`);
        }
      }
      return evidence.length > 0
        ? { passed: true, evidence: `Found: ${[...new Set(evidence)].join(', ')}.` }
        : { passed: false, evidence: 'No pre-commit hook tooling detected.' };
    },
  },
];
