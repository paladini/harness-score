<script setup lang="ts">
import { useData, withBase } from 'vitepress';
import { computed } from 'vue';
import { LOCALES, localeFromRelativePath, switchLocalePath } from '../i18n/localePath';

const { page, localeIndex } = useData();

const currentLocale = computed(() => localeFromRelativePath(page.value.relativePath));

const links = computed(() =>
  LOCALES.map((locale) => ({
    ...locale,
    href: withBase(switchLocalePath(currentLocale.value, locale.id, page.value.relativePath)),
    active: locale.id === currentLocale.value,
  })),
);
</script>

<template>
  <nav class="hs-lang-switcher" aria-label="Language">
    <template v-for="(link, index) in links" :key="link.id">
      <span v-if="index > 0" class="hs-lang-switcher__sep" aria-hidden="true">·</span>
      <a
        class="hs-lang-switcher__link"
        :class="{ 'is-active': link.active }"
        :href="link.href"
        :hreflang="link.hreflang"
        :lang="link.hreflang"
        :aria-current="link.active ? 'page' : undefined"
      >
        {{ link.label }}
      </a>
    </template>
  </nav>
</template>
