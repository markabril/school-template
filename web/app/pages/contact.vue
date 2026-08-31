<script setup lang="ts">
const { data: chrome } = await useChrome()
const settings = computed(() => chrome.value?.settings)

const form = reactive({
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
  website: '', // honeypot
})

const sent = ref(false)
const error = ref('')
const pending = ref(false)

async function submit() {
  error.value = ''
  pending.value = true
  try {
    await $fetch('/api/content/inquiries', {
      method: 'POST',
      body: { ...form, source: 'contact' },
    })
    sent.value = true
  } catch (err) {
    error.value = apiErrorMessage(
      err,
      'Your message could not be sent. Please try again, or telephone the school.',
    )
  } finally {
    pending.value = false
  }
}

useSeoMeta({
  title: 'Contact',
  description: () => `How to reach ${settings.value?.['site.name'] ?? 'the school'}.`,
})
</script>

<template>
  <div>
    <PageHeader
      title="Contact us"
      eyebrow="Get in touch"
      intro="The school office is happy to answer questions about admissions, visits or anything else."
    />

    <div class="mx-auto max-w-5xl px-6 py-12 sm:py-16">
    <div class="grid gap-12 md:grid-cols-2">
      <div>
        <h2 class="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-ink">
          The school office
        </h2>
        <address class="mt-4 space-y-3 text-sm not-italic leading-relaxed">
          <p v-if="settings?.['contact.address']" class="whitespace-pre-line">
            {{ settings['contact.address'] }}
          </p>
          <p v-if="settings?.['contact.phone']">
            <a :href="`tel:${settings['contact.phone']}`" class="text-gold-ink underline underline-offset-2">
              {{ settings['contact.phone'] }}
            </a>
          </p>
          <p v-if="settings?.['contact.email']">
            <a :href="`mailto:${settings['contact.email']}`" class="text-gold-ink underline underline-offset-2">
              {{ settings['contact.email'] }}
            </a>
          </p>
        </address>

        <!--
          The map is an iframe from a setting the school controls. Lazy-loaded
          because a Google Maps embed is heavier than the rest of this page put
          together, and most visitors will not scroll to it.
        -->
        <iframe
          v-if="settings?.['contact.mapEmbedUrl']"
          :src="settings['contact.mapEmbedUrl']"
          title="Map showing the school location"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          class="mt-6 aspect-[4/3] w-full rounded-card border border-hairline"
        />
      </div>

      <div>
        <div v-if="sent" class="rounded-card border border-hairline bg-white p-6">
          <h2 class="font-display text-xl font-semibold text-maroon">Thank you</h2>
          <p class="mt-2 text-sm leading-relaxed text-ink-muted">
            Your message has reached the school office. Someone will be in touch.
          </p>
          <p class="mt-3 text-sm leading-relaxed text-ink-muted">
            If it is urgent, please telephone rather than wait for a reply.
          </p>
        </div>

        <form v-else class="space-y-4 rounded-card border border-hairline bg-white p-6" @submit.prevent="submit">
          <h2 class="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-ink">
            Send a message
          </h2>

          <UiAlert v-if="error" tone="error">{{ error }}</UiAlert>

          <UiField v-model="form.name" label="Your name" required autocomplete="name" />
          <UiField v-model="form.email" label="Email" type="email" required autocomplete="email" />
          <UiField v-model="form.phone" label="Telephone" hint="Optional." autocomplete="tel" />
          <UiField v-model="form.subject" label="Subject" hint="Optional." />

          <div>
            <label for="message" class="block text-sm font-semibold text-ink">
              Message <span class="text-maroon" aria-hidden="true">*</span>
            </label>
            <textarea
              id="message"
              v-model="form.message"
              rows="5"
              required
              class="mt-1.5 w-full rounded-card border border-hairline px-3 py-2.5 text-base"
            />
          </div>

          <!--
            Honeypot. Hidden from people with `hidden`, and from screen readers
            with aria-hidden + tabindex="-1" so nobody is asked to fill in a
            field that will silently discard their message.
          -->
          <div hidden aria-hidden="true">
            <label for="website">Leave this field empty</label>
            <input id="website" v-model="form.website" type="text" tabindex="-1" autocomplete="off" />
          </div>

          <UiButton type="submit" block :loading="pending">Send message</UiButton>

          <p class="text-xs leading-relaxed text-ink-muted">
            Messages go to the school office. Please do not send anything urgent or confidential
            through this form.
          </p>
        </form>
      </div>
    </div>
    </div>
  </div>
</template>
