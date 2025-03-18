import boto3

ecs = boto3.client('ecs')

def handler(event, context):
    cluster_name = 'cluster-dev'  # Replace with your ECS cluster name

    try:
        # Stop all running tasks in the cluster
        response = ecs.list_tasks(cluster=cluster_name)
        for task in response['taskArns']:
            ecs.stop_task(cluster=cluster_name, task=task)

        # Deregister all container instances in the cluster
        response = ecs.list_container_instances(cluster=cluster_name)
        for instance in response['containerInstanceArns']:
            ecs.deregister_container_instance(cluster=cluster_name, containerInstance=instance)

        return {
            'statusCode': 200,
            'body': 'ECS cluster stopped successfully'
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': 'Error stopping ECS cluster: ' + str(e)
        }

# Update the API ID and stage name
api_id = 'plqlsagc9s'
stage_name = 'prod'

# Deploy the API
apigateway = boto3.client('apigateway')
response = apigateway.create_deployment(
    restApiId=api_id,
    stageName=stage_name
)

print(response)