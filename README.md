# Assignment App: Backend

A server where an admin posts timed assignments and students start them, submit an answer, and get an automatic score out of 3.

Built with Node.js, Express and PostgreSQL.

## Run it

1. Install Node.js (LTS) and PostgreSQL.
2. Install the libraries: `npm install`
3. Create the databases:
   ```
   psql -U postgres -c "CREATE DATABASE assignment_app;"
   psql -U postgres -c "CREATE DATABASE assignment_app_test;"
   psql -U postgres -d assignment_app -f schema.sql
   psql -U postgres -d assignment_app_test -f schema.sql
   ```
4. Copy `.env.example` to `.env` and fill in your Postgres password. If the password has special characters (such as `#`), URL-encode them (`#` becomes `%23`).
5. Start the server: `npm start` (runs on http://localhost:3000)
6. Run the tests: `npm test`

Example requests for the full story are in `examples.md`.

## Endpoints

| Endpoint | Who | What it does |
|---|---|---|
| POST /register | Anyone | Create an account (student or admin) |
| POST /login | Anyone | Get a token |
| POST /assignments | Admin | Add an assignment |
| GET /assignments | Logged in | List assignments |
| POST /assignments/:id/start | Student | Start an attempt; saves the deadline |
| POST /attempts/:id/submit | Student | Submit answer and link; rejected after the deadline |
| GET /attempts/:id | Owner or admin | Status, checks and score |

Send the token as `Authorization: Bearer <token>`.

## Automatic checks

Score = number of checks passed, out of 3: answer not empty, link is a valid http(s) address, answer at least 50 characters.

Attempt status: `in_progress`, `submitted`, `reviewed`, `timed_out`.

## Assumptions

- Checks run right after submit, so an attempt goes straight to `reviewed` (no background job). The `submitted` status is allowed by the schema but not used.
- One attempt per student per assignment.
- /register accepts a role field because the task says anyone can create an admin. A real product would not allow this.
- The deadline is saved when the attempt starts, and the database clock decides whether a submission is late.
- A student asking for another student's attempt gets 404, so attempt ids can't be guessed.
- An unsubmitted attempt is marked `timed_out` the next time it is viewed or submitted after the deadline.

## If 10,000 people used it

Add an index on attempts(user_id), run checks in a background job queue, add rate limiting on login, and use a scheduled job to mark timed-out attempts.

## Tests

`npm test` uses a separate test database. It covers login (right password, wrong password, unknown email) and the deadline rule (on-time submit is scored, late submit is rejected and marked timed out).