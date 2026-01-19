// Auth routes for NWHA
import { Strategy as GitHubStrategy } from 'passport-github2';
import passport from 'passport';
import { getDb, initSchema } from '../db/index.js';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback';

// Initialize passport with GitHub strategy
function initPassport() {
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    console.warn('GitHub OAuth not configured - GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET required');
    return false;
  }

  passport.use(new GitHubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: GITHUB_CALLBACK_URL
  }, (accessToken, refreshToken, profile, done) => {
    // Find or create user
    initSchema();
    const db = getDb();

    try {
      let user = db.prepare('SELECT * FROM users WHERE github_id = ?').get(profile.id);

      if (!user) {
        // Create new user
        const result = db.prepare(`
          INSERT INTO users (github_id, username, email, role)
          VALUES (?, ?, ?, 'user')
        `).run(profile.id, profile.username, profile.emails?.[0]?.value || null);

        user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      } else {
        // Update existing user
        db.prepare(`
          UPDATE users SET username = ?, email = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(profile.username, profile.emails?.[0]?.value || user.email, user.id);
      }

      done(null, user);
    } catch (err) {
      done(err);
    }
  }));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    try {
      const db = getDb();
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  return true;
}

export async function registerAuthRoutes(fastify) {
  const passportInitialized = initPassport();

  // GitHub OAuth routes (only if configured)
  if (passportInitialized) {
    // Start OAuth flow
    fastify.get('/auth/github', async (request, reply) => {
      const authUrl = new URL('https://github.com/login/oauth/authorize');
      authUrl.searchParams.set('client_id', GITHUB_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', GITHUB_CALLBACK_URL);
      authUrl.searchParams.set('scope', 'user:email');

      // Store state for CSRF protection
      const state = Math.random().toString(36).substring(7);
      request.session.set('oauth_state', state);
      authUrl.searchParams.set('state', state);

      return reply.redirect(authUrl.toString());
    });

    // OAuth callback
    fastify.get('/auth/github/callback', async (request, reply) => {
      const { code, state } = request.query;

      // Verify state
      const savedState = request.session.get('oauth_state');
      if (state !== savedState) {
        return reply.status(403).send({ error: 'Invalid state parameter' });
      }

      try {
        // Exchange code for access token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            client_id: GITHUB_CLIENT_ID,
            client_secret: GITHUB_CLIENT_SECRET,
            code: code,
            redirect_uri: GITHUB_CALLBACK_URL
          })
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
          return reply.status(400).send({ error: tokenData.error_description });
        }

        // Get user profile
        const profileResponse = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Accept': 'application/json'
          }
        });

        const profile = await profileResponse.json();

        // Get user email if not public
        let email = profile.email;
        if (!email) {
          const emailResponse = await fetch('https://api.github.com/user/emails', {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'Accept': 'application/json'
            }
          });
          const emails = await emailResponse.json();
          const primary = emails.find(e => e.primary);
          email = primary?.email || emails[0]?.email;
        }

        // Find or create user
        initSchema();
        const db = getDb();

        let user = db.prepare('SELECT * FROM users WHERE github_id = ?').get(String(profile.id));

        if (!user) {
          const result = db.prepare(`
            INSERT INTO users (github_id, username, email, role)
            VALUES (?, ?, ?, 'user')
          `).run(String(profile.id), profile.login, email);

          user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
        } else {
          db.prepare(`
            UPDATE users SET username = ?, email = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(profile.login, email || user.email, user.id);

          user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
        }

        // Set user in session
        request.session.set('user', user);

        return reply.redirect('/');
      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Authentication failed' });
      }
    });
  }

  // Auth status endpoint
  fastify.get('/auth/me', async (request, reply) => {
    const user = request.session.get('user');
    if (!user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }
    return { user };
  });

  // Logout
  fastify.get('/auth/logout', async (request, reply) => {
    await request.session.destroy();
    return reply.redirect('/');
  });
}
