
require('dotenv').config({path: __dirname + '/.env'})
var crypto = require('crypto');
var salt = process.env.SALT_VALUE;
function hashPassword(password) {
  
  return crypto.pbkdf2Sync(password, Buffer.from(salt, 'base64'), 10000, 16, 'sha1');
}
// server.js

const express = require('express');
const path = require('path');
const sql = require('mssql');
const bodyParser = require('body-parser');





// require('dotenv').config(); // Load environment variables from .env file

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
app.get('/get_sesdate', async (req, res) => {
  console.log('Getting Session date:');
   res.set('Content-Type', 'application/json'); // Set content type
  return res.send('Here');
});
//Endpoint to fetch groups
app.post('/get_biztype', async (req, res) => {
  try {
    // Connect to the SQL Server
    // await sql.connect(sqlConfig);
    await checkPoolConnection(); // Ensure the connection is active
    const sql = await poolPromise;
    console.log('Connected to the database'); 
    // Query the group table
    const result = await sql.query`select bizName from BusinessType`;
    // console.log(result.recordset);
     res.set('Content-Type', 'application/json'); // Set content type
    return res.json(result.recordset);
    
    
  }
  catch(err){return({status:'failed',err:err.message.replace('mssql-70716-0.cloudclusters.net:19061','server')})}
});
//Endpoint to fetch groups
app.post('/get_groups', async (req, res) => {
  try {
    // Connect to the SQL Server
    await checkPoolConnection(); // Ensure the connection is active
    const sql = await poolPromise;
    // await sql.connect(sqlConfig);
    console.log('Connected to the database'); 
    // Query the group table
    const result = await sql.query`SELECT groupid FROM Groups`;
    // console.log(result.recordset);
     res.set('Content-Type', 'application/json'); // Set content type
    return res.json(result.recordset);
    
    
  }
  catch(err){return({status:'failed',err:err.message.replace('mssql-70716-0.cloudclusters.net:19061','server')})}
});

// Endpoint to fetch the client's detail
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
// Endpoint to fetch the client's detail
app.post('/get_lastclientID', async (req, res) => {
  try {
    // Connect to the SQL Server
    // await sql.connect(sqlConfig);
    await checkPoolConnection(); // Ensure the connection is active
    const sql = await poolPromise;
    console.log('Connected to the database');
    // Query the user's detail based on the custno
    const result = await sql.query`Select max(num) as num from clients`;
    
        const clientdata={...result.recordset[0]};
     console.log(clientdata);
      res.set('Content-Type', 'application/json'); // Set content type
    return res.json(clientdata);
  
    
  }
  catch(err){return({status:'failed',err:err.message.replace('mssql-70716-0.cloudclusters.net:19061','server')})}
});
const NewFullAccountID = async () => {
  try {
   

    await checkPoolConnection(); // Ensure the connection is active
    const sql = await poolPromise;
    console.log('Connected to the database');

    // Query the user's detail based on the custno
    const result = await sql.query`SELECT MAX(serial) AS num FROM deposit`;
 
    if (result.recordset.length > 0) {
      
      const clientdata = {...result.recordset[0]};
       const num=clientdata.num;
      const getIDFormat = String(num).padStart(9, '0');
    
      // console.log('2'+getIDFormat);
      return ('2' + getIDFormat);
    } else {
      return { status: 'failed', message: 'No records found' };
    }
  } catch (err) {
    console.error(err); // Log the error for debugging
    return { status: 'failed', err: err.message.replace('mssql-70716-0.cloudclusters.net:19061', 'server') };
  }
};

