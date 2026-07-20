<script setup lang="ts">
import { useData, withBase } from 'vitepress';
import { computed } from 'vue';
import { LANDING, SUPPORTED_TOOLS, terminalSample } from '../i18n/landing';
import { localeFromRelativePath } from '../i18n/localePath';

const { page } = useData();

const locale = computed(() => localeFromRelativePath(page.value.relativePath));
const copy = computed(() => LANDING[locale.value]);

const supportedTools = computed(() =>
  SUPPORTED_TOOLS.map((name, index) => ({
    name,
    status: index === 0 ? copy.value.toolStatus.flagship : copy.value.toolStatus.supported,
  })),
);
</script>

<template>
  <div class="hs-landing">
    <section class="hs-landing__pitch">
      <p class="hs-landing__eyebrow">{{ copy.pitch.eyebrow }}</p>
      <h2 class="hs-landing__title">{{ copy.pitch.title }}</h2>
      <p class="hs-landing__lede">{{ copy.pitch.lede }}</p>
    </section>

    <section class="hs-landing__steps">
      <p class="hs-landing__eyebrow">{{ copy.steps.eyebrow }}</p>
      <div class="hs-landing__step-grid">
        <article v-for="(step, index) in copy.steps.items" :key="step.title" class="hs-landing__step">
          <span class="hs-landing__step-num">{{ index + 1 }}</span>
          <h3>{{ step.title }}</h3>
          <p>{{ step.body }}</p>
        </article>
      </div>
    </section>

    <section class="hs-landing__terminal">
      <div class="hs-landing__terminal-copy">
        <p class="hs-landing__eyebrow">{{ copy.terminal.eyebrow }}</p>
        <h2 class="hs-landing__title">{{ copy.terminal.title }}</h2>
        <p class="hs-landing__lede">{{ copy.terminal.lede }}</p>
        <a class="hs-landing__cta" :href="withBase(copy.guidePath)">{{ copy.terminal.cta }}</a>
      </div>
      <pre class="hs-landing__terminal-pre" :aria-label="copy.terminal.ariaLabel"><code>{{ terminalSample }}</code></pre>
    </section>

    <section class="hs-landing__install">
      <p class="hs-landing__eyebrow">{{ copy.install.eyebrow }}</p>
      <h2 class="hs-landing__title">{{ copy.install.title }}</h2>
      <div class="hs-landing__install-grid">
        <a
          v-for="item in copy.installs"
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
      <p class="hs-landing__eyebrow">{{ copy.maturity.eyebrow }}</p>
      <h2 class="hs-landing__title">{{ copy.maturity.title }}</h2>
      <p class="hs-landing__lede">{{ copy.maturity.lede }}</p>
      <div class="hs-landing__level-row">
        <a
          v-for="lvl in copy.levels"
          :key="lvl.n"
          class="hs-landing__level"
          :href="withBase(copy.maturityPath)"
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
      <a class="hs-landing__cta hs-landing__cta--ghost" :href="withBase(copy.maturityPath)">
        {{ copy.maturity.cta }}
      </a>
    </section>

    <section class="hs-landing__tools">
      <p class="hs-landing__eyebrow">{{ copy.tools.eyebrow }}</p>
      <h2 class="hs-landing__title">{{ copy.tools.title }}</h2>
      <p class="hs-landing__lede">{{ copy.tools.lede }}</p>
      <div class="hs-landing__tools-grid">
        <div v-for="tool in supportedTools" :key="tool.name" class="hs-landing__tool-chip">
          <strong>{{ tool.name }}</strong>
          <span class="hs-landing__tool-badge">{{ tool.status }}</span>
        </div>
      </div>
      <a class="hs-landing__cta hs-landing__cta--ghost" :href="withBase(copy.multiHarnessPath)">
        {{ copy.tools.cta }}
      </a>
    </section>

    <section class="hs-landing__showcase">
      <div class="hs-landing__showcase-badge">
        <p class="hs-landing__eyebrow">{{ copy.showcase.eyebrow }}</p>
        <h2 class="hs-landing__title">{{ copy.showcase.title }}</h2>
        <p class="hs-landing__lede">{{ copy.showcase.lede }}</p>
        <div class="hs-badge-row">
          <img
            class="hs-badge"
            :src="withBase('/harness-badge.svg')"
            alt="Harness Score live badge"
            height="20"
          />
        </div>
        <p class="hs-landing__links">
          <a :href="withBase(copy.measureShowPath)">{{ copy.showcase.gallery }}</a>
          <span aria-hidden="true">·</span>
          <a :href="withBase(copy.measureEmbedPath)">{{ copy.showcase.embeds }}</a>
        </p>
      </div>
      <div class="hs-landing__showcase-card">
        <img
          class="hs-share-card"
          :src="withBase('/maturity/card-l4.svg')"
          :alt="copy.showcase.cardAlt"
        />
      </div>
    </section>

    <section class="hs-landing__products">
      <p class="hs-landing__eyebrow">{{ copy.products.eyebrow }}</p>
      <div class="hs-landing__product-grid">
        <a
          v-for="item in copy.products.items"
          :key="item.title"
          class="hs-landing__product"
          :href="item.external ? item.href : withBase(item.href)"
          :target="item.external ? '_blank' : undefined"
          :rel="item.external ? 'noreferrer' : undefined"
        >
          <h3>{{ item.title }}</h3>
          <p>{{ item.body }}</p>
        </a>
      </div>
    </section>
  </div>
</template>
