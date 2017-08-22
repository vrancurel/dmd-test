# zenko-memcached-module
Zenko Memcached Module

This module demonstrates how to create a data storage and a metadata
storage module in Zenko.

Most of the time we will create a separate module for data and
metadata.

In this tutorial please replace vrancurel by your own dockerhub account.

Warning there shall be at least 2 nodes in the swarm for the networks
to work. Otherwise the docker networks won't work properly.

Don't forget to set the 'storage' label:

First list the node with 'docker node ls'.

E.g. if we choose the host with ID `ng8quztnef0r1x90le4d6lssj`. Then
to ensure that Docker Swarm only schedules the persistent containers
to this particular node, assign label `io.zenko.type` with value
`storage` to the node:

```shell
$ docker node update --label-add io.zenko.type=storage ng8quztnef0r1x90le4d6lssj
ng8quztnef0r1x90le4d6lssj
```

Check that the label has been applied:

```shell
$ docker node inspect ng8quztnef0r1x90le4d6lssj -f '{{ .Spec.Labels }}'
map[io.zenko.type:storage]

To remove the label on the node do:
```shell
$ docker node update --label-rm io.zenko.type ng8quztnef0r1x90le4d6lss\
j
ng8quztnef0r1x90le4d6lssj
```

To generate the docker image do:

```
$ docker build -t vrancurel/zenko-memcached-module .
$ docker push vrancurel/zenko-memcached-module
```

To run the memcached-module, do:

```
$ docker stack rm zenko-prod
$ docker stack deploy -c docker-stack.yml zenko-prod
```
