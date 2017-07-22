'use strict'; // eslint-disable-line strict

const arsenal = require('arsenal');
const Memcached = require('memcached');

const logOptions = {
    "logLevel": "info",
    "dumpLevel": "error"
};

const Logger = require('werelogs').Logger;

const logging = new Logger('Zenko-Memcached', logOptions);
const logger = logging.newRequestLogger();

const MetadataFileServer =
    arsenal.storage.metadata.MetadataFileServer;

const mdServer = new MetadataFileServer(
    { bindAddress: process.env.BIND_ADDRESS ? process.env.BIND_ADDRESS : 'localhost',
      port: process.env.PORT ? process.env.PORT : 9990,
      log: logOptions,
      path: '/tmp',
      versioning: { replicationGroupId: 'dummy' } 
      });

var memcached = new Memcached('localhost:11211', {retries:10,retry:10000,remove:true,failOverServers:['192.168.0.103:11211']});

class MemcachedService extends arsenal.network.rpc.BaseService {
    constructor(params) {
	super(params);
    }
}

mdServer.initMetadataService = function ()
{
    const dbService = new MemcachedService({
	namespace: '/dummy',
	logger: logger
    });
    this.services.push(dbService);

    dbService.registerAsyncAPI({
        put: (env, key, value, options, cb) => {
	    console.log('put');
        },
        del: (env, key, options, cb) => {
	    console.log('del');
        },
        get: (env, key, options, cb) => {
	    console.log('get');
        },
    });
    dbService.registerSyncAPI({
        createReadStream:
        (env, options) => {
	    console.log('createReadStream');
	},
        getUUID: () => this.readUUID(),
    });
    
    console.log('Zenko Memcached Plugin Initialized');
}

mdServer.startServer();
