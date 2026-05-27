<script lang="ts">
  import TransactionTable from '$lib/components/verification/TransactionTable.svelte';
  import { fetchTransactions } from '$lib/api/api.js';  
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';

  import { goto } from '$app/navigation';
  import { isAuthenticated } from '$lib/stores/auth';


  let refundModalOpen = false;


  onMount(() => {
  if (!get(isAuthenticated)) {
    goto('/login');
  }
});

  type TxnStatus = 'success' | 'failed' | 'pending';

  interface Transaction {
    txnId:   string;
    date:    string;
    time:    string;
    type:    string;
    amount:  number;
    status:  TxnStatus;
    gateway: string;
    ref:     string;
    mode:    string;
  }

  let seatInput    = '';
  let searchedSeat = '';
  let searched     = false;
  let notFound     = false;
  let loading      = false;  
  let studentInfo: { name: string; seat: string; mobile: string; email: string } | null = null;
  let transactions: Transaction[] = [];



  //Serch the tarction Function 

  async function search() {           
    const seat = seatInput.trim();
    if (!seat) return;
        
    searchedSeat = seat;
    searched     = true;
    loading      = true; 
    notFound     = false;
    transactions = [];
    studentInfo  = null;

    const data = await fetchTransactions(seat);   

    loading = false;

    // If API returned error (404, 400, 500)
    if (data.error) {
      notFound     = true;
      transactions = [];
      studentInfo  = null;
      return;
    }

    notFound    = false;
    studentInfo = data.studentInfo;
    transactions = data.transactions;
  }

  function reset() {
    seatInput    = '';
    searchedSeat = '';
    searched     = false;
    notFound     = false;
    loading      = false;
    transactions = [];
    studentInfo  = null;
  }


function signIn(board: string, seat: string) {
  const baseUrl = board === 'HSC'
    ? 'https://hsc_student.mahahsscboard.in'
    : 'https://ssc_student.mahahsscboard.in';

  // Copy seat to clipboard
  // navigator.clipboard.writeText(seat).then(() => {
  //   alert(`Seat number ${seat} copied to clipboard!\nPaste it in the Seat No field.`);
  // });

  // Open the login page
  window.open(baseUrl, '_blank');
}

function GoBack() {
    //isAuthenticated.set(false);
    goto('/home');
  }

function openRefundModal()  { refundModalOpen = true;  }


function closeRefundModal() { refundModalOpen = false; }


function goToRefund( type : 'hsc'|'ssc'){
  refundModalOpen = false;
  // /goto(type === 'hsc' ? '/refund/hsc' : '/refund/ssc');
   goto(type === 'hsc' ? '/verification/refund/hsc' : '/verification/refund/ssc');

}
</script>

     <!-- PAGE LAYOUT -->
  <div class="min-h-screen flex flex-col bg-gray-50">

    <header style="background-color: #2bbcb0;" class="shadow-md">
      <div class="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">

        <!-- Logo -->
        <div class="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-white/40 shadow-lg bg-white">
          <img src="/image/MSBImage.png" alt="MSBSHSE Logo" class="w-full h-full object-cover" />
        </div>

        <!-- Board Name -->
        <div class="flex-1">
          <h1 class="text-white font-bold text-base sm:text-lg tracking-wide uppercase leading-tight">
            Maharashtra State Board of Secondary & Higher Secondary Education, Pune
          </h1>
          <p class="text-white/75 text-xs mt-0.5 tracking-wider">Fee Transaction Verification Portal</p>
        </div>

        <!-- Gateway Status Badge -->
        <div class="hidden md:flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full">
          <span class="w-2 h-2 rounded-full bg-green-300 animate-pulse"></span>
          <span class="text-white text-xs font-medium">SubPaisa Active</span>

          <button
            onclick={GoBack}
            class="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-full transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"/>
            </svg>
            <span class="text-white text-xs font-medium">Back</span>
          </button>
        </div>

      </div>
    </header>


    <!-- SUB HEADER — Blue strip -->
  <div class="bg-[#1a3a6b] py-2 px-4">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <p class="text-blue-200 text-xs">Student Fee Payment Verification System</p>
      <p class="text-blue-300 text-xs hidden sm:block">Academic Year: 2025-26</p>
    </div>
  </div>


 <!-- MAIN CONTENT -->
  <main class="flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-5">

