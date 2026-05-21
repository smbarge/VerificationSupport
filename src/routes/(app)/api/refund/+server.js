import { json } from '@sveltejs/kit';
import db from '$lib/server/db.js';       // HSC
import SSCdb from '$lib/server/SSCdb.js'; // SSC

export async function POST({ request }) {
    try {
        const formData   = await request.formData();
        const board      = formData.get('board');                 
        const parsedData = JSON.parse(formData.get('parsedData'));

       // console.log("Parsedara1 ___",parsedData);
        

        // ── Pick correct DB 
        const pool = board === 'HSC' ? db : SSCdb;

        // ── Get subject master 
        const subjectMasterResult = await pool.query(
            `SELECT subj_name, subj_code FROM subject_master`
        );
        const subjectMaster = subjectMasterResult.rows;

        // ── Build subject map 
        const subjectMap = new Map(
            subjectMaster.map((s) => [s.subj_name, s.subj_code])
        );
        const getSubjectCode = (subjects) =>
            subjects.split(',').map((e) => ({
                subjCode: subjectMap.get(e.trim()),
            }));

        // ── Add subjectCodes 
        const sabpaisaData = parsedData.map((e) => ({
            ...e,
            subjectCodes: getSubjectCode(e.Udf3),
        }));

        // ── Tag duplicates 
        const seen = new Map();
        const taggedSabpaisaData = sabpaisaData.map((item) => {
            const baseKey = `${item.Udf1}_${item.Udf2}`;
            const currentSubjects = item.subjectCodes.map((s) => s.subjCode);
            let tag = 'single';
            if (!seen.has(baseKey)) {
                seen.set(baseKey, new Set(currentSubjects));
            } else {
                const existing = seen.get(baseKey);
                if (currentSubjects.some((sub) => existing.has(sub))) {
                    tag = 'duplicate';
                }
                currentSubjects.forEach((sub) => existing.add(sub));
            }
            return { ...item, tag };
        });

        // ── Check in DB 
        const result = await pool.query(`
            SELECT recheck_application_id, seat_no, recheck_type,
                   sabpaisa_trans_id, client_trans_id
            FROM recheck_application
        `);

        const dbMap = new Map(
            result.rows.map((r) => [
                `${r.seat_no}_${r.recheck_type}_${r.sabpaisa_trans_id}_${r.client_trans_id}`,
                r.recheck_application_id,
            ])
        );

        taggedSabpaisaData.forEach((item) => {
            const key = `${item.Udf2}_${item.Udf1}_${item['Trans ID']}_${item['Client Trans ID']}`;
            const appId = dbMap.get(key);
            if (appId) {
                item.dbTag = 'found';
                item.recheck_application_id = appId;
            } else {
                item.dbTag = 'NotInDB';
                item.recheck_application_id = null;
            }
        });

        //console.log("taged_parserdata",taggedSabpaisaData);
        

        return json({
            success: true,
            processed: taggedSabpaisaData.length,
            found:    taggedSabpaisaData.filter(x => x.dbTag === 'found').length,
            notInDB:  taggedSabpaisaData.filter(x => x.dbTag === 'NotInDB').length,
            sabpaisaData:taggedSabpaisaData
        });

    } catch (err) {
        return json(
            { error: -1, errorMsg: err.message },
            { status: 500 }
        );
    }
}