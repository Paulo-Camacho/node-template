import express from "express";
import mysql from "mysql2/promise";
import session from "express-session";

const app = express();

// EJS + STATIC + FORMS IDK DR LARA
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// SESSIONS
app.use(session({
  secret: "superSecretKey123",
  resave: false,
  saveUninitialized: true
}));

// Make session available in all EJS files
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// DATABASE CONNECTION
const pool = mysql.createPool({
  host: "k2fqe1if4c7uowsh.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
  user: "toszv1mikaqtn04s",
  password: "m35rbj01t9klhgh8",
  database: "g4ekc2ffehhxsjqq",
  connectionLimit: 10,
  waitForConnections: true,
});

// LOGIN ROUTES
app.get("/", (req, res) => {
  res.render("login.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.post("/loginProcess", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "s3cr3t") {
    req.session.authenticated = true;
    return res.redirect("/home");
  }

  res.render("login.ejs", { loginError: true });
});

// MIDDLEWARE: PROTECT ADMIN PAGES ??? 
function ensureAdmin(req, res, next) {
  if (!req.session.authenticated) {
    return res.redirect("/login");
  }
  next();
}

// HOME PAGE
app.get("/home", ensureAdmin, async (req, res) => {
  const sql = `SELECT authorId, firstName, lastName FROM authors ORDER BY lastName ASC`;
  const [rows] = await pool.query(sql);
  res.render("home.ejs", { rows });
});

// SEARCH ROUTES
app.get("/searchByKeyword", async (req, res) => {
  const keyword = req.query.keyword || "";

  const sql = `
    SELECT authorId, firstName, lastName, quote
    FROM authors
    NATURAL JOIN quotes
    WHERE quote LIKE ?
  `;
  const [rows] = await pool.query(sql, [`%${keyword}%`]);

  res.render("results.ejs", { rows, keyword });
});

app.get("/searchByAuthor", async (req, res) => {
  const authorId = req.query.authorId;

  const sql = `
    SELECT authorId, firstName, lastName, quote
    FROM authors
    NATURAL JOIN quotes
    WHERE authorId = ?
  `;

  const [rows] = await pool.query(sql, [authorId]);
  res.render("results.ejs", { rows, authorId });
});

// ADD / DELETE AUTHORS
app.get("/addAuthor", ensureAdmin, async (req, res) => {
  const [authors] = await pool.query(`
    SELECT authorId, firstName, lastName
    FROM authors
    ORDER BY lastName ASC
  `);

  res.render("addAuthor.ejs", { authors });
});

// Add new author
app.post("/addAuthor", ensureAdmin, async (req, res) => {
  const { fn, ln, sex, dob, dod, biography, picURL } = req.body;

  const sql = `
    INSERT INTO authors (firstName, lastName, sex, dob, dod, biography, portrait)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [fn, ln, sex, dob, dod, biography, picURL];
  await pool.query(sql, params);

  res.redirect("/addAuthor");
});

// Delete author
app.post("/deleteAuthor", ensureAdmin, async (req, res) => {
  const { authorId } = req.body;

  const sql = `DELETE FROM authors WHERE authorId = ? LIMIT 1`;
  await pool.query(sql, [authorId]);

 const [authors] = await pool.query(`
    SELECT authorId, firstName, lastName
    FROM authors
    ORDER BY lastName ASC
  `);

  res.render("addAuthor.ejs", {
    authors,
    message: "Author successfully deleted!"
  });



});

// ADD / DELETE QUOTES

// Show Add + Delete Quote page
app.get("/addQuote", ensureAdmin, async (req, res) => {
  const [authors] = await pool.query(`
    SELECT authorId, firstName, lastName
    FROM authors
    ORDER BY lastName ASC
  `);

  const [categories] = await pool.query(`
    SELECT DISTINCT category
    FROM quotes
  `);

  const [quotes] = await pool.query(`
    SELECT quoteId, quote, firstName, lastName
    FROM quotes
    NATURAL JOIN authors
    ORDER BY lastName ASC
  `);

  res.render("addQuote.ejs", { rows: authors, categories, quotes });
});

// Add quote
app.post("/addQuote", ensureAdmin, async (req, res) => {
  const { quote, authorId, category, likes } = req.body;

  const sql = `
    INSERT INTO quotes (quote, authorId, category, likes)
    VALUES (?, ?, ?, ?)
  `;

  await pool.query(sql, [quote, authorId, category, likes]);

  res.redirect("/addQuote");
});

app.post("/deleteQuote", ensureAdmin, async (req, res) => {
  const { quoteId } = req.body;

  const sql = "DELETE FROM quotes WHERE quoteId = ? LIMIT 1";
  await pool.query(sql, [quoteId]);

  const [authors] = await pool.query(`
    SELECT authorId, firstName, lastName
    FROM authors
    ORDER BY lastName ASC
  `);

  const [categories] = await pool.query(`
    SELECT DISTINCT category
    FROM quotes
  `);

  const [quotes] = await pool.query(`
    SELECT quoteId, quote, firstName, lastName
    FROM quotes
    NATURAL JOIN authors
    ORDER BY lastName ASC
  `);

  res.render("addQuote.ejs", {
    rows: authors,
    categories,
    quotes,
    message: "Quote successfully deleted!"
  });
});


// // START SERVER
// let open = 3000;
// app.listen(3000, () => {
//   console.log(`The server is running on localhost:${open}`);
// });

// RENDER 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

