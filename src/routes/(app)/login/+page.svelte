<script>
  import { goto } from '$app/navigation';
  import { isAuthenticated } from '$lib/stores/auth';


  let password = $state('');
  let phone = $state('');
  let showPassword = $state(false);
  let error = $state('');
  let loading = $state(false);
  let success = $state(false);

  const CORRECT_PASSWORD = 'Admin@2026';

  async function handleLogin() {
    error = '';
    if (!phone) {
      error = 'Please enter your phone number.';
      return;
    }
    if (!password) {
      error = 'Please enter your password.';
      return;
    }
    loading = true;
    await new Promise((r) => setTimeout(r, 900));
    if (password === CORRECT_PASSWORD) {
      isAuthenticated.set(true); 
      success = true;
      await new Promise((r) => setTimeout(r, 1200));
      goto('/home');
    } else {
      error = 'Incorrect password. Please try again.';
      loading = false;
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Enter') handleLogin();
    if (error) error = '';
  }
</script>

<div class="min-h-screen w-full bg-slate-100 flex items-center justify-center px-4 py-8">

  <!-- Card -->
  <div class="w-full max-w-md bg-white border border-slate-200 rounded-2xl px-8 py-10 shadow-sm">

    <!-- Logo -->
    <div class="flex justify-center mb-6">
      <div class="w-14 h-14 bg-[#2bbcb0] rounded-2xl flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="1.8" class="w-7 h-7">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
    </div>

    <!-- Heading -->
    <div class="text-center mb-8">
      <h1 class="text-xl font-semibold text-slate-800 tracking-tight mb-1.5">Verification Support</h1>
      <p class="text-sm text-slate-400">Sign in to access the admin dashboard</p>
    </div>

    {#if success}
      <!-- Success state -->
      <div class="flex flex-col items-center gap-2 py-4 text-center">
        <div class="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mb-1">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" class="w-7 h-7 stroke-green-500">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <strong class="text-slate-800 text-base font-semibold">Access granted!</strong>
        <span class="text-slate-400 text-sm">Redirecting to dashboard…</span>
      </div>

    {:else}

      <!-- Phone field -->
      <div class="mb-5">
        <label for="phone" class="block text-xs font-medium text-slate-1000 uppercase tracking-widest mb-2">
          Phone Number
        </label>
        <div class="relative">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">+91</span>
          <input
            id="phone"
            type="tel"
            bind:value={phone}
            onkeydown={handleKeydown}
            placeholder="Enter your phone number"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 focus:border-[#2bbcb0] focus:bg-gray {error && !phone ? 'border-red-400' : ''}"
          />
        </div>
      </div>

      <!-- Password field -->
      <div class="mb-5">
        <label for="password" class="block text-xs font-medium text-slate-1000 uppercase tracking-widest mb-2">
          Password
        </label>
        <div class="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            bind:value={password}
            onkeydown={handleKeydown}
            placeholder="Enter your password"
            class="w-full bg-slate-50 border rounded-xl py-3 pl-4 pr-11 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 focus:border-[#2bbcb0] focus:bg-gray {error ? 'border-red-400' : 'border-slate-200'}"
          />
          <button
            type="button"
            onclick={() => (showPassword = !showPassword)}
            aria-label="Toggle password"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md"
          >
            {#if showPassword}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" class="w-[18px] h-[18px]">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7a9.77 9.77 0 012.34-4.34M6.34 6.34A9.96 9.96 0 0112 5c5 0 9 4 9 7a9.77 9.77 0 01-2.34 4.34M3 3l18 18" />
              </svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" class="w-[18px] h-[18px]">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.522 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z" />
              </svg>
            {/if}
          </button>
        </div>

        {#if error}
          <p class="flex items-center gap-1.5 text-xs text-red-500 mt-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5 shrink-0">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            {error}
          </p>
        {/if}
      </div>

      <!-- Submit button -->
      <button
        onclick={handleLogin}
        disabled={loading}
        class="w-full flex items-center justify-center gap-2 bg-[#2bbcb0] hover:bg-[#2bbcb0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-xl py-3 px-4 transition-all duration-150"
      >
        {#if loading}
          <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          Verifying…
        {:else}
          Sign in
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        {/if}
      </button>
    {/if}

    <p class="text-center text-xs text-slate-1000 mt-8">Protected area &middot; Admin access only</p>
  </div>
</div>