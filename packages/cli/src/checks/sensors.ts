import type { Check, ScanContext } from '../types.js';
import { safeJsonParse } from '../util.js';

type Ecosystem = 'node' | 'python' | 'go' | 'rust' | 'java' | 'ruby' | 'php' | 'dotnet';

export function detectEcosystems(ctx: ScanContext): Ecosystem[] {
  const found: Ecosystem[] = [];
  if (ctx.has('package.json')) found.push('node');
  if (
    ctx.has('pyproject.toml') ||
    ctx.has('setup.py') ||
    ctx.has('requirements.txt') ||
    ctx.has('setup.cfg')
  ) {
    found.push('python');
  }
  if (ctx.has('go.mod')) found.push('go');
  if (ctx.has('Cargo.toml')) found.push('rust');
  if (ctx.has('pom.xml') || ctx.has('build.gradle') || ctx.has('build.gradle.kts')) found.push('java');
  if (ctx.has('Gemfile')) found.push('ruby');
  if (ctx.has('composer.json')) found.push('php');
  if (ctx.matching(/\.(csproj|sln)$/).length > 0) found.push('dotnet');
  return found;
}

function rootPackageJson(ctx: ScanContext): Record<string, any> | null {
  const content = ctx.read('package.json');
  const parsed = content ? safeJsonParse(content) : null;
  return parsed && typeof parsed === 'object' ? (parsed as Record<string, any>) : null;
}

function hasDep(pkg: Record<string, any> | null, name: string): boolean {
  if (!pkg) return false;
  return Boolean(pkg.dependencies?.[name] ?? pkg.devDependencies?.[name]);
}

function pyprojectHas(ctx: ScanContext, needle: string): boolean {
  const content = ctx.read('pyproject.toml');
  return content?.includes(needle) ?? false;
}

const TEST_FILE_RE =
  /(\.(test|spec)\.[jt]sx?$)|(_test\.go$)|((^|\/)test_[^/]+\.py$)|([^/]+_test\.py$)|(Test\.java$)|(_spec\.rb$)|((^|\/)tests?\/[^/]+)/;

