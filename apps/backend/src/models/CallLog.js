import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const CallLog = sequelize.define('CallLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  campaignId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  leadId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  phoneNumber: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  twilioCallSid: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  elevenlabsConversationId: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  transcription: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'call_logs',
  timestamps: true,
  updatedAt: false,
  createdAt: 'created_at'
});

export default CallLog;