// Endpoint to fetch the user's password by username
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Check if both username and password are provided
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  console.log(`Received username: ${username}, password: ${hashPassword(password).toString('base64')}`);

  try {
    // Connect to the SQL Server
    
    await checkPoolConnection(); // Ensure the connection is active
    const sql = await poolPromise;
    console.log('Connected to the database');

    // Query the user's password based on the username
    const result = await sql.query`SELECT userid, password, branch, userrole FROM usertable WHERE userid = ${username}`;

    if (result.recordset.length > 0) {
      // User found
      const user = result.recordset[0];

      // Check if the provided password matches the stored password
      if (hashPassword(password).toString('base64') === user.password) {
           res.set('Content-Type', 'application/json'); // Set content type
        return res.json({
          status: 'successful',
          userid: user.userid,
          branch: user.branch,
          userrole: user.userrole,
        });
      } else {
        // console.log('Failed: Invalid User/Incorrect password');
        return res.status(401).json({ message: 'Invalid User/Incorrect password' });
      }
    } else {
      // User not found
      return res.status(404).json({ message: 'User not found/invalid password' });
    }
  } catch (err) {
     console.error('Database error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

//Endpoint to fetch accounts
app.post('/get_accounts', async (req, res) => {
  try {
    // Connect to the SQL Server
    // await sql.connect(sqlConfig);
    await checkPoolConnection(); // Ensure the connection is active
    const sql = await poolPromise;
    console.log('Connected to the database'); 
    console.log(req.body);
    const custno=req.body.custno;
    // Query the group table
    const result = await sql.query`select  custno,accountid, accountname,runningbal,productid,groupid,status from accountbal where custno=${custno}`;
     console.log(result.recordset);
    res.set('Content-Type', 'application/json'); // Set content type
    return res.json(result.recordset);
    
    
  }
  catch(err){return({status:'failed',err:err.message.replace('mssql-70716-0.cloudclusters.net:19061','server')})}
});
//Endpoint to fetch accounts
app.post('/get_account_detail', async (req, res) => {
  try {
    await checkPoolConnection(); // Ensure the connection is active
    const pool = await poolPromise; // Get the connection pool
    console.log('Connected to the database'); 
    console.log(req.body);
    
    const { custno, accountid } = req.body;
    const acctable = accountid.slice(0, 1) === '2' ? 'Deposit' : 'loans';
    const accColumn = accountid.slice(0, 1) === '2' ? 'accountid' : 'loanid';

    const query = `SELECT * FROM ${acctable} WHERE custno = @custno AND ${accColumn} = @accountid`;

    // Create a request from the pool
    const request = pool.request(); // Use the pool instance to create a request
    request.input('custno', sql.VarChar, custno); // Adjust the type as needed
    request.input('accountid', sql.VarChar, accountid); // Adjust the type as needed

    const result = await request.query(query);
    console.log(result.recordset);
    res.set('Content-Type', 'application/json'); // Set content type 
    return res.json(result.recordset);
    
  } catch (err) {
    console.error(err); // Log the error for debugging
    return res.status(500).json({ status: 'failed', err: err.message.replace('mssql-70716-0.cloudclusters.net:19061','server') });
  }
});



app.post('/get_trx', async (req, res) => {
  try {
    // Connect to the SQL Server
    // await sql.connect(sqlConfig);
    await checkPoolConnection(); // Ensure the connection is active
    const sql = await poolPromise;
    console.log('Connected to the database'); 
    // Query the group table
    const result = await sql.query`select * from transactn `;
     console.log(result.recordset);
     res.set('Content-Type', 'application/json'); // Set content type
    return res.json(result.recordset);
    
    
  }
  catch(err){console.error(err);return({status:'failed',err:err.message.replace('mssql-70716-0.cloudclusters.net:19061','server')})}
});
////////////////////////////////Getting Products

app.get('/products', async (req, res) => {
  try {
      // Connect to the database
      await checkPoolConnection(); // Ensure the connection is active
      const sql = await poolPromise;

      const StrQuery = "SELECT productid, GLCode + '-' + intGL AS code,productDesc as name FROM Product WHERE glcode != ''";
      const result = await sql.query(StrQuery);
      
      const productArray = result.recordset.map(row => {
          let Pid = row.productid.toUpperCase().trim();
          if (Pid.replace("URSE", "SAVGS").includes("SAVGS")) {
              Pid = Pid.substring(0, 3) + "SAVGS";
          }
          return { id: Pid, code: row.code,name: row.name }; // Create an object for each product
      });
      res.set('Content-Type', 'application/json'); // Set content type
     return res.json(productArray);
      console.log(productArray);
  } catch (err) {
      console.error('SQL error', err);
      res.status(500).send(err.message);
  } finally {
      //await sql.close(); // Close the connection
  }
});

/////////////////////////////////////////
app.post('/get_staffreport', async (req, res) => {
  try {
    // await sql.connect(sqlConfig);
    await checkPoolConnection(); // Ensure the connection is active
    const sql = await poolPromise;
    console.log('Connected to the database'); 

    // Assuming you generate a report URL based on the transactions
    const result = await sql.query`

    SELECT 
    one.Branch,
    one.primaryofficerid,
    SUM(ISNULL(LoanBal, 0)) AS Loanbal,
    SUM(ISNULL(DepositBal, 0)) AS DepositBal,
    ISNULL(disbursement, 0) AS disbursement,
    ISNULL(mobilized, 0) AS mobilized,
    ISNULL(OVAPLusInt, 0) AS OVAPLusInt,
    ISNULL(OVAprinOnly, 0) AS OVAprinOnly,
    ISNULL(borrower, 0) AS borrower,
    ISNULL(saver, 0) AS saver,
    ISNULL(newclient, 0) AS newclient,
    ISNULL(closedclient, 0) AS closedclient,
    ISNULL(NBorrower, 0) AS NBorrower,
    ISNULL(fullpay, 0) AS fullpay,
    CASE WHEN OVAPLusInt > 0 THEN ISNULL(BOD, 0) ELSE 0 END AS BOD,
    round(Loanbal/BOD *100,2) AS PAR
FROM 
(
    SELECT 
        Branch,
        primaryofficerid,
        SUM(Runningbal) AS DepositBal 
    FROM 
        deposit de 
    INNER JOIN 
        Groups g ON de.groupid = g.groupid 
    WHERE 
        de.status <> 'closed' 
    GROUP BY 
        Branch, PrimaryOfficerID
) AS one 
LEFT OUTER JOIN 
(
    SELECT 
        Branch AS B1,
        primaryofficerid,
        '0.00' AS ZeroLoanBal 
    FROM 
        deposit d 
    INNER JOIN 
        Groups g ON d.groupid = g.groupid 
    WHERE 
        d.custno NOT IN (SELECT custno FROM loans) 
        AND d.status <> 'closed' 
    GROUP BY 
        Branch, PrimaryOfficerID
) AS oneb ON oneb.B1 = one.Branch AND oneb.PrimaryOfficerID = one.PrimaryOfficerID 
LEFT OUTER JOIN 
(
    SELECT 
        Branch AS B2,
        primaryofficerid,
        Round(-SUM(outstandingbal),2) AS LoanBal  
    FROM 
        loans l 
    INNER JOIN  
        Groups g ON l.groupid = g.groupid 
    WHERE 
        l.status <> 'cancel' 
    GROUP BY 
        Branch, PrimaryOfficerID 
) AS onec ON onec.B2 = one.Branch AND onec.PrimaryOfficerID = one.PrimaryOfficerID 
LEFT OUTER JOIN 
(
    SELECT 
        PrimaryOfficerID,
        CASE WHEN SUM(RepayWithInt) - SUM(servicedInt + ServicedPrin) > 0 THEN 
            SUM(RepayWithInt) - SUM(servicedInt + ServicedPrin) ELSE 0 END AS OVAPLusInt,
        CASE WHEN SUM(PrinRepay - ServicedPrin) > 0 THEN SUM(PrinRepay - ServicedPrin) ELSE 0 END AS OVAprinOnly 
    FROM 
        Loanschedule ls 
    INNER JOIN 
        Loans l ON l.LoanID = ls.LoanID 
    INNER JOIN 
        groups ON l.groupid = groups.groupid 
    INNER JOIN 
    (
        SELECT 
            LoanID 
        FROM 
            Loanschedule 
        WHERE 
            Status = 'not serviced' OR Status = 'Partial' 
        GROUP BY 
            custno, LoanID
    ) d ON d.LoanID = ls.LoanID 
    WHERE 
        l.status = 'Active' 
        AND date <= '2024-09-30'
    GROUP BY 
        PrimaryOfficerID  
) AS two ON one.PrimaryOfficerID = two.PrimaryOfficerID  
LEFT OUTER JOIN 
(
    SELECT 
        CASE WHEN ISNULL(SUM(amount), 0) > 0 THEN ISNULL(SUM(amount), 0) ELSE 0 END AS disbursement,
        primaryofficerid 
    FROM 
        transactn t 
    RIGHT OUTER JOIN 
        Clients c ON t.custno = c.Custno  
    RIGHT OUTER JOIN 
        Groups g ON c.GroupID = g.GroupID  
    WHERE 
        tranid IN ('010', 'R010') 
        AND MONTH(DateEffective) = MONTH('2024-09-30') 
        AND YEAR(DateEffective) = YEAR('2024-01-01') 
    GROUP BY 
        primaryofficerid
) AS twoA ON two.PrimaryOfficerID = twoA.PrimaryOfficerID  
LEFT OUTER JOIN 
(
    SELECT 
        CASE WHEN ISNULL(SUM(amount), 0) > 0 THEN ISNULL(SUM(amount), 0) ELSE 0 END AS mobilized,
        primaryofficerid 
    FROM 
        transactn t 
    RIGHT OUTER JOIN 
        Clients c ON t.custno = c.Custno  
    RIGHT OUTER JOIN 
        Groups g ON c.GroupID = g.GroupID  
    WHERE 
        tranid IN ('002', 'R002') 
        AND MONTH(DateEffective) = MONTH('2024-09-30') 
        AND YEAR(DateEffective) = YEAR('2024-01-01') 
    GROUP BY 
        primaryofficerid 
) AS twoB ON one.PrimaryOfficerID = twoB.PrimaryOfficerID 
LEFT OUTER JOIN 
(
    SELECT 
        CASE WHEN COUNT(DISTINCT custno) > 0 THEN COUNT(DISTINCT custno) ELSE 0 END AS borrower,
        primaryofficerid 
    FROM 
        loans l 
    RIGHT OUTER JOIN 
        Groups g ON l.GroupID = g.GroupID 
    WHERE 
        Status = 'Active'
    GROUP BY 
        primaryofficerid 
) AS three ON two.PrimaryOfficerID = three.PrimaryOfficerID 
LEFT OUTER JOIN 
(
    SELECT 
        COUNT(DISTINCT custno) AS saver,
        primaryofficerid 
    FROM 
        deposit d 
    RIGHT OUTER JOIN 
        Groups g ON d.GroupID = g.GroupID 
    WHERE 
        Status = 'Active' 
    GROUP BY 
        primaryofficerid 
) AS four ON one.PrimaryOfficerID = four.PrimaryOfficerID   
LEFT OUTER JOIN 
(
    SELECT 
        CASE WHEN ISNULL(COUNT(DISTINCT custno), 0) > 0 THEN ISNULL(COUNT(DISTINCT custno), 0) ELSE 0 END AS newclient,
        primaryofficerid 
    FROM 
        clients d 
    RIGHT OUTER JOIN 
        Groups g ON d.GroupID = g.GroupID  
    WHERE 
        Status = 'Active' 
        AND MONTH(DateCreated) = MONTH('2024-01-01')   
        AND YEAR(DateCreated) = YEAR('2024-09-30') 
    GROUP BY 
        primaryofficerid 
) AS five ON two.PrimaryOfficerID = five.PrimaryOfficerID 
LEFT OUTER JOIN 
(
    SELECT 
        CASE WHEN COALESCE(COUNT(DISTINCT custno), 0) > 0 THEN COALESCE(COUNT(DISTINCT custno), 0) ELSE 0 END AS closedclient,
        primaryofficerid 
    FROM 
        clients d 
    RIGHT OUTER JOIN 
        Groups g ON d.GroupID = g.GroupID  
    WHERE 
        Status = 'Closed' 
        AND MONTH(Dateclosed) = MONTH('2024-01-01') 
        AND YEAR(Dateclosed) = YEAR('2024-01-01') 
    GROUP BY 
        primaryofficerid 
) AS six ON two.PrimaryOfficerID = six.PrimaryOfficerID 
LEFT OUTER JOIN 
(
    SELECT 
        CASE WHEN SUM(borrower) > 0 THEN SUM(borrower) ELSE 0 END AS NBorrower,
        primaryofficerid 
    FROM 
    (
        SELECT 
            CASE WHEN amount > 1 THEN 1 ELSE -1 END AS borrower,
            primaryofficerid 
        FROM 
            transactn d  
        LEFT OUTER JOIN 
            loans c ON d.AccountID = c.LoanID 
        INNER JOIN 
            Groups g ON c.GroupID = g.GroupID 
        WHERE 
            tranid IN ('010', 'R010') 
            AND MONTH(valuedate) = MONTH('2024-01-01') 
            AND YEAR(valuedate) = YEAR('2024-01-01')  
        GROUP BY 
            g.primaryofficerid, Amount, AccountID
    ) AS newboro 
    GROUP BY 
        primaryofficerid 
) AS seven ON four.PrimaryOfficerID = seven.PrimaryOfficerID 
LEFT OUTER JOIN 
(
    SELECT 
        CASE WHEN COUNT(AccountID) > 0 THEN COUNT(AccountID) ELSE 0 END AS fullpay,
        primaryofficerid 
    FROM 
        transactn d 
    LEFT OUTER JOIN 
        loans c ON d.AccountID = c.loanid 
    INNER JOIN 
        Groups g ON c.GroupID = g.GroupID 
    WHERE 
        tranid = '101' 
        AND MONTH(valuedate) = MONTH('2024-01-01') 
        AND YEAR(valuedate) = YEAR('2024-01-01') 
        AND stmtref LIKE '%loans' 
    GROUP BY 
        primaryofficerid 
) AS eight ON four.PrimaryOfficerID = eight.PrimaryOfficerID 
LEFT OUTER JOIN 
(
    SELECT 
        PrimaryOfficerID,
        round(-SUM(outstandingbal),2) AS BOD 
    FROM 
        Fieldprintview fv 
    INNER JOIN 
        loans ln ON ln.LoanID = fv.LID AND ln.Custno = fv.custno AND ln.GroupID = fv.groupID 
		INNER JOIN 
		 Groups gp on ln.GroupID=gp.GroupID
    WHERE 
        Overdue > 0 
        AND ln.Status = 'Active' 
    GROUP BY 
        PrimaryOfficerID 
) AS nine ON two.PrimaryOfficerID = nine.PrimaryOfficerID

GROUP BY 
    one.Branch, one.PrimaryOfficerID, OVAprinOnly, disbursement, mobilized, OVAPLusInt, borrower, saver, newclient, closedclient, NBorrower, fullpay,Loanbal,BOD 
ORDER BY one.PrimaryOfficerID
    `;
    
    
    
    console.log(result.recordset);
    const data=result.recordset;

   res.set('Content-Type', 'application/json'); // Set content type    
    return res.json(data);
  } catch (err) {
    console.error('Error fetching transactions:', err.message.replace('mssql-70716-0.cloudclusters.net:19061','server'));
    return res.status(500).json({ status: 'failed', err: err.message.replace('mssql-70716-0.cloudclusters.net:19061','server') });
  } finally {
    // await sql.close();
  }
});

app.post('/register_client', async (req, res) => {
 
  const {
    custno,
    firstname,
    lastname,
    middlename,
    gender,
    qualification,
    biztype,
    bizAddress,
    homeAddress,
    groupID,
    phone,
    email,
    pix,
    sign,
    status,
    branchcode,
    bvn,
    nuban,
    dob,
    marital_status,
  } = req.body.formData;

  try {
    // console.log(custno);
    console.log(req.body);
  const date=new Date().toISOString().slice(0, 10);
 
  

// Convert hex string to Buffer (binary) before saving to SQL

const binarypix = pix ? Buffer.from(pix, 'hex') : Buffer.from('', 'hex');  // Convert the pix hex string to binary if it is in hex otherwise convert to 
//  console.log(pix);
 
  
  const binarysign =sign ? Buffer.from(sign, 'hex'):  Buffer.from('', 'hex'); // Convert the sign hex string to binary
  
  // Connect to the SQL Server
    // const pool = await sql.connect(sqlConfig);
    await checkPoolConnection(); // Ensure the connection is active
    const pool = await poolPromise;
    const result = await pool.request()
      .input('custno', sql.VarChar(10), custno)
      .input('firstname', sql.VarChar(50), firstname)
      .input('lastname', sql.VarChar(50), lastname)
      .input('middlename', sql.VarChar(50), middlename)
      .input('gender', sql.VarChar(6), gender)
      .input('qualification', sql.VarChar(10), qualification)
      .input('biztype', sql.VarChar(30), biztype)
      .input('bizAddress', sql.VarChar(50), bizAddress)
      .input('homeaddress', sql.VarChar(50), homeAddress)
      .input('groupID', sql.VarChar(50), groupID)
      .input('phone', sql.VarChar(14), phone)
      .input('email', sql.VarChar(50), email)
      .input('pix', sql.VarBinary(sql.MAX), binarypix ) // Uncomment if you want to add these later
      .input('sign', sql.VarBinary(sql.MAX), binarysign )
      .input('status', sql.VarChar(10), status)
      .input('branchcode', sql.VarChar(3), custno.slice(0,3))
      .input('bvn', sql.VarChar(12), bvn || '')
      .input('nuban', sql.VarChar(10), nuban || '')
      .input('dob', sql.Date, dob)
      .input('marital_status', sql.VarChar(10), marital_status)
      .input('date', sql.VarChar(10), date)
      .query(
        'INSERT INTO clients (custno, firstname, lastname, middlename, gender, qualification, biztype, bizAddress, homeaddress, groupID, phone, email,pix,sign, status, branchcode, bvn, nuban, dob, marital_status,datecreated) ' +
        'VALUES (@custno, @firstname, @lastname, @middlename, @gender, @qualification, @biztype, @bizAddress, @homeaddress, @groupID, @phone, @email,@pix,@sign, @status, @branchcode, @bvn, @nuban, @dob, @marital_status,@date)'
      );

    // Return success response
     res.set('Content-Type', 'application/json'); // Set content type
    return res.status(200).json({ message: 'Client registered successfully', result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message.replace('mssql-70716-0.cloudclusters.net:19061','server')});
  }
});
//////////////////updating the client info/////////////////////////////////////////////
app.post('/update_client', async (req, res) => {
  const {
    custno,
    firstname,
    lastname,
    middlename,
    gender,
    qualification,
    biztype,
    bizAddress,
    homeAddress,
    groupID,
    phone,
    email,
    pix,
    sign,
    status,
    branchcode,
    bvn,
    nuban,
    dob,
    marital_status,
  } = req.body.formData;

  try {
    // console.log(custno);
    console.log(req.body);
  const date=new Date().toISOString().slice(0, 10);
  //FUNCTION TO CHECK IF IT HAS BEEN CONVERTED ALREADY
  function isHex(string) { //CHECKS IF THE IMAGE IS IN DB HEXA FORM
    return /^[0-9a-fA-F]+$/.test(string);
  }
  
// Convert the binary buffer to Base64
const base64Pix = pix.toString('base64');
// Convert the binary buffer to Base64
const base64Sign = sign.toString('base64');


// Convert hex string to Buffer (binary) before saving to SQL

 const binarypix =isHex(pix)? Buffer.from(pix, 'hex'):Buffer.from(base64Pix, 'base64');  // Convert the pix hex string to binary
//  console.log(pix);
 
  
  const binarysign =isHex(sign)? Buffer.from(sign, 'hex'):Buffer.from(base64Sign, 'base64'); // Convert the sign hex string to binary
      // Connect to the SQL Server
    // const pool = await sql.connect(sqlConfig);
    await checkPoolConnection(); // Ensure the connection is active
    const pool = await poolPromise;
    const result = await pool.request()
      .input('custno', sql.VarChar(10), custno)
      .input('firstname', sql.VarChar(50), firstname)
      .input('lastname', sql.VarChar(50), lastname)
      .input('middlename', sql.VarChar(50), middlename)
      .input('gender', sql.VarChar(6), gender)
      .input('qualification', sql.VarChar(10), qualification)
      .input('biztype', sql.VarChar(30), biztype)
      .input('bizAddress', sql.VarChar(50), bizAddress)
      .input('homeaddress', sql.VarChar(50), homeAddress)
      .input('groupID', sql.VarChar(50), groupID)
      .input('phone', sql.VarChar(14), phone)
      .input('email', sql.VarChar(50), email)
      .input('pix', sql.VarBinary(sql.MAX), binarypix ) // Uncomment if you want to add these later
      .input('sign', sql.VarBinary(sql.MAX), binarysign )
      .input('status', sql.VarChar(10), status)
      .input('branchcode', sql.VarChar(3), branchcode)
      .input('bvn', sql.VarChar(12), bvn || '')
      .input('nuban', sql.VarChar(10), nuban || '')
      .input('dob', sql.Date, dob)
      .input('marital_status', sql.VarChar(10), marital_status)
      .input('date', sql.VarChar(10), date)
      .query(
        `UPDATE clients
     SET firstname = @firstname,
         lastname = @lastname,
         middlename = @middlename,
         gender = @gender,
         qualification = @qualification,
         biztype = @biztype,
         bizAddress = @bizAddress,
         homeaddress = @homeaddress,
         groupID = @groupID,
         phone = @phone,
         email = @email,
         pix = @pix,
         sign = @sign,
         status = @status,
         branchcode = @branchcode,
         bvn = @bvn,
         nuban = @nuban,
         dob = @dob,
         marital_status = @marital_status,
         datecreated = @date
     WHERE custno = @custno`
      );

    // Return success response
     res.set('Content-Type', 'application/json'); // Set content type
    return res.status(200).json({ message: 'Client updated successfully', result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message.replace('mssql-70716-0.cloudclusters.net:19061','server') });
  }
});

//////////////////////////end of updating clientinfo//////////////////////////////////
app.post('/get_history', async (req, res) => {
  const { custno, accountid } = req.body;

  // Validate input
  if (!custno || !accountid) {
    return res.status(400).json({ message: 'custno and accountid are required.' });
  }

  try {
    console.log(custno, accountid);
    
    // Connect to the SQL Server
    await checkPoolConnection(); // Ensure the connection is active
    const pool = await poolPromise;
    // const pool = await sql.connect(sqlConfig);
    // Parameterized query using `input` to declare parameters
    const request = pool.request();
    request.input('custno', sql.VarChar, custno);  
    request.input('accountid', sql.VarChar, accountid);  

    if(accountid.slice(0,1)==='2'){
      // Parameterized query to prevent SQL injection
    const result = await request.query(
      'SELECT tranid, CONVERT(varchar, ValueDate, 111) AS ValueDate, AccountID, Stmtref, transactionNbr, amount, Runningbal, CreatedBy ' +
      'FROM transactn ' +
      'WHERE custno = @custno AND AccountID = @accountid ' +
      'ORDER BY DateProcessing, ValueDate',
      { custno, accountid }
    );
    const data = result.recordset;
    console.log(data);
    return res.json(data);
    }
    else{
    // Use parameterized query to avoid SQL injection
    const result = await request.query(
      'SELECT tranid, CONVERT(varchar, ValueDate, 111) AS ValueDate, AccountID, Stmtref, transactionNbr, ' +
      'CASE WHEN tranid in ( \'010\',\'R010\') THEN CONVERT(decimal(12,2), amount * interestpercent) ELSE amount END AS amount, ' +
      'ROUND(Runningbal * interestpercent, 1) AS Runningbal, CreatedBy ' +
      'FROM transactn t INNER JOIN loans l ON l.custno = t.custno AND l.loanid = t.accountid ' +
      'WHERE t.custno = @custno AND AccountID = @accountid AND tranid IN (\'001\', \'010\', \'R001\', \'R010\') ' +
      'ORDER BY ValueDate, DateProcessing',
      { custno, accountid }
    );
    const data = result.recordset;
    console.log(data);
     res.set('Content-Type', 'application/json'); // Set content type
    return res.json(data);
  }
    
  } catch (err) {
    console.error(err);  // Log the actual error
    return res.status(500).json({ message: err.message.replace('mssql-70716-0.cloudclusters.net:19061','server') });
  }
});
// Endpoint to fetch Group workflow data
app.get('/workflow', async (req, res) => {
  const branchCode = req.query.branchCode || 'all';
  let SQL = `SELECT groupid, SUM(amount) AS amount, CONVERT(VARCHAR(10), CAST(valuedate AS DATE), 120) AS ValueDate 
             FROM pendingGrptrx 
             WHERE TranID NOT IN ('011', '*001', '*002', '*005', '*011') 
             GROUP BY groupid, ValueDate`;

  if (branchCode !== 'all') {
      SQL = `SELECT groupid, SUM(amount) AS amount, LEFT(ValueDate, 11) AS ValueDate 
              FROM pendingGrptrx 
              WHERE LEFT(custno, 3) = @branchCode 
              AND TranID NOT IN ('011', '*001', '*002', '*005', '*011') 
              GROUP BY groupid, ValueDate`;
  }

  try {
      // Connect to the database
      // const pool = await sql.connect(sqlConfig);
      // console.log('ok');
      await checkPoolConnection(); // Ensure the connection is active
      const pool = await poolPromise;
      const request = pool.request();

      // Use a prepared statement for branchCode
      if (branchCode !== 'all') {
          request.input('branchCode', sql.VarChar, branchCode);
      }
      console.log('connecting...');
      const result = await request.query(SQL);
      res.json(result.recordset);
  } catch (error) {
      console.error('SQL error', error);
      res.status(500).send('Error retrieving data');
  } finally {
      // await sql.close(); // Close the connection
  }
});
// Endpoint to fetch Group workflow data
app.get('/workflowInd', async (req, res) => {
  const { groupid, date, branchCode} = req.query;

  console.log(branchCode,groupid,date);
  let SQL='';
  if(groupid==='none'){
    
     SQL = `select  * from PendingTrx where left(custno,3)='${branchCode}' and tranid not in  ('011','*002','*005','*001','*011')  and valuedate='${date}'`;
  }
  else{
   SQL = `select  * from PendinggrpTrx where left(custno,3)='${branchCode}' and tranid not in ('011','*002','*005','*001','*011') and groupid='${groupid}' and valuedate='${date}'`;
  }

  try {
     
      await checkPoolConnection(); // Ensure the connection is active
      const pool = await poolPromise;
      const request = pool.request();

      // Use a prepared statement for branchCode
      if (branchCode !== 'all') {
          request.input('branchCode', sql.VarChar, branchCode);
      }
     
      const result = await request.query(SQL);
       res.set('Content-Type', 'application/json'); // Set content type
      res.json(result.recordset);
  } catch (error) {
      console.error('SQL error', error);
      res.status(500).send('Error retrieving data');
  } finally {
      // await sql.close(); // Close the connection
  }
});
// Endpoint to get  chart data
app.get('/chart/:branch', async (req, res) => {
  const ChartBranch = req.params.branch;
  const ses_date = new Date().toISOString().slice(0, 10); // Use the current date for example
  let limitsearch = '';

  if (ChartBranch !== 'All' && ChartBranch !== '00' && ChartBranch) {
      limitsearch = ` AND LEFT(LTRIM(custno), 3) = '${ChartBranch}'`;
  }

  try {
      // const pool = await sql.connect(sqlConfig);
      await checkPoolConnection(); // Ensure the connection is active
      const pool = await poolPromise;
      const request = pool.request();

      // Queries
      const sqlDisbursed = `SELECT ISNULL(SUM(amount), 0) AS disbursement, LEFT(DATENAME(MONTH, DATEADD(month, MONTH(ValueDate), -1)), 3) AS MonthDisb 
                            FROM transactn 
                            WHERE tranid IN ('010', 'R010') AND YEAR(ValueDate) = YEAR('${ses_date}') ${limitsearch} 
                            GROUP BY MONTH(ValueDate)`;

      const sqlMobilized = `SELECT ISNULL(SUM(amount), 0) AS mobilized, LEFT(DATENAME(MONTH, DATEADD(month, MONTH(ValueDate), -1)), 3) AS MonthDisb 
                            FROM transactn 
                            WHERE tranid IN ('002', 'R002') AND YEAR(ValueDate) = YEAR('${ses_date}') ${limitsearch} 
                            GROUP BY MONTH(ValueDate) ORDER BY MONTH(ValueDate)`;

      const disbursedResult = await request.query(sqlDisbursed);
      const mobilizedResult = await request.query(sqlMobilized);
       res.set('Content-Type', 'application/json'); // Set content type
      res.json({
          disbursement: disbursedResult.recordset,
          mobilized: mobilizedResult.recordset,
      });
  } catch (error) {
      console.error('SQL error', error);
      res.status(500).send('Error retrieving data');
  } finally {
      // await sql.close();
  }
});
///////////////////////////UPDATE SESSION DATE
app.post('/set_session_date', async (req, res) => {
  const { ses_date } = req.body; // Destructure ses_date from req.body directly

  try {
    console.log(req.body);

    // Ensure the connection is active
    await checkPoolConnection(); 
    const pool = await poolPromise;

    // Execute the query to update the session date
    const result = await pool.request()
      .input('ses_date', sql.VarChar(10), ses_date) // Use ses_date directly
      .query(`
        UPDATE company
        SET ses_date = @ses_date
      `);

    // Return success response
     res.set('Content-Type', 'application/json'); // Set content type
    return res.status(200).json({ message: 'Session Date changed successfully', result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message.replace('mssql-70716-0.cloudclusters.net:19061','server') });
  }
});


///////////////////////////////////////////////////////////////
/// Endpoint to fetch income and expense data
app.get('/incomechart/:branch', async (req, res) => {
  const branch = req.params.branch || 'All';
   const ses_date = new Date().toISOString().slice(0, 10);
  // const ses_date = '2024-09-01';

  // Limit search query based on branch
  let limitsearch = '';
  if (branch !== 'All' && branch !== '00' && branch !== '') {
      limitsearch = ` AND LEFT(LTRIM(custno), 3) = @branch`;
  }

  const sqlIncome = `
      SELECT ISNULL(SUM(Amount), 0) AS income
      FROM transactn T
      INNER JOIN GLCOA G ON LEFT(LTRIM(G.COANBR), 5) = LEFT(LTRIM(T.CREDITGL), 5)
      WHERE TRANID = '020' AND COATYPE = 'I' 
      AND MONTH(valuedate) = MONTH(@ses_date) AND YEAR(valuedate) = YEAR(@ses_date)${limitsearch}
  `;
  const sqlIncomeloan=`select  abs(isnull(sum(amount),0))  income from transactn t
   where tranid in ('011','R0011')  and month(ValueDate)=MONTH(@ses_date)  AND YEAR(valuedate) = YEAR(@ses_date)${limitsearch}`;
  
  const sqlExpense = `
      SELECT ISNULL(SUM(Amount), 0) AS expense
      FROM transactn T
      INNER JOIN GLCOA G ON LEFT(LTRIM(G.COANBR), 5) = LEFT(LTRIM(T.DEBITGL), 5)
      WHERE TRANID = '020' AND COATYPE = 'E' 
      AND MONTH(valuedate) = MONTH(@ses_date) AND YEAR(valuedate) = YEAR(@ses_date)${limitsearch}
  `;

  try {
      // Get the connection pool
      await checkPoolConnection(); // Ensure the connection is active
      const pool = await poolPromise;
      const request = pool.request();
      request.input('ses_date', sql.Date, ses_date);

      if (branch !== 'All' && branch !== '00' && branch !== '') {
          request.input('branch', sql.VarChar, branch);
      }

      const incomeResult = await request.query(sqlIncome);
      const incomeLoanResult = await request.query(sqlIncomeloan);
      const expenseResult = await request.query(sqlExpense);

      const incomegl = incomeResult.recordset[0].income ;
      const incomeln = incomeLoanResult.recordset[0].income;
      const expense = expenseResult.recordset[0].expense;
      const income=incomegl+incomeln;
      res.json({ income, expense });
  } catch (err) {
      console.error('SQL error', err);
      res.status(500).json({ error: err });
  }
});
///////////////////////////////////HANDLE TRANSACTION APPROVAL////////////////////////////////////////////////////////
////////Approving 
app.post('/approvetransactionall', async (req, res) => {
  const trans=req.body;
  console.log(req.body);
  for (const tran of trans) {
  const {
    AccountID,
    TranID,
    Amount,
    TransactionNbr,
    CustNo,
    BranchID,
    GroupID,
    IntElement,
    PrinElement
  } = tran;
  console.log(TranID,AccountID,Amount);

  await checkPoolConnection(); // Ensure the connection is active
    const pool = await poolPromise;
    
    const balance = await getAccountBalance(pool, AccountID,CustNo);
   
  if (TranID === "001") {
    runningBal = await handleLoanTransaction(pool, IntElement, PrinElement, TransactionNbr, AccountID, CustNo, balance,TranID,GroupID);
  } else if (TranID === "002") {
    runningBal = await handleDepositTransaction(pool, TransactionNbr, AccountID, Amount, balance, TranID,GroupID);
  } else {
    runningBal = await handleOtherTransactionTypes(pool, TranID, TransactionNbr, AccountID, Amount, balance, CustNo,GroupID);
  }

  // res.send({ message: `Transaction posted for custno: ${CustNo} and AccountID:${AccountID}` });

}
res.send({ message: 'Transaction posted successfully', runningBal });
});
///////////////////////////////////////////////////////////////////
////Post Bal difference between cloud based and window based
app.post('/insert_balancediff', async (req, res) => {
  const { custno,LoanID,AccountID,balAcc,balHist,baldiff,name,userid }
  = req.body;
  console.log(baldiff);
  const date=new Date();
  const formattedDate=date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/(\d+)\/(\d+)\/(\d+)/, '$1-$2-$3');
 
  const transactionNbr=generateTransactionNumber('rpt');
  try {
    await checkPoolConnection(); // Ensure the connection is active
    const pool = await poolPromise;
    
    // const balance = await getAccountBalance(pool, AccountID,CustNo);
    
    // Validate CustNo to avoid SQL errors
    if (!custno || typeof custno !== 'string' ||custno.trim().length === 0) {
      throw new Error('Invalid CustNo');
    }
    const queryInsertdiff =LoanID ? `
    INSERT INTO transactn (AccountID, tranid, Amount, DebitGL, CreditGL, Runningbal, ValueDate, DateEffective, CustNO, StmtRef, BranchID, ChequeNbr, CreatedBy, transactionNbr) 
    Values(@LoanID,'001',@baldiff,'0','0',@balAcc,@formattedDate,@formattedDate,@custno,'Migration diff adjusted',@name,'',@userid,@transactionNbr)  ` 
    :
    `INSERT INTO transactn (AccountID, tranid, Amount, DebitGL, CreditGL, Runningbal, ValueDate, DateEffective, CustNO, StmtRef, BranchID, ChequeNbr, CreatedBy, transactionNbr) 
    Values(@AccountID,'001',@baldiff,'0','0',@balAcc,@formattedDate,@formattedDate,@custno,'Migration diff adjusted',@name,'',@userid,@transactionNbr)`;
                  
    // Prepare and execute the SQL command
    
    const request = await pool.request()
    request
        .input('AccountID', sql.VarChar(12), AccountID)
        .input('LoanID', sql.VarChar(12), LoanID)
        .input('custno', sql.VarChar(12), custno)
        .input('baldiff', sql.Decimal(18, 2), parseFloat(baldiff)) //  convert to float
        .input('balAcc', sql.Decimal(18, 2), balAcc)
        .input('name', sql.VarChar, name)
        .input('formattedDate', sql.Date, formattedDate)
        .input('transactionNbr', sql.VarChar, transactionNbr) 
        .input('userid', sql.VarChar, userid); // You may want to use a variable here

    await request.query(queryInsertdiff);

  
    
    res.send({ message: 'Transaction posted successfully' });
    
  } catch (err) {
    console.error('SQL error', err);
    res.status(500).send({ error: err.message.replace('mssql-70716-0.cloudclusters.net:19061', 'server') });
  }
});


// POST endpoint for approving transactions
app.post('/approvetransaction', async (req, res) => {
  const {
    AccountID,
    TranID,
    Amount,
    TransactionNbr,
    CustNo,
    BranchID,
    GroupID,
    IntElement,
    PrinElement
  } = req.body;

  let runningBal = 0;

  try {
    await checkPoolConnection(); // Ensure the connection is active
    const pool = await poolPromise;
    
    const balance = await getAccountBalance(pool, AccountID,CustNo);
    
    // Validate CustNo to avoid SQL errors
    if (!CustNo || typeof CustNo !== 'string' || CustNo.trim().length === 0) {
      throw new Error('Invalid CustNo');
    }

    if (TranID === "001") {
      runningBal = await handleLoanTransaction(pool, IntElement, PrinElement, TransactionNbr, AccountID, CustNo, balance,TranID,GroupID);
    } else if (TranID === "002") {
      runningBal = await handleDepositTransaction(pool, TransactionNbr, AccountID, Amount, balance, TranID,GroupID);
    } else {
      runningBal = await handleOtherTransactionTypes(pool, TranID, TransactionNbr, AccountID, Amount, balance, CustNo,GroupID);
    }

    res.send({ message: 'Transaction posted successfully', runningBal });
    
  } catch (err) {
    console.error('SQL error', err);
    res.status(500).send({ error: err.message.replace('mssql-70716-0.cloudclusters.net:19061', 'server') });
  }
});

// Function to get account balance
async function getAccountBalance(pool, AccountID,CustNo) {
  const TableAccColumn = AccountID.slice(0, 1) === '2' ? 'AccountID' : 'Loanid';
  const TableBalColumn = AccountID.slice(0, 1) === '2' ? 'RunningBal' : 'OutstandingBal';
  const TableName = AccountID.slice(0, 1) === '2' ? 'Deposit' : 'Loans';

  const balanceResult = await pool.request()
    .input('AccountID', sql.VarChar, AccountID)
    .input('CustNo', sql.VarChar, CustNo)
    .query(`SELECT ${TableBalColumn} as balance FROM ${TableName} WHERE ${TableAccColumn} = @AccountID and CustNo=@CustNo`);
//  console.log(`SELECT ${TableBalColumn} as balance FROM ${TableName} WHERE ${TableAccColumn} = @AccountID and CustNo=@CustNo`);
    console.log('balance:',balanceResult.recordset[0]);
  return balanceResult.recordset[0].balance;
}

// Function to handle loan transactions
async function handleLoanTransaction(pool, IntElement, PrinElement, TransactionNbr, AccountID, CustNo, balance,TranID,GroupID) {
  let pamount = PrinElement;
  let intamount = IntElement;

  const runningBal = (balance + parseFloat(pamount)).toFixed(2);
  const updateLoanBalQuery = `EXEC updateLoanBal @pamount, @AccountID, @CustNo`;
  
  const queryInsertRepayment =GroupID==='none' ? `
    INSERT INTO transactn (AccountID, tranid, Amount, DebitGL, CreditGL, Runningbal, ValueDate, DateEffective, CustNO, StmtRef, BranchID, ChequeNbr, CreatedBy, transactionNbr) 
    SELECT AccountID, tranid, Amount, DebitGL, CreditGL, @runningBal, ValueDate, DateEffective, CustNO, StmtRef, BranchID, ChequeNbr, CreatedBy, transactionNbr 
    FROM pendingtrx WHERE transactionNbr = @TransactionNbr
  ` : `
    INSERT INTO transactn (AccountID, tranid, Amount, DebitGL, CreditGL, Runningbal, ValueDate, DateEffective, CustNO, StmtRef, BranchID, ChequeNbr, CreatedBy, transactionNbr) 
    SELECT AccountID, tranid, Amount, DebitGL, CreditGL, @runningBal, ValueDate, DateEffective, CustNO, StmtRef, BranchID, ChequeNbr, CreatedBy, transactionNbr 
    FROM pendinggrptrx WHERE transactionNbr = @TransactionNbr
  `;
  const LoanschSQLUpdate = `
    UPDATE loanschedule SET servicedprin = servicedprin + @pamount, servicedint = servicedint + @intamount 
    WHERE custNo = @CustNo AND loanid = @AccountID AND count = 1
  `;

  const queryDelPendTrx =GroupID==='none'? `
    DELETE FROM pendingtrx 
    WHERE transactionNbr = @TransactionNbr AND AccountID = @AccountID AND tranID = @TranID
  `:  `DELETE FROM pendinggrptrx 
  WHERE transactionNbr = @TransactionNbr AND AccountID = @AccountID AND tranID = @TranID`
;

  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const request1 = new sql.Request(transaction);
    request1.input('pamount', sql.Decimal(18, 2), pamount);
    request1.input('AccountID', sql.VarChar(12), AccountID);
    request1.input('CustNo', sql.VarChar(12), CustNo);
    await request1.query(updateLoanBalQuery);

    const request2 = new sql.Request(transaction);
    request2.input('runningBal', sql.Decimal(18, 2), runningBal);
    request2.input('TransactionNbr', sql.VarChar(50), TransactionNbr);
    await request2.query(queryInsertRepayment);

    const request3 = new sql.Request(transaction);
    request3.input('pamount', sql.Decimal(18, 2), pamount);
    request3.input('intamount', sql.Decimal(18, 2), intamount);
    request3.input('AccountID', sql.VarChar(12), AccountID);
    request3.input('TranID', sql.VarChar(6), TranID); // Ensure TranID is defined
    request3.input('CustNo', sql.VarChar(12), CustNo);
    await request3.query(LoanschSQLUpdate);

    const request4 = new sql.Request(transaction);
    request4.input('TransactionNbr', sql.VarChar(50), TransactionNbr);
    request4.input('AccountID', sql.VarChar(50), AccountID);
    request4.input('TranID', sql.VarChar(6), TranID); // Ensure TranID is defined
    await request4.query(queryDelPendTrx);

    await transaction.commit();
    return runningBal;

  } catch (err) {
    await transaction.rollback();
    throw new Error('Error during transaction: ' + err.message.replace('mssql-70716-0.cloudclusters.net:19061', 'server'));
  }
}
// Search endpoint
app.get('/api/search/:accountNameTyped', async (req, res) => {
  try {
    await checkPoolConnection(); // Ensure the connection is active
    const pool = await poolPromise;
   
      const { accountNameTyped } = req.params;
      const result = await pool.request()
          .input('accountNameTyped', sql.VarChar, `%${accountNameTyped}%`)
          .query(`select lastname+' '+middlename+' '+firstname as accountName,CustNo from clients
  where lastname+' '+middlename+' '+firstname like @accountNameTyped or firstname+' '+middlename+' '+lastname like @accountNameTyped or firstname+' '+lastname like @accountNameTyped or lastname+' '+firstname like @accountNameTyped  or lastname+' '+firstname+' '+middlename like @accountNameTyped

            `);
 
      res.json(result.recordset);
      console.log(result.recordset);
  } catch (error) {
      console.error(error);
      res.status(500).send('Error retrieving data');
  } finally {
    
  }
});


