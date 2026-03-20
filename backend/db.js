const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'passport.db'));

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function initDB() {
  await exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE NOT NULL,
      mobile TEXT,
      password TEXT NOT NULL,
      city TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      ref_number TEXT,
      app_type TEXT DEFAULT 'Fresh Passport - Normal',
      status TEXT DEFAULT 'draft',
      step INTEGER DEFAULT 1,
      given_name TEXT,
      surname TEXT,
      dob TEXT,
      gender TEXT,
      place_of_birth TEXT,
      marital_status TEXT,
      aadhaar TEXT,
      pan TEXT,
      mobile TEXT,
      email TEXT,
      father_name TEXT,
      mother_name TEXT,
      emergency_contact TEXT,
      emergency_mobile TEXT,
      present_address TEXT,
      permanent_address TEXT,
      psk_location TEXT,
      appointment_date TEXT,
      appointment_time TEXT,
      last_saved TEXT DEFAULT (datetime('now')),
      submitted_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      doc_type TEXT NOT NULL,
      filename TEXT NOT NULL,
      uploaded_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (application_id) REFERENCES applications(id)
    );
  `);

  // seed demo user if not exists
  const existing = await get('SELECT id FROM users WHERE email = ?', ['hire-me@anshumat.org']);
  if (!existing) {
    const hash = bcrypt.hashSync('HireMe@2025!', 10);
    await run(
      'INSERT INTO users (name, email, mobile, password, city) VALUES (?, ?, ?, ?, ?)',
      ['Demo User', 'hire-me@anshumat.org', '9999999999', hash, 'Bangalore']
    );
    const user = await get('SELECT id FROM users WHERE email = ?', ['hire-me@anshumat.org']);
    await run(`
      INSERT INTO applications (
        user_id, ref_number, app_type, status, step,
        given_name, surname, dob, gender, place_of_birth,
        aadhaar, mobile, email, father_name, mother_name,
        present_address, permanent_address,
        psk_location, appointment_date, appointment_time, submitted_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
    `, [
      user.id, 'PSP-2025-38472', 'Fresh Passport - Normal', 'submitted', 5,
      'Demo', 'User', '1998-05-15', 'Male', 'Bangalore',
      '1234 5678 9012', '9999999999', 'hire-me@anshumat.org',
      'Ramesh Kumar', 'Sunita Kumar',
      '42, MG Road, Bangalore, Karnataka - 560001',
      '42, MG Road, Bangalore, Karnataka - 560001',
      'Koramangala PSK, Bangalore', '18 Jan 2025', '10:30 AM'
    ]);
    console.log('Demo user seeded: hire-me@anshumat.org / HireMe@2025!');
  }
}

module.exports = { db, run, get, all, initDB };
