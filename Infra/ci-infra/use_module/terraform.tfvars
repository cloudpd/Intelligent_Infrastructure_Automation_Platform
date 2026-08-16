
vpc_cidr = "10.100.0.0/16" # but in "" cause its type is string 


region = "eu-north-1"



subnet_variables_list = [{
  name        = "private_subnet_1", # private or public & use this as condition also not just in name
  subnet_cidr = "10.100.1.0/24",    # 
  AZ_letters  = "a",                # region +(a,b,c)
  type        = "private"           # private or public # to make condition of allow public ip or not
  },
  {
    name        = "private_subnet_2",
    subnet_cidr = "10.100.2.0/24",
    AZ_letters  = "b",
    type        = "private"
  },
  {
    name        = "public_subnet_1",
    subnet_cidr = "10.100.3.0/24",
    AZ_letters  = "c",
    type        = "public"
  },
  {
    name        = "public_subnet_2",
    subnet_cidr = "10.100.4.0/24",
    AZ_letters  = "a",
    type        = "public"
  }
]
