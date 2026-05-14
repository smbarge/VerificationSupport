import pg from 'pg';
import { DATABASE_URL_1 } from '$env/static/private';

const { Pool } = pg;

const pool = new Pool({
    connectionString: DATABASE_URL_1
});

export default pool;