// Function to handle deposit transactions
async function handleDepositTransaction(pool, TransactionNbr, AccountID, Amount, balance,TranID,CustNo,GroupID) {
  
  const runningBal = (balance + parseFloat(Amount)).toFixed(2);
  console.log("here:",Amount,runningBal);
  const updateDepositQuery = `UPDATE Deposit SET RunningBal = RunningBal + @Amount WHERE AccountID = @AccountID and CustNo=@CustNo`;
  const queryInsertDeposit =GroupID==='none'? `
    INSERT INTO transactn (AccountID, tranid, Amount, DebitGL, CreditGL, Runningbal, ValueDate, DateEffective, CustNO, StmtRef, BranchID, ChequeNbr, CreatedBy, transactionNbr) 
    SELECT AccountID, tranid, Amount, DebitGL, CreditGL, @runningBal, ValueDate, DateEffective, CustNo, StmtRef, BranchID, ChequeNbr, CreatedBy, transactionNbr 
    FROM pendingtrx WHERE transactionNbr = @TransactionNbr
  `: `
    INSERT INTO transactn (AccountID, tranid, Amount, DebitGL, CreditGL, Runningbal, ValueDate, DateEffective, CustNO, StmtRef, BranchID, ChequeNbr, CreatedBy, transactionNbr) 
    SELECT AccountID, tranid, Amount, DebitGL, CreditGL, @runningBal, ValueDate, DateEffective, CustNo, StmtRef, BranchID, ChequeNbr, CreatedBy, transactionNbr 
    FROM pendinggrptrx WHERE transactionNbr = @TransactionNbr
  `;
  console.log("query:",queryInsertDeposit);
  const queryDelPendTrx =GroupID==='none'? `
    DELETE FROM pendingtrx 
    WHERE transactionNbr = @TransactionNbr AND AccountID = @AccountID AND tranID = @TranID
  `: `
    DELETE FROM pendinggrptrx 
    WHERE transactionNbr = @TransactionNbr AND AccountID = @AccountID AND tranID = @TranID
  `;

 
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    
    const request1 = new sql.Request(transaction);
    request1.input('Amount', sql.Decimal(18, 2), Amount);
    request1.input('AccountID', sql.VarChar(12), AccountID);
    request1.input('CustNo', sql.VarChar(12), CustNo);
    await request1.query(updateDepositQuery);

    const request2 = new sql.Request(transaction);
    request2.input('runningBal', sql.Decimal(18, 2), runningBal);
    request2.input('TransactionNbr', sql.VarChar(50), TransactionNbr);
    await request2.query(queryInsertDeposit);

    const request3 = new sql.Request(transaction);
    request3.input('TransactionNbr', sql.VarChar(50), TransactionNbr);
    request3.input('AccountID', sql.VarChar(50), AccountID);
    request3.input('TranID', sql.VarChar(6), TranID);
    await request3.query(queryDelPendTrx);

    await transaction.commit();
    return runningBal;

  } catch (err) {
    await transaction.rollback();
    throw new Error('Error during transaction: ' + err.message.replace('mssql-70716-0.cloudclusters.net:19061', 'server'));
  }
}

