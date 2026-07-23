const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/db");
const { Service } = require("../../service/service.model");

const EksCluster = sequelize.define(
  "EksCluster",
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

    cluster_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    cluster_version: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // Kept independent from the Network row's region: an EKS cluster always
    // lives in the same region as its VPC, but the generator config needs
    // its own copy of this value (used for the AWS CLI token exec block
    // and the ALB/DNS Helm add-ons), so it's captured here explicitly
    // rather than reached-through from the Network association at
    // generation time.
    region: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // Map of node-group-name -> { instance_types, capacity_type,
    // desired_size, min_size, max_size, disk_size }.
    node_groups: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },

    // List of { userName, userAccountId } cluster admins.
    cluster_admins: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },

    // Stored encrypted at rest (see core/utils/encryption.js), decrypted
    // only inside toGeneratorConfig() right before being handed to the
    // Terraform generator.
    grafana_admin_password_encrypted: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    enable_ebs_csi: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    enable_alb_controller: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    enable_external_dns: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    enable_external_secrets: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    status: {
      type: DataTypes.ENUM("pending", "applied", "destroyed"),
      allowNull: false,
      defaultValue: "pending",
    },
  },
  {
    tableName: "eks_clusters",
    timestamps: true,
    indexes: [
      {
        // One EKS cluster per service, same 1:1 shape as Network.
        unique: true,
        fields: ["service_id"],
      },
    ],
  }
);

// Associations
EksCluster.belongsTo(Service, {
  foreignKey: "service_id",
  as: "service",
});

Service.hasOne(EksCluster, {
  foreignKey: "service_id",
  as: "eksCluster",
});

module.exports = { EksCluster };
