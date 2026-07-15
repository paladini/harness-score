// Feedback hook: formats files the agent just edited so diffs stay clean.
import { execSync } from 'node:child_process';

let input = '';
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  const payload = JSON.parse(input || '{}');
  const filePath = payload.file_path ?? payload.filePath;
  if (typeof filePath === 'string' && /\.(js|json|md)$/.test(filePath)) {
    try {
      execSync(`npx prettier --write "${filePath}"`, { stdio: 'ignore' });
    } catch {
      // Formatting is best-effort; never block the edit.
    }
  }
});
