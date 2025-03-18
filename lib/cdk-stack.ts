import { Stack, StackProps, CfnOutput, Size } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
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


export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Fetch the environment (e.g., 'dev' or 'qa')
    const env = this.node.tryGetContext('env') || 'dev';

    // Load the values from context
    const lambdaFunctio1 = this.node.tryGetContext(env)?.lambdaFunction || 'default-lambda';
    const vpcName = this.node.tryGetContext(env)?.vpcName || 'default-vpc';
    const api_1 = this.node.tryGetContext(env)?.apiName || 'default-api';
    const s3bucket = this.node.tryGetContext(env)?.s3bucket || 'default-s3';
    const clusterName = this.node.tryGetContext(env)?.clusterName || 'default-cluster';


// ######################### WORKING CODE #############################

    const lambdaFunction = new lambda.Function(this, 'Lambda-1', {
      functionName: lambdaFunctio1,
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda-1'),
    });

    const api1 = new ApiGateway.LambdaRestApi(this, 'api_1', {
      handler: lambdaFunction,
      restApiName: api_1,
      retainDeployments: true,
    });



    const vpc = new ec2.Vpc(this, vpcName, {
      maxAzs: 3,
    });

    const securityGroup0 = new ec2.SecurityGroup(this, 'SecurityGroup0', {
      securityGroupName: 'secuityGroup01',     
      vpc: vpc,
    });

    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: vpc,
      clusterName: clusterName
    });
 
    
    const wp_efs = new efs.FileSystem(this, 'wp_efs', {
      vpc: vpc,
      oneZone: true,
      securityGroup: securityGroup0,
    });

    
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      volumes: [
      {
        name: 'efs-volume',
        efsVolumeConfiguration: {
        fileSystemId: wp_efs.fileSystemId,
        },
      },
      ],
    });


   const secret = new Secret(this, 'Secret', {
      secretName: 'rds-credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'admin' }),
        generateStringKey: 'password',
        excludePunctuation: true,
      },
    });

    const rds = new RdsInstance.DatabaseInstance(this, 'RdsInstance', {
        engine: RdsInstance.DatabaseInstanceEngine.mysql({
          version: RdsInstance.MysqlEngineVersion.VER_8_0,
        }),
        databaseName: 'mydb',
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.MICRO),
        credentials: {
          username: secret.secretValueFromJson('username').toString(),
          password: secret.secretValueFromJson('password'),
        },
        vpc: vpc,
        securityGroups: [securityGroup0],
      });

      const container = taskDefinition.addContainer('wordpress', {
        image: ecs.ContainerImage.fromRegistry('wordpress:latest'),
        containerName: 'wordpress-container',
        environment: {
          WORDPRESS_DB_NAME: 'mydb',
          WORDPRESS_DB_USER: secret.secretValueFromJson('username').toString(),
          WORDPRESS_DB_PASSWORD: secret.secretValueFromJson('password').toString(),
          WORDPRESS_DB_HOST: `${rds.instanceEndpoint.hostname}:${rds.instanceEndpoint.port.toFixed()}`,
          WORDPRESS_TABLE_PREFIX: 'wp'
          },
      }); 
      container.addPortMappings({
        containerPort: 80,
        hostPort: 80,
      });

      container.addMountPoints({
        sourceVolume: 'efs-volume',
        containerPath: '/var/www/html/',
        readOnly: false,
      });

      const Service = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'Service', {
        serviceName: `${clusterName}-wp-Service`,
        cluster: cluster,
        taskDefinition: taskDefinition,
        publicLoadBalancer: true,
        desiredCount: 1,
        assignPublicIp: true,
        securityGroups: [securityGroup0],
      });

      rds.connections.allowDefaultPortFrom(Service.service);
  

    new CfnOutput(this, 'RDSConnectionString', {
      value: rds.instanceEndpoint.hostname,
    });

    new CfnOutput(this, 'RDSConnectionPort', {
      value: rds.instanceEndpoint.port.toFixed(),
    });

    new CfnOutput(this, 'LoadBalancerDNS', {
      value: Service.loadBalancer.loadBalancerDnsName,
    });

// ################# WORKING CODE END #################################


  }
}
