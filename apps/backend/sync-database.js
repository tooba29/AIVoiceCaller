import { sequelize } from './src/config/database.js';
import { CallLog } from './src/models/index.js';

async function syncDatabase() {
  try {
    console.log('🔄 Syncing database schema...');
    
    // Force sync to update the schema
    await sequelize.sync({ alter: true });
    
    console.log('✅ Database schema synced successfully');
    console.log('📊 CallLog.campaignId is now nullable for test calls');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database sync failed:', error);
    process.exit(1);
  }
}

syncDatabase();
