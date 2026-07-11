const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');
const { User } = require('../auth/auth.model');

const GithubToken = sequelize.define(
  'GithubToken',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false, 
    },
    token: {
      type: DataTypes.TEXT, 
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: 'github_tokens',
    timestamps: true,
  }
);

User.hasMany(GithubToken, { foreignKey: 'user_id', onDelete: 'CASCADE' });
GithubToken.belongsTo(User, { foreignKey: 'user_id' });

module.exports = { GithubToken };