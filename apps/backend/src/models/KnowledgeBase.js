import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const KnowledgeBase = sequelize.define('KnowledgeBase', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  campaignId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  filename: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  fileUrl: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  elevenlabsDocId: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  uploadedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'knowledge_base_files',
  timestamps: false,
  updatedAt: false,
  createdAt: 'uploadedAt'
});

export default KnowledgeBase;
