import { json } from '@sveltejs/kit';
import db from '$lib/server/db.js';
import axios from 'axios';
import crypto from 'crypto';


const algorithm = "aes-128-cbc";
// const authKey = "kaY9AIhuJZNvKGp2";
// const authIV = "YN2v8qQcU3rGfA1y";

let authKey = "p25LH698ItQbLdz9";
let authIV = "3GLhOs6K0RYluZLj";


//Decrypt function 
function decrypt(text) {
  let decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(authKey),
    authIV
  );
  let decrypted = decipher.update(Buffer.from(text, "base64"));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

function parseDecrypted(text) {
  const obj = {};
  const pairs = text.split(/&(?=[a-zA-Z0-9]+=)/);

  pairs.forEach(pair => {
    const eqIndex = pair.indexOf('='); 
    if (eqIndex === -1) return;
    const key   = decodeURIComponent(pair.slice(0, eqIndex).trim());
    const value = decodeURIComponent(pair.slice(eqIndex + 1).trim());
    if (key) obj[key] = value;
  });

  // ── Split udf3 by comma for multiple subjects ──
  if (obj.udf3) {
    obj.udf3 = obj.udf3.split(',').map(s => s.trim()).filter(Boolean);
  }

  return obj;
}

//Transaction Status Check Function 
const checkTransactionStatus = async ({
	encoded_data,
	client_code
}) => {

	const API_URL =
		'https://txnenquiry.sabpaisa.in/SPTxtnEnquiry/getTxnStatusByClientxnId';

	try {

		const response = await axios.post(
			API_URL,
			{
				clientCode: client_code,
				statusTransEncData: encoded_data
			},
			{
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);

		return {
			error: 0,
			data: response.data
		};

	} catch (err) {

		console.error('API Error:', err.message);

		return {
			error: -1,
			message: err.message
		};
	}
};

//GET
export async function GET({ url }) {

	try {

		const seat = url.searchParams.get('seat');

		if (!seat) {
			return json(
				{error: -1, errorMsg: 'Seat number is required' },
				{ status: 400 }
			);
		}

		// const result = await db.query(
		// 	`
		// 	SELECT
		// 		client_txn_id,
		// 		(encryptdata, 'escape') AS encoded_dataencode
		// 	FROM payment_transactions
		// 	WHERE seat_no = $1
		// 	ORDER BY client_txn_id DESC
		// 	`,
		// 	[seat]
		// );

		const result = await db.query(
			`
			SELECT
				client_txn_id,
				encode(encryptdata, 'escape') AS encoded_data
			FROM payment_transactions
			WHERE seat_no = $1
			ORDER BY client_txn_id DESC
			`,
			[seat]
		);

		if (result.rows.length === 0) {
			return json(
				{ error : -1 , errorMsg: 'No records found' },
				{ status: 404 }
			);
		}

		const responses = await Promise.all(

			result.rows.map(async (element) => {

				const response = await checkTransactionStatus({
					encoded_data: element.encoded_data,
					client_code: 'MSBP2'
				});

				// return {
				// 	client_txn_id: element.client_txn_id,
				// 	response:response?.data?.statusResponseData ? decrypt(response.data.statusResponseData) : []
				// };

               return{
					client_txn_id: element.client_txn_id,
					response: response?.data?.statusResponseData
						? parseDecrypted(decrypt(response.data.statusResponseData))
						: {}
				  };

			})
		);

		return json({
			error: 0,
			responses
		}); 

	} catch (err) {

		console.error(err);

		return json(
			{
				error: -1,
				errorMsg: err.message
			},
			{
				status: 500
			}
		);
	}
}