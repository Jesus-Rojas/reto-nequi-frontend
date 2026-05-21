output "cloudfront_domain" {
  description = "Dominio público de la distribución CloudFront (N/A en LocalStack CE)."
  value       = var.use_localstack ? "N/A — CloudFront no disponible en LocalStack CE" : aws_cloudfront_distribution.frontend[0].domain_name
}

output "frontend_url" {
  description = "URL del frontend Angular."
  value = var.use_localstack ? (
    "http://localhost:4566/${aws_s3_bucket.frontend.id}/index.html"
  ) : (
    "https://${aws_cloudfront_distribution.frontend[0].domain_name}"
  )
}

output "cloudfront_distribution_id" {
  description = "ID de la distribución CloudFront (N/A en LocalStack CE)."
  value       = var.use_localstack ? "N/A — CloudFront no disponible en LocalStack CE" : aws_cloudfront_distribution.frontend[0].id
}

output "s3_bucket_name" {
  description = "Nombre del bucket S3 donde se alojan los archivos del frontend."
  value       = aws_s3_bucket.frontend.id
}

output "s3_bucket_arn" {
  description = "ARN del bucket S3."
  value       = aws_s3_bucket.frontend.arn
}

output "invalidate_cache_command" {
  description = "Comando para invalidar la caché de CloudFront tras un nuevo deploy."
  value = var.use_localstack ? "N/A — CloudFront no disponible en LocalStack CE" : "aws cloudfront create-invalidation --distribution-id ${aws_cloudfront_distribution.frontend[0].id} --paths '/*'"
}

