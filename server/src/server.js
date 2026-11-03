// This file connects MongoDB and starts the Express server.
import 'dotenv/config';
import app from './app.js';
import { closeDatabase, connectDatabase } from './config/db.js';
import { removeLegacyNotificationUniqueIndex } from './utils/notificationIndexes.js';

const port = process.env.PORT || 5000;

// Start Express only after MongoDB connects successfully.
connectDatabase()
  .then(async () => {
    await removeLegacyNotificationUniqueIndex();
    app.listen(port, () => console.log(`Volunteer Nepal API running on http://localhost:${port}`));
  })
  .catch((error) => {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  });

// Close MongoDB safely when the terminal or hosting service stops the server.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await closeDatabase();
    process.exit(0);
  });
}
