# Super Snake Game

A retro-style snake game with power-ups and online leaderboard functionality using Turso DB.

## Play Online

The game is hosted on GitHub Pages: [Play Super Snake](https://YOUR_GITHUB_USERNAME.github.io/powersnake/)

## Features

- Classic snake gameplay with retro pixelated graphics
- Multiple power-ups: Speed Boost, Shrink, Invincible, and Magnet
- Online leaderboard system using Turso SQLite database
- Responsive controls that work on both desktop and mobile

## Setting Up Your Own Version

### 1. Fork the Repository

1. Create a new GitHub repository
2. Push this code to your repository
3. Enable GitHub Pages in your repository settings:
   - Go to Settings → Pages
   - Set the Source to "GitHub Actions"

### 2. Set Up Turso Database

1. Sign up for a free [Turso](https://turso.tech/) account
2. Install the Turso CLI:
   ```
   curl -sSfL https://get.turso.tech/install.sh | sh
   ```
3. Log in to Turso:
   ```
   turso auth login
   ```
4. Create a new database:
   ```
   turso db create snake-game
   ```
5. Create the highscores table:
   ```
   turso db shell snake-game
   CREATE TABLE highscores (id INTEGER PRIMARY KEY, name TEXT, score INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
   ```
6. Get your database URL and authentication token:
   ```
   turso db show snake-game
   turso db tokens create snake-game
   ```

### 3. Add GitHub Secrets

1. In your GitHub repository, go to Settings → Secrets and Variables → Actions
2. Add two repository secrets:
   - `TURSO_DB_URL`: Your Turso database URL
   - `TURSO_AUTH_TOKEN`: Your Turso authentication token

### 4. Push Your Changes

1. Commit and push your changes to GitHub
2. GitHub Actions will automatically build and deploy your game
3. Your game will be available at `https://YOUR_GITHUB_USERNAME.github.io/repository-name/`

## Local Development

To run the game locally:

1. Edit the `config.js` file with your Turso database URL and auth token (for testing only)
2. Start a local server (due to ES modules requiring CORS):
   ```
   npx http-server
   ```
3. Open `http://localhost:8080` in your browser

## License

This project is open source and available under the [MIT License](LICENSE).
