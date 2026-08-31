<script setup lang="ts">
import type { Role } from '@cms/shared'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Users — CMS' })

interface UserRow {
  id: string
  email: string
  role: Role
  status: 'active' | 'invited' | 'disabled'
  displayName: string
  lastLoginAt: string | null
}

const { user: me } = useAuth()

const users = ref<UserRow[]>([])
const loadError = ref('')
const busyId = ref('')

const form = reactive({ email: '', displayName: '', role: 'content_editor' as Role })
const formError = ref('')
const notice = ref('')
const inviting = ref(false)

async function load() {
  try {
    const res = await $fetch<{ users: UserRow[] }>('/api/users', { credentials: 'include' })
    users.value = res.users
  } catch (err) {
    loadError.value = apiErrorMessage(err, 'Could not load users.')
  }
}
onMounted(load)

async function invite() {
  formError.value = ''
  notice.value = ''
  inviting.value = true
  try {
    await $fetch('/api/users', { method: 'POST', body: { ...form }, credentials: 'include' })
    notice.value = `Invitation queued for ${form.email}.`
    form.email = ''
    form.displayName = ''
    await load()
  } catch (err) {
    formError.value = apiErrorMessage(err, 'Could not send the invitation.')
  } finally {
    inviting.value = false
  }
}

async function act(id: string, fn: () => Promise<unknown>, message: string) {
  busyId.value = id
  notice.value = ''
  try {
    await fn()
    notice.value = message
    await load()
  } catch (err) {
    loadError.value = apiErrorMessage(err)
  } finally {
    busyId.value = ''
  }
}

const resend = (u: UserRow) =>
  act(
    u.id,
    () =>
      $fetch(`/api/users/${u.id}/resend-invite`, { method: 'POST', credentials: 'include' }),
    `Invitation re-queued for ${u.email}.`,
  )

const toggleStatus = (u: UserRow) =>
  act(
    u.id,
    () =>
      $fetch(`/api/users/${u.id}/status`, {
        method: 'PATCH',
        body: { status: u.status === 'disabled' ? 'active' : 'disabled' },
        credentials: 'include',
      }),
    u.status === 'disabled' ? `${u.email} re-enabled.` : `${u.email} disabled.`,
  )

const statusStyle: Record<string, string> = {
  active: 'bg-gold-tint text-gold-ink',
  invited: 'bg-navy-tint text-navy',
  disabled: 'bg-maroon-tint text-maroon',
}

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString() : 'Never')
</script>

<template>
  <div>
    <h1 class="font-display text-2xl font-semibold text-maroon">Users</h1>
    <p class="mt-1.5 text-sm text-ink-muted">
      Accounts are created here and invited by email. There is no public sign-up.
    </p>

    <UiAlert v-if="notice" tone="success" class="mt-5">{{ notice }}</UiAlert>
    <UiAlert v-if="loadError" tone="error" class="mt-5">{{ loadError }}</UiAlert>

    <form
      class="mt-6 rounded-card border border-hairline bg-white p-5"
      @submit.prevent="invite"
    >
      <h2 class="text-sm font-bold uppercase tracking-wider text-ink-muted">Invite someone</h2>
      <UiAlert v-if="formError" tone="error" class="mt-4">{{ formError }}</UiAlert>

      <div class="mt-4 grid gap-4 sm:grid-cols-3">
        <UiField v-model="form.displayName" label="Name" required />
        <UiField v-model="form.email" label="Email" type="email" required />
        <div>
          <label for="role" class="block text-sm font-semibold text-ink">Role</label>
          <select
            id="role"
            v-model="form.role"
            class="mt-1.5 w-full rounded-card border border-hairline bg-white px-3 py-2.5 text-base"
          >
            <option value="content_editor">Content editor</option>
            <option value="super_admin">Administrator</option>
          </select>
        </div>
      </div>

      <p class="mt-3 text-xs text-ink-muted">
        Content editors manage the website only &mdash; they never see student records.
      </p>

      <div class="mt-4">
        <UiButton type="submit" :loading="inviting">Send invitation</UiButton>
      </div>
    </form>

    <div class="mt-8 overflow-x-auto rounded-card border border-hairline bg-white">
      <table class="w-full min-w-[40rem] text-left text-sm">
        <caption class="sr-only">
          All accounts, with role, status and last sign-in
        </caption>
        <thead class="border-b border-hairline text-xs uppercase tracking-wide text-ink-muted">
          <tr>
            <th scope="col" class="px-4 py-3 font-semibold">Name</th>
            <th scope="col" class="px-4 py-3 font-semibold">Role</th>
            <th scope="col" class="px-4 py-3 font-semibold">Status</th>
            <th scope="col" class="px-4 py-3 font-semibold">Last sign-in</th>
            <th scope="col" class="px-4 py-3"><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id" class="border-b border-hairline last:border-0">
            <td class="px-4 py-3">
              <div class="font-medium text-ink">{{ u.displayName }}</div>
              <div class="text-xs text-ink-muted">{{ u.email }}</div>
            </td>
            <td class="px-4 py-3 text-ink-muted">{{ u.role.replace('_', ' ') }}</td>
            <td class="px-4 py-3">
              <span
                :class="[statusStyle[u.status], 'rounded-full px-2 py-0.5 text-xs font-semibold']"
              >
                {{ u.status }}
              </span>
            </td>
            <td class="px-4 py-3 text-ink-muted">{{ fmt(u.lastLoginAt) }}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-2">
                <UiButton
                  v-if="u.status === 'invited'"
                  variant="secondary"
                  :loading="busyId === u.id"
                  @click="resend(u)"
                >
                  Resend
                </UiButton>
                <!-- No self-disable: locking yourself out of the only admin
                     account needs database access to undo. -->
                <UiButton
                  v-if="u.id !== me?.id"
                  variant="danger"
                  :loading="busyId === u.id"
                  @click="toggleStatus(u)"
                >
                  {{ u.status === 'disabled' ? 'Enable' : 'Disable' }}
                </UiButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
