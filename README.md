# zenko-memcached-module
Zenko Memcached Module

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

