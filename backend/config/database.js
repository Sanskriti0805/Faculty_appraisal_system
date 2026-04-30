const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbHost = (process.env.DB_HOST || '127.0.0.1').trim();
const dbUser = (process.env.DB_USER || '').trim();
const dbPassword = process.env.DB_PASSWORD || '';
const dbName = (process.env.DB_NAME || '').trim();
const dbPort = Number.parseInt((process.env.DB_PORT || '3306').trim(), 10) || 3306;

// Create connection pool
const pool = mysql.createPool({
  host: dbHost,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  port: dbPort,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Promisify for async/await
const promisePool = pool.promise();

// Test connection
pool.getConnection((err, connection) => {
  if (err) {
    if (process.env.DB_LOG_CONNECTIONS !== '0') {
      console.error(
        `Error connecting to database (${dbHost}:${dbPort}/${dbName || 'unknown_db'}):`,
        err
      );
    }
    return;
  }
  if (process.env.DB_LOG_CONNECTIONS !== '0') {
    console.log(`✅ Database connected successfully (${dbHost}:${dbPort}/${dbName})`);
  }
  connection.release();
});

module.exports = promisePool;
