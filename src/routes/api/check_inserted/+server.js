import { json } from '@sveltejs/kit';
import SSCdb from '$lib/server/SSCdb.js';
import HSCdb from '$lib/server/db.js';

const HSC_PREFIXES = ['P','N','R','M','X','V','S','T','W'];

function getBoard(seat) {
  const firstLetter = seat?.trim().charAt(0).toUpperCase();
  return HSC_PREFIXES.includes(firstLetter) ? 'HSC' : 'SSC';
}

export async function GET({ url }) {
  try {
    const seat         = url.searchParams.get('seat');
    const recheckType  = url.searchParams.get('recheck_type');  // from udf1
    const subjectsRaw  = url.searchParams.get('subjects');      // from udf3 comma separated

    if (!seat) {
      return json({ error: -1 ,errorMsg :' Seat number is required' }, { status: 400 });
    }

    const db = getBoard(seat) === 'HSC' ? HSCdb : SSCdb;

    // Parse subjects from query param
    const subjects = subjectsRaw
      ? subjectsRaw.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    // Step 1 — find recheck_application_ids for this seat
    const appResult = await db.query(
      `SELECT recheck_application_id 
       FROM recheck_application 
       WHERE seat_no = $1`,
      [seat]
    );

    if (appResult.rows.length === 0) {
      return json({ applied: false, matchedSubjects: [] });
    }

    const appIds = appResult.rows.map(r => r.recheck_application_id);

    // Step 2 — find details matching recheck_type + subjects
    const detailResult = await db.query(
      `SELECT 
          rad.subj_code,
          rad.recheck_type,
          rad.status,
          sm.subj_name
       FROM recheck_application_detail rad
       LEFT JOIN subject_master sm ON sm.subj_code = rad.subj_code
       WHERE rad.recheck_application_id = ANY($1)
         AND rad.seat_no   = $2
         AND rad.recheck_type = $3`,
      [appIds, seat, parseInt(recheckType)]
    );

    if (detailResult.rows.length === 0) {
      return json({ applied: false, matchedSubjects: [] });
    }

    // Step 3 — check which subjects from udf3 are already applied
    const appliedSubjCodes = detailResult.rows.map(r => r.subj_code.trim().toUpperCase());

    const matchedSubjects = detailResult.rows.filter(r =>
      subjects.some(s => s.trim().toUpperCase() === r.subj_code.trim().toUpperCase()
                      || s.trim().toUpperCase() === r.subj_name?.trim().toUpperCase())
    );

    const applied = matchedSubjects.length > 0;

    return json({
      applied,
      matchedSubjects,   // which subjects already applied
      allApplied: matchedSubjects.length === subjects.length,
    });

  } catch (err) {
    console.error('check_applied error:', err);
    return json({ error : -1, errorMsg: err.message }, { status: 500 });
  }
}