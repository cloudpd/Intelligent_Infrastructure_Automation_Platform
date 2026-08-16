# Intelligent Infrastructure Automation Platform — Backend

## Prerequisites

- Node.js installed
- MySQL server installed and running

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment variables

Create a `.env` file in the project root:

```env
PORT=5000

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=infra_platform
DB_USER=infra_app
DB_PASSWORD=your_db_password_here

JWT_ACCESS_SECRET=your_long_random_secret_here
JWT_ACCESS_EXPIRES_IN=1h
```

## 3. Set up the database

Log in to MySQL:

```bash
sudo mysql -u root -p
```

Create the database and app user:

```sql
CREATE DATABASE infra_platform;
CREATE USER 'infra_app'@'localhost' IDENTIFIED BY 'your_db_password_here';
GRANT ALL PRIVILEGES ON infra_platform.* TO 'infra_app'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Make sure `DB_USER` and `DB_PASSWORD` in your `.env` match what you created here.

## 4. Run the app

```bash
npm run dev
```

You should see:

```
✅ Connected to MySQL
✅ Users table synced
🚀 Server running on http://localhost:5000
```

## 5. Test it

Signup:

```bash
curl -X POST http://localhost:5000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Password123"}'
```

Login:

```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123"}'
```

Access a protected route (paste the `accessToken` from signup/login):

```bash
curl http://localhost:5000/auth/me \
  -H "Authorization: Bearer PASTE_TOKEN_HERE"
```