import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
// import { ApiGateway } from 'aws-cdk-lib/aws-events-targets';
import * as ApiGateway from 'aws-cdk-lib/aws-apigateway';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import { DockerImage } from 'aws-cdk-lib/aws-stepfunctions-tasks';

// import * as sqs from 'aws-cdk-lib/aws-sqs';

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

// ######################################################
    const vpc = new ec2.Vpc(this, vpcName, {
      maxAzs: 3,
    });

    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: vpc,
      clusterName: clusterName   
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
    });

    const container = taskDefinition.addContainer('nginx', {
      image: ecs.ContainerImage.fromRegistry('nginx:latest'),
      memoryLimitMiB: 512,
      cpu: 256,
      containerName: 'nginx-container',
    });

    container.addPortMappings({
      containerPort: 80,
      hostPort: 80,
    });

    // const service = new ecs.FargateService(this, 'Service', {
    //   serviceName: 'Nginx-Service',
    //   cluster: cluster,
    //   taskDefinition: taskDefinition,
    //   assignPublicIp: true,
    //   desiredCount: 1,
    // });

    const Service = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'Service', {
      serviceName: `${clusterName}-Service`,
      cluster: cluster,
      taskDefinition: taskDefinition,
      publicLoadBalancer: true,
      desiredCount: 1,
      assignPublicIp: true,
    });
    
  }
}
