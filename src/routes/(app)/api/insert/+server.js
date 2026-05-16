import { error, json } from '@sveltejs/kit';
import HSCdb from '$lib/server/db.js';
import SSCdb from '$lib/server/SSCdb.js';
import { addRecheckApplication }           from '$lib/server/recheckSSC.js';
import { addRecheckApplication as addHSC } from '$lib/server/recheckHSC.js';

const HSC_PREFIXES = ['P','N','R','M','X','V','S','T','W'];

function getBoard(seat) {
  return HSC_PREFIXES.includes(seat?.trim().charAt(0).toUpperCase()) ? 'HSC' : 'SSC';
}

export async function POST({ request }) {
  try {
    const body        = await request.json();
    console.log("Inserted data is this ......******",body);
    const seat        = body.udf2 ?? '';
    const board       = getBoard(seat);
    const db          = board === 'HSC' ? HSCdb : SSCdb;
    const recheckType = parseInt(body.udf1 ?? '1');

    // ── Fetch delivery_type, address_id from pending_recheck_application ──
    const pendingResult = await db.query(
      `SELECT delivery_type, address_id, pending_recheck_application_id
       FROM pending_recheck_application
       WHERE seat_no = $1
         AND recheck_type = $2
       LIMIT 1`,
      [seat, recheckType]
    );

    if (pendingResult.rows.length === 0) {
      return json({ error: -1, errorMsg: 'No pending recheck application found' }, { status: 404 });
    }

    const pending                     = pendingResult.rows[0];
    const deliveryType                = pending.delivery_type ?? null;
    const addressId                   = pending.address_id    ?? null;
    const pendingRecheckApplicationId = pending.pending_recheck_application_id;

    console.log(
      "Data is Below....:",
      pending,
      deliveryType,
      addressId,
      pendingRecheckApplicationId
    );

    // ── Map subject names → subj_codes ──
    const subjectNames = Array.isArray(body.udf3)
      ? body.udf3
      : String(body.udf3 ?? '').split(',').map(s => s.trim()).filter(Boolean);

    const subjectResult = await db.query(
      `SELECT subj_code, subj_name FROM subject_master
       WHERE UPPER(TRIM(subj_name)) = ANY($1)`,
      [subjectNames.map(s => s.trim().toUpperCase())]
    );

    const subjectCodes = subjectResult.rows.map(r => ({ subjCode: r.subj_code, url: null }));

    if (subjectCodes.length === 0) {
      return json({ error: -1, errorMsg: 'No matching subjects found' }, { status: 400 });
    }

    const result = board === 'HSC'
      ? await addHSC({
          db, 
          pendingRecheckApplicationId,
          seatNo: seat,
          subjectCodes, 
          recheckType,
          deliveryType, 
          addressId,
          clientTransId:   body.clientTxnId,
          sabpaisaTransId: body.sabpaisaTxnId,
        })
      : await addRecheckApplication({
          db, 
          pendingRecheckApplicationId,
          seatNo: seat,
          subjectCodes, 
          recheckType,
          deliveryType, 
          addressId,
          clientTransId:   body.clientTxnId,
          sabpaisaTransId: body.sabpaisaTxnId,
        });

    if (result.error !== 0) {
      return json({ error: -1, errorMsg: result.errorMsg }, { status: 500 });
    }

    return json({ error: 0, errorMsg: 'Inserted successfully' });

  } catch (err) {
    console.error('insert error:', err);
    return json({ error: -1, errorMsg: err.message }, { status: 500 });
  }
}



// import { json } from '@sveltejs/kit';
// import HSCdb from '$lib/server/db.js';
// import SSCdb from '$lib/server/SSCdb.js';
// import { saveResponseData, addRecheckApplication }           from '$lib/server/recheckSSC.js';
// import { saveResponseData as saveHSC, addRecheckApplication as addHSC } from '$lib/server/recheckHSC.js';

