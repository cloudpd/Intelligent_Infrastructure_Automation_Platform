variable "name" {
  type        = string
  description = "ECR repository name (e.g. my-service/api)"
}

variable "image_tag_mutability" {
  type        = string
  description = "Whether image tags can be overwritten. MUTABLE or IMMUTABLE."
  default     = "MUTABLE"
}

variable "scan_on_push" {
  type        = bool
  description = "Automatically scan images for vulnerabilities on push."
  default     = true
}

variable "force_delete" {
  type        = bool
  description = "Allow the repository to be deleted even if it contains images."
  default     = false
}
