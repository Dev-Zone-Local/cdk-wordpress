import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
// import { ApiGateway } from 'aws-cdk-lib/aws-events-targets';
import * as ApiGateway from 'aws-cdk-lib/aws-apigateway';
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


  }
}
