// Gate hook: denies destructive shell commands before they execute.
// Contract: JSON on stdin ({ command }), JSON on stdout ({ permission }).
let input = '';
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  let command = '';
  try {
    const payload = JSON.parse(input || '{}');
    command = String(payload.command ?? payload.tool_input?.command ?? '');
  } catch {
    // Unparseable payload: allow — this gate only targets known-destructive patterns.
  }
  const destructive =
    /\brm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)[a-z]*\s+([/~]|\.\.)|\bgit\s+push\s+.*--force\b|\bgit\s+reset\s+--hard\b|\bdrop\s+(table|database)\b|\bnpm\s+publish\b/i;
  const claude = process.argv.includes('--claude');
  if (destructive.test(command)) {
    const reason = `Blocked by project guard: "${command.slice(0, 80)}" matches a destructive pattern. Run it manually if intended.`;
    process.stdout.write(
      JSON.stringify(
        claude
          ? {
              hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'deny',
                permissionDecisionReason: reason,
              },
            }
          : {
              permission: 'deny',
              user_message: reason,
              agent_message: reason,
            },
      ),
    );
  } else {
    process.stdout.write(JSON.stringify(claude ? {} : { permission: 'allow' }));
  }
});
