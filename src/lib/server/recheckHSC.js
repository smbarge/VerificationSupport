import { camelCase, snakeCase } from 'change-case-all';
const toCamelCaseObject = (obj) => {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [camelCase(key), value]),
  );
};

export const saveResponseData = async ({ db, userId, responseData }) => {
  try {
    let {
      payerName,
      payerEmail,
      payerMobile,
      clientTxnId,
      amount,
      clientCode,
      paidAmount,
      paymentMode,
      bankName,
      amountType,
      status,
      statusCode,
      challanNumber,
      sabpaisaTxnId,
      sabpaisaMessage,
      bankMessage,
      bankErrorCode,
      sabpaisaErrorCode,
      bankTxnId,
      transDate,
      udf1,
      udf2,
      udf3,
      udf4,
      udf5,
      udf6,
      udf7,
      udf8,
      udf9,
      udf10,
      udf11,
      udf12,
      udf13,
      udf14,
      udf15,
      udf16,
      udf17,
      udf18,
      udf19,
      udf20,
    } = responseData;

    let nstatus;
    if (status == "SUCCESS") {
      nstatus = 1;
    } else if (status == "FAILED") {
      nstatus = 2;
    } else if (status == "ABORTED") {
      nstatus = 3;
    } else if (status == "INITIATED") {
      nstatus = 4;
    }

    if (Array.isArray(udf3)) udf3 = udf3.join(',');

    const query = `
    INSERT INTO payment_responses (
    payer_name, payer_email, payer_mobile, client_txn_id,  amount,
    client_code, paid_amount, payment_mode, bank_name, amount_type, status, status_code,
    challan_number, sabpaisa_txn_id, sabpaisa_message, bank_message, bank_error_code,
    sabpaisa_error_code, bank_txn_id,transaction_date, udf1, udf2, udf3, udf4, udf5,
    udf6, udf7, udf8, udf9, udf10, udf11, udf12, udf13, udf14, udf15, udf16, udf17, udf18, udf19, udf20,
    seat_no,sources,nstatus  -- Include the seat_no column
) VALUES (
     $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,$41,$42,$43
);`;

    const values = [
      payerName,
      payerEmail,
      payerMobile,
      clientTxnId,
      amount,
      clientCode,
      paidAmount,
      paymentMode,
      bankName,
      amountType,
      status,
      statusCode,
      challanNumber,
      sabpaisaTxnId,
      sabpaisaMessage,
      bankMessage,
      bankErrorCode,
      sabpaisaErrorCode,
      bankTxnId,
      transDate,
      udf1,
      udf2,
      udf3,
      udf4,
      udf5,
      udf6,
      udf7,
      udf8,
      udf9,
      udf10,
      udf11,
      udf12,
      udf13,
      udf14,
      udf15,
      udf16,
      udf17,
      udf18,
      udf19,
      udf20,
      userId,
      1,
      nstatus,
    ];

    const { rows } = await db.query(query, values);
    let updatedAt = new Date().toISOString();

    let query2 = `WITH updated AS (
    -- Step 1: Update sabpaisa_trans_id and return the updated row's ID
    UPDATE pending_recheck_application
    SET sabpaisa_trans_id = $2,
    updated_at=$4
    WHERE client_trans_id = $3
    RETURNING pending_recheck_application_id
)
-- Step 2: Use the returned ID to update the status in pending_recheck_application_details
UPDATE pending_recheck_application_detail
SET status = $1
WHERE pending_recheck_application_id IN (SELECT pending_recheck_application_id FROM updated);`;
    let values2 = [status, sabpaisaTxnId, clientTxnId, updatedAt];
    let updateResult = await db.query(query2, values2);
    return { error: 0, errorMsg: "", response: true };
  } catch (e) {
    console.log("error in saveResponse Data is", e);
    return {
      error: -1,
      errorMsg: "error in fetching recheck application from database",
    };
  }
};

