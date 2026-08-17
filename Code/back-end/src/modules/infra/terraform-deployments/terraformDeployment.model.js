const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');
const { Service } = require('../../service/service.model');
const { AwsCredential } = require('../../aws/aws.model');

/**
 * One row per successful `terraform apply`. This is deliberately NOT the
 * same thing as TerraformState (which just tracks the Setup Wizard's
 * choices for a service). TerraformState answers "how should the next
 * Generate/Apply behave"; TerraformDeployment answers "what is actually
 * running right now, and how do I destroy exactly that, regardless of
 * whatever Generate has been overwritten to since".
 *
 * `generated/<slug>/<env>/` (see terraform.service.js) is a mutable
 * scratch directory the user is free to re-Generate over at any time.
 * The moment an apply against that directory succeeds, its contents are
 * copied verbatim into `snapshot_dir` — a folder named after this row's
 * own id, so it can never collide with, or be overwritten by, a later
 * Generate/Apply cycle. Destroy always reads from snapshot_dir, never
 * from `generated/`.
 *
 * A service+environment can have many of these over its lifetime
 * (deploy → destroy → deploy again) — that's intentional, it's the audit
 * trail of every real deployment, not just the current one.
 */
const TerraformDeployment = sequelize.define(
  'TerraformDeployment',
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
    environment: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    service_slug: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // Backend coordinates, frozen at apply time. Destroy must reconnect
    // to this exact S3 key regardless of whatever terraform_states
    // currently holds (it could have been edited since).
    state_bucket: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lock_table: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    aws_region: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // Which saved AWS credential to reuse for destroy. Nullable only so a
    // destroy call can still supply one explicitly if the original
    // credential was since deleted.
    aws_credential_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: AwsCredential,
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    // Absolute path to the immutable copy of exactly what was applied.
    snapshot_dir: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // Which static module folders were copied alongside the snapshot,
    // e.g. { network: true, ecr: false, eks: true, vm: false } — needed
    // so destroy knows which modules/* directories belong next to it.
    modules: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
    status: {
      type: DataTypes.ENUM('applied', 'destroying', 'destroy_failed'),
      allowNull: false,
      defaultValue: 'applied',
      // Note: there is no 'destroyed' status — a successful destroy hard
      // deletes this row entirely (see terraformDeployment.service.js).
    },
    destroy_error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    applied_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: 'terraform_deployments',
    timestamps: true,
    indexes: [
      {
        // At most one live (non-destroyed) deployment per service+env —
        // rows are hard-deleted on successful destroy, so this simply
        // stops two applies from racing into two "current" deployments.
        unique: true,
        fields: ['service_id', 'environment'],
      },
    ],
  }
);

TerraformDeployment.belongsTo(Service, {
  foreignKey: 'service_id',
  as: 'service',
});

TerraformDeployment.belongsTo(AwsCredential, {
  foreignKey: 'aws_credential_id',
  as: 'awsCredential',
});

module.exports = { TerraformDeployment };