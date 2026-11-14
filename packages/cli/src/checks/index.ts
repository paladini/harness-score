import type { Check } from '../types.js';
import { agentChecks } from './agents.js';
import { ciChecks } from './ci.js';
import { contextChecks } from './context.js';
import { hookChecks } from './hooks.js';
import { hygieneChecks } from './hygiene.js';
import { sensorChecks } from './sensors.js';
import { skillChecks } from './skills.js';

/** Ordered catalog of all built-in maturity checks. */
export const ALL_CHECKS: Check[] = [
  ...contextChecks,
  ...skillChecks,
  ...agentChecks,
  ...hookChecks,
  ...sensorChecks,
  ...ciChecks,
  ...hygieneChecks,
];