export const addRecheckApplication = async ({
  db,
  pendingRecheckApplicationId,
  seatNo,
  subjectCodes,
  recheckType,
  deliveryType,
  addressId,
  clientTransId,
  sabpaisaTransId,
}) => {
  try {
    console.log("pendingRecheckApplicationId ", pendingRecheckApplicationId);
    const createdAt = new Date(); // Get the current timestamp
    // check if application already exists if it does then its error
    {
      const { error, errorMsg, recheckApplications } =
        await getRecheckApplicationBySeatNo({
          db,
          seatNo,
          subjectCodes,
          recheckType,
        });

      if (error == 0) {
        return {
          error: -1,
          errorMsg: `application(s) already exist applicationIds : ${recheckApplications
            .map((e) => e.recheckApplicationId)
            .join(",")}`,
        };
      }
    }
    await db.query("BEGIN");
    // check if all subjects are part of result row from sub1 to sub7
    const candidateResultQuery = {
      text: `SELECT 
      sub1, 
      sub2, 
      sub3, 
      sub4, 
      sub5, 
      sub6, 
      sub7, 
      ${snakeCase("divnCode")} 
      from exam_results
      WHERE ${snakeCase("seatNo")} = $1`,
      values: [seatNo],
    };

    const candidateQueryResult = await db.query(candidateResultQuery);

    const candidateResult = toCamelCaseObject(candidateQueryResult.rows[0]);
    const { divnCode } = candidateResult;

    const resultSubjects = Object.values({
      sub1: candidateResult.sub1,
      sub2: candidateResult.sub2,
      sub3: candidateResult.sub3,
      sub4: candidateResult.sub4,
      sub5: candidateResult.sub5,
      sub6: candidateResult.sub6,
      sub7: candidateResult.sub7,
    });

    const subjectCodesValid = subjectCodes.every((sub) =>
      resultSubjects.includes(sub.subjCode),
    );
    if (!subjectCodesValid)
      throw {
        error: -1,
        errorMsg:
          "requested subject codes are not part result of the candidate",
      };
    // check if the subjects are already part of earlier recheck application
    // Insert data into recheck_application table with the same created_at timestamp
    const recheckApplicationQuery = {
      text: `INSERT INTO recheck_application (
      ${snakeCase("seatNo")},
      ${snakeCase("divnCode")},
      ${snakeCase("recheckType")},
      ${snakeCase("deliveryType")},
      ${snakeCase("addressId")}, 
      ${snakeCase("createdAt")},
    ${snakeCase("clientTransId")},
  ${snakeCase("sabpaisaTransId")},
  ${snakeCase("pendingRecheckApplicationId")})
      VALUES ($1, $2, $3, $4,$5,$6,$7,$8,$9)
      RETURNING ${snakeCase("recheck_ApplicationId")}`,
      values: [
        seatNo,
        divnCode,
        recheckType,
        deliveryType,
        addressId,
        createdAt,
        clientTransId,
        sabpaisaTransId,
        pendingRecheckApplicationId,
      ],
    };

    const recheckApplicationResult = await db.query(recheckApplicationQuery);
    const recheckApplicationId =
      recheckApplicationResult.rows[0][snakeCase("recheckApplicationId")];

    if (addressId) {
      const recheckApplicationAddressQuery = {
        text: `INSERT INTO recheck_application_address (
          ${snakeCase("recheckApplicationId")},
          ${snakeCase("addressId")})
          VALUES ($1,$2)
        `,
        values: [recheckApplicationId, addressId],
      };
      const recheckApplicationAddressResult = await db.query(
        recheckApplicationAddressQuery,
      );
    }

    // Insert data into recheck_application_detail table with the same created_at timestamp for each subject code
    for (const subjCode of subjectCodes) {
      const recheckApplicationDetailQuery = {
        text: `INSERT INTO recheck_application_detail (
          ${snakeCase("recheckApplicationId")}, 
          ${snakeCase("seatNo")}, 
          ${snakeCase("subjCode")}, 
          ${snakeCase("recheckType")}, 
          ${snakeCase("createdAt")},
          ${snakeCase("revaluationUrl")})
          VALUES ($1, $2, $3, $4, $5,$6)`,
        values: [
          recheckApplicationId,
          seatNo,
          subjCode.subjCode,
          recheckType,
          createdAt,
          subjCode.url ? subjCode.url : null,
        ],
      };
      await db.query(recheckApplicationDetailQuery);
    }
    await db.query("COMMIT");
    let mobileQuery = `select vm.mobile_no
from user_details ud,verified_mobile vm 
where ud.user_id=$1
and
ud.mobile_confirmation_id = vm.mobile_confirm_unique_id`;

    let { rows } = await db.query(mobileQuery, [seatNo]);

    let mobileNo = rows[0].mobile_no;

    let verificationType;
    if (recheckType == 1) {
      verificationType = "Verification Without Photocopy";
    }
    if (recheckType == 2) {
      verificationType = "Verification With Photocopy";
    }
    if (recheckType == 3) {
      verificationType = "Re-Evaluation";
    }

 
    return { error:0, errorMsg:0, recheckApplication:[] };
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("Error inserting data:", error);
    return { error: -1, errorMsg: "failed to create applicationId" };
  }
};

