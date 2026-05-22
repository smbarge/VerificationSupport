<script lang="ts">
  import * as XLSX from "xlsx";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { isAuthenticated } from "$lib/stores/auth";
  import { json } from "@sveltejs/kit";

  onMount(() => {
    if (!get(isAuthenticated)) goto("/login");
  });

  const BOARD = "HSC";

  let uploadFile: File | null = null;
  let uploading = false;
  let successMsg = "";
  let errorMsg = "";
  let parsedData: any[] = [];
  let previewRows: any[] = [];
  let fileError = "";

  let fileParsed = false;

  let currentPage = 1;
  const pageSize = 100;

  $: totalPages = Math.ceil(parsedData.length / pageSize);
  $: pagedRows = parsedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  function prevPage() {
    if (currentPage > 1) currentPage--;
  }
  function nextPage() {
    if (currentPage < totalPages) currentPage++;
  }
  function goToPage(p: number) {
    currentPage = p;
  }

  function handleFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    uploadFile = input.files?.[0] ?? null;
    successMsg = "";
    errorMsg = "";
    fileError = "";
    parsedData = [];
    previewRows = [];
    currentPage = 1;

    if (!uploadFile) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        parsedData = jsonData as any[];

        parsedData = parsedData.filter((row: any) => {
          const udf15 = String(row.Udf15 || "").trim();

          const firstPart = udf15.split("_")[0];

          return firstPart === "HSC";
        });

        
        fileParsed = true;

        console.log("parseData.....", parsedData);

        previewRows = parsedData.slice(0, 5);

        if (parsedData.length === 0) {
          fileError = "File is empty or has no valid data.";
        }
      } catch (err) {
        fileError =
          "Failed to read file. Please ensure it is a valid Excel/CSV file.";
      }
    };

    reader.onerror = () => {
      fileError = "Error reading file.";
    };
    reader.readAsArrayBuffer(uploadFile);
  }

  async function handleSubmit() {
    if (!uploadFile) {
      errorMsg = "Please select a file before submitting.";
      return;
    }
    if (parsedData.length === 0) {
      errorMsg = "No valid data found in the file.";
      return;
    }

    uploading = true;
    errorMsg = "";
    successMsg = "";

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("board", BOARD);
      formData.append("parsedData", JSON.stringify(parsedData));

      const res = await fetch("/api/refund", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (!res.ok || data.error) {
        errorMsg = data.errorMsg || "Upload failed. Please try again.";
      } else {
        parsedData = data.sabpaisaData || []
        successMsg = `File uploaded successfully. ${data.processed ?? parsedData.length} records processed.`;
        currentPage = 1;
      }
    } catch (err) {
      errorMsg = "Network error. Please try again.";
    } finally {
      uploading = false;
    }
  }

  function goBack() {
    goto("/verification/dashboard");
  }

  const DISPLAY_COLUMNS = [
  'Trans ID',
  'Client Trans ID',
  'Paid Amount',
  'Payment Status',
  'Payee Mob number',
  'Client Code',
  'Payment Mode',
  'Udf1',
  'Udf2',
  'Udf3',
  'Udf15',
  'tag',
  'dbTag',
  'recheck_application_id',
  'Refund Status',
];

// ── Search & Filter state ──

let searchSeat   = '';
let searchMobile = '';
let activeFilter: 'all' | 'single' | 'duplicate' | 'notfound' = 'all';

$: filteredData = parsedData.filter((row: any) => {
  const q = searchSeat.trim().toLowerCase();
  const searchMatch = !q
    || String(row.Udf2 || '').toLowerCase().includes(q)
    || String(row['Payee Mob number'] || '').includes(q);

  let tagMatch = true;
  if (activeFilter === 'single')    tagMatch = row.tag   === 'single';
  if (activeFilter === 'duplicate') tagMatch = row.tag   === 'duplicate';
  if (activeFilter === 'notfound')  tagMatch = row.dbTag === 'NotInDB';

  return searchMatch && tagMatch;
}).map((row: any) => ({
  ...row,
  'Refund Status': refundStatus[row['Trans ID']] ?? row['Refund Status'] ?? '',
}));

