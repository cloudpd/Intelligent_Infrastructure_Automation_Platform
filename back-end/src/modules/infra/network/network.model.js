const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/db");
const { Service } = require("../../service/service.model");

const Network = sequelize.define(
  "Network",
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
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    region: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cidr: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "applied", "destroyed"),
      allowNull: false,
      defaultValue: "pending",
    },
  },
  {
    tableName: "networks",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["service_id"],
      },
    ],
  }
);

Network.belongsTo(Service, {
  foreignKey: "service_id",
  as: "service",
});

Service.hasOne(Network, {
  foreignKey: "service_id",
  as: "network",
});

module.exports = { Network };
