import boto3

ecs = boto3.client('ecs')

def handler(event, context):
    cluster_name = 'your-cluster-name'  # Replace with your ECS cluster name

    try:
        # Update the ECS cluster capacity to 0
        ecs.update_cluster(
            cluster=cluster_name,
            settings=[
                {
                    'name': 'containerInstanceLongArnFormat',
                    'value': 'disabled'
                }
            ],
            capacityProviders=[
                {
                    'name': 'FARGATE',
                    'capacityProviderStrategy': [
                        {
                            'capacityProvider': 'FARGATE',
                            'weight': 0,
                            'base': 0
                        }
                    ]
                }
            ]
        )

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