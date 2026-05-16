import pg from 'pg';
import { DATABASE_URL_2 } from '$env/static/private';

const { Pool } = pg;

const pool = new Pool({
    connectionString: DATABASE_URL_2
});

export default pool;