const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');
const { Service } = require('../../service/service.model');

/**
 * KubernetesConfig
 * One row per service — stores the answers collected by the Kubernetes
 * Deployment Wizard so that a previous run can be reloaded/edited without
 * resubmitting the whole form, mirrors how CIConfig stores CI answers.
 *
 * JSON columns are used for the nested/optional wizard steps (storage,
 * service account, networking, health checks, autoscaling) since their
 * shape depends on user choices (e.g. "Custom" service account rules).
 */
const KubernetesConfig = sequelize.define(
  'KubernetesConfig',
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

    // Step 1 — Application (stopgap fields until a real Docker Generator
    // module exists — see Decision A3 in the plan)
    app_name: { type: DataTypes.STRING, allowNull: false },
    docker_image: { type: DataTypes.STRING, allowNull: false },
    image_tag: { type: DataTypes.STRING, allowNull: false },
    container_port: { type: DataTypes.INTEGER, allowNull: false },
    env_vars: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },

    // Step 2 — Workload
    namespace: { type: DataTypes.STRING, allowNull: false },
    workload_type: {
      type: DataTypes.ENUM('Deployment', 'StatefulSet'),
      allowNull: false,
      defaultValue: 'Deployment',
    },
    replicas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },

    // Step 3 — Resources
    cpu_request: { type: DataTypes.STRING, allowNull: false },
    memory_request: { type: DataTypes.STRING, allowNull: false },
    cpu_limit: { type: DataTypes.STRING, allowNull: false },
    memory_limit: { type: DataTypes.STRING, allowNull: false },
    namespace_quota: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },

    // Step 4 — Storage
    storage: { type: DataTypes.JSON, allowNull: true, defaultValue: null },

    // Step 5 — Service Account
    service_account: { type: DataTypes.JSON, allowNull: true, defaultValue: null },

    // Step 6 — Networking
    networking: { type: DataTypes.JSON, allowNull: false },

    // Step 7 — Health Checks
    health_checks: { type: DataTypes.JSON, allowNull: true, defaultValue: null },

    // Step 8 — Autoscaling
    autoscaling: { type: DataTypes.JSON, allowNull: true, defaultValue: null },

    last_commit_sha: { type: DataTypes.STRING, allowNull: true },
    last_generated_files: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
  },
  {
    tableName: 'kubernetes_configs',
    timestamps: true,
  }
);

KubernetesConfig.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });
Service.hasOne(KubernetesConfig, { foreignKey: 'service_id', as: 'kubernetesConfig' });

module.exports = { KubernetesConfig };