// Function to handle other transaction types
async function handleOtherTransactionTypes(pool, TranID, TransactionNbr, AccountID, Amount,balance,CustNo,GroupID) {
  // Handle withdrawal and other cases...
  // Similar to handleDepositTransaction, but amount is being subtracted from the bal unlike Deposit.
  const runningBal = (balance + parseFloat(-Amount)).toFixed(2);
  const updateWithdrQuery = `UPDATE Deposit SET RunningBal = RunningBal - @Amount WHERE AccountID = @AccountID and CustNo=@CustNo`;
  const queryInsertWithdr =GroupID==='nome'? `
    INSERT INTO transactn (AccountID, tranid, Amount, DebitGL, CreditGL, Runningbal, ValueDate, DateEffective, CustNO, StmtRef, BranchID, ChequeNbr, CreatedBy, transactionNbr) 
    SELECT AccountID, tranid, Amount, DebitGL, CreditGL, @RunningBal, ValueDate, DateEffective, CustNO, StmtRef, BranchID, ChequeNbr, CreatedBy, transactionNbr 
    FROM pendingtrx WHERE transactionNbr = @TransactionNbr
  `:`
    INSERT INTO transactn (AccountID, tranid, Amount, DebitGL, CreditGL, Runningbal, ValueDate, DateEffective, CustNO, StmtRef, BranchID, ChequeNbr, CreatedBy, transactionNbr) 
    SELECT AccountID, tranid, Amount, DebitGL, CreditGL, @RunningBal, ValueDate, DateEffective, CustNO, StmtRef, BranchID, ChequeNbr, CreatedBy, transactionNbr 
    FROM pendinggrptrx WHERE transactionNbr = @TransactionNbr
  `;
  const queryDelPendTrx =GroupID==='none'? `
    DELETE FROM pendingtrx 
    WHERE transactionNbr = @TransactionNbr AND AccountID = @AccountID AND tranID = @TranID
  `: `
    DELETE FROM pendinggrptrx 
    WHERE transactionNbr = @TransactionNbr AND AccountID = @AccountID AND tranID = @TranID
  `;

  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const request1 = new sql.Request(transaction);
    request1.input('Amount', sql.Decimal(18, 2), Amount);
    request1.input('AccountID', sql.VarChar(12), AccountID);
    request1.input('CustNo', sql.VarChar(12), CustNo);
    await request1.query(updateWithdrQuery);

    const request2 = new sql.Request(transaction);
    request2.input('RunningBal', sql.Decimal(18, 2), runningBal);
    request2.input('TransactionNbr', sql.VarChar(50), TransactionNbr);
    await request2.query(queryInsertWithdr);

    const request3 = new sql.Request(transaction);
    request3.input('TransactionNbr', sql.VarChar(50), TransactionNbr);
    request3.input('AccountID', sql.VarChar(12), AccountID);
    request3.input('TranID', sql.VarChar(6), TranID);
    await request3.query(queryDelPendTrx);

    await transaction.commit();
    return runningBal;

  } catch (err) {
    await transaction.rollback();
    throw new Error('Error during transaction: ' + err.message.replace('mssql-70716-0.cloudclusters.net:19061', 'server'));
  }
}



