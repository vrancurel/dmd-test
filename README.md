# zenko-memcached-module
Zenko Memcached Module

To generate the docker image do:

```
$ docker build -t vrancurel/zenko-memcached-module .
```

To run the memcached-module, do:

```
$ docker stack deploy -c module.yml zenko-prod
```

