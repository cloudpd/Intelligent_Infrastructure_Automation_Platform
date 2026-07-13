const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');
const { Service } = require('../service/service.model');

const CIConfig = sequelize.define(
  'CIConfig',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    service_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: Service,
        key: 'id',
      },
    },
    pipeline_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    trigger_branch: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    registry: {
      type: DataTypes.ENUM('docker-hub', 'aws-ecr'),
      allowNull: false,
    },
    image_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    enable_trivy: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    enable_lint: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    enable_tests: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

    enable_build: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    enable_install: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

    aws_ecr_region: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: 'ci_configs',
    timestamps: true,
  }
);

CIConfig.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });
Service.hasOne(CIConfig, { foreignKey: 'service_id', as: 'ciConfig' });

module.exports = { CIConfig };