///////////////////////////////////////////////////////////////////////////////////////////
// Endpoint to get Bulk posting loan data
app.post('/getbulkloans', async (req, res) => {
  const code = req.body.code; // Get group code from request body
  const date = new Date(); // Get current date
  const formattedDate = date.toISOString().split('T')[0]; // Format date

  const sqlQuery = `
      SELECT l.loanID, outstandingbal, expected, loanproduct, interestPercent, c.custno,
      CONCAT(lastname, ' ',middlename,' ', firstname) AS name 
      FROM clients c 
      INNER JOIN loans l ON c.custno = l.custno 
      LEFT OUTER JOIN (SELECT * FROM expected) ls ON l.loanid = ls.loanid 
      WHERE c.groupID = @groupId AND l.status = 'Active' 
      ORDER BY c.custno`;

  try {
    await checkPoolConnection(); // Ensure the connection is active
    const pool = await poolPromise;
   
    const result = await pool.request()
    .input('groupId', sql.VarChar, code) // Use input for named parameter
    .query(sqlQuery);
    
    // Return success response
     

       res.status(200).json(result.recordset);
       console.log(result.recordset);
  } catch (err) {
      console.error(err);
     return({status:'failed',err:err.message.replace('mssql-70716-0.cloudclusters.net:19061','server')})

  }
});
///////////////////////////////////Both deposit and repayment bulk posting
app.post('/postbulkdepositsrepayments', async (req, res) => {
  const deposits = req.body.depositToPost; // Get deposits array from request body
  const repayments = req.body.repayToPost; // Get deposits array from request body
  const groupid = req.body.code; // Get groupid  from request body
  const userid = req.body.userid; // Get userid  from request body

  const date = new Date(); // Get current date
  const formattedDate = date.toISOString().split('T')[0]; // Format date
 

  let transaction;
  try {
      await checkPoolConnection(); // Ensure the connection is active
      const pool = await poolPromise;

       // Use a transaction for bulk inserts
   transaction = new sql.Transaction(pool);
      await transaction.begin();
   //POSTING FOR DEPOSIT
      for (const deposit of deposits) {
        const transactionNbr = generateTransactionNumber(groupid);
          const { code,AccountID, CustNo, RunningBal, name, accountValue } = deposit;
          const grouptrxNbr = `${groupid}${AccountID}-deposit-${formattedDate}`;
          const narration = `Cash dep by ${name}`;
          const glcode=code.slice(0,6)+CustNo.slice(0,3);
          const pettycashgl='11102-'+CustNo.slice(0,3);
          const sqlQuery = `
              INSERT INTO pendinggrptrx (AccountID, tranid, Amount, DebitGL, CreditGL, Runningbal, ValueDate, DateEffective, CustNO, StmtRef, BranchID, ChequeNbr, CreatedBy, transactionNbr, groupid,Grouptrxno)
              VALUES (@AccountID, '002', @accountValue, @pettycashgl, @glcode, @RunningBal, @formattedDate, @formattedDate, @CustNo, @narration, @name, 'Cash Deposit', @userid, @transactionNbr,@groupid,@grouptrxNbr)
          `;
     
          // Prepare and execute the SQL command
          const request = new sql.Request(transaction);
          request.input('AccountID', sql.VarChar(12), AccountID)
              .input('CustNo', sql.VarChar(12), CustNo)
              .input('accountValue', sql.Decimal(18, 2), parseFloat(accountValue.replace(/,/g, ''))) // Remove commas and convert to float
              .input('RunningBal', sql.Decimal(18, 2), RunningBal)
              .input('name', sql.VarChar, name)
              .input('formattedDate', sql.Date, formattedDate)
              .input('transactionNbr', sql.VarChar, transactionNbr)
              .input('narration', sql.VarChar, narration)
              .input('grouptrxNbr', sql.VarChar, grouptrxNbr)  
              .input('glcode', sql.VarChar, glcode)  
              .input('pettycashgl', sql.VarChar, pettycashgl) 
              .input('groupid', sql.VarChar, groupid) 
              .input('userid', sql.VarChar, userid); // You may want to use a variable here

          await request.query(sqlQuery);
      }

       //POSTING FOR REPAYMENT
     
       for (const repayment of repayments) {
        const transactionNbr = generateTransactionNumber(groupid);
        const { code,loanID, custno, outstandingbal, name,interestPercent,
        accountValue } = repayment; 
        const grouptrxNbr = `${groupid}${loanID}-repay-${formattedDate}`;
        const groupinttrxNbr = `${groupid}${loanID}-int-${formattedDate}`;
        const narration = `Bulk repay by ${name}`;
        const glcode=code.slice(0,6)+custno.slice(0,3);
        const pettycashgl='11102-'+custno.slice(0,3);
        const accountAmount= parseFloat(accountValue.replace(/,/g, ''));
        const intamount=accountAmount-(accountAmount/interestPercent);
        const pamount=accountAmount/interestPercent;
        const RunningBal=(outstandingbal/interestPercent)+ pamount;
        const sqlQuery = `
            INSERT INTO pendinggrptrx (AccountID, tranid, Amount, DebitGL, CreditGL, Runningbal, ValueDate, DateEffective, CustNO, StmtRef, BranchID, ChequeNbr, CreatedBy, transactionNbr,groupid, Grouptrxno,intElement,PrinElement)
            VALUES (@loanID, '001', @accountValue,@glcode, @pettycashgl,  @RunningBal, @formattedDate, @formattedDate, @CustNo, @narration, @name, 'Bulk Repayment', @userid, @transactionNbr,@groupid,@grouptrxNbr,@intamount,@pamount)
        `;
        const sqlQuery2 = `
            INSERT INTO pendinggrptrx (AccountID, tranid, Amount, DebitGL, CreditGL, Runningbal, ValueDate, DateEffective, CustNO, StmtRef, BranchID, ChequeNbr, CreatedBy, transactionNbr,groupid, Grouptrxno,intElement,PrinElement)
            VALUES (@loanID, '011', @intamount,@glcode, @pettycashgl,  @RunningBal, @formattedDate, @formattedDate, @CustNo, @narration, @name, 'Int on Repay', @userid, @transactionNbr,@groupid,@groupinttrxNbr,@intamount,@pamount)
        `;
   
        // Prepare and execute the SQL command
        const request = new sql.Request(transaction);
        request.input('loanID', sql.VarChar(12), loanID)
            .input('custno', sql.VarChar(12), custno)
            .input('accountValue', sql.Decimal(18, 2), parseFloat(accountValue.replace(/,/g, ''))) // Remove commas and convert to float
            .input('RunningBal', sql.Decimal(18, 2), RunningBal)
            .input('name', sql.VarChar, name)
            .input('formattedDate', sql.Date, formattedDate)
            .input('transactionNbr', sql.VarChar, transactionNbr)
            .input('narration', sql.VarChar, narration)
            .input('grouptrxNbr', sql.VarChar, grouptrxNbr)  
            .input('groupinttrxNbr', sql.VarChar, groupinttrxNbr)
            .input('glcode', sql.VarChar, glcode) 
            .input('pettycashgl', sql.VarChar, pettycashgl) 
            .input('intamount',  sql.Decimal(18, 2), intamount) 
            .input('pamount', sql.Decimal(18, 2), pamount) 
            .input('groupid', sql.VarChar, groupid)  
            .input('userid', sql.VarChar, userid); // You may want to use a variable here

        await request.query(sqlQuery);
        await request.query(sqlQuery2);
    }
      await transaction.commit(); // Commit the transaction
      res.status(200).json({ message: 'Bulk transactions posted successfully,...Loans and savings' });
  } catch (err) {
      await transaction.rollback(); // Rollback the transaction on error
      console.error(err);
      res.status(500).json({ status: 'failed', error: err.message.replace('mssql-70716-0.cloudclusters.net:19061', 'server') });
  }
});