<!--REFUND BUTTON -->
<div class="flex justify-end items-center mb-5">
  <button
    onclick={openRefundModal}
    class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white
           shadow-sm transition-all duration-200 hover:opacity-90 active:scale-95"
    style="background-color: #2b4f87;"
  >
    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
    </svg>
    Refund
  </button>
</div>

<!-- ── SEACH CARD ── -->
<div class="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">

    <div class="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">

      <div style="background-color: #2bbcb0;" class="px-5 py-3">
        <h2 class="text-white font-semibold text-sm flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
          </svg>
          Search Student Transactions by Seat Number
        </h2>
      </div>

      <!-- Card Body -->
      <div class="p-5">

        <!-- Input Row -->
        <div class="flex flex-wrap gap-3 items-end">

          <!-- Seat Number Input -->
          <div class="flex flex-col gap-1.5 flex-1 min-w-[220px]">
            <label class="text-xs font-semibold text-gray-600">
              Seat Number <span class="text-red-500">*</span>
            </label>
            <input
              bind:value={seatInput}
              oninput={(e) => seatInput = e.currentTarget.value.toUpperCase()}

              onkeydown={(e) => e.key === 'Enter' && search()}
              type="text"
              placeholder="Enter seat number (e.g. X234567)"
              maxlength="10"
              class="h-11 border-2 border-gray-200 rounded-xl px-4 text-sm text-gray-800
                    focus:outline-none focus:border-[#2bbcb0] transition-colors placeholder-gray-300"
            />
          </div>

          <!-- Search Button -->
          <button
            onclick={search}
            style="background-color: #2bbcb0;"
            class="h-11 px-6 text-white text-sm font-semibold rounded-xl
                   hover:opacity-90 active:scale-95 transition-all shadow flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
            </svg>
            Search
          </button>

          <!-- Reset Button -->
          <button
           onclick={reset}
            class="h-11 px-5 border-2 border-gray-200 text-gray-500 text-sm font-medium
                   rounded-xl hover:bg-gray-50 transition-all"
          >
            ↺ Reset
          </button>

        </div>

      </div>
    </div>

    {#if loading}
    <div class="bg-white rounded-2xl shadow border border-gray-100 p-10 text-center">
      <div class="w-8 h-8 border-4 border-[#2bbcb0] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p class="text-gray-400 text-sm">Fetching transactions...</p>
    </div>
    {/if}


    <!-- ── NOT FOUND MESSAGE ── -->
    {#if notFound}
    <div class="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-red-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      </svg>
      <p class="text-red-600 font-semibold">No records found for seat number <strong>{searchedSeat}</strong></p>
      <p class="text-red-400 text-sm mt-1">Please verify the seat number and try again.</p>
    </div>
    {/if}


    <!-- ── RESULTS SECTION ── -->
    {#if searched && !notFound && studentInfo && !loading}


      <!-- Student Info Bar -->
      <div class="bg-white rounded-2xl shadow border border-gray-100 p-4 flex flex-wrap gap-4 items-center">

        <!-- Avatar + Name -->
        <div class="flex items-center gap-3">
          <div style="background-color: #2bbcb0;"
               class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {studentInfo.name.charAt(0)}
          </div>
          <div>
            <p class="font-bold text-gray-800 text-sm">{studentInfo.name}</p>
          <p class="text-xs text-gray-400">{studentInfo.email} &nbsp;|&nbsp; {studentInfo.mobile}</p>
          </div>
        </div>

        <!-- Seat Badge -->
        <div class="ml-auto">
          <span class="bg-blue-50 text-[#1a3a6b] text-xs font-bold px-3 py-1.5 rounded-full border border-blue-100">
            Seat No: {searchedSeat}
          </span>

          <span class="text-xs font-bold px-3 py-1.5 rounded-full border
          {studentInfo.board === 'HSC'
            ? 'bg-[#2bbcb0] text-white border-[#2bbcb0]'
            : 'bg-[#1a3a6b] text-white border-[#1a3a6b]'}">
          {studentInfo.board}
        </span>

       <button
         onclick={() => signIn(studentInfo!.board, searchedSeat)}
          class="text-xs font-bold px-3 py-1.5 rounded-full border-2 border-white text-white transition-all hover:opacity-90 active:scale-95"
          style="background-color: #1a3a6b;"
        >
          Sign In
        </button>
        </div>

      </div>
      <TransactionTable {transactions} {searchedSeat} />

    {/if}

    <!-- ── END RESULTS SECTION ── -->
    {#if !searched}
    <div class="bg-white rounded-2xl border border-gray-100 shadow p-14 text-center">
      <div class="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-teal-50">
        <img src="/image/MSBImage.png" alt="MSBSHSE" class="w-14 h-14 object-contain rounded-full opacity-60" />
      </div>
      <p class="text-gray-600 font-semibold">Enter a seat number to view all fee transactions</p>
      <p class="text-gray-400 text-sm mt-1.5">All payments processed via SubPaisa gateway will be displayed here</p>
    </div>
    {/if}


  </main>
  
</div>

<!-- REFUND PAYMENT MODAL -->
{#if refundModalOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    style="background: rgba(0,0,0,0.5);"
    onclick={(e) => { if (e.target === e.currentTarget) closeRefundModal(); }}
    role="dialog"
    aria-modal="true"
  >
  <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

    <!-- Modal Header -->
    <div style="background-color: #1a3a6b;" class="px-5 py-4 flex items-center justify-between">
      <div>
        <h3 class="text-white font-bold text-sm">Select Refund Type</h3>
        <p class="text-blue-300 text-xs mt-0.5">Choose the board to initiate payment refund</p>
      </div>
      <button
        onclick={closeRefundModal}
        class="text-white/70 hover:text-white transition-colors text-xl font-bold leading-none"
      >✕</button>
    </div>

    <!-- Modal Body -->
    <div class="p-5 space-y-3">

      <!-- HSC Option -->
      <button
        onclick={() => goToRefund('hsc')}
        class="w-full flex items-center gap-4 p-4 border-2 border-gray-100 rounded-xl
               hover:border-[#2bbcb0] hover:bg-teal-50/40 transition-all text-left"
      >
        <div class="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
          </svg>
        </div>
        <div class="flex-1">
          <p class="font-bold text-gray-800 text-sm">HSC Payment Refund</p>
          <p class="text-xs text-gray-400 mt-0.5">Higher Secondary Certificate — Class 12</p>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
        </svg>
      </button>

      <!-- SSC Option -->
      <button
        onclick={() => goToRefund('ssc')}
        class="w-full flex items-center gap-4 p-4 border-2 border-gray-100 rounded-xl
               hover:border-[#2bbcb0] hover:bg-teal-50/40 transition-all text-left"
      >
        <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
          </svg>
        </div>
        <div class="flex-1">
          <p class="font-bold text-gray-800 text-sm">SSC Payment Refund</p>
          <p class="text-xs text-gray-400 mt-0.5">Secondary School Certificate — Class 10</p>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
        </svg>
      </button>

    </div>

    <!-- Modal Footer -->
    <div class="px-5 py-3 border-t border-gray-100 flex justify-end bg-gray-50">
      <button
        onclick={closeRefundModal}
        class="px-5 py-2 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition-all"
        style="background-color: #1a3a6b;"
      >Cancel</button>
    </div>

  </div>
</div>
{/if}