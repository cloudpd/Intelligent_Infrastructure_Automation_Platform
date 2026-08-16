variable "names_of_users_cluster_admins" {
  type = list(object({
      user_name = string
      user_account_id = string
      cluster_name = string
  }))
  
}



# variable "names_of_users_cluster_admins" {
#     type = list(string)
# }
# variable "names_of_users_admin" {
#     type = list(string)
# }

# variable "names_of_users_cluster_developers" {
#     type = list(string)
# }

# variable "names_of_users_cluster_viewers" {
#     type = list(string)
# }