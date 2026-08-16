const { DataTypes } = require("sequelize");
const sequelize = require('../../config/db');
const { User } = require("../auth/auth.model");

const AwsCredential = sequelize.define(
  "AwsCredential",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },

    access_key: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    secret_key: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: "aws_credentials",
    timestamps: true,
    indexes: [
      {
        fields: ["user_id"],
      },
    ],
  }
);

AwsCredential.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

User.hasMany(AwsCredential, {
  foreignKey: "user_id",
  as: "awsCredentials",
});

module.exports = { AwsCredential };