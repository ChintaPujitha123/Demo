// seed.js
require('dotenv').config();
const db = require('./db');
const bcrypt = require('bcrypt');

async function run() {
  try {
    // create tables if not exists (idempotent)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS chocolates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    price VARCHAR(20),
    img VARCHAR(255)
)`);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS cart (
        id INT AUTO_INCREMENT PRIMARY KEY,
        chocolate_id INT NOT NULL,
        quantity INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chocolate_id) REFERENCES chocolates(id) ON DELETE CASCADE
      )`);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

    // insert default chocolates if table empty
    const [rows] = await db.execute("SELECT COUNT(*) as c FROM chocolates");
    if (rows[0].c === 0) {
      const samples = [
        ['Dark Chocolate', '₹120', 'images/chocolate1.jpg'],
        ['Milk Chocolate', '₹100', 'images/chocolate2.jpg'],
        ['White Chocolate', '₹140', 'images/chocolate3.jpg'],
        ['Hazelnut Chocolate', '₹180', 'images/chocolate4.jpg'],
        ['Caramel Delight', '₹150', 'images/chocolate5.jpg'],
        ['Almond Crunch', '₹170', 'images/chocolate6.jpg'],
        ['Strawberry Cream', '₹160', 'images/chocolate7.jpg'],
        ['Orange Zest', '₹130', 'images/chocolate8.jpg'],
        ['Mint Fresh', '₹110', 'images/chocolate9.jpg'],
        ['Double Cocoa', '₹200', 'images/chocolate10.jpg']
      ];
      for (const s of samples) {
        await db.execute("INSERT INTO chocolates (name, price, img) VALUES (?, ?, ?)", s);
      }
      console.log('Inserted sample chocolates.');
    } else {
      console.log('Chocolates already present - skipping sample insert.');
    }

    // create default admin if not exists
    const adminUsername = 'admin';
    const adminPass = 'admin123'; // change after seeding!
    const [adminRows] = await db.execute("SELECT COUNT(*) as c FROM admins WHERE username = ?", [adminUsername]);
    if (adminRows[0].c === 0) {
      const hash = await bcrypt.hash(adminPass, 10);
      await db.execute("INSERT INTO admins (username, password_hash) VALUES (?, ?)", [adminUsername, hash]);
      console.log(`Created admin user -> username: ${adminUsername}, password: ${adminPass}`);
    } else {
      console.log('Admin already exists - skipping admin creation.');
    }

    console.log('Done seeding.');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

run();
