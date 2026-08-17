# variable "cluster_vpc_name" { # cluser_name-vpc
#   type = string
# }

variable "cluster_name" {

}

variable "vpc_cidr" {
  type = string
  # default = "10.100.0.0/16" # to be required user must send it to module because he doesn't see the default value 

}


variable "subnet_variables_list" {
  type = list(object({
    name        = string, # private-subnet1 or public-subnet1 , private-subnet2 or public-subnet2
    subnet_cidr = string, # 
    AZ_letters  = string, # region +(a,b,c)
    type        = string  # private or public # to make condition of allow public ip or not
  }))
}



variable "region" {
  type = string
  # default = "eu-north-1" # use this in AZ ${var.region}a , ${var.region}b , ${var.region}c

}

# those are variables my code depend on them  
# here i can make my user must define them or i can make it default value 