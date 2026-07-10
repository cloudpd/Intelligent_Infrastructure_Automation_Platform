const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');
const { Project } = require('../projects/projects.model');

const Service = sequelize.define(
  'Service',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Project,
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    repository_url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    branch: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'main',
    },
  },
  {
    tableName: 'services',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['project_id', 'name'],
      },
    ],
  }
);

Service.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
Project.hasMany(Service, { foreignKey: 'project_id', as: 'services' });

module.exports = { Service };