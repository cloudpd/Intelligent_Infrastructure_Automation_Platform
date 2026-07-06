const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');
const { User } = require('../auth/auth.model');

const Project = sequelize.define(
  'Project',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    owner_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'projects',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['owner_id', 'name'],
      },
    ],
  }
);

Project.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });
User.hasMany(Project, { foreignKey: 'owner_id', as: 'projects' });

module.exports = { Project };
