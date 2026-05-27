<script lang="ts">
  import { checkApplicationStatus, updateApplicationResponse } from '$lib/api/reprintapi';

  type TxnStatus = 'success' | 'failed' | 'aborted' | 'refunded' | 'unknown';

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
    raw?: Record<string, string>;
  }

  export let transactions: Transaction[] = [];
  export let searchedSeat: string        = '';
  export let actualSeat: string          = '';


  let filterStatus = '';

  let modalOpen  = false;
  let modalData: Record<string, any> | null = null;
  let modalTxnId = '';
  let modalStatus: TxnStatus = 'unknown';

  // Update Response state
  let appStatus      : string | null = null;
  let checkingApp    = false;
  let updatingApp    = false;
  let updateAppDone  = false;
  let updateAppError = '';

  async function openModal(t: Transaction) {
  modalTxnId     = t.txnId;
  modalData      = t.raw ?? {};
  modalOpen      = true;
  modalStatus    = t.status;

    // reset
  appStatus      = null;
  checkingApp    = false;
  updatingApp    = false;
  updateAppDone  = false;
  updateAppError = '';

  if (t.status === 'success') {
      const tempId = String(t.raw?.udf1 ?? '');
      console.log('udf1 tempId:', tempId);  

      if (tempId) {
        checkingApp = true;
        const appResult = await checkApplicationStatus(tempId);
         console.log('appResult:', appResult); // debug
        const status = appResult.application?.application_status ?? null;
         console.log('appStatus:', status); // debug
        checkingApp = false;
      }
  }
  }

  function closeModal() {
    modalOpen      = false;
    modalData      = null;
    modalTxnId     = '';
    appStatus      = status;
    checkingApp    = false;
    updatingApp    = false;
    updateAppDone  = false;
    updateAppError = '';
    modalStatus    = 'unknown';  
  }

  async function handleUpdateResponse(data: Record<string, any> | null) {
    if (!data) return;

    updatingApp    = true;
    updateAppError = '';
    updateAppDone  = false;

    const result = await updateApplicationResponse({
      temp_id:           String(data.udf1 ?? ''),
      client_trans_id:   String(data.clientTxnId ?? ''),
      sabpaisa_trans_id: String(data.sabpaisaTxnId ?? '')
    });

    updatingApp = false;

    if (result.error) {
      updateAppError = result.error;
    } else {
      updateAppDone = true;
      appStatus     = 'submitted';
    }
  }

  $: filtered = filterStatus
    ? transactions.filter(t => t.status === filterStatus)
    : transactions;

  $: if (transactions) filterStatus = '';

  function getStatusClass(status: TxnStatus): string {
    if (status === 'success')  return 'bg-green-50 text-green-700 border border-green-100';
    if (status === 'failed')   return 'bg-red-50 text-red-600 border border-red-100';
    if (status === 'aborted')  return 'bg-orange-50 text-orange-600 border border-orange-100';
    if (status === 'refunded') return 'bg-purple-50 text-purple-600 border border-purple-100';
    return                            'bg-gray-50 text-gray-500 border border-gray-200';
  }

  function getDotClass(status: TxnStatus): string {
    if (status === 'success')  return 'bg-green-500';
    if (status === 'failed')   return 'bg-red-400';
    if (status === 'aborted')  return 'bg-orange-400';
    if (status === 'refunded') return 'bg-purple-400';
    return                            'bg-gray-400';
  }

  function getStatusLabel(status: TxnStatus): string {
    if (status === 'success')  return 'Success';
    if (status === 'failed')   return 'Failed';
    if (status === 'aborted')  return 'Aborted';
    if (status === 'refunded') return 'Refunded';
    return                            'Unknown';
  }

  function formatAmount(amount: number): string {
    if (amount <= 0) return '—';
    return '₹' + amount.toLocaleString('en-IN');
  }

  const fieldLabels: Record<string, string> = {
    payerName:         'Payer Name',
    payerEmail:        'Payer Email',
    payerMobile:       'Payer Mobile',
    clientTxnId:       'Client Txn ID',
    payerAddress:      'Payer Address',
    amount:            'Amount',
    clientCode:        'Client Code',
    paidAmount:        'Paid Amount',
    paymentMode:       'Payment Mode',
    bankName:          'Bank Name',
    status:            'Status',
    responseCode:      'Response Code',
    statusCode:        'Status Code',
    sabpaisaTxnId:     'SubPaisa Txn ID',
    sabpaisaMessage:   'SubPaisa Message',
    bankMessage:       'Bank Message',
    bankErrorCode:     'Bank Error Code',
    sabpaisaErrorCode: 'SubPaisa Error Code',
    bankTxnId:         'Bank Txn ID',
    programId:         'Program ID',
    mcc:               'MCC',
    transDate:         'Transaction Date',
    rrn:               'RRN',
    udf1:              'UDF1',
    udf2:              'Seat No',
    udf3:              'Subject',
    udf13:             'UDF13',
    udf14:             'UDF14',
    udf15:             'UDF15',
    udf16:             'UDF16',
    udf17:             'UDF17',
    udf19:             'UDF19',
  };

  const primaryFields = [
    'payerName','payerEmail','payerMobile','clientTxnId',
    'transDate','paidAmount','amount','paymentMode',
    'bankName','status','sabpaisaMessage','bankTxnId',
    'sabpaisaTxnId','sabpaisaErrorCode','rrn'
  ];
