import boto3

cluster_name = 'cluster-dev'

ecs = boto3.client('ecs')

def stop_ecs_cluster():
    try:

        response = ecs.list_tasks(cluster=cluster_name)
        for task in response['taskArns']:
            ecs.stop_task(cluster=cluster_name, task=task)

        response = ecs.list_container_instances(cluster=cluster_name)
        for instance in response['containerInstanceArns']:
            ecs.deregister_container_instance(cluster=cluster_name, containerInstance=instance)

        print('ECS cluster stopped successfully')
    except Exception as e:
        print('Error stopping ECS cluster: ' + str(e))

stop_ecs_cluster()