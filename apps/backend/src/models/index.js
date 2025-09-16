import User from './User.js';
import Campaign from './Campaign.js';
import Lead from './Lead.js';
import Voice from './Voice.js';
import KnowledgeBase from './KnowledgeBase.js';
import CallLog from './CallLog.js';

// Define associations
User.hasMany(Campaign, { foreignKey: 'userId', as: 'campaigns' });
Campaign.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Campaign.hasMany(Lead, { foreignKey: 'campaignId', as: 'leads' });
Lead.belongsTo(Campaign, { foreignKey: 'campaignId', as: 'campaign' });

Campaign.hasMany(KnowledgeBase, { foreignKey: 'campaignId', as: 'knowledgeBase' });
KnowledgeBase.belongsTo(Campaign, { foreignKey: 'campaignId', as: 'campaign' });

Campaign.hasMany(CallLog, { foreignKey: 'campaignId', as: 'callLogs' });
CallLog.belongsTo(Campaign, { foreignKey: 'campaignId', as: 'campaign' });

Lead.hasMany(CallLog, { foreignKey: 'leadId', as: 'callLogs' });
CallLog.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' });

export {
  User,
  Campaign,
  Lead,
  Voice,
  KnowledgeBase,
  CallLog
};
