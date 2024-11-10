const express = require('express');
const sql = require('mssql');
const router = express.Router();

router.post('/transactions/withdr', async (req, res) => {
  const {
    accountID,
    amount,
    transactionType,
    description,
    reference,
  } = req.body;

  const isWithdrawal = transactionType === 'Withdraw';
  const amnt =  -amount ;
  const tranid =  '005' ;

  const queryUpdateDeposit = `
    UPDATE Deposit 
    SET RunningBal = RunningBal + @amount, Dateuploaded = '1900-01-01' 
    WHERE AccountID = @accountID
  `;

  const queryInsertTransactn = `
    INSERT INTO transactn (AccountID, tranid, Amount, DebitGL, CreditGL, Runningbal, ValueDate, DateEffective, CustNO, StmtRef, BranchID, ChequeNbr, CreatedBy, transactionNbr)
    VALUES (@accountID, @tranid, @amountAbs, @debitGL, @creditGL, @runningBal, @valueDate, @dateEffective, @custNo, @stmtRef, @branchID, @chequeNbr, @createdBy, @transactionNbr)
  `;

  const transactionNbr = generateTransactionNbr(); // Replace with actual function

  try {
    const pool = await sql.connect(config); // Define `config` for your SQL Server

    // Start a transaction
    await pool.request().query('BEGIN TRANSACTION');

    // Update Deposit Table
    const updateDeposit = await pool.request()
      .input('amount', sql.Float, amnt)
      .input('accountID', sql.VarChar, accountID)
      .query(queryUpdateDeposit);

    // Insert into Transactn Table
    const insertTransactn = await pool.request()
      .input('accountID', sql.VarChar, accountID)
      .input('tranid', sql.VarChar, tranid)
      .input('amountAbs', sql.Float, Math.abs(amnt))
      .input('debitGL', sql.VarChar, isWithdrawal ? 'DebitGLCode' : 'IntExpGL')
      .input('creditGL', sql.VarChar, 'SavingGLCode')
      .input('runningBal', sql.Float, calculateRunningBalance()) // Replace with actual function
      .input('valueDate', sql.Date, new Date())
      .input('dateEffective', sql.Date, new Date())
      .input('custNo', sql.VarChar, 'CustNoValue') // Replace with actual values
      .input('stmtRef', sql.VarChar, reference)
      .input('branchID', sql.VarChar, 'BranchIDValue')
      .input('chequeNbr', sql.VarChar, 'ChequeNbrValue')
      .input('createdBy', sql.VarChar, 'CreatedByValue')
      .input('transactionNbr', sql.VarChar, transactionNbr)
      .query(queryInsertTransactn);

    // Commit the transaction
    await pool.request().query('COMMIT TRANSACTION');
    res.status(200).json({ message: 'Transaction successful' });
  } catch (error) {
    await pool.request().query('ROLLBACK TRANSACTION');
    console.error('Error in transaction:', error);
    res.status(500).json({ error: 'Transaction failed' });
  }
});

function generateTransactionNbr() {
  const timestamp = new Date().getTime();
  const randomNum = Math.floor(Math.random() * 100000);
  return `${timestamp}${randomNum}`;
}

module.exports = router;
