# zenko-memcached-module

This module is definitely a toy but demonstrates how to create a data
storage and a metadata storage module in Zenko. Please note that for
production we would want to create a separate module for data and
metadata, because conceptually they are very different and have very
different dynamics. They would end up in 2 different docket-stack.yml
sections then. So please understand that for sake of simplicity we
include both here.

Metadata modules are supposed to manage the low level bucket storage:
one bucket equals one DB. The semantics for list are very close to the
one of LevelUp (leveldb) so it is advised, although not required, to
write a leveldown module of your backend first for sake of simplicity.
Please note that in our case, by laziness, we use jsondown which
basically creates JSON dbs in /tmp of the container. Please be aware
that if the container is restarted those DBs will be lost. The proper
way would have been probably to write a jsonmemcachedmemdown module
that would have fetched the JSON blobs from memcached (see jsondown
sources).

Data modules are supposed to manage the low level blob storage. There
is no metadata available here such as the file name, parent folder or
any other attributes that would be useful, so it is impossible to
rattach it whatsoever to a bucket name. Please see this interface more
as a disk interface where you create a key, store a blob, return a key
to it (some blob store would dictate the key to use so it is fine
also, just return it). Few other operations are required such as stat
and get where cloudserver (S3 server) will provide the exact same key
you returned at put. Note that in our case, due to laziness with
convert streams to strings, which is very bad: a fully fledged data
module would stream to the backend.

Warning there shall be at least 2 nodes in the swarm for the networks
to work. Otherwise the docker networks won't work properly.

Don't forget to set the 'storage' label for container affinity with
the actual real backend if necessary (in our case to be on the same
node as memcached, in another context it would be for a specific
volume). Note that for cloud "disks" backend this is not necessary.

To set the 'storage' label, first list the node with 'docker node ls'.

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

To generate the docker image do (you should replace vrancurel by your own dockerhub account):


```
$ docker build -t vrancurel/zenko-memcached-module .
$ docker push vrancurel/zenko-memcached-module
```

To run the memcached-module, do:

```
$ docker stack rm zenko-prod
$ docker stack deploy -c docker-stack.yml zenko-prod
```
