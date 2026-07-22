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

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    region: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    vpc_cidr: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // Persisted at creation time from region + the subnet counts the user
    // sent (see resolveAvailabilityZones in network.service.js). The user
    // only ever sends numbers (publicSubnets.count / privateSubnets.count);
    // the backend fills in the actual AZ name list before saving.
    availability_zones: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },

    // Single JSON field per group: { enabled, cidrs }.
    // The user only ever sends `count` on the request — count itself is
    // never stored (cidrs.length already tells you that).
    public_subnets: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { enabled: true, cidrs: [] },
    },

    private_subnets: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { enabled: true, cidrs: [] },
    },

    internet_gateway: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    nat_gateway: {
      type: DataTypes.ENUM(
        "none",
        "single",
        "one_per_az"
      ),
      allowNull: false,
      defaultValue: "single",
    },
    enable_dns_support: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    enable_dns_hostnames: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    status: {
      type: DataTypes.ENUM('pending', 'applied', 'destroyed'),
      allowNull: false,
      defaultValue: 'pending',
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

// Associations
Network.belongsTo(Service, {
  foreignKey: "service_id",
  as: "service",
});

Service.hasOne(Network, {
  foreignKey: "service_id",
  as: "network",
});

module.exports = { Network };