// ── HSC seat prefixes ──
const HSC_PREFIXES = ['P','N','R','M','X','V','S','T','W'];

function getBoard(seat) {
  const firstLetter = seat.trim().charAt(0).toUpperCase();
  return HSC_PREFIXES.includes(firstLetter) ? 'HSC' : 'SSC';
}

export async function fetchTransactions(seat) {
  const board    = getBoard(seat);
  const endpoint = board === 'HSC'
    ? `/api/transactions?seat=${encodeURIComponent(seat)}`
    : `/api/ssc_transactions?seat=${encodeURIComponent(seat)}`;

  const res  = await fetch(endpoint);
  const data = await res.json();

console.log("Data ...", data);

  if (!res.ok) {
    return { error: data.error || 'Something went wrong' };
  }

  const transactions = data.responses.map((item) => {
    const r = item.response;
    return {
      txnId:   item.client_txn_id,
      date:    r.transDate ?? '',
      time:    '',
      type:    Array.isArray(r.udf3) ? r.udf3.join(', ') : (r.udf3 ?? 'Fee Payment'),
      recheckType: r.udf1 ?? '',
      amount:  parseFloat(r.paidAmount) || parseFloat(r.amount) || 0,
      status:  getStatus(r.status),
      mode:    r.paymentMode ?? 'N/A',
      gateway: 'SubPaisa',
      ref:     r.clientTxnId ?? '',
      raw:     r,
    };
  })
    .sort((a, b) => {
    const toDate = (str) => {
      if (!str) return 0;
      const [dd, mm, yyyy] = str.split('/');
      return new Date(`${yyyy}-${mm}-${dd}`).getTime();
    };
    return toDate(b.date) - toDate(a.date);
  });


//   const studentInfo = {
//   name:   data.responses[0]?.response?.payerName  ?? '',
//   email:  data.responses[0]?.response?.payerEmail ?? '',
//   mobile: data.responses[0]?.response?.payerMobile ?? '',
//   seat:   seat,
//   board:  board,
// };


const infoSource = data.responses.find(
  (item) => item.response?.payerName && item.response.payerName !== 'null'
)?.response ?? {};

const mobileSource = data.responses.find(
  (item) => item.response?.payerMobile && item.response.payerMobile !== 'null'
)?.response ?? {};

const studentInfo = {
  name:   infoSource.payerName                                          || '—',
  email:  infoSource.payerEmail   === 'null' ? '—' : (infoSource.payerEmail  || '—'),
  mobile: mobileSource.payerMobile === 'null' ? '—' : (mobileSource.payerMobile || '—'),
  seat:   seat,
  board:  board,
};

console.log("Information student ...",studentInfo);
//console.log("Raw response[0]:", data.responses[0]?.response);
  return {
    studentInfo,
    transactions,    
  };

}

// function getStatus(val) {
//   if (!val) return 'NA';
//   const s = val.toUpperCase();
//   if (s === 'SUCCESS'  || s === 'CAPTURED') return 'success';
//   if (s === 'FAILED'   || s === 'FAILURE')  return 'failed';
//   if (s === 'ABORTED')                      return 'failed';
//   return 'NA';
// }

function getStatus(val) {
  if (!val) return 'unknown';
  const s = val.toUpperCase();
  if (s === 'SUCCESS'  || s === 'CAPTURED')        return 'success';
  if (s === 'FAILED'   || s === 'FAILURE')          return 'failed';
  if (s === 'ABORTED')                              return 'aborted';
  if (s === 'REFUND'   || s === 'REFUNDED'
                       || s === 'REFUND_INITIATED') return 'refunded';
  return 'unknown';  
}


export async function checkApplied(seat, recheckType, subjects = []) {
  try {
    const subjectsParam = subjects.join(',');
    const res = await fetch(
      `/api/check_inserted?seat=${encodeURIComponent(seat)}&recheck_type=${encodeURIComponent(recheckType)}&subjects=${encodeURIComponent(subjectsParam)}`
    );
    const result = await res.json();
    return {
      applied:         result.applied         ?? false,
      allApplied:      result.allApplied      ?? false,
      matchedSubjects: result.matchedSubjects ?? [],
    };
  } catch (err) {
    return { applied: false, allApplied: false, matchedSubjects: [], error: err.message };
  }
}

// ── Insert Response → calls saveResponseData ──
export async function insertResponse(data) {
  try {
    const res    = await fetch('/api/insert_response', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) return { error: result.error || 'Insert response failed' };
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

// ── Insert Transaction → calls addRecheckApplication ──
export async function insertTransaction(data) {
  try {
    const res    = await fetch('/api/insert?type=recheck', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) return { error: result.error || 'Insert failed' };
    return { success: true, message: result.message };
  } catch (err) {
    return { error: err.message };
  }
}

export async function fetchRecheckTransactions(seat) {

  const board = getBoard(seat);

  // ── Dynamic API selection ──
  const endpoint =
    board === 'HSC'
      ? `/api/check_recheckdata?seat=${encodeURIComponent(seat)}`
      : `/api/check_recheckdata?seat=${encodeURIComponent(seat)}`;

  try {

    const res  = await fetch(endpoint);
    const data = await res.json();

    console.log('Recheck Transactions...', data);

    if (!res.ok) {
      return {
        error: data.errorMsg || 'Something went wrong',
        transactions: []
      };
    }

    // ── Format response ──
   const transactions = (data.data || []).map((row) => ({
    sr_no:                  row.sr_no,
    recheck_application_id: row.recheck_application_id,
    seat_no:                row.seat_no,
    divn_code:              row.divn_code,
    recheck_type:           row.recheck_type,
    status:                 row.status,
    date:                   row.date,
    delivery_type:          row.delivery_type,
    sabpaisa_trans_id:      row.sabpaisa_trans_id,
    client_trans_id:        row.client_trans_id,
    subjects:               row.subjects || []
}));

    return {
      error: null,
      transactions
    };

  } catch (err) {

    console.error(err);

    return {
      error: err.message,
      transactions: []
    };
  }
}




