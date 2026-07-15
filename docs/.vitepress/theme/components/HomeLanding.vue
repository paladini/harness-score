<script setup lang="ts">
import { withBase } from 'vitepress';

const levels = [
  { n: 0, name: 'Unharnessed', hint: 'Cold-start every session' },
  { n: 1, name: 'Documented', hint: 'AGENTS.md orients the agent' },
  { n: 2, name: 'Guided', hint: 'Rules, skills, hygiene' },
  { n: 3, name: 'Sensing', hint: 'Tests, types, CI verify work' },
  { n: 4, name: 'Self-correcting', hint: 'Hooks close the loop' },
];

const installs = [
  {
    title: 'Run once',
    cmd: 'npx harness-score',
    note: 'No install. Point at any repo path.',
    href: '/guide/measure-and-improve',
    external: false,
    primary: true,
  },
  {
    title: 'npm',
    cmd: 'npm i -g harness-score',
    note: 'v0.3.0 on npmjs.org',
    href: 'https://www.npmjs.com/package/harness-score',
    external: true,
    primary: false,
  },
  {
    title: 'Cursor plugin',
    cmd: '/harness-audit',
    note: 'In repo — Marketplace listing not live yet',
    href: 'https://github.com/paladini/harness-score/tree/main/plugins/cursor',
    external: true,
    primary: false,
  },
  {
    title: 'GitHub Action',
    cmd: 'paladini/harness-score/action',
    note: 'CI gate + README badge',
    href: 'https://github.com/paladini/harness-score/tree/main/action',
    external: true,
    primary: false,
  },
  {
    title: 'JSR',
    cmd: 'npx jsr add @paladini/harness-score',
    note: 'Deno & Bun users',
    href: 'https://jsr.io/@paladini/harness-score',
    external: true,
    primary: false,
  },
];
</script>

