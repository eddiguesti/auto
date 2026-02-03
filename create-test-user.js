import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const db = new Database('./server/db/life-story.db');

// Create test user
const hashedPassword = bcrypt.hashSync('test123', 10);
const stmt = db.prepare('INSERT OR REPLACE INTO users (id, email, name, password, onboarding_completed) VALUES (?, ?, ?, ?, ?)');
stmt.run(999, 'test@test.com', 'Test User', hashedPassword, 0);

// Generate JWT token
const token = jwt.sign({ userId: 999 }, process.env.JWT_SECRET || 'your-secret-key-here', { expiresIn: '7d' });

console.log('TOKEN:', token);
db.close();
