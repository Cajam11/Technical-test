## Getting Started

First install dependencies:

```bash
npm install
```

Second install mysql2:

```bash
npm install mysql2
```

Create .env file:

```ts
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=Admin123
MYSQL_DATABASE=technical-test
```

Create database using MySQL:

```sql
CREATE TABLE IF NOT EXISTS users (
  uid VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  birth_date VARCHAR(32) DEFAULT NULL,
  hobbies JSON NOT NULL,
  country VARCHAR(100) DEFAULT NULL,
  street VARCHAR(255) DEFAULT NULL,
  city VARCHAR(255) DEFAULT NULL,
  postal_code VARCHAR(32) DEFAULT NULL,
  locally_modified TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