<template>
  <div class="hs-landing">
    <section class="hs-landing__pitch">
      <p class="hs-landing__eyebrow">The problem</p>
      <h2 class="hs-landing__title">
        Your AI agent is only as reliable as the harness around it.
      </h2>
      <p class="hs-landing__lede">
        Two repos can run the same model and get wildly different results. One has
        <strong>guides</strong> that steer the agent, <strong>sensors</strong> that verify
        its work, and <strong>guardrails</strong> that stop damage — the other has none.
        Harness Score measures that harness in seconds and tells you what to fix next.
      </p>
    </section>

    <section class="hs-landing__steps">
      <p class="hs-landing__eyebrow">How it works</p>
      <div class="hs-landing__step-grid">
        <article class="hs-landing__step">
          <span class="hs-landing__step-num">1</span>
          <h3>Scan</h3>
          <p>
            Run <code>npx harness-score</code> in your repo. The CLI reads your
            filesystem — 36 checks, zero LLM calls, zero network.
          </p>
        </article>
        <article class="hs-landing__step">
          <span class="hs-landing__step-num">2</span>
          <h3>Level</h3>
          <p>
            Get a maturity level <strong>L0–L4</strong>, a 108-point breakdown across six
            dimensions, and the exact gap blocking the next level.
          </p>
        </article>
        <article class="hs-landing__step">
          <span class="hs-landing__step-num">3</span>
          <h3>Fix</h3>
          <p>
            Every failed check links to a remediation recipe in the guide — or let an
            editor plugin's <code>/harness-audit</code> command apply the fixes.
          </p>
        </article>
      </div>
    </section>

    <section class="hs-landing__terminal">
      <div class="hs-landing__terminal-copy">
        <p class="hs-landing__eyebrow">Example output</p>
        <h2 class="hs-landing__title">A diagnosis, not a vibe check</h2>
        <p class="hs-landing__lede">
          Deterministic: same commit, same score — on your laptop or in CI. Gate merges
          with <code>--min-level 3</code> so maturity only ratchets up.
        </p>
        <a class="hs-landing__cta" :href="withBase('/guide/measure-and-improve')">
          Run the scanner →
        </a>
      </div>
      <pre class="hs-landing__terminal-pre" aria-label="Example harness-score output"><code>  harness-score v0.3.0  ~/my-app

  Maturity: L2 · Guided   Score: 70/108 (65%)

  Context & Guides     ████████████████░░░░  80%
  Skills & Commands    █████████████░░░░░░░  65%
  Hooks & Guardrails   ░░░░░░░░░░░░░░░░░░░░   0%
  Sensors & Feedback   ████████████████░░░░  80%
  CI Feedback          ██████████████░░░░░░  71%
  Hygiene & Safety     ███████████████░░░░░  74%

  To reach L3: sensors ≥ 60%; ci ≥ 50%</code></pre>
    </section>

    <section class="hs-landing__install">
      <p class="hs-landing__eyebrow">Get started</p>
      <h2 class="hs-landing__title">Install anywhere you work</h2>
      <div class="hs-landing__install-grid">
        <a
          v-for="item in installs"
          :key="item.title"
          class="hs-landing__install-card"
          :class="{ 'is-primary': item.primary }"
          :href="item.external ? item.href : withBase(item.href)"
          :target="item.external ? '_blank' : undefined"
          :rel="item.external ? 'noreferrer' : undefined"
        >
          <h3>{{ item.title }}</h3>
          <code>{{ item.cmd }}</code>
          <span>{{ item.note }}</span>
        </a>
      </div>
    </section>

    <section class="hs-landing__levels">
      <p class="hs-landing__eyebrow">Maturity ladder</p>
      <h2 class="hs-landing__title">Five levels you can measure and gate on</h2>
      <p class="hs-landing__lede">
        Levels gate on the <em>shape</em> of your harness — not just points. Eighty
        points of docs with zero tests is L1, not L3.
      </p>
      <div class="hs-landing__level-row">
        <a
          v-for="lvl in levels"
          :key="lvl.n"
          class="hs-landing__level"
          :href="withBase('/guide/maturity-model')"
        >
          <img
            :src="withBase(`/maturity/badge-l${lvl.n}.svg`)"
            :alt="`L${lvl.n}`"
            height="20"
            width="112"
          />
          <strong>L{{ lvl.n }} · {{ lvl.name }}</strong>
          <span>{{ lvl.hint }}</span>
        </a>
      </div>
      <a class="hs-landing__cta hs-landing__cta--ghost" :href="withBase('/guide/maturity-model')">
        Full maturity model →
      </a>
    </section>

    <section class="hs-landing__showcase">
      <div class="hs-landing__showcase-badge">
        <p class="hs-landing__eyebrow">Show your score</p>
        <h2 class="hs-landing__title">Branded badges for your README</h2>
        <p class="hs-landing__lede">
          112×20 pill for shield rows. CI regenerates it, or pin a static
          <code>badge-lN.svg</code>. Copy-paste embeds in Markdown, HTML, iframe, and JSX.
        </p>
        <div class="hs-badge-row">
          <img
            class="hs-badge"
            :src="withBase('/harness-badge.svg')"
            alt="Harness Score live badge"
            height="20"
          />
        </div>
        <p class="hs-landing__links">
          <a :href="withBase('/guide/measure-and-improve#show-your-maturity')">Gallery</a>
          <span aria-hidden="true">·</span>
          <a :href="withBase('/guide/measure-and-improve#embed-snippets')">Embed snippets</a>
        </p>
      </div>
      <div class="hs-landing__showcase-card">
        <img
          class="hs-share-card"
          :src="withBase('/maturity/card-l4.svg')"
          alt="Harness Score L4 · Self-correcting share card"
        />
      </div>
    </section>

    <section class="hs-landing__products">
      <p class="hs-landing__eyebrow">What ships in this repo</p>
      <div class="hs-landing__product-grid">
        <a class="hs-landing__product" :href="withBase('/guide/what-is-harness-engineering')">
          <h3>Guide</h3>
          <p>8 chapters on harness engineering for AI coding agents — feedforward, sensors, guardrails.</p>
        </a>
        <a class="hs-landing__product" :href="withBase('/guide/measure-and-improve')">
          <h3>CLI</h3>
          <p><code>harness-score</code> — JSON, markdown, badge output. Zero runtime deps.</p>
        </a>
        <a
          class="hs-landing__product"
          href="https://github.com/paladini/harness-score/tree/main/plugins/cursor"
          target="_blank"
          rel="noreferrer"
        >
          <h3>Cursor plugin</h3>
          <p><code>/harness-audit</code> command + skill to fix every gap the scan finds.</p>
        </a>
        <a class="hs-landing__product" href="https://github.com/paladini/harness-score/tree/main/action" target="_blank" rel="noreferrer">
          <h3>GitHub Action</h3>
          <p>Scan on every push, emit the badge, fail below <code>--min-level</code>.</p>
        </a>
      </div>
    </section>
  </div>
</template>
