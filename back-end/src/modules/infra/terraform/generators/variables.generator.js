/** Root variables.tf — static passthrough for the simplified network config shape. */
function generateVariablesTf() {
  return `variable "aws_region" {
  type = string
}
`;
}

module.exports = { generateVariablesTf };
