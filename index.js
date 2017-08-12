'use strict'; // eslint-disable-line strict

const arsenal = require('arsenal');
const werelogs = require('werelogs');
const Memcached = require('memcached');

const MEMCACHED_LIFETIME = 100000;

const logOptions = {
    "logLevel": "debug",
    "dumpLevel": "error"
};

const logger = new werelogs.Logger('Zenko-Memcached');

// Metadata

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
	this.addRequestInfoConsumer((dbService, reqParams) => {
            const env = {};
            env.subLevel = reqParams.subLevel;
	    return env;
	});
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
	    const dbName = env.subLevel.join(SUBLEVEL_SEP);
	    console.log('put',env,dbName,key,value,options);
/*	    memcached.get(dbName, (err, data) => {
		if (err) {
		    console.log(err);
		    let db = {};
		    db[key] = value;
		    memcached.add(dbName, JSON.stringify(db), MEMCACHED_LIFETIME, 
				  (err) => {
				      if (err) {
					  console.log(err);
					  cb(err);
				      } else {
					  cb(null);
				      }
				  });
		} else {
		    console.log(data);
		    let db = JSON.parse(data);
		    db[key] = value;
		    memcached.replace(dbName, JSON.stringify(db), MEMCACHED_LIFETIME, 
				      (err) => {
					  if (err) {
					      console.log(err);
					      cb(err);
					  } else {
					      cb(null);
					  }
				      });
		}
	    });*/
        },
        del: (env, key, options, cb) => {
	    console.log('del',env,key,options);
        },
        get: (env, key, options, cb) => {
	    console.log('get',key,options);
/*	    memcached.get(dbName, (err, data) => {
		if (err) {
		    console.log(err);
		} else {
		    console.log(data);
		    let db = JSON.parse(data);
		    cb(null, db[key])
		}
	    });
*/
        },
	getDiskUsage: (env, cb) => {
	    console.log('getDiskUsage',env);
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

// data

const dataServer = new arsenal.network.rest.RESTServer(
    { bindAddress: '0.0.0.0',
      port: 9991,
      dataStore: new arsenal.storage.data.file.DataFileStore(
          { dataPath: '/tmp',
            log: logOptions }),
      log: logOptions });

dataServer.setup(err => {
    if (err) {
        logger.error('Error initializing REST data server',
                     { error: err });
        return;
    }
    dataServer.start();
});

console.log('Zenko Memcached Plugin Initialized');
