import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Campaign = sequelize.define('Campaign', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  firstPrompt: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  systemPersona: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  selectedVoiceId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'paused', 'completed'),
    defaultValue: 'draft'
  },
  totalLeads: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  completedCalls: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  successfulCalls: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  failedCalls: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  averageDuration: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  userId: {
    type: DataTypes.STRING(36),
    allowNull: false
  },
  pausedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resumedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastProcessedLeadId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  batchJobId: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'campaigns',
  timestamps: true
});

export default Campaign;
