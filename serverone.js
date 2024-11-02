require('dotenv').config({ path: __dirname + '/.env' });
const crypto = require('crypto');
const salt = process.env.SALT_VALUE;

// Hash password function
function hashPassword(password) {
  return crypto.pbkdf2Sync(password, Buffer.from(salt, 'base64'), 10000, 16, 'sha1');
}

// Express.js setup
const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const cors = require('cors');
app.use(cors());

// MSSQL configuration
const sql = require('mssql');
const sqlConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PWD,
  database: process.env.DB_NAME,
  server: process.env.DB_SERVER || '(local)',
  port: parseInt(process.env.DB_PORT, 10),
  options: {
    encrypt: false,
    trustServerCertificate: false,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 3000000,
  },
};

// Create connection pool
let poolPromise;
async function initializePool() {
  try {
    poolPromise = await sql.connect(sqlConfig);
    console.log('Connected to SQL Server');
  } catch (err) {
    console.error('Database connection failed:', err);
  }
}

// Check connection pool status
async function checkPoolConnection() {
  if (!poolPromise) {
    console.log('Reconnecting to SQL Server...');
    await initializePool();
  } else {
    const pool = await poolPromise;
    if (pool.connected === false) {
      console.log('Connection is closed. Reconnecting...');
      await initializePool();
    }
  }
}

// Routes
app.get('/get_sesdate', async (req, res) => {
  console.log('Getting Session date:');
  res.set('Content-Type', 'application/json');
  return res.send('Here');
});

app.post('/get_biztype', async (req, res) => {
  try {
    await checkPoolConnection();
    const sql = await poolPromise;
    console.log('Connected to the database');
    const result = await sql.query`SELECT bizName FROM BusinessType`;
    res.set('Content-Type', 'application/json');
    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', err: err.message });
  }
});

// Handle connection pool shutdown
process.on('SIGINT', async () => {
  try {
    const pool = await poolPromise;
    await pool.close();
    console.log('Connection pool closed.');
  } catch (err) {
    console.error('Error closing connection pool:', err);
  } finally {
    process.exit(0);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});