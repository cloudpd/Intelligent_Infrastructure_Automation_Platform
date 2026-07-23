const Joi = require('joi');

/**
 * ECR repository name rules (AWS):
 *  - 2–256 characters
 *  - lowercase letters, numbers, hyphens, underscores, dots, and forward slashes
 *  - must start with a letter or number
 */
const ECR_NAME_PATTERN = /^[a-z0-9][a-z0-9\-_.\/]{1,255}$/;

const createEcrSchema = Joi.object({
  name: Joi.string().pattern(ECR_NAME_PATTERN).required().messages({
    'string.pattern.base':
      'Must be a valid ECR repository name (lowercase letters, numbers, hyphens, underscores, dots, slashes). e.g. my-service/api',
  }),
  image_tag_mutability: Joi.string()
    .valid('MUTABLE', 'IMMUTABLE')
    .default('MUTABLE'),
  scan_on_push: Joi.boolean().default(true),
  force_delete: Joi.boolean().default(false),
});

/**
 * After creation only non-structural fields can be updated.
 * The repository name is locked — renaming an ECR repo means
 * destroying and recreating it in Terraform (state would break).
 */
const updateEcrSchema = Joi.object({
  image_tag_mutability: Joi.string().valid('MUTABLE', 'IMMUTABLE'),
  scan_on_push: Joi.boolean(),
  force_delete: Joi.boolean(),
}).min(1);

module.exports = { createEcrSchema, updateEcrSchema };
