const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');
const { Service } = require('../service/service.model');   

const BuildConfig = sequelize.define(
  'BuildConfig',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    has_existing_dockerfile: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    dockerfile_path: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    language: {
      type: DataTypes.STRING,
      allowNull: true, 
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed'),
      defaultValue: 'pending',
    },
  },
  {
    tableName: 'build_config',
    timestamps: true,
  }
);

// One-to-one: each service has exactly one build config
Service.hasOne(BuildConfig, { foreignKey: 'service_id', onDelete: 'CASCADE' });
BuildConfig.belongsTo(Service, { foreignKey: 'service_id' });

module.exports = { BuildConfig };