locals {
  bucket_name = "${var.project_name}-${var.environment}-frontend"
}

# ── Bucket S3 ────────────────────────────────────────────────────────────────
# El bucket NO es público. CloudFront accede a él mediante OAC (Origin Access
# Control), que es el mecanismo recomendado por AWS desde 2022.
resource "aws_s3_bucket" "frontend" {
  bucket        = local.bucket_name
  force_destroy = true

  tags = {
    Name = local.bucket_name
  }
}

# En AWS real el bucket es privado (solo CloudFront accede vía OAC).
# En LocalStack no hay CloudFront CE, así que se habilita acceso público.
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = var.use_localstack ? false : true
  block_public_policy     = var.use_localstack ? false : true
  ignore_public_acls      = var.use_localstack ? false : true
  restrict_public_buckets = var.use_localstack ? false : true
}

# Habilitar versionado (útil para rollbacks de deploys)
resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Política del bucket:
#   - AWS real: solo CloudFront (OAC) puede leer los objetos
#   - LocalStack: acceso público de lectura (no hay CloudFront disponible)
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = var.use_localstack ? jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadLocalStack"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.frontend.arn}/*"
    }]
  }) : jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowCloudFrontOAC"
      Effect = "Allow"
      Principal = {
        Service = "cloudfront.amazonaws.com"
      }
      Action   = "s3:GetObject"
      Resource = "${aws_s3_bucket.frontend.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.frontend[0].arn
        }
      }
    }]
  })

  depends_on = [aws_cloudfront_distribution.frontend]
}

# ── Build automático de Angular ─────────────────────────────────────────────
# Ejecuta `ng build` con el base-href correcto antes de subir archivos a S3.
# LocalStack: base-href = /<bucket>/ para que el router resuelva bien.
# AWS real:   base-href = / (CloudFront sirve desde raíz).
locals {
  computed_base_href = var.base_href != "" ? var.base_href : (
    var.use_localstack ? "/${local.bucket_name}/" : "/"
  )
}

resource "null_resource" "ng_build" {
  triggers = {
    base_href   = local.computed_base_href
    src_hash    = sha256(join(",", fileset(var.frontend_src_dir, "src/**")))
  }

  provisioner "local-exec" {
    working_dir = var.frontend_src_dir
    command     = "npm run build -- --configuration production --base-href ${local.computed_base_href}"
  }
}

# ── Sync de archivos a S3 ────────────────────────────────────────────────────
# Usa `aws s3 sync` via local-exec para evitar que fileset() se evalúe en
# la fase de plan (antes de que el build exista).
resource "null_resource" "s3_sync" {
  triggers = {
    build_id   = null_resource.ng_build.id
    bucket     = aws_s3_bucket.frontend.id
  }

  provisioner "local-exec" {
    command = var.use_localstack ? (
      "AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test aws s3 sync ${var.build_dir} s3://${aws_s3_bucket.frontend.id}/ --endpoint-url http://localhost:4566 --region ${var.aws_region} --delete"
    ) : (
      "aws s3 sync ${var.build_dir} s3://${aws_s3_bucket.frontend.id}/ --delete"
    )
  }

  depends_on = [
    null_resource.ng_build,
    aws_s3_bucket_policy.frontend,
  ]
}
