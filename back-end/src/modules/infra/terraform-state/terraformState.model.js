const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');
const { Service } = require('../../service/service.model');
const { AwsCredential } = require('../../aws/aws.model');

/**
 * Tracks the Terraform Setup Wizard's progress for a service — this is
 * NOT a Terraform module config (see Network/Ecr/EksCluster/VmDeployment
 * for those). It only stores the wizard-level choices (state backend,
 * whether to use ECR, which compute deployment type to generate) plus
 * two flags (generated/applied) that drive the UI's step gating.
 *
 * One TerraformState per service — same 1:1 shape as Network/Ecr/EksCluster/VmDeployment.
 */
const TerraformState = sequelize.define(
  'TerraformState',
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
    // Which saved AWS credential (from the existing /aws module) this
    // service's Terraform should use. Set by the wizard's first step,
    // before the S3 backend step — nullable only until that step runs.
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
    // Just the bucket URL the user typed in Step 1 of the wizard (e.g.
    // "s3://terraform-state-prod"). No bucket is created on their behalf.
    s3_bucket: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    use_ecr: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    // Null until the Terraform Configuration step is completed.
    deployment_type: {
      type: DataTypes.ENUM('eks', 'vm'),
      allowNull: true,
    },
    generated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    applied: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: 'terraform_states',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['service_id'],
      },
    ],
  }
);

TerraformState.belongsTo(Service, {
  foreignKey: 'service_id',
  as: 'service',
});

Service.hasOne(TerraformState, {
  foreignKey: 'service_id',
  as: 'terraformState',
});

TerraformState.belongsTo(AwsCredential, {
  foreignKey: 'aws_credential_id',
  as: 'awsCredential',
});

module.exports = { TerraformState };
