# Example requests (Windows Command Prompt)

Run `npm start` first. Use `set` to save tokens in variables.

## 1. Ravi signs up and logs in
```
curl -X POST http://localhost:3000/register -H "Content-Type: application/json" -d "{\"name\":\"Ravi\",\"email\":\"ravi@test.com\",\"password\":\"secret123\"}"
curl -X POST http://localhost:3000/login -H "Content-Type: application/json" -d "{\"email\":\"ravi@test.com\",\"password\":\"secret123\"}"
set STUDENT=<token from login>
```

## 2. An admin adds the assignment (30 minutes)
```
curl -X POST http://localhost:3000/register -H "Content-Type: application/json" -d "{\"name\":\"Admin\",\"email\":\"admin@test.com\",\"password\":\"admin123\",\"role\":\"admin\"}"
curl -X POST http://localhost:3000/login -H "Content-Type: application/json" -d "{\"email\":\"admin@test.com\",\"password\":\"admin123\"}"
set ADMIN=<token from login>
curl -X POST http://localhost:3000/assignments -H "Content-Type: application/json" -H "Authorization: Bearer %ADMIN%" -d "{\"title\":\"Write a SQL query\",\"description\":\"Write a query that returns the top 5 customers by total orders.\",\"time_limit_minutes\":30}"
```

## 3. Ravi starts it (the deadline is saved)
```
curl -X POST http://localhost:3000/assignments/1/start -H "Authorization: Bearer %STUDENT%"
```

## 4. Ravi submits on time (score 3 out of 3)
```
curl -X POST http://localhost:3000/attempts/1/submit -H "Content-Type: application/json" -H "Authorization: Bearer %STUDENT%" -d "{\"answer\":\"SELECT customer_id, SUM(total) FROM orders GROUP BY customer_id ORDER BY 2 DESC LIMIT 5;\",\"link\":\"https://github.com/ravi/sql-work\"}"
```

## 5. Ravi views his result
```
curl http://localhost:3000/attempts/1 -H "Authorization: Bearer %STUDENT%"
```

## 6. Another student cannot see it (404)
```
curl http://localhost:3000/attempts/1 -H "Authorization: Bearer %OTHER%"
```

## 7. A late submit is rejected and marked timed out
Submitting after the deadline returns `Deadline passed. Attempt marked as timed out.`
This is covered by the automated test in `tests/app.test.js`.