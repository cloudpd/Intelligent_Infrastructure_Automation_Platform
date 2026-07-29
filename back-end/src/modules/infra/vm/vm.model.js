const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');
const { Service } = require('../../service/service.model');

const VmDeployment = sequelize.define(
  'VmDeployment',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    service_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: Service, key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    region: {
      // Captured independently from the linked Network row, same reasoning
      // as EksCluster#region — the generator needs its own copy without
      // reaching through the association at render time.
      type: DataTypes.STRING,
      allowNull: false,
    },
    instance_type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 't3.micro',
    },
    kind_cluster_name: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'kind',
    },
    container_port: {
      // The port the app listens on INSIDE the container/pod.
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3000,
    },
    host_port: {
      // The port opened on the VM's public IP, mapped through to the
      // KIND NodePort so the app is actually internet-reachable.
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 80,
    },
    allow_ssh: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'applying', 'applied', 'failed', 'destroyed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    apply_error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Populated only after a real apply — never set by the user directly.
    instance_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    public_ip: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: 'vm_deployments',
    timestamps: true,
    indexes: [
      {
        // One VM deployment per service, same 1:1 shape as Network/EksCluster.
        unique: true,
        fields: ['service_id'],
      },
    ],
  }
);

VmDeployment.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });
Service.hasOne(VmDeployment, { foreignKey: 'service_id', as: 'vmDeployment' });

module.exports = { VmDeployment };