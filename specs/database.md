# Database Schema (SQLite)

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    github_id TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'user'
);

CREATE TABLE projects (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'draft',
    path TEXT NOT NULL
);

CREATE TABLE conversations (
    id INTEGER PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    phase TEXT
);

CREATE TABLE sessions (
    id INTEGER PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id),
    engine TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    pid INTEGER,
    iterations INTEGER DEFAULT 0
);

CREATE TABLE tasks (
    id INTEGER PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id),
    title TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    phase TEXT,
    order_num INTEGER
);

CREATE TABLE knowledge (
    id INTEGER PRIMARY KEY,
    category TEXT NOT NULL,
    problem TEXT NOT NULL,
    solution TEXT NOT NULL,
    context TEXT,
    tags TEXT
);

CREATE VIRTUAL TABLE knowledge_fts USING fts5(
    problem, solution, context, tags
);
```
