import { json } from '@sveltejs/kit';
import db from '$lib/server/reprint.js';

// GET — check application status by temp_id (udf1)
export async function GET({ url }) {
  try {
    const tempId = url.searchParams.get('temp_id');

    if (!tempId) {
      return json({ error: -1, errorMsg: 'temp_id is required' }, { status: 400 });
    }

    const result = await db.query(
      `SELECT temp_id, application_status, application_id
       FROM reprint_application
       WHERE temp_id = $1
       LIMIT 15`,
      [tempId]
    );

        console.log('DB rows:', result.rows);


    if (result.rows.length === 0) {
      return json({ error: -1, errorMsg: 'No application found' }, { status: 404 });
    }

    return json({ error: 0, application: result.rows[0] });

  } catch (err) {
    console.error('GET updateresponse error:', err);
    return json({ error: -1, errorMsg: err.message }, { status: 500 });
  }
}

// POST — update the application entry
export async function POST({ request }) {
  try {
    const body = await request.json();
    const { temp_id, client_trans_id, sabpaisa_trans_id } = body;

    if (!temp_id || !client_trans_id) {
      return json({ error: -1, errorMsg: 'temp_id and client_trans_id are required' }, { status: 400 });
    }

    // Get max application_id and increment by 1
    const maxResult = await db.query(
      `SELECT MAX(CAST(application_id AS INTEGER)) as max_id
       FROM reprint_application`
    );

    const newApplicationId = String((maxResult.rows[0]?.max_id ?? 0) + 1);

    // Update the row
    const updateResult = await db.query(
      `UPDATE reprint_application
       SET
         application_id     = $1,
         application_status = 'submitted',
         sabpaisa_trans_id  = $2,
         client_trans_id    = $3,
         update_date        = TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI:SS')
       WHERE temp_id = $4
       RETURNING *`,
      [newApplicationId, sabpaisa_trans_id ?? '', client_trans_id, temp_id]
    );

    if (updateResult.rowCount === 0) {
      return json({ error: -1, errorMsg: 'Update failed, record not found' }, { status: 404 });
    }

    return json({ error: 0, updated: updateResult.rows[0] });

  } catch (err) {
    console.error('POST updateresponse error:', err);
    return json({ error: -1, errorMsg: err.message }, { status: 500 });
  }
}