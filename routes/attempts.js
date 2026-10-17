const express = require('express');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { runChecks } = require('../checks');
const router = express.Router();

router.post('/assignments/:id/start', authenticate, requireRole('student'), async (req, res) => {
  const assignmentId = Number(req.params.id);
  if (!Number.isInteger(assignmentId)) {
    return res.status(400).json({ error: 'Invalid assignment id' });
  }

  try {
    const result = await db.query(
      `INSERT INTO attempts (user_id, assignment_id, deadline)
       SELECT $1, a.id, now() + a.time_limit_minutes * interval '1 minute'
       FROM assignments a WHERE a.id = $2
       RETURNING *`,
      [req.user.id, assignmentId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'You already started this assignment' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/attempts/:id/submit', authenticate, requireRole('student'), async (req, res) => {
    const attemptId = Number(req.params.id);
    if (!Number.isInteger(attemptId)) {
      return res.status(400).json({ error: 'Invalid attempt id' });
    }
    const { answer, link } = req.body;
  
    try {
      const found = await db.query(
        'SELECT status FROM attempts WHERE id = $1 AND user_id = $2',
        [attemptId, req.user.id]
      );
      if (found.rows.length === 0) {
        return res.status(404).json({ error: 'Attempt not found' });
      }
      if (found.rows[0].status !== 'in_progress') {
        return res.status(409).json({ error: 'Attempt already submitted or closed' });
      }
  
      // Too late? Mark it timed out and reject.
      const late = await db.query(
        `UPDATE attempts SET status = 'timed_out'
         WHERE id = $1 AND status = 'in_progress' AND now() > deadline
         RETURNING id`,
        [attemptId]
      );
      if (late.rows.length > 0) {
        return res.status(400).json({ error: 'Deadline passed. Attempt marked as timed out.' });
      }
  
      // On time: run the checks and save the result.
      const checks = runChecks(answer, link);
      const saved = await db.query(
        `UPDATE attempts
         SET status = 'reviewed', submitted_at = now(), answer_text = $2, link = $3,
             check_answer_not_empty = $4, check_link_valid = $5,
             check_answer_long_enough = $6, score = $7
         WHERE id = $1 AND status = 'in_progress' AND now() <= deadline
         RETURNING *`,
        [
          attemptId,
          typeof answer === 'string' ? answer : null,
          typeof link === 'string' ? link : null,
          checks.answerNotEmpty,
          checks.linkValid,
          checks.answerLongEnough,
          checks.score,
        ]
      );
      if (saved.rows.length === 0) {
        return res.status(409).json({ error: 'Attempt could not be submitted' });
      }
      res.json(saved.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });
  router.get('/attempts/:id', authenticate, async (req, res) => {
    const attemptId = Number(req.params.id);
    if (!Number.isInteger(attemptId)) {
      return res.status(400).json({ error: 'Invalid attempt id' });
    }
  
    try {
      // If the time ran out and nothing was submitted, mark it timed out now.
      await db.query(
        `UPDATE attempts SET status = 'timed_out'
         WHERE id = $1 AND status = 'in_progress' AND now() > deadline`,
        [attemptId]
      );
  
      const result = await db.query('SELECT * FROM attempts WHERE id = $1', [attemptId]);
      const attempt = result.rows[0];
  
      const isOwner = attempt && attempt.user_id === req.user.id;
      const isAdmin = req.user.role === 'admin';
      if (!attempt || (!isOwner && !isAdmin)) {
        return res.status(404).json({ error: 'Attempt not found' });
      }
  
      const response = {
        id: attempt.id,
        assignment_id: attempt.assignment_id,
        status: attempt.status,
        started_at: attempt.started_at,
        deadline: attempt.deadline,
        submitted_at: attempt.submitted_at,
        answer: attempt.answer_text,
        link: attempt.link,
      };
  
      if (attempt.status === 'reviewed') {
        response.checks = {
          answer_not_empty: attempt.check_answer_not_empty,
          link_valid: attempt.check_link_valid,
          answer_long_enough: attempt.check_answer_long_enough,
        };
        response.score = `${attempt.score} out of 3`;
      }
  
      res.json(response);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });
module.exports = router;