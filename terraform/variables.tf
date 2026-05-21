# ── LocalStack ───────────────────────────────────────────────────────────────
variable "use_localstack" {
  description = "Si es true, apunta todos los endpoints al contenedor LocalStack local en lugar de AWS real."
  type        = bool
  default     = false
}

# ── General ──────────────────────────────────────────────────────────────────
variable "project_name" {
  description = "Nombre del proyecto, usado como prefijo en los recursos."
  type        = string
  default     = "reto-nequi"
}

variable "environment" {
  description = "Entorno de despliegue (dev, staging, prod)."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "El valor de environment debe ser dev, staging o prod."
  }
}

# ── AWS ──────────────────────────────────────────────────────────────────────
variable "aws_region" {
  description = "Región de AWS donde se desplegará la infraestructura."
  type        = string
  default     = "us-east-1"
}

# ── S3 ───────────────────────────────────────────────────────────────────────
variable "build_dir" {
  description = "Ruta local al directorio con el build de Angular (ej: ../dist/frontend/browser)."
  type        = string
  default     = "../dist/frontend/browser"
}

variable "frontend_src_dir" {
  description = "Ruta al directorio raíz del frontend donde está el package.json."
  type        = string
  default     = ".."
}

variable "base_href" {
  description = "Base href de la SPA Angular. Déjalo vacío para calcularlo automáticamente según use_localstack."
  type        = string
  default     = ""
}

# ── CloudFront ────────────────────────────────────────────────────────────────
variable "cloudfront_price_class" {
  description = "Clase de precio de CloudFront. PriceClass_100 = solo US/Europa (más barato)."
  type        = string
  default     = "PriceClass_100"

  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.cloudfront_price_class)
    error_message = "Debe ser PriceClass_100, PriceClass_200 o PriceClass_All."
  }
}

variable "default_root_object" {
  description = "Archivo raíz que sirve CloudFront (index.html para SPAs Angular)."
  type        = string
  default     = "index.html"
}