export const sensorChecks: Check[] = [
  {
    id: 'SNS-01',
    dimension: 'sensors',
    title: 'Test runner configured',
    points: 6,
    remediation:
      'Wire up a test runner (vitest/jest, pytest, go test, cargo test…) with a standard entry point — tests are the strongest feedback sensor an agent can run on its own work.',
    run(ctx) {
      const evidence: string[] = [];
      const pkg = rootPackageJson(ctx);
      const testScript: string | undefined = pkg?.scripts?.test;
      if (testScript && !testScript.includes('no test specified')) {
        evidence.push(`package.json test script: "${testScript}"`);
      }
      for (const runner of ['vitest', 'jest', 'mocha', 'ava', '@playwright/test']) {
        if (hasDep(pkg, runner)) evidence.push(`${runner} in package.json`);
      }
      const nodeConfigs = ctx.matching(/(^|\/)(vitest|jest|playwright)\.config\.[cm]?[jt]s$/);
      if (nodeConfigs.length > 0) evidence.push(nodeConfigs[0]!);
      if (ctx.has('pytest.ini') || ctx.has('tox.ini') || pyprojectHas(ctx, '[tool.pytest')) {
        evidence.push('pytest configuration');
      }
      if (ctx.matching(/_test\.go$/).length > 0) evidence.push('Go *_test.go files (go test built-in)');
      if (ctx.has('Cargo.toml') && ctx.matching(/(^|\/)tests\/[^/]+\.rs$/).length > 0) {
        evidence.push('Rust tests/ directory (cargo test built-in)');
      }
      if (ctx.has('pom.xml')) evidence.push('Maven test lifecycle');
      return evidence.length > 0
        ? { passed: true, evidence: `${evidence.slice(0, 3).join('; ')}.` }
        : { passed: false, evidence: 'No test runner configuration or test script detected.' };
    },
  },
  {
    id: 'SNS-02',
    dimension: 'sensors',
    title: 'Linter configured',
    points: 5,
    remediation:
      'Add a linter config (eslint/biome, ruff, golangci-lint, clippy.toml, rubocop…) — linters give the agent instant, deterministic feedback on every edit.',
    run(ctx) {
      const configs = [
        ...ctx.matching(/(^|\/)\.eslintrc(\.(json|js|cjs|yml|yaml))?$/),
        ...ctx.matching(/(^|\/)eslint\.config\.[cm]?[jt]s$/),
        ...ctx.matching(/(^|\/)biome\.jsonc?$/),
        ...ctx.matching(/(^|\/)(\.)?ruff\.toml$/),
        ...ctx.matching(/(^|\/)\.flake8$/),
        ...ctx.matching(/(^|\/)\.pylintrc$/),
        ...ctx.matching(/(^|\/)\.golangci\.(yml|yaml|toml)$/),
        ...ctx.matching(/(^|\/)clippy\.toml$/),
        ...ctx.matching(/(^|\/)\.rubocop\.yml$/),
        ...ctx.matching(/(^|\/)checkstyle\.xml$/),
        ...ctx.matching(/(^|\/)phpcs\.xml(\.dist)?$/),
      ];
      if (pyprojectHas(ctx, '[tool.ruff')) configs.push('pyproject.toml [tool.ruff]');
      const pkg = rootPackageJson(ctx);
      if (hasDep(pkg, 'eslint') || hasDep(pkg, '@biomejs/biome') || hasDep(pkg, 'oxlint')) {
        configs.push('linter in package.json devDependencies');
      }
      return configs.length > 0
        ? { passed: true, evidence: `Found: ${[...new Set(configs)].slice(0, 3).join(', ')}.` }
        : { passed: false, evidence: 'No linter configuration detected.' };
    },
  },
  {
    id: 'SNS-03',
    dimension: 'sensors',
    title: 'Type checking in place',
    points: 4,
    remediation:
      'Enable static type checking (tsconfig.json with strict: true, mypy/pyright for Python) — typed code is dramatically more harnessable: the compiler catches agent mistakes for free.',
    run(ctx) {
      const ecosystems = detectEcosystems(ctx);
      const staticLangs = ecosystems.filter((e) => ['go', 'rust', 'java', 'dotnet'].includes(e));
      const evidence: string[] = [];
      const tsconfigs = ctx.matching(/(^|\/)tsconfig(\..+)?\.json$/);
      if (tsconfigs.length > 0) {
        const strict = tsconfigs.some((t) => /"strict"\s*:\s*true/.test(ctx.read(t) ?? ''));
        evidence.push(`${tsconfigs[0]}${strict ? ' (strict: true)' : ' (strict mode not detected)'}`);
      }
      if (ctx.has('mypy.ini') || pyprojectHas(ctx, '[tool.mypy')) evidence.push('mypy configuration');
      if (ctx.has('pyrightconfig.json') || pyprojectHas(ctx, '[tool.pyright'))
        evidence.push('pyright configuration');
      if (staticLangs.length > 0) {
        evidence.push(`statically typed language(s): ${staticLangs.join(', ')} (compiler-enforced)`);
      }
      if (evidence.length > 0) {
        return { passed: true, evidence: `${evidence.join('; ')}.` };
      }
      return {
        passed: false,
        evidence:
          ecosystems.length === 0
            ? 'No language ecosystem detected, and no type-checker configuration found.'
            : `No type-checker configuration for detected ecosystem(s): ${ecosystems.join(', ')}.`,
      };
    },
  },
  {
    id: 'SNS-04',
    dimension: 'sensors',
    title: 'Formatter configured',
    points: 3,
    remediation:
      'Add an auto-formatter (prettier/biome, black or ruff format, gofmt/rustfmt are built-in) — formatting noise in diffs hides real agent mistakes from review.',
    run(ctx) {
      const ecosystems = detectEcosystems(ctx);
      const evidence: string[] = [];
      const prettier = ctx.matching(/(^|\/)\.prettierrc(\.(json|yml|yaml|js|cjs|toml))?$/);
      if (prettier.length > 0 || ctx.matching(/(^|\/)prettier\.config\.[cm]?js$/).length > 0) {
        evidence.push('prettier configuration');
      }
      const pkg = rootPackageJson(ctx);
      if (pkg?.prettier !== undefined) evidence.push('prettier key in package.json');
      if (hasDep(pkg, 'prettier') || hasDep(pkg, '@biomejs/biome'))
        evidence.push('formatter in devDependencies');
      if (ctx.matching(/(^|\/)biome\.jsonc?$/).length > 0) evidence.push('biome (formats + lints)');
      if (pyprojectHas(ctx, '[tool.black') || pyprojectHas(ctx, '[tool.ruff')) {
        evidence.push('python formatter via pyproject.toml');
      }
      if (ecosystems.includes('go')) evidence.push('gofmt (built into Go toolchain)');
      if (ecosystems.includes('rust')) evidence.push('rustfmt (built into Rust toolchain)');
      if (
        ctx.has('pom.xml') &&
        ctx.read('pom.xml')?.includes('<artifactId>spotless-maven-plugin</artifactId>')
      )
        evidence.push('spotless used in maven');
      return evidence.length > 0
        ? { passed: true, evidence: `${[...new Set(evidence)].slice(0, 3).join('; ')}.` }
        : { passed: false, evidence: 'No formatter configuration detected.' };
    },
  },
  {
    id: 'SNS-05',
    dimension: 'sensors',
    title: 'Test files actually exist',
    points: 2,
    remediation:
      'Write at least one real test file — a configured runner with zero tests gives the agent a green light it did not earn.',
    run(ctx) {
      const testFiles = ctx.matching(TEST_FILE_RE);
      return testFiles.length > 0
        ? { passed: true, evidence: `Found ${testFiles.length} test file(s), e.g. ${testFiles[0]}.` }
        : { passed: false, evidence: 'No test files detected (*.test.*, *_test.go, test_*.py, tests/ …).' };
    },
  },
];
