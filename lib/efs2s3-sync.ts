import { Stack, StackProps, CfnOutput, Size } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
// import { ApiGateway } from 'aws-cdk-lib/aws-events-targets';
import * as ApiGateway from 'aws-cdk-lib/aws-apigateway';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import { DockerImage } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import * as RdsInstance from 'aws-cdk-lib/aws-rds';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';
import { KubectlV32Layer } from '@aws-cdk/lambda-layer-kubectl-v32';
import { EfsVolume } from 'aws-cdk-lib/aws-batch';
import * as efs from 'aws-cdk-lib/aws-efs';

//    // Create an S3 bucket
    const s3Bucket = new s3.Bucket(this, 'S3Bucket', {
      bucketName: s3bucket,
    });

    // Create an IAM role for the EFS to S3 sync
    const efsToS3Role = new iam.Role(this, 'EfsToS3Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });

    // Add policies to the IAM role
    efsToS3Role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject'],
        resources: [s3Bucket.arnForObjects('*')],
      }),
    );

    // Create an EFS to S3 sync task
    const efsToS3SyncTask = new ecs.FargateTaskDefinition(this, 'EfsToS3SyncTask', {
      volumes: [
        {
          name: 'efs-volume',
          efsVolumeConfiguration: {
            fileSystemId: wp_efs.fileSystemId,
          },
        },
      ],
    });

    // Add a container to the task definition
    const efsToS3SyncContainer = efsToS3SyncTask.addContainer('efs-to-s3-sync', {
      image: ecs.ContainerImage.fromRegistry('amazon/aws-cli:latest'),
      containerName: 'efs-to-s3-sync-container',
      environment: {
        EFS_FILE_SYSTEM_ID: wp_efs.fileSystemId,
        S3_BUCKET_NAME: s3Bucket.bucketName,
      },
      command: [
        'aws',
        's3',
        'sync',
        '/var/www/html/',
        `s3://${s3Bucket.bucketName}/`,
      ],
    });

    // Add the IAM role to the task definition
    efsToS3SyncTask.taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ReadOnlyAccess'),
    );
    efsToS3SyncTask.taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'),
    );
    efsToS3SyncTask.taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEFSReadOnlyAccess'),
    );

    // Create an ECS service for the EFS to S3 sync task
    const efsToS3SyncService = new ecs_patterns.ApplicationLoadBalancedFargateService(
      this,
      'EfsToS3SyncService',
      {
        serviceName: 'efs-to-s3-sync-service',
        cluster: cluster,
        taskDefinition: efsToS3SyncTask,
        publicLoadBalancer: false,
        desiredCount: 1,
        assignPublicIp: false,
        securityGroups: [securityGroup0],
      },
    );
      
//// Sensetive Code end ///