// const HSC_PREFIXES = ['P','N','R','M','X','V','S','T','W'];

// function getBoard(seat) {
//   return HSC_PREFIXES.includes(seat?.trim().charAt(0).toUpperCase()) ? 'HSC' : 'SSC';
// }

// // ── POST /api/insert?type=response   → saveResponseData only
// // ── POST /api/insert?type=recheck    → addRecheckApplication only
// export async function POST({ request, url }) {

//   try {
//     const type  = url.searchParams.get('type'); 
//     const body  = await request.json();
//     const seat  = body.udf2 ?? '';
//     const board = getBoard(seat);
//     const db    = board === 'HSC' ? HSCdb : SSCdb;

//     // ── Insert Response → saveResponseData ──
//     if (type === 'response') {

//       const result = board === 'HSC'
//         ? await saveHSC({ db, userId: seat, responseData: body })
//         : await saveResponseData({ db, userId: seat, responseData: body });

//       if (result.error !== 0) {
//         return json({ success: false, error: result.errorMsg }, { status: 500 });
//       }

//       return json({ success: true, message: 'Response saved successfully' });
//     }

//     // ── Insert Recheck → addRecheckApplication ──
//     if (type === 'recheck') {

//       const recheckType = parseInt(body.udf1 ?? '1');

//        const pendingResult = await db.query(
//         `SELECT delivery_type, address_id, pending_recheck_application_id
//         FROM pending_recheck_application
//         WHERE seat_no = $1
//           AND recheck_type = $2
//           AND client_trans_id = $3
//         LIMIT 1`,
//         [seat, recheckType, body.clientTxnId]
//       );

//       if (pendingResult.rows.length === 0) {
//         return json({ success: false, error: 'No pending recheck application found' }, { status: 404 });
//       }


//       const pending = pendingResult.rows[0];
//       const deliveryType = pending.delivery_type ?? null;
//       const addressId    = pending.address_id    ?? null;
//       const pendingRecheckApplicationId = pending.pending_recheck_application_id;

//       // Map subject names → subj_codes
//       const subjectNames = Array.isArray(body.udf3)
//         ? body.udf3
//         : String(body.udf3 ?? '').split(',').map(s => s.trim()).filter(Boolean);

//       const subjectResult = await db.query(
//         `SELECT subj_code, subj_name FROM subject_master
//          WHERE UPPER(TRIM(subj_name)) = ANY($1)`,
//         [subjectNames.map(s => s.trim().toUpperCase())]
//       );

//       const subjectCodes = subjectResult.rows.map(r => ({
//         subjCode: r.subj_code,
//         url: null,
//       }));

//       if (subjectCodes.length === 0) {
//         return json({ success: false, error: 'No matching subjects found' }, { status: 400 });
//       }

//       const result = board === 'HSC'
//         ? await addHSC({
//             db,
//             pendingRecheckApplicationId,
//             seatNo:          seat,
//             subjectCodes,
//             recheckType,
//             deliveryType,
//             addressId,
//             clientTransId:   body.clientTxnId,
//             sabpaisaTransId: body.sabpaisaTxnId,
//           })
//         : await addRecheckApplication({
//             db,
//             pendingRecheckApplicationId,
//             seatNo:          seat,
//             subjectCodes,
//             recheckType,
//             deliveryType,
//             addressId,
//             clientTransId:   body.clientTxnId,
//             sabpaisaTransId: body.sabpaisaTxnId,
//           });

//       if (result.error !== 0) {
//         return json({ success: false, error: result.errorMsg }, { status: 500 });
//       }

//       return json({ success: true, message: 'Inserted successfully' });
//     }

//     // ── Unknown type ──
//     return json({ success: false, error: 'Invalid type. Use ?type=response or ?type=recheck' }, { status: 400 });

//   } catch (err) {
//     console.error('insert error:', err);
//     return json({ success: false, error: err.message }, { status: 500 });
//   }
// }