///////////////Posting bulk deposits
app.post('/postbulkdeposits', async (req, res) => {
  const deposits = req.body.depositToPost; // Get deposits array from request body
  const groupid = req.body.code; // Get groupid  from request body
  const userid = req.body.userid; // Get userid  from request body

  const date = new Date(); // Get current date
  const formattedDate = date.toISOString().split('T')[0]; // Format date


  let transaction;
  try {
      await checkPoolConnection(); // Ensure the connection is active
      const pool = await poolPromise;

       // Use a transaction for bulk inserts
   transaction = new sql.Transaction(pool);
      await transaction.begin();

      for (const deposit of deposits) {
          const transactionNbr = generateTransactionNumber(groupid);
          const { code,AccountID, CustNo, RunningBal, name, accountValue } = deposit;
          const grouptrxNbr = `${groupid}${AccountID}-deposit-${formattedDate}`;
          const narration = `Cash dep by ${name}`;
          const glcode=code.slice(0,6)+CustNo.slice(0,3);
          const pettycashgl='11102-'+CustNo.slice(0,3);
          const sqlQuery = `
              INSERT INTO pendinggrptrx (AccountID, tranid, Amount, DebitGL, CreditGL, Runningbal, ValueDate, DateEffective, CustNO, StmtRef, BranchID, ChequeNbr, CreatedBy, transactionNbr, groupid,Grouptrxno)
              VALUES (@AccountID, '002', @accountValue, '11102-002', @glcode, @RunningBal, @formattedDate, @formattedDate, @CustNo, @narration, @name, 'Cash Deposit', @userid, @transactionNbr,@groupid,@grouptrxNbr)
          `;
     
          // Prepare and execute the SQL command
          const request = new sql.Request(transaction);
          request.input('AccountID', sql.VarChar(12), AccountID)
              .input('CustNo', sql.VarChar(12), CustNo)
              .input('accountValue', sql.Decimal(18, 2), parseFloat(accountValue.replace(/,/g, ''))) // Remove commas and convert to float
              .input('RunningBal', sql.Decimal(18, 2), RunningBal)
              .input('name', sql.VarChar, name)
              .input('formattedDate', sql.Date, formattedDate)
              .input('transactionNbr', sql.VarChar, transactionNbr)
              .input('narration', sql.VarChar, narration)
              .input('grouptrxNbr', sql.VarChar, grouptrxNbr)  
              .input('glcode', sql.VarChar, glcode)  
              .input('pettycashgl', sql.VarChar, pettycashgl) 
              .input('groupid', sql.VarChar, groupid) 
              .input('userid', sql.VarChar, userid); // You may want to use a variable here

          await request.query(sqlQuery);
      }

      await transaction.commit(); // Commit the transaction
      res.status(200).json({ message: 'Bulk deposits posted successfully,...Posting Loans' });
  } catch (err) {
      await transaction.rollback(); // Rollback the transaction on error
      console.error(err);
      res.status(500).json({ status: 'failed', error: err.message.replace('mssql-70716-0.cloudclusters.net:19061', 'server') });
  }
});
////////Posting bulk repayments
app.post('/postbulkrepayments', async (req, res) => {
  const repayments = req.body.repayToPost; // Get repayments array from request body
  const groupid = req.body.code; // Get groupid  from request body
  const userid = req.body.userid; // Get userid  from request body

  const date = new Date(); // Get current date
  const formattedDate = date.toISOString().split('T')[0]; // Format date
 

  let transaction;
  try {
      await checkPoolConnection(); // Ensure the connection is active
      const pool = await poolPromise;

       // Use a transaction for bulk inserts
   transaction = new sql.Transaction(pool);
      await transaction.begin();
     
      for (const repayment of repayments) {
        const transactionNbr = generateTransactionNumber(groupid);
          const { code,AccountID, CustNo, RunningBal, name, accountValue } = repayments;
          const grouptrxNbr = `${groupid}${AccountID}-repay${formattedDate}`;
          const narration = `Cash dep by ${name}`;
          const glcode=code.slice(0,6)+CustNo.slice(0,3);
          const pettycashgl='11102-'+CustNo.slice(0,3);
          const sqlQuery = `
              INSERT INTO pendinggrptrx (AccountID, tranid, Amount, DebitGL, CreditGL, Runningbal, ValueDate, DateEffective, CustNO, StmtRef, BranchID, ChequeNbr, CreatedBy, transactionNbr,groupid, Grouptrxno)
              VALUES (@AccountID, '002', @accountValue,@glcode, @pettycashgl,  @RunningBal, @formattedDate, @formattedDate, @CustNo, @narration, @name, 'Bulk Repayment', @userid, @transactionNbr,@groupid,@grouptrxNbr)
          `;
     
          // Prepare and execute the SQL command
          const request = new sql.Request(transaction);
          request.input('AccountID', sql.VarChar(12), AccountID)
              .input('CustNo', sql.VarChar(12), CustNo)
              .input('accountValue', sql.Decimal(18, 2), parseFloat(accountValue.replace(/,/g, ''))) // Remove commas and convert to float
              .input('RunningBal', sql.Decimal(18, 2), RunningBal)
              .input('name', sql.VarChar, name)
              .input('formattedDate', sql.Date, formattedDate)
              .input('transactionNbr', sql.VarChar, transactionNbr)
              .input('narration', sql.VarChar, narration)
              .input('grouptrxNbr', sql.VarChar, grouptrxNbr)  
              .input('glcode', sql.VarChar, glcode) 
              .input('pettycashgl', sql.VarChar, pettycashgl) 
              .input('groupid', sql.VarChar, groupid)  
              .input('userid', sql.VarChar, userid); // You may want to use a variable here

          await request.query(sqlQuery);
      }

      await transaction.commit(); // Commit the transaction
      res.status(200).json({ message: 'Bulk Loans posted successfully,...Posting completed' });
  } catch (err) {
      await transaction.rollback(); // Rollback the transaction on error
      console.error(err);
      res.status(500).json({ status: 'failed', error: err.message.replace('mssql-70716-0.cloudclusters.net:19061', 'server') });
  }
});

