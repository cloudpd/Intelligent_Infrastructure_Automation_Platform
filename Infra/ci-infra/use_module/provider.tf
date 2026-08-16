provider "aws" {
  # region  = "eu-north-1"
  region  = var.region
  profile = "youssef-aws" # you can put this profile name in env variables AWS_PROFILE and  put this env varialbe here if you don't want expose your profile name


}