export const getRecheckApplicationBySeatNo = async ({
  db,
  seatNo,
  subjectCodes,
  recheckType,
}) => {
  try {
    const lRecheckTypes = recheckType == 1 ? [1, 2] : [recheckType];
    const query = {
      text: `SELECT 
      ${snakeCase("recheckApplicationId")},
      ${snakeCase("recheckApplicationDetailId")},
      ${snakeCase("seatNo")},
      ${snakeCase("subjCode")}, 
      ${snakeCase("recheckType")}
      FROM recheck_application_detail
      WHERE 
      ${snakeCase("seatNo")} = $1 AND
      ${snakeCase("recheckType")} = ANY($2) AND
      ${snakeCase("subjCode")} = ANY($3)`,
      values: [
        seatNo,
        lRecheckTypes,
        subjectCodes,
        // subjectCodes.map((e) => `'${e}'`).join(","),
      ],
    };

    const query1 = {
      text: `SELECT 
      ${snakeCase("recheckApplicationId")},
      ${snakeCase("recheckApplicationDetailId")},
      ${snakeCase("seatNo")},
      ${snakeCase("subjCode")}, 
      ${snakeCase("recheckType")}
      FROM recheck_application_detail
      WHERE 
      ${snakeCase("seatNo")} = $1 AND
      ${snakeCase("recheckType")} = $2 AND
      ${snakeCase("subjCode")} = ANY($3)`,
      values: [
        seatNo,
        2,
        subjectCodes,
        // subjectCodes.map((e) => `'${e}'`).join(","),
      ],
    };
    let queryResult;
    let queryResultRecheckTypeThree;
    if (recheckType == 1 || 2) {
      queryResult = await db.query(query);
    }
    if (recheckType == 3) {
      queryResultRecheckTypeThree = await db.query(query1);
      queryResult = await db.query(query);
    }

    if (recheckType == 3) {
      if (queryResultRecheckTypeThree.rows.length == 0) {
        return {
          error: -3,
          errorMsg: `Before applying for Revaluation. You Need to apply for verification with photocopy`,
        };
      }
    }

    if (queryResult.rows.length == 0) {
      return { error: -1, errorMsg: `recheck applications not found` };
    }

    const queryResultRows = queryResult.rows.map((r) => {
      return toCamelCaseObject(r);
    });
    const recheckApplications = [
      {
        recheckApplicationId: queryResultRows[0].recheckApplicationId,
        subjects: queryResultRows
          .filter(
            (e) =>
              e.recheckApplicationId == queryResultRows[0].recheckApplicationId,
          )
          .map((e) => {
            return { subjCode: e.subjCode };
          }),
      },
    ];
    return { error: 0, errorMsg: "", recheckApplications };
  } catch (e) {
    return { error: -1, errorMsg: `exception in getRecheckApplications ${e}` };
  }
};

//module.exports = { saveResponseData, addRecheckApplication };