import { json } from '@sveltejs/kit';
import HSCdb from '$lib/server/db.js';
import SSCdb from '$lib/server/SSCdb.js';
import { saveResponseData }             from '$lib/server/recheckSSC.js';
import { saveResponseData as saveHSC }  from '$lib/server/recheckHSC.js';

const HSC_PREFIXES = ['P','N','R','M','X','V','S','T','W'];
function getBoard(seat) {
  return HSC_PREFIXES.includes(seat?.trim().charAt(0).toUpperCase()) ? 'HSC' : 'SSC';
}

export async function POST({ request }) {
  try {
    const body  = await request.json();
    const seat  = body.udf2 ?? '';
    const board = getBoard(seat);
    const db    = board === 'HSC' ? HSCdb : SSCdb;

    const result = board === 'HSC'
      ? await saveHSC({ db, userId: seat, responseData: body })
      : await saveResponseData({ db, userId: seat, responseData: body });

    if (result.error !== 0) {
      return json({ error: -1, errorMsg: result.errorMsg }, { status: 500 });
    }

    return json({ error: 0, errorMsg: 'Response saved successfully' });

  } catch (err) {
    console.error('insert_response error:', err);
    return json({ error: -1, errorMsg: err.message }, { status: 500 });
  }
}