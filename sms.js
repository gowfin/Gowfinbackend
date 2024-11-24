require('dotenv').config({path: __dirname + '/.env'})
const express = require('express');
const path = require('path');
const sql = require('mssql');
const bodyParser = require('body-parser');

// Create an Express application
const app = express();

// Middleware to parse JSON requests
app.use(express.json());
//handle cross-origin resource sharing
const cors = require('cors');
app.use(cors(
  // {
  // origin: 'http://localhost:3000', 
// }
)); // Enable CORS for all routes
app.use(bodyParser.json({ limit: '100mb' })); // Adjust size if needed

// Database configuration
const sqlConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PWD,
  database: process.env.DB_NAME,
  server: process.env.DB_SERVER || '(local)', // Default to local if DB_SERVER is not set
  port: parseInt(process.env.DB_PORT, 10),
  options: {
    encrypt: false, // Use encryption (adjust based on your server config)
    trustServerCertificate: false // Only set to true for development
  },
  pool: {
    max: 10, // Maximum number of connections
    min: 0, // Minimum number of connections
    idleTimeoutMillis: 3000000 // Close idle connections after 30 seconds
}
};
// Create a connection pool
let poolPromise;

// Create a connection pool


// Function to initialize the connection pool
const initializePool = async () => {
    try {
        poolPromise = await sql.connect(sqlConfig);
        console.log('Connected to SQL Server');
    } catch (err) {
        console.error('Database connection failed: ', err);
    }
};

// Check if the pool is connected
const checkPoolConnection = async () => {
    if (!poolPromise) {
        console.log('Reconnecting to SQL Server...');
        await initializePool();
    } else {
        // Check the state of the connection pool
        const pool = await poolPromise;
        if (pool.connected === false) {
            console.log('Connection is closed. Reconnecting...');
            await initializePool();
        }
    }
};
app.post('/get_client', async (req, res) => {
    try {
      // Connect to the SQL Server
      // await sql.connect(sqlConfig);
      await checkPoolConnection(); // Ensure the connection is active
      const sql = await poolPromise;
      console.log('Connected to the database');
   const custno = req.body.custno;
   console.log(custno);
   
      // Query the user's detail based on the custno
      const result = await sql.query`SELECT * FROM clients WHERE custno = ${custno}`;
      if (result.recordset.length === 0) {
        // No rows found (custno does not exist)
        return res.json({status:'Customer number not found.'});
      } else {
      const pixBuffer=result.recordset[0].pix;
      const signBuffer=result.recordset[0].sign;
      // Convert the buffer to base64 string
      const base64Pix = Buffer.from(pixBuffer).toString('base64');
      const base64Sign = Buffer.from(signBuffer).toString('base64');
      const clientdata={...result.recordset[0],status:'successful',pix:base64Pix,sign:base64Sign};
      // console.log(clientdata);
       res.set('Content-Type', 'application/json'); // Set content type
      return res.json(clientdata);
    }
      
    }
    catch(err){return({status:'failed',err:err.message.replace('mssql-70716-0.cloudclusters.net:19061','server')})}
  });
// Ensure to handle connection pool shutdown gracefully
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
  
  
  // Start the server on port 5000
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    // console.log(hashPassword('12345').toString('base64'));
  
  });
    