import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Voice = sequelize.define('Voice', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  name: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isCloned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sampleUrl: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  settings: {
    type: DataTypes.JSON,
    allowNull: true
  },
  category: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'voices',
  timestamps: false
});

export default Voice;