</script>


{#if modalOpen && modalData}
<div
  class="fixed inset-0 z-50 flex items-center justify-center p-4"
  style="background: rgba(0,0,0,0.5);"
  on:click|self={closeModal}
  role="dialog"
  aria-modal="true"
>
  <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">

    <!-- Modal Header -->
      <div style="background-color: #1a3a6b;" class="px-5 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h3 class="text-white font-bold text-sm">Transaction Details</h3>
          <p class="text-blue-300 text-xs mt-0.5 font-mono">{modalTxnId}</p>
        </div>

        <div class="flex items-center gap-3">

              <!-- ── Update Response Button — only for SUCCESS ── -->
  {#if String(modalData?.status ?? '').toUpperCase() === 'SUCCESS' || String(modalData?.status ?? '').toUpperCase() === 'CAPTURED'}

  <!-- {#if modalStatus === 'success'} -->

    {#if checkingApp}
      <span class="text-xs px-4 py-1.5 rounded-lg font-semibold text-white/60"
            style="background-color: #1a3a6b;">
        Checking...
      </span>

    {:else if updateAppDone}
      <span class="text-xs px-4 py-1.5 rounded-lg font-semibold text-white border-2 border-white"
            style="background-color: #16a34a;">
        ✓ Response Updated
      </span>

            {:else if appStatus !== null && appStatus.toLowerCase() !== 'submitted'}
            <!-- Not submitted — ENABLED -->
            <button
                on:click={() => handleUpdateResponse(modalData)}
                disabled={updatingApp}
                class="text-xs px-4 py-2 rounded-lg font-semibold transition-all hover:opacity-90 active:scale-95 border-2 border-white text-white disabled:opacity-50"
                style="background-color: #f59e0b;"
            >
                {updatingApp ? 'Updating...' : '↑ Update Response'}
            </button>
            {#if updateAppError}
                <span class="text-xs text-red-300">{updateAppError}</span>
            {/if}

            {:else if appStatus !== null && appStatus.toLowerCase() === 'submitted'}
            <!-- Already submitted — DISABLED -->
            <button
                disabled
                class="text-xs px-4 py-1.5 rounded-lg font-semibold text-white/40 border-2 border-white/20 cursor-not-allowed"
                style="background-color: #6b7280;"
            >
                ✓ Already Submitted
            </button>

    {:else}
      <!-- udf1 empty or no application found -->
      <span class="text-xs px-3 py-1 rounded-lg text-white/40 border border-white/20">
        No Application
      </span>
    {/if}

  {/if}

          <!-- Close button -->
          <button
            on:click={closeModal}
            class="text-white/70 hover:text-white transition-colors text-xl font-bold leading-none"
          >✕</button>
        </div>
      </div>

    <!-- Modal Body -->
    <div class="overflow-y-auto flex-1 p-5 space-y-4">

      <!-- Primary Fields -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {#each primaryFields as key}
          {#if modalData[key] && modalData[key] !== 'null'}
          <div class="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <p class="text-xs text-gray-400 font-medium mb-0.5">
              {fieldLabels[key] ?? key}
            </p>
            <p class="text-sm font-semibold text-gray-800 break-all">
              {modalData[key]}
            </p>
          </div>
          {/if}
        {/each}
      </div>

      <!-- Divider -->
      <div class="border-t border-gray-100 pt-3">
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">All Fields</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {#each Object.entries(modalData) as [key, val]}
            {#if val && val !== 'null' && val !== 'NA'}
            <div class="flex justify-between items-start gap-2 py-1.5 border-b border-gray-50">
              <span class="text-xs text-gray-400 flex-shrink-0">
                {fieldLabels[key] ?? key}
              </span>
              <span class="text-xs font-medium text-gray-700 text-right break-all">
                {val}
              </span>
            </div>
            {/if}
          {/each}
        </div>
      </div>

    </div>

    <!-- Modal Footer -->
    <div class="px-5 py-3 border-t border-gray-100 flex justify-end flex-shrink-0 bg-gray-50">
      <button
        on:click={closeModal}
        class="px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all hover:opacity-90"
        style="background-color: #1a3a6b;"
      >Close</button>
    </div>

  </div>
</div>
{/if}


<!-- TRANSACTION TABLE COMPONENT -->
<div class="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">

  <div
    class="px-5 py-3.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3"
    style="background: linear-gradient(to right, #f8fffe, #f0faf9);"
  >
    <div class="flex items-center gap-3">
      <h2 class="text-sm font-bold text-gray-700">All Transactions</h2>
      <span
        class="text-xs font-semibold px-2.5 py-1 rounded-full border"
        style="background-color: rgba(43,188,176,0.1); color: #2bbcb0; border-color: rgba(43,188,176,0.2);"
      >
        Seat: {actualSeat || searchedSeat}
      </span>
    </div>
    
  </div>

  <!-- ── DESKTOP TABLE ── -->
  <div class="overflow-x-auto hidden sm:block">
    <table class="w-full text-sm">
      <thead>
        <tr style="background-color: #1a3a6b;">
          <th class="px-4 py-3 text-left text-xs text-blue-200 font-semibold uppercase tracking-wider w-8">Sr.No</th>
          <th class="px-4 py-3 text-left text-xs text-blue-200 font-semibold uppercase tracking-wider">Client Transaction ID</th>
          <th class="px-4 py-3 text-left text-xs text-blue-200 font-semibold uppercase tracking-wider">Seat No</th>
          <th class="px-4 py-3 text-left text-xs text-blue-200 font-semibold uppercase tracking-wider">Date & Time</th>
          <th class="px-4 py-3 text-left text-xs text-blue-200 font-semibold uppercase tracking-wider">Fee Type</th>
          <th class="px-4 py-3 text-left text-xs text-blue-200 font-semibold uppercase tracking-wider">Mode</th>
          <th class="px-4 py-3 text-right text-xs text-blue-200 font-semibold uppercase tracking-wider">Amount</th>
          <th class="px-4 py-3 text-center text-xs text-blue-200 font-semibold uppercase tracking-wider">Status</th>
          <th class="px-4 py-3 text-center text-xs text-blue-200 font-semibold uppercase tracking-wider">View</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as t, i}
        <tr class="border-t border-gray-50 hover:bg-teal-50/40 transition-colors">

          <td class="px-4 py-3.5 text-gray-300 text-xs">{i + 1}</td>

          <td class="px-4 py-3.5">
            <span class="font-mono text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
              {t.txnId}
            </span>
          </td>

           <td class="px-4 py-3.5">
            <span class="font-mono text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded font-bold text-[#1a3a6b]">
              {t.seat}
            </span>
          </td>

          <td class="px-4 py-3.5 whitespace-nowrap">
            <p class="text-gray-700 text-xs font-medium">{t.date}</p>
            <p class="text-gray-400 text-xs">{t.time}</p>
          </td>

          <td class="px-4 py-3.5">
          <div class="flex flex-wrap gap-1">
            {#each (t.type ? t.type.split(', ') : ['Fee Payment']) as subject}
              <span class="text-xs font-medium bg-blue-50 text-[#1a3a6b] px-2 py-0.5 rounded-full border border-blue-100">
                {subject}
              </span>
            {/each}
          </div>
        </td>

          <td class="px-4 py-3.5">
            <span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-medium">
              {t.mode}
            </span>
          </td>

          <td class="px-4 py-3.5 text-right font-bold {t.amount > 0 ? 'text-gray-800' : 'text-gray-300'}">
            {formatAmount(t.amount)}
          </td>

          <td class="px-4 py-3.5 text-center">
            <span class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full {getStatusClass(t.status)}">
              <span class="w-1.5 h-1.5 rounded-full {getDotClass(t.status)}"></span>
              {getStatusLabel(t.status)}
            </span>
          </td>

          <!-- View modal  -->
          <td class="px-4 py-3.5 text-center">
            <button
              on:click={() => openModal(t)}
              class="text-xs px-3 py-1.5 rounded-lg font-semibold text-white transition-all hover:opacity-90 active:scale-95"
              style="background-color: #2bbcb0;"
            >View</button>
          </td>

        </tr>
        {/each}

        {#if filtered.length === 0}
        <tr>
          <td colspan="8" class="px-4 py-12 text-center text-gray-300 text-sm">
            No transactions match this filter
          </td>
        </tr>
        {/if}
      </tbody>
    </table>
  </div>


  <!-- ── MOBILE CARDS ── -->
  <div class="sm:hidden divide-y divide-gray-50">
    {#each filtered as t}
    <div class="p-4 space-y-2.5">

      <div class="flex justify-between items-start">
        <div>
          <p class="font-bold text-gray-800 text-sm">{t.type}</p>
          <p class="font-mono text-xs text-gray-400 mt-0.5">{t.txnId}</p>
        </div>
        <span class="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full {getStatusClass(t.status)}">
          {getStatusLabel(t.status)}
        </span>
      </div>

      <div class="flex justify-between items-center text-xs text-gray-400">
        <span>{t.date} · {t.time}</span>
        <span class="font-bold text-gray-700 text-sm">{formatAmount(t.amount)}</span>
      </div>

      <!-- ── CHANGED: removed mode+gateway+ref, added View button ── -->
      <div class="flex items-center justify-between">
        <span class="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded font-medium">{t.mode}</span>
        <button
          on:click={() => openModal(t)}
          class="text-xs px-3 py-1.5 rounded-lg font-semibold text-white transition-all hover:opacity-90"
          style="background-color: #2bbcb0;"
        >View Details</button>
      </div>

    </div>
    {/each}

    {#if filtered.length === 0}
    <p class="p-8 text-center text-gray-300 text-sm">No transactions match this filter</p>
    {/if}
  </div>


  <!-- ── TABLE FOOTER ── -->
  <div
    class="px-5 py-3 border-t border-gray-100 flex flex-wrap justify-between items-center gap-2 text-xs text-gray-400"
    style="background: linear-gradient(to right, #f8fffe, #f0faf9);"
  >
    <span>
      Showing <strong class="text-gray-600">{filtered.length}</strong>
      of <strong class="text-gray-600">{transactions.length}</strong> transactions
    </span>
    <span>Payment Gateway: <strong class="text-indigo-600">SubPaisa</strong></span>
  </div>

</div>

<!-- 
//////
<script lang="ts">
// import { checkApplied } from '$lib/api/api.js';
import { checkApplicationStatus, updateApplicationResponse } from '$lib/api/reprintapi';


   type TxnStatus = 'success' | 'failed' | 'aborted' | 'refunded' | 'unknown';

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
    raw?: Record<string, string>;
  }

  export let transactions: Transaction[] = [];
  export let searchedSeat: string        = '';

  let filterStatus = '';

  let modalOpen = false;
  let modalData: Record<string, string> | null = null;
  let modalTxnId = '';
  let matchedSubjects: any[] = [];

  // let modalData: Record<string, any> | null = null;


  // function openModal(t: Transaction) {
  //   modalTxnId = t.txnId;
  //   modalData  = t.raw ?? {};
  //   modalOpen  = true;
  //   console.log('Modal status value:', modalData?.status);
  // }

  async function openModal(t: Transaction) {
  modalTxnId       = t.txnId;
  modalData        = t.raw ?? {};
  modalOpen        = true;

  matchedSubjects  = [];

  if (t.status === 'success') {
    const seat        = String(t.raw?.udf2 ?? '');
    const recheckType = String(t.raw?.udf1 ?? '');
    const subjects    = Array.isArray(t.raw?.udf3)
      ? t.raw.udf3
      : String(t.raw?.udf3 ?? '').split(',').map(s => s.trim()).filter(Boolean);

   
    matchedSubjects  = result.matchedSubjects ?? [];
  }

 
}

  function closeModal() {
    modalOpen  = false;
    modalData  = null;
    modalTxnId = '';
    
   matchedSubjects  = [];    

  }

  $: filtered = filterStatus
    ? transactions.filter(t => t.status === filterStatus)
    : transactions;

  $: if (transactions) filterStatus = '';

  
  // function getStatusClass(status: TxnStatus): string {
  //   if (status === 'success') return 'bg-green-50 text-green-700 border border-green-100';
  //   if (status === 'failed')  return 'bg-red-50   text-red-600   border border-red-100';
  //   return                           'bg-amber-50 text-amber-600 border border-amber-100';
  // }

  // function getDotClass(status: TxnStatus): string {
  //   if (status === 'success') return 'bg-green-500';
  //   if (status === 'failed')  return 'bg-red-400';
  //   return                           'bg-amber-400';
  // }

  // function getStatusLabel(status: TxnStatus): string {
  //   if (status === 'success') return 'Success';
  //   if (status === 'failed')  return 'Failed';
  //   return                           'Pending';
  // }

  function getStatusClass(status: TxnStatus): string {
  if (status === 'success')  return 'bg-green-50 text-green-700 border border-green-100';
  if (status === 'failed')   return 'bg-red-50 text-red-600 border border-red-100';
  if (status === 'aborted')  return 'bg-orange-50 text-orange-600 border border-orange-100';
  if (status === 'refunded') return 'bg-purple-50 text-purple-600 border border-purple-100';
  return                            'bg-gray-50 text-gray-500 border border-gray-200';
}

function getDotClass(status: TxnStatus): string {
  if (status === 'success')  return 'bg-green-500';
  if (status === 'failed')   return 'bg-red-400';
  if (status === 'aborted')  return 'bg-orange-400';
  if (status === 'refunded') return 'bg-purple-400';
  return                            'bg-gray-400';
}

function getStatusLabel(status: TxnStatus): string {
  if (status === 'success')  return 'Success';
  if (status === 'failed')   return 'Failed';
  if (status === 'aborted')  return 'Aborted';
  if (status === 'refunded') return 'Refunded';
  return                            'Unknown';
}

  function formatAmount(amount: number): string {
    if (amount <= 0) return '—';
    return '₹' + amount.toLocaleString('en-IN');
  }

  // ──label map for modal display ──
  const fieldLabels: Record<string, string> = {
    payerName:        'Payer Name',
    payerEmail:       'Payer Email',
    payerMobile:      'Payer Mobile',
    clientTxnId:      'Client Txn ID',
    payerAddress:     'Payer Address',
    amount:           'Amount',
    clientCode:       'Client Code',
    paidAmount:       'Paid Amount',
    paymentMode:      'Payment Mode',
    bankName:         'Bank Name',
    status:           'Status',
    responseCode:     'Response Code',
    statusCode:       'Status Code',
    sabpaisaTxnId:    'SubPaisa Txn ID',
    sabpaisaMessage:  'SubPaisa Message',
    bankMessage:      'Bank Message',
    bankErrorCode:    'Bank Error Code',
    sabpaisaErrorCode:'SubPaisa Error Code',
    bankTxnId:        'Bank Txn ID',
    programId:        'Program ID',
    mcc:              'MCC',
    transDate:        'Transaction Date',
    rrn:              'RRN',
    udf1:             'UDF1',
    udf2:             'Seat No',
    udf3:             'Subject',
    udf13:            'UDF13',
    udf14:            'UDF14',
    udf15:            'UDF15',
    udf16:            'UDF16',
    udf17:            'UDF17',
    udf19:            'UDF19',
  };

//Top of modal showing
  const primaryFields = [
    'payerName','payerEmail','payerMobile','clientTxnId',
    'transDate','paidAmount','amount','paymentMode',
    'bankName','status','sabpaisaMessage','bankTxnId',
    'sabpaisaTxnId','sabpaisaErrorCode','rrn'
  ];

//   //Handel Insert  function 
//   function handleInsert(data: Record<string, string> | null) {
//   if (!data) return;
//   console.log('Insert transaction:', data);
//   // your insert logic here
// }

</script> -->
