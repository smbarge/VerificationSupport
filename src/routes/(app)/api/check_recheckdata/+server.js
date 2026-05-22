import { json } from '@sveltejs/kit';
import hscdb from '$lib/server/db.js';
import sscdb from '$lib/server/SSCdb'; 
import axios from 'axios';
import crypto from 'crypto';

export async function GET({ url }) {

    try {

        const seat = url.searchParams.get('seat');

        if (!seat) {
            return json(
                { error: -1, errorMsg: 'Seat number is required' },
                { status: 400 }
            );
        }

             const seatUpper = seat.trim().toUpperCase();

            const hscPrefixes = ['P', 'N', 'R', 'M', 'X', 'V', 'S', 'T', 'W'];

            const isHSC = hscPrefixes.some(prefix =>
                seatUpper.startsWith(prefix)
            );
            const db = isHSC ? hscdb : sscdb;

            console.log('Seat:', seatUpper);
            console.log('Selected DB:', isHSC ? 'HSC DB' : 'SSC DB');

        const result = await db.query(
            `  SELECT
                ra.recheck_application_id,
                ra.seat_no,
                ra.divn_code,
                ra.recheck_type,
                ra.status,
                ra.created_at,
                ra.delivery_type,
                ra.sabpaisa_trans_id,
                ra.client_trans_id,
                rad.subj_code,
                sm.subj_name
            FROM recheck_application ra
            LEFT JOIN recheck_application_detail rad
                ON ra.recheck_application_id = rad.recheck_application_id
            LEFT JOIN subject_master sm
                ON rad.subj_code = sm.subj_code
            WHERE ra.seat_no = $1
            ORDER BY ra.created_at DESC
            `,
            [seat]
        );

        if (result.rows.length === 0) {
            return json(
                { error: 0, errorMsg: 'No records found', data: [] },
                { status: 200 }
            );
        }
            
        const grouped = {};

for (const row of result.rows) {
    const id = row.recheck_application_id;

    if (!grouped[id]) {
        grouped[id] = {
            recheck_application_id: id,
            seat_no:      row.seat_no,
            divn_code:    row.divn_code,
            recheck_type:
                row.recheck_type == 1 ? 'Without Photocopy' :
                row.recheck_type == 2 ? 'With Photocopy'    :
                row.recheck_type == 3 ? 'Re-Evaluation'     : '',
            status:        row.status,
            date:          row.created_at,
            delivery_type:
                row.delivery_type == 1 ? 'In Hand' :
                row.delivery_type == 2 ? 'By Email' :
                row.delivery_type == 3 ? 'By Post'  : '',
            sabpaisa_trans_id: row.sabpaisa_trans_id,
            client_trans_id:   row.client_trans_id,
            subjects: []
        };
    }

    if (row.subj_code) {
        grouped[id].subjects.push({
            subj_code: row.subj_code,
            subj_name: row.subj_name || row.subj_code
        });
    }
}

const data = Object.values(grouped).map((row, index) => ({
    sr_no: index + 1,
    ...row
}));

        return json({
            error: 0,
            errorMsg: 'Data Found',
            data
        });

    } catch (err) {

        console.error(err);

        return json(
            { error: -1, errorMsg: err.message },
            { status: 500 }
        );
    }
}