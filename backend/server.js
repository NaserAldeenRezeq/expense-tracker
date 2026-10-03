// Expense Tracker - backend (Express API + PostgreSQL)
//
// PHASE 1
// Setup:
//   1. Create a database named expense_tracker and run schema.sql on it.
//   2. Copy .env.example to a new file named .env and write your PostgreSQL password.
//   3. npm install express cors pg dotenv
// Run:    node server.js   (restart it every time you change this file)
//
// Endpoints you need to build:
//   GET    /api/expenses        return all expenses
//   GET    /api/expenses/:id    return one expense (404 if not found)
//   POST   /api/expenses        add an expense (201, or 400 if the data is invalid)
//   PUT    /api/expenses/:id    update an expense (200, 400, or 404)
//   DELETE /api/expenses/:id    delete an expense (200, or 404)
//
// Tips:
//   - Create one Pool (from the "pg" library) with the values from .env,
//     and use pool.query(...) in every route.
//   - ALWAYS send the values as parameters: pool.query("... WHERE id = $1", [id]).
//     NEVER build the SQL text by joining strings with data from the user.
//   - Use RETURNING to get the new (or updated) row back from INSERT and UPDATE.
//   - The database creates the id. The client never sends one.
//   - pg returns NUMERIC as text and DATE as a JavaScript Date, so fix both in your SELECT.
//     Hint: amount::float8 and to_char(date, 'YYYY-MM-DD').
//   - Validate the data before the query, and answer 400 with a message that explains the problem.
//   - Check the id before the query. A text like "abc" makes PostgreSQL throw an error.
//   - Enable CORS so the frontend can talk to the server.
//   - Test every endpoint with Thunder Client BEFORE you connect the frontend.

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = 3000;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

app.use(cors());
app.use(express.json());


const COLUMNS = "id, title, amount::float8 AS amount, category, to_char(date, 'YYYY-MM-DD') AS date";


function parseId(value){
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

const CATEGORIES = ["Food", "Transport", "Bills", "Entertainment", "Other"];

function validateExpense(body) {

    const title = body.title;
    const amount = body.amount;
    const category = body.category;
    const date = body.date;

    if (typeof title !== "string" || title.trim() === "") {
        return { error: "Title is required" };
    }
    if (title.trim().length > 100) {
        return { error: "Title must be 100 characters or less" };
    }

    const amountNumber = Number(amount);
    if (amount === null || amount === "" || !Number.isFinite(amountNumber) || amountNumber <= 0) {
        return { error: "Amount must be a number greater than 0" };
    }

    if (!CATEGORIES.includes(category)) {
        return { error: `Category must be one of: ${CATEGORIES.join(", ")}` };
    }

    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date + "T00:00:00Z").toISOString().slice(0, 10) !== date) {
        return { error: "Date must be a valid date in YYYY-MM-DD format" };
    }

    return { data: { title: title.trim(), amount: amountNumber, category, date } };
}


//! -----------------------------------------------------------
//? GET /api/expenses
app.get("/api/expenses", async (req, res) => {
    try{
        const result = await pool.query(`SELECT ${COLUMNS} FROM expenses ORDER BY date DESC, id DESC`);
        res.json(result.rows);
    }
    catch (error){
        console.error(error);
        res.status(500).json({ message: "Server error"});
    }
});
//! -----------------------------------------------------------
//? GET /api/expenses/:id 
app.get("/api/expenses/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if(id === null){
        return res.status(404).json({ message : "Expense not found" });
    }

    try{
        const result = await pool.query(`SELECT ${COLUMNS} FROM expenses WHERE id = $1`, [id]);
        if(result.rows.length === 0){
            return res.status(404).json({ message : "Expense not found" });
        }
        res.json(result.rows[0]);
    }
    catch(error){
        console.error(error);
        res.status(500).json({ message: "Server error"});
    }
});

//! -----------------------------------------------------------
//? POST /api/expenses
app.post("/api/expenses", async (req, res) => {
    
    const result = validateExpense(req.body);
    const error = result.error;
    const data = result.data;

    if(error){
        return res.status(400).json({ message: error});
    }

    try{
        const result = await pool.query(
            `INSERT INTO expenses (title, amount, category, date)
             VALUES ($1, $2, $3, $4)
             RETURNING ${COLUMNS}`, [data.title, data.amount, data.category, data.date]
        );
        res.status(201).json(result.rows[0]);
    }
    catch(error){
        console.error(error);
        res.status(500).json({ message: "Server error"});
    }

});

//! -----------------------------------------------------------
//? PUT /api/expenses/:id
app.put("/api/expenses/:id", async (req, res) => {
    
    const id = parseId(req.params.id);

    if (id === null) {
        return res.status(404).json({ message: "Expense not found" });
    }

    const result = validateExpense(req.body);
    const error = result.error;
    const data = result.data;

    if (error) {
        return res.status(400).json({ message: error });
    }

    try{
        const result = await pool.query(
            `UPDATE expenses
             SET title = $1, amount = $2, category = $3, date = $4
             WHERE id = $5
             RETURNING ${COLUMNS}`,
             [data.title, data.amount, data.category, data.date, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Expense not found" });
        }

        res.json(result.rows[0]);

    }

    catch(error){
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

//! -----------------------------------------------------------
//? DELETE /api/expenses/:id
app.delete("/api/expenses/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) {
        return res.status(404).json({ message: "Expense not found" });
    }

    try {
        const result = await pool.query(
        `DELETE FROM expenses WHERE id = $1 RETURNING ${COLUMNS}`,
        [id]
        );

        if (result.rows.length === 0) {
        return res.status(404).json({ message: "Expense not found" });
        }
        res.json({ message: "Expense deleted", expense: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});




app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});