$: countSingle   = parsedData.filter(r => r.tag   === 'single').length;
$: countDouble   = parsedData.filter(r => r.tag   === 'duplicate').length;
$: countNotFound = parsedData.filter(r => r.dbTag === 'NotInDB').length;
$: showSummary   = activeFilter !== 'all';
$: if (globalSearch !== undefined) currentPage = 1;


let globalSearch = '';
$: searchedRows = parsedData.filter((row: any) => {
  if (!globalSearch.trim()) return true;
  const q = globalSearch.trim().toLowerCase();
  return Object.values(row).some(v => String(v).toLowerCase().includes(q));
}).map((row: any) => ({
  ...row,
  'Refund Status': refundStatus[row['Trans ID']] ?? row['Refund Status'] ?? '',
}));
$: totalSearchPages = Math.ceil(searchedRows.length / pageSize);
$: pagedSearchRows  = searchedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);


function resetSearch() {
  searchSeat   = '';
  searchMobile = '';
  activeFilter = 'all';
  globalSearch = '';
}

// ── Refund status per row
let refundStatus: Record<string, string> = {};

function setRefundStatus(transId: string, value: string) {
  refundStatus[transId] = value;
  refundStatus = { ...refundStatus };
}

function downloadFilteredExcel() {
  const exportData = filteredData.map((row: any, idx: number) => ({
    'Sr No':                    idx + 1,
    'Client Trans ID':          row['Client Trans ID']          ?? '',
    'Trans ID':                 row['Trans ID']                 ?? '',
    'Seat No':                  row.Udf2                        ?? '',
    'Mobile':                   row['Payee Mob number']         ?? '',
    'Paid Amount':              row['Paid Amount']              ?? '',
    'Payment Status':           row['Payment Status']           ?? '',
    'Payment Mode':             row['Payment Mode']             ?? '',
    'Client Code':              row['Client Code']              ?? '',
    'Udf1':                     row.Udf1                        ?? '',
    'Udf3':                     row.Udf3                        ?? '',
    'Udf15':                    row.Udf15                       ?? '',
    'Tag':                      row.tag                         ?? '',
    'DB Tag':                   row.dbTag                       ?? '',
    'Recheck Application ID':   row.recheck_application_id      ?? '',
    'Refund Status':            row['Refund Status']            ?? '',
  }));

  const ws   = XLSX.utils.json_to_sheet(exportData);
  const wb   = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Filtered Summary');
  XLSX.writeFile(wb, `filtered_summary_${BOARD}_${new Date().toISOString().slice(0,10)}.xlsx`);
}
  
</script>

