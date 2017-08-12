# zenko-memcached-module
Zenko Memcached Module

Overrides Dmd/Data and Dmd/Metadata

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

