# ── Origin Access Control (OAC) ──────────────────────────────────────────────
# OAC es la forma moderna (recomendada por AWS) de que CloudFront acceda a S3
# de forma privada y firmada, sin necesitar URLs públicas en el bucket.
# CloudFront no está disponible en LocalStack CE — se omite con count = 0.
resource "aws_cloudfront_origin_access_control" "frontend" {
  count = var.use_localstack ? 0 : 1
  name                              = "${var.project_name}-${var.environment}-frontend-oac"
  description                       = "OAC para el bucket S3 del frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ── Distribución CloudFront ───────────────────────────────────────────────────
resource "aws_cloudfront_distribution" "frontend" {
  count = var.use_localstack ? 0 : 1
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = var.default_root_object
  price_class         = var.cloudfront_price_class
  comment             = "${var.project_name}-${var.environment} frontend"

  # ── Origen: bucket S3 ────────────────────────────────────────────────────
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "s3-${local.bucket_name}"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend[0].id
  }

  # ── Comportamiento por defecto ────────────────────────────────────────────
  default_cache_behavior {
    target_origin_id       = "s3-${local.bucket_name}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    # Caché de 1 día por defecto, mínimo 0, máximo 1 año
    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  # ── SPA fallback (Angular Router) ────────────────────────────────────────
  # Cuando Angular Router navega a /ruta/cualquiera, S3 devuelve 403/404
  # porque ese archivo no existe. CloudFront intercepta ese error y sirve
  # index.html para que Angular maneje la ruta en el cliente.
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  # ── Restricciones geográficas ─────────────────────────────────────────────
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # ── Certificado SSL ───────────────────────────────────────────────────────
  # Usa el certificado por defecto de CloudFront (*.cloudfront.net con HTTPS).
  # Para un dominio propio, reemplazar por un bloque acm_certificate_arn.
  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-frontend-cdn"
  }

  depends_on = [aws_s3_bucket.frontend]
}