//Get bulk deposit for display
app.post('/getbulkdeposits', async (req, res) => {
  const code = req.body.code; // Get group code from request body
  const date = new Date(); // Get current date
  const formattedDate = date.toISOString().split('T')[0]; // Format date

  const sqlQuery = `
      select AccountID,c.custno CustNo,ProductID,upper(left(ProductID,3)+'SAVGS') as PID,RunningBal,AccountName as name 
      from clients c  inner join Deposit d on c.custno=d.custno where c.groupID=@groupId and d.status='Active' order by c.custno
      `;

  try {
    await checkPoolConnection(); // Ensure the connection is active
    const pool = await poolPromise;
   
    const result = await pool.request()
    .input('groupId', sql.VarChar, code) // Use input for named parameter
    .query(sqlQuery);
    
    // Return success response
     

       res.status(200).json(result.recordset);
       console.log(result.recordset);
  } catch (err) {
      console.error(err);
     return({status:'failed',err:err.message.replace('mssql-70716-0.cloudclusters.net:19061','server')})

  }
});
/////////////////////////////////////////////////////////////////////////////////////
// Endpoint to get Bulk posting loan data
app.post('/getfieldprint', async (req, res) => {
  const code = req.body.code; // Get group code from request body
  const date = new Date(); // Get current date
  const formattedDate = date.toISOString().split('T')[0]; // Format date
 const sqlQuery =`
 SELECT 
    d.CustNo,
    d.AccountName,
    MAX(l.loanID) AS loanID,              -- Use MAX to get a single LoanID (null if no loan)
    MAX(l.LoanProduct) AS LoanProduct,     -- Use MAX to get a single LoanProduct (null if no loan)
    MAX(l.DisbursedDate) AS DisbursedDate, -- Use MAX to get a single DisbursedDate (null if no loan)
    MAX(-l.OutstandingBal) AS OutstandingBal, -- Use MAX to get a single OutstandingBal (null if no loan)
    MAX(l.instalment) AS instalment,       -- Use MAX to get a single instalment (null if no loan)
    d.AccountID,
    MAX(d.RunningBal) AS RunningBal,       -- Use MAX to get a single RunningBal
    UPPER(MAX(d.ProductID)) AS ProductID,  -- Use MAX to get a single ProductID
    MAX(l.interestPercent) AS interestPercent
FROM 
    deposit d
LEFT JOIN 
    loans l ON l.CustNo = d.CustNo AND l.Status = 'Active'
WHERE 
    d.groupID = @groupID 
    AND d.Status <> 'Closed'
GROUP BY 
    d.CustNo, d.AccountName, d.AccountID
ORDER BY 
    d.CustNo;

 
 
 `;
  // const sqlQuery = `
//      SELECT 
//     d.CustNo,
//     d.AccountName,
//     MAX(l.loanID) AS loanID,            -- Use MAX to get a single LoanID
//     MAX(l.LoanProduct) AS LoanProduct,   -- Use MAX to get a single LoanProduct
//     MAX(l.DisbursedDate) AS DisbursedDate, -- Use MAX to get a single DisbursedDate
//     MAX(-l.OutstandingBal) AS OutstandingBal, -- Use MAX to get a single OutstandingBal
//     MAX(l.instalment) AS instalment,      -- Use MAX to get a single instalment
//     d.AccountID,
//     MAX(d.RunningBal) AS RunningBal,      -- Use MAX to get a single RunningBal
//     UPPER(MAX(d.ProductID)) AS ProductID,         -- Use MAX to get a single ProductID
//     MAX(interestPercent) AS interestPercent
//     FROM 
//     loans l
// INNER JOIN 
//     deposit d ON l.custno = d.custno 
// WHERE 
//     d.groupID = @groupID 
//     AND l.Status = 'Active' 
//     AND d.Status <> 'Closed'
// GROUP BY 
//     d.CustNo, d.AccountName, d.AccountID
// ORDER BY 
//     d.CustNo;

      // `;

  try {
    await checkPoolConnection(); // Ensure the connection is active
    const pool = await poolPromise;
   
    const result = await pool.request()
    .input('groupId', sql.VarChar, code) // Use input for named parameter
    .query(sqlQuery);
    
    // Return success response
     

       res.status(200).json(result.recordset);
       console.log(result.recordset);
  } catch (err) {
      console.error(err);
     return({status:'failed',err:err.message.replace('mssql-70716-0.cloudclusters.net:19061','server')})

  }
});
/////////////////////////////////////////CREATE ACCOUNT
app.post('/createAccount', async (req, res) => {
  const {
    custno,
    firstname,
    lastname,
    middlename,
    gender,
    qualification,
    biztype,
    bizAddress,
    homeAddress,
    groupID,
    phone,
    email,
    pix,
    sign,
    status,
    branchCode,
    bvn,
   
    
  } = req.body.formData;
  const fullName=firstname+' '+middlename+' '+lastname;
  const balance='0.00';
  const LastTrans='0.00';
  const   createdDate  = new Date().toISOString().slice(0, 10);;

 const AccountID= await NewFullAccountID();
  // console.log(branchCode);
  try {
    await checkPoolConnection(); // Ensure the connection is active
    const pool = await poolPromise;
   
      const result = await pool.request()
          .input('custno', sql.NVarChar, custno)
          .input('FullName', sql.NVarChar, fullName)
          .input('AccountID', sql.NVarChar, AccountID)
          .input('createdDate', sql.Date, createdDate)
          .input('Balance', sql.Decimal(18, 2), balance)
          .input('Status', sql.NVarChar, status)
          .input('groupID', sql.NVarChar, groupID)
          .input('ProductID', sql.NVarChar, branchCode)
          .input('bvn', sql.NVarChar, bvn)
          .input('LastTrans', sql.NVarChar, LastTrans)
          .query(`INSERT INTO Deposit (Custno, accountName, AccountID, DateCreated, RunningBal, Status, GroupID,ProductID, BVN,LastTrans) 
                   VALUES (@custno, @FullName, @AccountID, @createdDate, @Balance, @Status, @groupID,@ProductID,@bvn,@LastTrans)`);

      res.status(201).send({ message: 'Account created successfully' });
  } catch (error) {
      res.status(500).send({ message: 'Error creating account', error });
      console.log(error);
  }
});
/////////////////////GET Transactions
///Get transactions



