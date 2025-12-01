// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: "5mb" }));
app.use(express.json({ limit: "10mb" }));

// Use sessions (for simple admin auth)
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24*60*60*1000 } // 1 day
}));

// Serve frontend static
app.use(express.static(path.join(__dirname, "../frontend")));
app.use("/images", express.static(path.join(__dirname, "../frontend/images")));

// Helper wrappers
async function runAsync(query, params = []) {
  const [result] = await db.execute(query, params);
  return result;
}
async function allAsync(query, params = []) {
  const [rows] = await db.execute(query, params);
  return rows;
}
async function getAsync(query, params = []) {
  const [rows] = await db.execute(query, params);
  return rows[0];
}

// ----------------- API ROUTES -------------------

// Get all chocolates
app.get("/api/chocolates", async (req, res) => {
  try {
    const rows = await allAsync("SELECT * FROM chocolates ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Add chocolate (admin-only)
app.post("/api/add-chocolate", (req, res) => {
    const {name, price, img} = req.body;

    if(!name || !price || !img) return res.status(400).json({error: "Missing fields"});

    // img must be a short path, e.g., "images/chocolate1.jpg"
    if(img.startsWith("data:image")) {
        return res.status(400).json({error: "Image too long. Use short URL instead of Base64."});
    }

    db.query(
        "INSERT INTO chocolates (name, price, img) VALUES (?,?,?)",
        [name, price, img],
        (err, result) => {
            if(err) return res.status(500).json(err);
            res.json({message: "Chocolate added"});
        }
    );
});


app.get("/api/chocolates", (req, res) => {
    db.query("SELECT * FROM chocolates", (err, rows) => {
        if (err) {
            return res.status(500).json({ message: "DB error" });
        }
        res.json(rows);
    });
});

// Delete chocolate (admin-only)
app.delete("/api/chocolates/:id", ensureAdmin, async (req, res) => {
  try {
    await runAsync("DELETE FROM chocolates WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get cart items (with chocolate details)
app.get("/api/cart", async (req, res) => {
  try {
    const rows = await allAsync(`
      SELECT cart.id AS cart_id, cart.quantity, c.id AS chocolate_id, c.name, c.price, c.img
      FROM cart
      JOIN chocolates c ON cart.chocolate_id = c.id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Add to cart (public)
app.post("/api/cart", async (req, res) => {
  try {
    const { chocolate_id, quantity = 1 } = req.body;
    if (!chocolate_id) return res.status(400).json({ error: "Missing chocolate_id" });

    const existing = await getAsync("SELECT * FROM cart WHERE chocolate_id = ?", [chocolate_id]);

    if (existing) {
      await runAsync("UPDATE cart SET quantity = quantity + ? WHERE chocolate_id = ?", [quantity, chocolate_id]);
      const updated = await getAsync("SELECT * FROM cart WHERE chocolate_id = ?", [chocolate_id]);
      return res.status(200).json(updated);
    }

    const result = await runAsync("INSERT INTO cart (chocolate_id, quantity) VALUES (?, ?)", [chocolate_id, quantity]);
    const created = await getAsync("SELECT * FROM cart WHERE id = ?", [result.insertId]);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Remove item from cart
app.delete("/api/cart/:id", async (req, res) => {
  try {
    await runAsync("DELETE FROM cart WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Simple contact submission (saves to DB)
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: "Missing fields" });
    const result = await runAsync("INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)", [name, email, message]);
    const created = await getAsync("SELECT * FROM contacts WHERE id = ?", [result.insertId]);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------- AUTH (ADMIN) ------------------

// Login route
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Missing username or password" });

    const admin = await getAsync("SELECT * FROM admins WHERE username = ?", [username]);
    if (!admin) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    // set session
    req.session.admin = { id: admin.id, username: admin.username };
    res.json({ success: true, admin: { id: admin.id, username: admin.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Logout
app.post("/api/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) console.error(err);
    res.json({ success: true });
  });
});

// Admin check
app.get("/api/me", (req, res) => {
  if (req.session && req.session.admin) return res.json({ admin: req.session.admin });
  res.status(401).json({ error: "Not logged in" });
});

// ----------------- UTIL ------------------------
function ensureAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  return res.status(401).json({ error: "Admin only" });
}

// Catch-all -> serve index
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Start
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});