<!-- PAGE LAYOUT -->
<div class="min-h-screen flex flex-col bg-gray-50">

  <!-- HEADER -->
  <header style="background-color: #2bbcb0;" class="shadow-md">
    <div class="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
      <div
        class="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-white/40 shadow-lg bg-white"
      >
        <img
          src="/image/MSBImage.png"
          alt="MSBSHSE Logo"
          class="w-full h-full object-cover"
        />
      </div>
      <div class="flex-1">
        <h1
          class="text-white font-bold text-base sm:text-lg tracking-wide uppercase leading-tight"
        >
          Maharashtra State Board of Secondary & Higher Secondary Education,
          Pune
        </h1>
        <p class="text-white/75 text-xs mt-0.5 tracking-wider">
          Fee Transaction Verification Portal
        </p>
      </div>
      <div
        class="hidden md:flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"
      >
        <span class="w-2 h-2 rounded-full bg-green-300 animate-pulse"></span>
        <span class="text-white text-xs font-medium">SubPaisa Active</span>
        <button
          onclick={goBack}
          class="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-full transition-all"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-3.5 h-3.5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"
            />
          </svg>
          <span class="text-white text-xs font-medium">Back</span>
        </button>
      </div>
    </div>
  </header>

  <!-- SUB HEADER -->
  <div class="bg-[#1a3a6b] py-2 px-4">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <p class="text-blue-200 text-xs">
        Student Fee Payment Refund System :
        <span class="font-semibold text-white">({BOARD}) Refund Upload</span>
      </p>
      <p class="text-blue-300 text-xs hidden sm:block">
        Academic Year: 2025-26
      </p>
    </div>
  </div>

  <!-- MAIN CONTENT -->
  <main class="flex-1 w-full max-w-7xl mx-auto px-2 py-6 space-y-4">

    <!-- Success -->
    {#if successMsg}
      <div
        class="bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-3 items-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-5 h-5 text-green-500 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
        <p class="text-green-700 text-sm font-medium">{successMsg}</p>
      </div>
    {/if}

    <!-- Error -->
    {#if errorMsg}
      <div
        class="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 items-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-5 h-5 text-red-400 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
        </svg>
        <p class="text-red-600 text-sm font-medium">{errorMsg}</p>
      </div>
    {/if}

    <!-- Left - Upload  and right - filterd data  -->

    <div class="flex flex-col lg:flex-row gap-4 items-start">

      <!-- LEFT -->
       <div class="w-full lg:w-[400px] flex-shrink-0 space-y-3">
        <div
          class="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden"
        >
          <div class="px-5 py-3" style="background-color: #1a3a6b;">
            <h2
              class="text-white font-semibold text-sm flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              Upload Refund File
            </h2>
          </div>

          <div class="p-4">
            <label
              class="flex flex-col items-center justify-centre border-2 rounded-xl p-10 cursor-pointer transition-all
                   {uploadFile
                ? 'border-[#2bbcb0] bg-teal-50'
                : 'border-dashed border-gray-200 hover:border-[#2bbcb0] hover:bg-teal-50/30'}"
            >
              <div
                class="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style="background-color: {uploadFile ? '#d1faf4' : '#f3f4f6'};"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-7 h-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="1.5"
                  style="color: {uploadFile ? '#2bbcb0' : '#9ca3af'};"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
              </div>

              {#if uploadFile}
                <p class="text-sm font-bold text-[#2bbcb0] text-center">
                  {uploadFile.name}
                </p>
                <p class="text-xs text-teal-500 mt-1">Click to change file</p>
              {:else}
                <p class="text-sm font-bold text-gray-700 text-center">
                  Click to upload or drag & drop
                </p>
                <p class="text-xs text-gray-400 mt-1 text-center">
                  Supported formats
                </p>
                <div class="flex items-center gap-2 mt-3">
                  <span
                    class="text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-700"
                    >.xlsx</span
                  >
                  <span class="text-xs text-gray-300">|</span>
                  <span
                    class="text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-700"
                    >.xls</span
                  >
                  <span class="text-xs text-gray-300">|</span>
                  <span
                    class="text-xs font-semibold px-3 py-1 rounded-full bg-blue-100 text-blue-700"
                    >.csv</span
                  >
                </div>
              {/if}
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                class="hidden"
                onchange={handleFileChange}
              />
            </label>

            <p class="text-xs text-gray-400 text-center mt-4">
              Ensure the file contains valid seat numbers and transaction IDs
              before uploading.
            </p>

            <!-- File Error inside upload card -->
            {#if fileError}
              <p class="text-red-500 text-xs text-center mt-3">{fileError}</p>
            {/if}
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3">
          <button
            onclick={goBack}
            class="flex-1 h-11 border-2 border-gray-200 text-gray-500 text-sm font-medium rounded-xl hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            onclick={handleSubmit}
            disabled={uploading || !uploadFile}
            class="flex-1 h-11 text-white text-sm font-semibold rounded-xl hover:opacity-90 active:scale-95 transition-all shadow flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style="background-color: #2bbcb0;"
          >
            {#if uploading}
              <div
                class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
              ></div>
              Uploading...
            {:else}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              Submit Refund File
            {/if}
          </button>
        </div>
      </div>

      <!--  RIGHT-->
       {#if fileParsed && parsedData.length > 0 && showSummary}
      <div class="flex-1 min-w-0">
        <div class="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
          <div class="px-5 py-3 flex items-center justify-between" style="background-color: #1a3a6b;">
            <h2 class="text-white font-semibold text-sm flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M3 6h18M3 14h18M3 18h18"/>
              </svg>
              Filtered Summary
            </h2>
           <span class="text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white">
              {filteredData.length} records
            </span>
            <button
              onclick={downloadFilteredExcel}
              class="flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-semibold text-white border border-white/30
                     bg-white/15 hover:bg-white/25 transition-all active:scale-95"
              title="Download filtered data as Excel"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
              Download
            </button>
          </div>

          <div class="overflow-x-auto max-h-[460px] overflow-y-auto">

            <table class="w-full text-xs border-collapse">
              <thead>
                <tr style="background-color: #1a3a6b;">
                  <th class="px-3 py-2.5 text-left text-blue-200 font-semibold uppercase tracking-wider">#</th>
                  <th class="px-3 py-2.5 text-left text-blue-200 font-semibold uppercase tracking-wider">Client Txn ID</th>
                  <th class="px-3 py-2.5 text-left text-blue-200 font-semibold uppercase tracking-wider">Seat No</th>
                  <th class="px-3 py-2.5 text-left text-blue-200 font-semibold uppercase tracking-wider">Mobile</th>
                  <th class="px-3 py-2.5 text-right text-blue-200 font-semibold uppercase tracking-wider">Amount</th>
                  <th class="px-3 py-2.5 text-center text-blue-200 font-semibold uppercase tracking-wider">Tag</th>
                  <th class="px-3 py-2.5 text-center text-blue-200 font-semibold uppercase tracking-wider">DB Tag</th>
                  <th class="px-3 py-2.5 text-center text-blue-200 font-semibold uppercase tracking-wider">Refund Status</th>

                </tr>
              </thead>
              <tbody>
                {#each filteredData as row, i}
                <tr class="border-b border-gray-50 {i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-teal-50/30 transition-colors">
                  <td class="px-3 py-2 text-gray-400">{i + 1}</td>
                  <td class="px-3 py-2 font-mono text-gray-500">{row['Client Trans ID'] ?? '—'}</td>
                  <td class="px-3 py-2 font-semibold text-gray-800">{row.Udf2 ?? '—'}</td>
                  <td class="px-3 py-2 font-mono text-gray-600">{row['Payee Mob number'] ?? '—'}</td>
                  <td class="px-3 py-2 text-right font-semibold text-gray-800">
                    ₹{Number(row['Paid Amount'] || 0).toLocaleString('en-IN')}
                  </td>
                  <td class="px-3 py-2 text-center">
                    {#if row.tag === 'single'}
                      <span class="bg-teal-100 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full">single</span>
                    {:else if row.tag === 'duplicate'}
                      <span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Duplicate</span>
                    {:else}
                      <span class="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{row.tag ?? '—'}</span>
                    {/if}
                  </td>
                  <td class="px-3 py-2 text-center">
                    {#if row.dbTag === 'found'}
                      <span class="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full">found</span>
                    {:else if row.dbTag === 'NotInDB'}
                      <span class="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Not in DB</span>
                    {:else}
                      <span class="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{row.dbTag ?? '—'}</span>
                    {/if}
                  </td>

                   <!-- Refund Status -->
                  <td class="px-3 py-2 text-center">
                    {#if row['Refund Status'] === 'Refund'}
                      <span class="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Refund</span>
                    {:else if row['Refund Status'] === 'Not Refund'}
                      <span class="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Not Refund</span>
                    {:else}
                      <span class="bg-gray-100 text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded-full">—</span>
                    {/if}
                  </td>
                </tr>
                {/each}
                {#if filteredData.length === 0}
                <tr>
                  <td colspan="7" class="px-4 py-10 text-center text-gray-300">No records match your search or filter</td>
                </tr>
                {/if}
              </tbody>
            </table>
          </div>
        </div>
      </div>
       {/if}

    </div>

    {#if fileParsed && parsedData.length > 0}
     <!-- Search Card -->
      <div class="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
        <div class="px-5 py-3" style="background-color: #1a3a6b;">
          <h2 class="text-white font-semibold text-sm flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
            </svg>
            Search & Filter Records
          </h2>
        </div>
        <div class="p-4 space-y-3">

          <!-- Search Input by Email and phone Number -->
          <!-- <div class="flex flex-wrap gap-3 items-end">
            <div class="flex flex-col gap-1 flex-1 min-w-[220px]">
              <label class="text-xs font-semibold text-gray-500">Search by Seat Number or Mobile Number</label>
              <input
                bind:value={searchSeat}
                oninput={(e) => { searchSeat = e.currentTarget.value; searchMobile = e.currentTarget.value; }}
                type="text"
                placeholder="Enter seat number or mobile number..."
                class="h-10 border-2 border-gray-200 rounded-xl px-4 text-sm text-gray-800
                      focus:outline-none focus:border-[#2bbcb0] transition-colors placeholder-gray-300"
              />
            </div>
            <button
              onclick={resetSearch}
              class="h-10 px-5 border-2 border-gray-200 text-gray-500 text-sm font-medium rounded-xl hover:bg-gray-50 transition-all"
            >↺ Reset</button>
          </div> -->

          <!-- Filter Buttons -->
          <div class="border-t border-gray-100 pt-3 flex flex-wrap items-center gap-2">
            <span class="text-xs font-semibold text-gray-400">Filter:</span>

            <button onclick={() => activeFilter = 'single'}
              class="h-8 px-4 rounded-full text-xs font-semibold border-2 transition-all
                    {activeFilter === 'single' ? 'bg-[#2bbcb0] border-[#2bbcb0] text-white' : 'bg-teal-50 border-[#2bbcb0] text-teal-800 hover:bg-teal-100'}">
              Single <span class="ml-1 text-[10px] font-bold opacity-70">{countSingle}</span>
            </button>

            <button onclick={() => activeFilter = 'notfound'}
              class="h-8 px-4 rounded-full text-xs font-semibold border-2 transition-all
                    {activeFilter === 'notfound' ? 'bg-red-500 border-red-500 text-white' : 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100'}">
              Not Found <span class="ml-1 text-[10px] font-bold opacity-70">{countNotFound}</span>
            </button>

            <button onclick={() => activeFilter = 'duplicate'}
              class="h-8 px-4 rounded-full text-xs font-semibold border-2 transition-all
                    {activeFilter === 'duplicate' ? 'bg-amber-500 border-amber-500 text-white' : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'}">
              Duplicate <span class="ml-1 text-[10px] font-bold opacity-70">{countDouble}</span>
            </button>

            {#if activeFilter !== 'all'}
              <button onclick={() => activeFilter = 'all'}
                class="h-8 px-3 rounded-full text-xs font-semibold border-2 border-gray-200 text-gray-400 hover:bg-gray-50 transition-all">
                ✕ Clear
              </button>
            {/if}
          </div>

        </div>
      </div>

    <!--EXCEL TABLE DATA -->
      <div
        class="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden"
      >
      <!-- Preview Card Header -->
      <div
          class="px-5 py-3 flex items-center justify-between"
          style="background-color: #1a3a6b;"
        >
          <h2 class="text-white font-semibold text-sm flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M3 6h18M3 14h18M3 18h18"/>
            </svg>
            Excel Data Preview
          </h2>
          <div class="flex items-center gap-2">
            <input
              bind:value={globalSearch}
              type="text"
              placeholder="Search all records..."
              class="h-8 bg-white/15 border border-white/30 rounded-lg px-3 text-xs text-white placeholder-white/50
                     focus:outline-none focus:bg-white/25 transition-all w-48"
            />
            <span class="text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white">
              {searchedRows.length} rows
            </span>
            <span class="text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white">
              {parsedData.length} rows found
            </span>
          </div>
        </div>

       {#if Object.keys(refundStatus).length > 0}
        <div class="relative h-0 overflow-visible z-20">
          <div class="absolute right-4 top-2">
            <button
              onclick={() => {
                parsedData = parsedData.map(row => ({
                  ...row,
                  'Refund Status': refundStatus[row['Trans ID']] ?? row['Refund Status'] ?? '',
                }));
                refundStatus = {};
              }}
              class="h-8 px-4 rounded-lg text-xs font-bold text-white shadow-lg transition-all hover:opacity-90 active:scale-95"
              style="background-color: #2bbcb0;"
            >
            Save Changes
            </button>
          </div>
        </div>
        {/if}

        <!-- Scrollable Table -->
        <div class="overflow-x-auto w-full">
          <table class="w-full text-xs border-collapse">
            <thead>
              <tr style="background-color: #f0fdf9;">
                <th
                  class="px-4 py-3 text-left text-gray-500 font-bold border-b border-gray-100 whitespace-nowrap sticky left-0 bg-[#f0fdf9]"
                >
                  Sr No
                </th>
                <!-- {#each Object.keys(parsedData[0]) as col}
                  <th
                    class="px-4 py-3 text-left font-bold border-b border-gray-100 whitespace-nowrap"
                    style="color: #1a3a6b;"
                  >
                    {col}
                  </th>
                {/each} -->

                {#each DISPLAY_COLUMNS as col}
                  <th class="px-4 py-3 text-left font-bold border-b border-gray-100 whitespace-nowrap"
                      style="color: #1a3a6b;">
                    {col}
                  </th>
                {/each}
              </tr>
            </thead>
            <tbody>

              <!-- change -->
               
               {#each pagedSearchRows as row, i}
            <tr class="border-b border-gray-50 {i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-teal-50/30 transition-colors">
              <td class="px-4 py-2.5 font-semibold text-gray-400 whitespace-nowrap sticky left-0 {i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}">
                {(currentPage - 1) * pageSize + i + 1}
              </td>

              {#each DISPLAY_COLUMNS as col}
                {#if col === 'Refund Status'}
                  <td class="px-4 py-2 whitespace-nowrap">
                    <div class="flex items-center gap-1.5">
                      <select
                        value={refundStatus[row['Trans ID']] ?? row['Refund Status'] ?? ''}
                        onchange={(e) => setRefundStatus(row['Trans ID'], e.currentTarget.value)}
                        class="h-7 border border-gray-200 rounded-lg px-2 text-xs text-gray-700
                              focus:outline-none focus:border-[#2bbcb0] transition-colors bg-white"
                      >
                        <option value="">-- Select --</option>
                        <option value="Refund">Refund</option>
                        <option value="Not Refund">Not Refund</option>
                      </select>

                    </div>
                  </td>
                {:else}
                  <td class="px-4 py-2.5 text-gray-700 whitespace-nowrap">{row[col] ?? '—'}</td>
                {/if}
              {/each}
            </tr>
          {/each}
            </tbody>
          </table>
          <!-- {JSON.stringify(pagedSearchRows.slice(0,2),null,2)} -->
        </div>

        <!--PAGINATION FOOTER -->
        <div
          class="px-5 py-3 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-3"
        >
          <!-- Left: record info -->
          <p class="text-xs text-gray-400">
            Showing
            <span class="font-semibold text-gray-600"
              >{(currentPage - 1) * pageSize + 1}</span
            >
            –
            <span class="font-semibold text-gray-600"
              >{Math.min(currentPage * pageSize, parsedData.length)}</span
            >
            of
            <span class="font-semibold text-gray-600">{searchedRows.length}</span>
            records
          </p>

          <!-- Right: pagination controls -->
          <div class="flex items-center gap-1">
            <!-- Prev -->
            <button
              onclick={prevPage}
              disabled={currentPage === 1}
              class="h-7 w-7 flex items-center justify-start rounded-lg border border-gray-200
               text-gray-500 hover:bg-teal-50 hover:border-[#2bbcb0] hover:text-[#2bbcb0]
               disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs"
              >‹</button
            >

            <!-- Page Numbers -->
            {#each Array.from({ length: totalSearchPages }, (_, i) => i + 1) as page}
              {#if page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)}
                <button
                  onclick={() => goToPage(page)}
                  class="h-7 min-w-[28px] px-1.5 flex items-center justify-start rounded-lg border text-xs font-semibold transition-all
                   {currentPage === page
                    ? 'text-white border-[#2bbcb0]'
                    : 'border-gray-200 text-gray-500 hover:bg-teal-50 hover:border-[#2bbcb0] hover:text-[#2bbcb0]'}"
                  style={currentPage === page
                    ? "background-color: #2bbcb0;"
                    : ""}>{page}</button
                >
              {:else if page === currentPage - 2 || page === currentPage + 2}
                <span class="text-gray-300 text-xs px-0.5">…</span>
              {/if}
            {/each}

            <!-- Next -->
            <button
              onclick={nextPage}
              disabled={currentPage === totalSearchPages}
              class="h-7 w-7 flex items-center justify-start rounded-lg border border-gray-200
               text-gray-500 hover:bg-teal-50 hover:border-[#2bbcb0] hover:text-[#2bbcb0]
               disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs"
              >›</button
            >
          </div>
        </div>
      </div>
    {/if}
  </main>
</div>
