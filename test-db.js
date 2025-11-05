const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

(async () => {
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`select now() as current_time`;
  console.log(rows);
})();
