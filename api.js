// API functions for interacting with the Turso database
import { config } from './config.js';

// Configuration from config file
const TURSO_DB_URL = config.TURSO_DB_URL;
const TURSO_AUTH_TOKEN = config.TURSO_AUTH_TOKEN;

// Fetch the top highscores from the database
async function getHighscores() {
  try {
    const response = await fetch(`${TURSO_DB_URL}/execute`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TURSO_AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        statements: ["SELECT name, score FROM highscores ORDER BY score DESC LIMIT 10"]
      })
    });

    const data = await response.json();
    if (data.results && data.results[0]) {
      return data.results[0].rows || [];
    }
    return [];
  } catch (error) {
    console.error("Error fetching highscores:", error);
    return [];
  }
}

// Save a new highscore to the database
async function saveHighscore(name, score) {
  try {
    const response = await fetch(`${TURSO_DB_URL}/execute`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TURSO_AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        statements: [
          {
            sql: "INSERT INTO highscores (name, score) VALUES (?, ?)",
            params: [name, score]
          }
        ]
      })
    });

    const data = await response.json();
    return data.results && data.results[0] && data.results[0].rowCount > 0;
  } catch (error) {
    console.error("Error saving highscore:", error);
    return false;
  }
}

export { getHighscores, saveHighscore };
