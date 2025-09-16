import dotenv from 'dotenv';
import { sequelize } from './src/config/database.js';
import { Lead, Campaign, User } from './src/models/index.js';

dotenv.config();

async function checkDatabase() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Check leads
    const leads = await Lead.findAll();
    console.log('\n📋 Current leads in database:');
    if (leads.length === 0) {
      console.log('   No leads found');
    } else {
      leads.forEach(lead => {
        console.log(`   - ${lead.firstName} ${lead.lastName}: ${lead.contactNo} (Campaign ID: ${lead.campaignId})`);
      });
    }
    console.log(`   Total leads: ${leads.length}`);

    // Check campaigns
    const campaigns = await Campaign.findAll();
    console.log('\n🎯 Current campaigns in database:');
    if (campaigns.length === 0) {
      console.log('   No campaigns found');
    } else {
      campaigns.forEach(campaign => {
        console.log(`   - ${campaign.name}: ${campaign.totalLeads} leads (Status: ${campaign.status})`);
      });
    }
    console.log(`   Total campaigns: ${campaigns.length}`);

    // Check users
    const users = await User.findAll();
    console.log('\n👤 Current users in database:');
    if (users.length === 0) {
      console.log('   No users found');
    } else {
      users.forEach(user => {
        console.log(`   - ${user.email} (ID: ${user.id})`);
      });
    }
    console.log(`   Total users: ${users.length}`);

  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await sequelize.close();
  }
}

checkDatabase();
