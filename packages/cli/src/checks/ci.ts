import type { Check, ScanContext } from '../types.js';
import { safeJsonParse } from '../util.js';

// Every provider is matched depth-independently: in a workspace layout the
// agent harness lives in a control repo at the root and the code repos are
// subfolders, each carrying its own pipeline file. Matching only at depth 0
// scored those repos 0/14 on CI while the harness itself was complete.
const WORKFLOW_RE = /(^|\/)\.github\/workflows\/[^/]+\.(yml|yaml)$/;
const OTHER_CI_RES = [
  /(^|\/)\.gitlab-ci\.yml$/,
  /(^|\/)azure-pipelines\.yml$/,
  /(^|\/)\.circleci\/config\.yml$/,
  /(^|\/)Jenkinsfile$/,
  /(^|\/)bitbucket-pipelines\.yml$/,
  /(^|\/)cloudbuild\/.+\.(yml|yaml)$/,
];

function ciFiles(ctx: ScanContext): string[] {
  return [...new Set([WORKFLOW_RE, ...OTHER_CI_RES].flatMap((re) => ctx.matching(re)))];
}

function ciContent(ctx: ScanContext): string {
  return ciFiles(ctx)
    .map((f) => ctx.read(f) ?? '')
    .join('\n');
}

const TEST_CMD_RE =
  /((npm|pnpm|yarn|bun)\s+(run\s+)?test)|vitest|\bjest\b|pytest|go\s+test|cargo\s+test|mvn\s+(test|verify)|gradle\w*\s+(test|check)|rake\s+test|phpunit|dotnet\s+test|\btest\b/i;
const LINT_CMD_RE =
  /\blint\b|eslint|biome|ruff|flake8|pylint|clippy|golangci|tsc\b|typecheck|type-check|mypy|pyright|rubocop|phpstan|checkstyle/i;

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
        : { passed: false, evidence: 'No CI configuration detected (GitHub Actions, GitLab CI, CircleCI…).' };
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
      const match = ciContent(ctx).match(TEST_CMD_RE);
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
      const match = ciContent(ctx).match(LINT_CMD_RE);
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
      if (ctx.has('.pre-commit-config.yaml')) evidence.push('.pre-commit-config.yaml');
      if (ctx.matching(/(^|\/)\.husky\/[^/]+$/).length > 0) evidence.push('.husky/');
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
