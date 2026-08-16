/**
 * Root variables.tf — static passthrough for the simplified network config
 * shape, plus an optional sensitive variable when an EKS module is present.
 *
 * Calling generateVariablesTf() with no arguments (the pre-EKS call shape)
 * returns byte-for-byte the same output as before.
 */
function generateVariablesTf({ eksEnabled } = {}) {
  let out = `variable "aws_region" {
  type = string
}
`;

  if (eksEnabled) {
    out += `
variable "grafana_admin_password" {
  type      = string
  sensitive = true
}
`;
  }

  return out;
}

module.exports = { generateVariablesTf };
