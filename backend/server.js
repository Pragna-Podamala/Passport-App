const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { run, get, all, initDB } = require('./db');
const { authMiddleware, SECRET } = require('./middleware');

const app = express();
const PORT = 5347;

// init database
initDB()
  .then(() => console.log('Database ready'))
  .catch((err) => console.error('DB init error:', err));

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// file upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only JPG, PNG, PDF files are allowed'));
  }
});

// ===================
//   AUTH ROUTES
// ===================

// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const existing = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ error: 'This email is already registered' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = await run(
      'INSERT INTO users (name, email, mobile, password) VALUES (?, ?, ?, ?)',
      [name, email, mobile || null, hash]
    );

    const token = jwt.sign({ id: result.lastID, email }, SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: result.lastID, name, email } });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===================
//   APPLICATION ROUTES
// ===================

// GET /api/applications
app.get('/api/applications', authMiddleware, async (req, res) => {
  try {
    const apps = await all(
      'SELECT * FROM applications WHERE user_id = ? ORDER BY last_saved DESC',
      [req.user.id]
    );
    res.json({ applications: apps });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/applications
app.post('/api/applications', authMiddleware, async (req, res) => {
  try {
    const { app_type } = req.body;
    const result = await run(
      'INSERT INTO applications (user_id, app_type, status, step) VALUES (?, ?, ?, ?)',
      [req.user.id, app_type || 'Fresh Passport - Normal', 'draft', 1]
    );
    const app = await get('SELECT * FROM applications WHERE id = ?', [result.lastID]);
    res.json({ application: app });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/applications/:id
app.get('/api/applications/:id', authMiddleware, async (req, res) => {
  try {
    const app = await get(
      'SELECT * FROM applications WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!app) return res.status(404).json({ error: 'Application not found' });
    res.json({ application: app });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/applications/:id  (save any step)
app.put('/api/applications/:id', authMiddleware, async (req, res) => {
  try {
    const appId = req.params.id;
    const existing = await get(
      'SELECT * FROM applications WHERE id = ? AND user_id = ?',
      [appId, req.user.id]
    );
    if (!existing) return res.status(404).json({ error: 'Application not found' });

    const allowed = [
      'app_type', 'step',
      'given_name', 'surname', 'dob', 'gender', 'place_of_birth', 'marital_status',
      'aadhaar', 'pan', 'mobile', 'email',
      'father_name', 'mother_name', 'emergency_contact', 'emergency_mobile',
      'present_address', 'permanent_address',
      'psk_location', 'appointment_date', 'appointment_time'
    ];

    const updates = [];
    const values = [];

    allowed.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    });

    if (updates.length === 0) return res.json({ application: existing });

    updates.push("last_saved = datetime('now')");
    values.push(appId, req.user.id);

    await run(
      `UPDATE applications SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );

    const updated = await get('SELECT * FROM applications WHERE id = ?', [appId]);
    res.json({ application: updated });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/applications/:id/submit
app.post('/api/applications/:id/submit', authMiddleware, async (req, res) => {
  try {
    const appId = req.params.id;
    const existing = await get(
      'SELECT * FROM applications WHERE id = ? AND user_id = ?',
      [appId, req.user.id]
    );
    if (!existing) return res.status(404).json({ error: 'Application not found' });

    const refNumber = 'PSP-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000);

    await run(
      `UPDATE applications SET status = 'submitted', ref_number = ?, submitted_at = datetime('now'), last_saved = datetime('now') WHERE id = ? AND user_id = ?`,
      [refNumber, appId, req.user.id]
    );

    const updated = await get('SELECT * FROM applications WHERE id = ?', [appId]);
    res.json({ application: updated });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/applications/:id/receipt
app.get('/api/applications/:id/receipt', authMiddleware, async (req, res) => {
  try {
    const app = await get(
      'SELECT * FROM applications WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!app) return res.status(404).json({ error: 'Not found' });

    const user = await get('SELECT name, email FROM users WHERE id = ?', [req.user.id]);
    const docs = await all('SELECT doc_type, filename FROM documents WHERE application_id = ?', [app.id]);

    res.json({
      receipt: {
        ref_number: app.ref_number,
        applicant: ((app.given_name || '') + ' ' + (app.surname || '')).trim() || user.name,
        email: app.email || user.email,
        app_type: app.app_type,
        psk_location: app.psk_location,
        appointment_date: app.appointment_date,
        appointment_time: app.appointment_time,
        status: app.status,
        submitted_at: app.submitted_at,
        documents: docs.map(d => ({ doc_type: d.doc_type, original_name: d.filename }))
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================
//   DOCUMENT ROUTES
// ===================

// POST /api/documents/:id/upload
app.post('/api/documents/:id/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const appId = req.params.id;
    const { doc_type } = req.body;

    const existing = await get(
      'SELECT * FROM applications WHERE id = ? AND user_id = ?',
      [appId, req.user.id]
    );
    if (!existing) return res.status(404).json({ error: 'Application not found' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // delete old file of same type if exists
    const oldDoc = await get(
      'SELECT * FROM documents WHERE application_id = ? AND doc_type = ?',
      [appId, doc_type]
    );
    if (oldDoc) {
      const oldPath = path.join(__dirname, 'uploads', oldDoc.filename);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      await run('DELETE FROM documents WHERE id = ?', [oldDoc.id]);
    }

    const result = await run(
      'INSERT INTO documents (application_id, doc_type, filename) VALUES (?, ?, ?)',
      [appId, doc_type, req.file.filename]
    );

    res.json({ id: result.lastID, doc_type, filename: req.file.filename });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================
//   HEALTH CHECK
// ===================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', port: PORT });
});

// start server
app.listen(PORT, () => {
  console.log('');
  console.log('  PassportEase Backend');
  console.log('  Running on http://localhost:' + PORT);
  console.log('');
  console.log('  Demo login:');
  console.log('  Email    : hire-me@anshumat.org');
  console.log('  Password : HireMe@2025!');
  console.log('');
});
