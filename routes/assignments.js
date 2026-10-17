const express = require('express');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/assignments', authenticate, requireRole('admin'), async (req, res) => {
  const { title, description, time_limit_minutes } = req.body;
  const minutes = Number(time_limit_minutes);

  if (!title || !description || !Number.isInteger(minutes) || minutes <= 0) {
    return res.status(400).json({
      error: 'title, description and a positive whole number time_limit_minutes are required',
    });
  }

  try {
    const result = await db.query(
      `INSERT INTO assignments (title, description, time_limit_minutes, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [title, description, minutes, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/assignments', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, title, description, time_limit_minutes, created_at
       FROM assignments ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;