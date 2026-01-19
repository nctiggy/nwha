# API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /auth/github | Start OAuth |
| GET | /auth/github/callback | OAuth callback |
| GET | /auth/logout | End session |
| GET | /auth/me | Current user |
| GET | /api/projects | List projects |
| POST | /api/projects | Create project |
| GET | /api/projects/:slug | Get project |
| PUT | /api/projects/:slug | Update project |
| DELETE | /api/projects/:slug | Delete project |
| GET | /api/projects/:slug/chat | Get conversation |
| POST | /api/projects/:slug/chat | Send message |
| POST | /api/projects/:slug/generate-spec | Generate specs |
| POST | /api/projects/:slug/sessions | Start Ralph |
| GET | /api/projects/:slug/sessions | List sessions |
| POST | .../sessions/:id/pause | Pause |
| POST | .../sessions/:id/resume | Resume |
| POST | .../sessions/:id/stop | Stop |
| GET | /api/projects/:slug/tasks | Get tasks |
| GET | /api/knowledge | Search knowledge |
| POST | /api/knowledge | Add knowledge |

## Socket Events

| Event | Direction | Payload |
|-------|-----------|---------|
| terminal:attach | C→S | { sessionId } |
| terminal:input | C→S | { data } |
| terminal:output | S→C | string |
| session:status | S→C | { status, iterations } |
| task:update | S→C | { tasks } |
