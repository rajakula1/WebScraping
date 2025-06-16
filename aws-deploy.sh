#!/bin/bash

# AWS Configuration
AWS_REGION="us-east-1"  # Change this to your preferred region
ECR_REPOSITORY="webscraper-backend"
ECS_CLUSTER="webscraper-cluster"
ECS_SERVICE="webscraper-service"
ECS_TASK_DEFINITION="webscraper-task"

# Login to AWS ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com

# Create ECR repository if it doesn't exist
aws ecr describe-repositories --repository-names $ECR_REPOSITORY --region $AWS_REGION || \
    aws ecr create-repository --repository-name $ECR_REPOSITORY --region $AWS_REGION

# Build and tag the Docker image
docker build -t $ECR_REPOSITORY:latest .
docker tag $ECR_REPOSITORY:latest $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest

# Push the image to ECR
docker push $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest

# Update ECS service
aws ecs update-service --cluster $ECS_CLUSTER --service $ECS_SERVICE --force-new-deployment --region $AWS_REGION

echo "Deployment completed successfully!" 