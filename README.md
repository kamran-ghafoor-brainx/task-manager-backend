# Task Manager API

A REST API for managing tasks, built with NestJS, TypeORM and PostgreSQL.

## Features

- Authentication with JWT, email verification, and forgot and reset password
- Task CRUD with search, filtering, sorting and pagination
- Task collaboration through invitations
- Notifications, stored and pushed in real time over Socket.IO
- Rate limiting, validation and a consistent error format

## Requirements

- Node.js 20 or later
- Docker (for PostgreSQL and Mailpit)

## Getting started

```bash
npm install
cp .env.example .env          # then set JWT_SECRET
docker compose up -d          # PostgreSQL + Mailpit
npm run migration:run
npm run start:dev
```

The API runs at `http://localhost:3000/v1`. Emails sent in development are captured by Mailpit at `http://localhost:8025`.

Generate a JWT secret with:

```bash
node -e "console.log(require('node:crypto').randomBytes(64).toString('hex'))"
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run start:dev` | Start in watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run the compiled build |
| `npm run lint` | Lint with oxlint |
| `npm run format` | Format with Prettier |
| `npm run migration:run` | Apply pending migrations |
| `npm run migration:show` | List migrations and their status |

## API testing

Import both files from the `postman/` folder into Postman:

- `task-manager-api.postman_collection.json`
- `task-manager-api.local.postman_environment.json`
