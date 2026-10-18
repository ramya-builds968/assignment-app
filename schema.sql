CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_attempts_user_id ON attempts(user_id);

CREATE TABLE assignments (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  time_limit_minutes INTEGER NOT NULL CHECK (time_limit_minutes > 0),
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_attempts_user_id ON attempts(user_id);

CREATE TABLE attempts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  assignment_id INTEGER NOT NULL REFERENCES assignments(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deadline TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,
  answer_text TEXT,
  link TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'submitted', 'reviewed', 'timed_out')),
  check_answer_not_empty BOOLEAN,
  check_link_valid BOOLEAN,
  check_answer_long_enough BOOLEAN,
  score INTEGER,
  UNIQUE (user_id, assignment_id)
);
CREATE INDEX idx_attempts_user_id ON attempts(user_id);