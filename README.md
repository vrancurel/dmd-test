# zenko-memcached-module

## Introduction

This module is definitely a **proof of concept** to demonstrate how to create
data and metadata storage modules (containers) for Zenko. The aim is to enable
you to make the most of Zenko's flexibility in terms of backends.

Please note that for production we strongly recommend the creation of two
distinct modules for data and metadata; indeed, they respond to very different
needs, hence belong to very different paradigms.
For sake of simplicity we include both in one container here.
 - In Zenko, they would be 2 different containers, so 2 distinct sections in
the `docker-stack.yml` of your usecase-specific deployment folder; see the
[Zenko production stack](https://github.com/scality/Zenko/blob/master/swarm-production/docker-stack.yml)
for an example.

## Design and architecture

### Metadata modules

Metadata modules are supposed to manage the low level bucket storage:
**for each bucket, there is one DB**. The semantics for `list` are very close
to the ones of [LevelUP](https://github.com/Level/levelup) (a client compatible
with numerous forks of LevelDB) so it is advised, although not required, to
write a [LevelDOWN](https://github.com/Level/leveldown) module of your backend
first, for sake of simplicity.
In our case, since this is only a POC, we use [jsondown](https://www.npmjs.com/package/jsondown)
which basically creates JSON databases in `/tmp` of the container.
 - Please be aware that if the container is restarted those DBs will be lost.

The recommended implementation for production settings would be to write a
jsonmemcachedmemdown module that fetches the JSON blobs from memcached (see
jsondown sources).

Eventually, there are 2 special buckets: 
 * **`__metastore`**: maintains the list of all buckets
 * **`users..bucket`**: manitains the list of buckets per user
 
Interaction with those 2 is also done via the metadata interface.

### Data modules

Data modules are supposed to manage the low level blob storage. There is no
metadata available (e.g.: no file name, parent folder or any other attributes)
through a data module, so it is impossible to link it whatsoever to a bucket
name.
 - If, for your usecase, you need such info, please consider writing a backend
directly in S3/CloudServer; see [`/lib/external`](https://github.com/scality/S3/tree/master/lib/data/external). 

You should picture this low level blob storage interface like a disk interface,
where you create a key, store a blob, and return a key at the end (some blob
stores dictate the key to use: it is fine, just return it).

A few other operations are required, such as `stat` and `get`. For these,
[CloudServer](https://github.com/scality/S3) will provide the exact same key
you returned at `put`. 
 - WARNING: in our case, in the POC spirit, we convert streams to strings, which
is very bad practice: a fully fledged data module is expected to stream the blob
to the backend.

## Deployment

This proof-of-concept module also demonstrates the usage of Docker Swarm
orchestrations through a standard `docker-stack.yml` file, and thus makes use of
the powerful Docker networks: 
 - WARNING: there shall be at least 2 nodes in the Swarm for the networks
to work. Otherwise the docker networks won't work properly.

### Setting the storage node

In a multiple server deployment, only one node of the Doxker Swarm network will
actually store the data. We identify it by applying a  'storage' label to it.
For this POC, we want to be on the same node as memcached; in your in module, it
could be for a specific volume).
 - For Cloud "disk" backends this is not necessary.

List the nodes in your Swarm:
``` shell
$ docker node ls
ID                            HOSTNAME            STATUS              AVAILABILITY        MANAGER STATUS
ng8quztnef0r1x90le4d6lssj *   host1               Ready               Active              Leader
dfgayejh8xbdfkgk76bbdfkef     host2               Ready               Active
```
We will choose node `ng8quztnef0r1x90le4d6lssj` to be assigned persistent
containers. To inform Docker Swarm, assign label `io.zenko.type` with value
`storage` to the node:

```shell
$ docker node update --label-add io.zenko.type=storage ng8quztnef0r1x90le4d6lssj
ng8quztnef0r1x90le4d6lssj
```

Check that the label has been applied:

```shell
$ docker node inspect ng8quztnef0r1x90le4d6lssj -f '{{ .Spec.Labels }}'
map[io.zenko.type:storage]
```

To remove the label on the node do:

```shell
$ docker node update --label-rm io.zenko.type ng8quztnef0r1x90le4d6lss\
j
ng8quztnef0r1x90le4d6lssj
```

### Generating your image

Generate the Docker image from this repository's Dockerfile:
``` shell
$ docker build -t {{YOUR_DOCKERHUB_REPO}}/zenko-memcached-module
$ docker push {{YOUR_DOCKERHUB_REPO}}/zenko-memcached-module
```
 - You can follow the same steps once you have written your own service; of
course, you don't have to keep memcached as the name!

To run the memcached-module, do:
``` shell
$ docker stack deploy -c docker-stack.yml zenko-prod-memcached
```

- WARNING: you can only have one Zenko stack running at a time. If you have
deployed this stack or another in the past, make sure to delete it before deploying
the new one: `$ docker stack rm {{ZENKO_STACK_NAME}}`
