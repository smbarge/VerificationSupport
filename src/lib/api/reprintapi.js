// REMOVE these — not needed for reprint
// const HSC_PREFIXES = ['...'];
// function getBoard(seat) { ... }

export async function fetchTransactions(seat, phone = null) {

  // ADD these logs
  console.log('fetchTransactions called with seat:', seat, 'phone:', phone);

  let res;

  if (phone) {
    res = await fetch(`/api/reprint/transactions?phone=${encodeURIComponent(phone)}`);
  } else if (seat) {
    res = await fetch(`/api/reprint/transactions?seat=${encodeURIComponent(seat)}`);
  } else {
    return { error: 'No seat or phone provided' };
  }

  const data = await res.json();
  console.log('Reprint Data ...', data);

  if (!res.ok || data.error) {
    return { error: data.errormsg || data.errorMsg || 'Something went wrong' };
  }

  const transactions = data.responses.map((item) => {
    const r = item.response;
    return {
      txnId:   item.client_txn_id,
      date:    r.transDate ?? '',
      seat:    item.seat_no ?? '—', 
      time:    '',
      type:    Array.isArray(r.udf3) ? r.udf3.join(', ') : (r.udf3 ?? 'Reprint'),
      amount:  parseFloat(r.paidAmount) || parseFloat(r.amount) || 0,
      status:  getStatus(r.status),
      mode:    r.paymentMode ?? 'N/A',
      gateway: 'SubPaisa',
      ref:     r.clientTxnId ?? '',
      raw:     r,
    };
  }).sort((a, b) => {
    const toDate = (str) => {
      if (!str) return 0;
      const [dd, mm, yyyy] = str.split('/');
      return new Date(`${yyyy}-${mm}-${dd}`).getTime();
    };
    return toDate(b.date) - toDate(a.date);
  });

  // No board field — just what's in the DB
  const infoSource = data.responses.find(
    (item) => item.response?.payerName && item.response.payerName !== 'null'
  )?.response ?? {};

  const mobileSource = data.responses.find(
    (item) => item.response?.payerMobile && item.response.payerMobile !== 'null'
  )?.response ?? {};

  const studentInfo = {
    name:   infoSource.payerName                                           || '—',
    email:  infoSource.payerEmail   === 'null' ? '—' : (infoSource.payerEmail   || '—'),
    mobile: mobileSource.payerMobile === 'null' ? '—' : (mobileSource.payerMobile || '—'),
    seat: data.responses?.[0]?.seat_no || seat || '—',
  };

  console.log("Information student ...",studentInfo);


  return { studentInfo, transactions };
}

function getStatus(val) {
  if (!val) return 'unknown';
  const s = val.toUpperCase();
  if (s === 'SUCCESS'  || s === 'CAPTURED')                     return 'success';
  if (s === 'FAILED'   || s === 'FAILURE')                      return 'failed';
  if (s === 'ABORTED')                                          return 'aborted';
  if (s === 'REFUND'   || s === 'REFUNDED' || s === 'REFUND_INITIATED') return 'refunded';
  return 'unknown';
}


// Check application status by temp_id (udf1)
export async function checkApplicationStatus(tempId) {
  try {
    console.log('Calling checkApplicationStatus with tempId:', tempId);

    const res  = await fetch(`/api/reprint/updateresponse?temp_id=${encodeURIComponent(tempId)}`);
    const data = await res.json();

    console.log('checkApplicationStatus response:', data);

    if (data.error && data.error !== 0) {
      return { error: data.errorMsg || 'Not found', application: null };
    }

    return { error: null, application: data.application };
  } catch (err) {
    console.error('checkApplicationStatus error:', err);
    return { error: err.message, application: null };
  }
}

// Update application with payment response
export async function updateApplicationResponse({ temp_id, client_trans_id, sabpaisa_trans_id }) {
  try {
    const res = await fetch(`/api/reprint/updateresponse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temp_id, client_trans_id, sabpaisa_trans_id })
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      return { error: data.errorMsg || 'Update failed' };
    }

    return { error: null, updated: data.updated };
  } catch (err) {
    return { error: err.message };
  }
}