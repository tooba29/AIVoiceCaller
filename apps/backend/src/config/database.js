import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DATABASE_NAME || 'mowaisac_salescalling',
  process.env.DATABASE_USER || 'mowaisac_scroot',
  process.env.DATABASE_PASSWORD || '^};t2v1Y+=~v',
  {
    host: process.env.DATABASE_HOST || 'gator3166.hostgator.com',
    port: process.env.DATABASE_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true
    }
  }
);

export { sequelize };
