<script lang="ts">
  import { goto } from '$app/navigation';
  import { isAuthenticated } from '$lib/stores/auth';

  function logout() {
    isAuthenticated.set(false);
    goto('/login');
  }
</script>

<div class="min-h-screen bg-slate-100">

  <!-- Navbar -->
  <header class="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
    <div class="flex items-center gap-2">
      <div class="w-10 h-10 rounded-lg bg-[#2bbcb0] flex items-center justify-center">
        <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </div>
      <span class="font-semibold text-slate-800 text-sm">Support Portal</span>
    </div>
    <button
      onclick={logout}
      class="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      Logout
    </button>
  </header>

  <!-- Main -->
  <main class="max-w-2xl mx-auto px-4 py-14">

    <div class="text-center mb-10">
      <h1 class="text-2xl font-semibold text-slate-800">Welcome To Support Portal</h1>
      <p class="text-slate-500 text-sm mt-1.5">Select an application to continue</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">

      <!-- Verification Support Card -->
      <button
        onclick={() => goto('/verification/dashboard')}
        class="group bg-white rounded-2xl border border-slate-200 p-6 text-left hover:shadow-lg hover:border-slate-300 transition-all duration-200"
      >
        <div class="w-12 h-12 rounded-xl bg-[#2bbcb0] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200">
          <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </div>

        <span class="inline-block text-xs font-medium bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full mb-3">
          Active
        </span>

        <h2 class="text-slate-800 font-semibold text-base mb-1.5">Verification Support</h2>
        <p class="text-slate-500 text-sm leading-relaxed">
          Manage HSC &amp; SSC certificate verification requests, review documents and update status.
        </p>

        <div class="mt-5 flex items-center gap-1 text-sm font-medium text-slate-700 group-hover:gap-2 transition-all duration-150">
          Open
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>
      </button>

      <!-- Reprint Support Card -->
      <button
        onclick={() => goto('/reprint/dashboard')}
        class="group bg-white rounded-2xl border border-slate-200 p-6 text-left hover:shadow-lg hover:border-slate-300 transition-all duration-200"
      >
        <div class="w-12 h-12 rounded-xl bg-teal-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200">
          <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
        </div>

        <span class="inline-block text-xs font-medium bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full mb-3">
          Active
        </span>

        <h2 class="text-slate-800 font-semibold text-base mb-1.5">Reprint Support</h2>
        <p class="text-slate-500 text-sm leading-relaxed">
          Handle certificate reprint requests, track print jobs and manage dispatch &amp; delivery.
        </p>

        <div class="mt-5 flex items-center gap-1 text-sm font-medium text-slate-700 group-hover:gap-2 transition-all duration-150">
          Open
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>
      </button>

    </div>
  </main>
</div>