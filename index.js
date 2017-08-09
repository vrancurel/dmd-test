'use strict'; // eslint-disable-line strict

const arsenal = require('arsenal');
const werelogs = require('werelogs');
const Memcached = require('memcached');

const logOptions = {
    "logLevel": "debug",
    "dumpLevel": "error"
};

const logger = new werelogs.Logger('Zenko-Memcached');

const MetadataFileServer =
          require('arsenal').storage.metadata.MetadataFileServer;

const mdServer = new MetadataFileServer(
    { bindAddress: '0.0.0.0',
      port: 9990,
      path: '/tmp',
      restEnabled: false,
      restPort: 9999,
      recordLog: { enabled: false, recordLogName: 's3-recordlog' },
      versioning: { replicationGroupId: 'RG001' },
      log: logOptions });

var memcached = new Memcached('localhost:11211', {retries:10,retry:10000,remove:true,failOverServers:['192.168.0.103:11211']});

class MemcachedService extends arsenal.network.rpc.BaseService {
    constructor(params) {
	super(params);
    }
}

mdServer.initMetadataService = function ()
{
    const dbService = new MemcachedService({
	namespace: '/MDFile/metadata',
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
	getDiskUsage: (env, cb) => {
	    console.log('getDiskUsage');
	},
    });
    dbService.registerSyncAPI({
        createReadStream:
        (env, options) => {
	    console.log('createReadStream');
	},
        getUUID: () => this.readUUID(),
    });
    
    console.log('Hooks installed');
}

mdServer.startServer();

console.log('Zenko Memcached Plugin Initialized');
