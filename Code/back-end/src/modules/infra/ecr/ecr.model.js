const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');
const { Service } = require('../../service/service.model');

const Ecr = sequelize.define(
  'Ecr',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    service_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Service,
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    image_tag_mutability: {
      type: DataTypes.ENUM('MUTABLE', 'IMMUTABLE'),
      allowNull: false,
      defaultValue: 'MUTABLE',
    },
    scan_on_push: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    force_delete: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'applied', 'destroyed'),
      allowNull: false,
      defaultValue: 'pending',
    },
  },
  {
    tableName: 'ecr_repositories',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['service_id'],
      },
    ],
  }
);

Ecr.belongsTo(Service, {
  foreignKey: 'service_id',
  as: 'service',
});

Service.hasOne(Ecr, {
  foreignKey: 'service_id',
  as: 'ecr',
});

module.exports = { Ecr };