app.get('/transactionreports', async (req, res) => {
  try {
    const { startDate, endDate, branch } = req.query; // Use req.query for GET request
    await checkPoolConnection(); // Ensure the connection is active
    const pool = await poolPromise;
    console.log(startDate, endDate, branch);

    const result = await pool.request()
      .input('startDate', sql.Date, new Date(startDate)) // Use sql.Date for the correct type
      .input('endDate', sql.Date, new Date(endDate))
      .input('branch', sql.VarChar, branch) // Adjust data type as necessary
      .query(`SELECT AccountID, TranID, t.CustNo AS CustNo, Amount, ValueDate, StmtRef, c.groupid AS groupid, PrimaryOfficerID 
              FROM transactn t 
              INNER JOIN clients c ON t.custno = c.custno 
              INNER JOIN groups g ON g.groupid = c.groupid 
              WHERE valuedate BETWEEN @startDate AND @endDate AND t.custno LIKE @branch + '%' 
              ORDER BY ValueDate, PrimaryOfficerID, groupid`);

    res.json(result.recordset);
    console.log(result.recordset);
  } catch (error) {
    res.status(500).send(error);
    console.log(error);
  }
});
///////////////////////////////////////////////////////////////////////////////////
const generateTransactionNumber = (groupName) => {
  // Get current date
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2); // Last two digits of the year
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Current month (01-12)
  const day = String(now.getDate()).padStart(2, '0'); // Current day (01-31)

  // Generate a random number based on the current timestamp
  const timestamp = now.getTime();
  const rand = Math.floor(Math.random() * 999999); // Random number between 0 and 999999

  // Clean up group name and calculate mid-point
  const cleanGroupName = groupName.replace(/\s+/g, '');
  const mid = Math.floor(cleanGroupName.length / 2);

  // Create transaction number
  const transactionNumber = `${year}${month}${day}${rand}${cleanGroupName.substring(0, mid + 1)}`;
  return transactionNumber;
};


// Function to send SMS (dummy implementation, replace with actual logic)
function sendSMS({ branchCode, transactionType, accountID, glno, amount, stmtRef, chequeNbr }) {
  console.log(`Sending SMS for ${transactionType} on account ${accountID}: Amount: ${amount}, GL: ${glno}`);
  // Add your SMS logic here
}
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
