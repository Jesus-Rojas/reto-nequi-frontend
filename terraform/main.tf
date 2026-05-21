terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
  }

  # Opcional: descomenta para guardar el estado en S3
  # backend "s3" {
  #   bucket         = "tu-bucket-terraform-state"
  #   key            = "reto-nequi/frontend/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "terraform-lock"
  #   encrypt        = true
  # }
}

locals {
  localstack_endpoint = "http://localhost:4566"
}

# Proveedor principal (us-east-1 o la región configurada)
provider "aws" {
  region = var.aws_region

  # ── LocalStack (desarrollo local) ────────────────────────────────────────
  # Cuando use_localstack = true se redirigen S3 y CloudFront al contenedor
  # LocalStack en lugar de apuntar a AWS real.
  dynamic "endpoints" {
    for_each = var.use_localstack ? [1] : []
    content {
      s3          = local.localstack_endpoint
      cloudfront  = local.localstack_endpoint
      iam         = local.localstack_endpoint
      sts         = local.localstack_endpoint
    }
  }

  access_key                  = var.use_localstack ? "test" : null
  secret_key                  = var.use_localstack ? "test" : null
  skip_credentials_validation = var.use_localstack
  skip_metadata_api_check     = var.use_localstack
  skip_requesting_account_id  = var.use_localstack
  s3_use_path_style           = var.use_localstack

  default_tags {
    tags = {
      Project     = var.project_name
      Component   = "frontend"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# CloudFront requiere que los certificados ACM estén siempre en us-east-1,
# independientemente de la región principal del proyecto.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  access_key                  = var.use_localstack ? "test" : null
  secret_key                  = var.use_localstack ? "test" : null
  skip_credentials_validation = var.use_localstack
  skip_metadata_api_check     = var.use_localstack
  skip_requesting_account_id  = var.use_localstack
}
