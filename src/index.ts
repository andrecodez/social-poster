import 'dotenv/config';
import PostScheduler from './schedulers/postScheduler';
import DatabaseService from './services/database';
import { Logger } from './utils/logger';

async function main() {
  try {
    Logger.info('🚀 Starting Social Poster Application...');
    
    // Start the post scheduler
    PostScheduler.start();
    
    Logger.success('Application started successfully!');
    Logger.info('Press Ctrl+C to stop the application');
    
    // Keep the application running
    process.on('SIGINT', async () => {
      Logger.info('Shutting down gracefully...');
      
      // Stop the scheduler
      PostScheduler.stop();
      
      // Close database connection
      await DatabaseService.disconnect();
      
      Logger.success('Application stopped');
      process.exit(0);
    });

  } catch (error) {
    Logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  Logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  Logger.error('Unhandled Rejection at:', promise);
  Logger.error('Reason:', reason);
  process.exit(1);
});

main();