'use strict'; // eslint-disable-line strict

const arsenal = require('arsenal');
const werelogs = require('werelogs');
const Memcached = require('memcached');
const StreamArray = require('stream-array');

const SUBLEVEL_SEP = '::';
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

var memcached_host = process.env.MEMCACHED_HOST ? process.env.MEMCACHED_HOST : 'localhost';

var memcached = new Memcached(`${memcached_host}:11211`, {retries:10,retry:10000,remove:true,failOverServers:['192.168.0.103:11211']});

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
	    console.log('put', dbName, key, value, options);
	    memcached.get(dbName, (err, data) => {
		if (err) {
		    console.log(err);
		    cb(err);
		} else if (data === undefined) {
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
	    });
        },
        del: (env, key, options, cb) => {
	    const dbName = env.subLevel.join(SUBLEVEL_SEP);
	    console.log('del', dbName, key, options);
        },
        get: (env, key, options, cb) => {
	    const dbName = env.subLevel.join(SUBLEVEL_SEP);
	    console.log('get', dbName, key, options);
	    memcached.get(dbName, (err, data) => {
		if (err) {
		    console.log(err);
		    cb(err);
		} else {
		    console.log('get', data);
		    let db = JSON.parse(data);
		    cb(null, db[key])
		}
	    });
        },
	getDiskUsage: (env, cb) => {
	    console.log('getDiskUsage',env);
	},
    });
    dbService.registerSyncAPI({
        createReadStream:
        (env, options) => {
	    const dbName = env.subLevel.join(SUBLEVEL_SEP);
	    console.log('createReadStream', dbName, options);
	    memcached.get(dbName, (err, data) => {
		if (err) {
		    console.log(err);
		    return undefined;
		} else {
		    console.log('createReadStream', data);
		    if (data === undefined) {
			return null;
		    } else {
			let db = JSON.parse(data);
			const stream = StreamArray.create(db);
			return stream;
		    }
		}
	    });
	},
        getUUID: () => this.readUUID(),
    });
    
    console.log('Hooks installed');
}

mdServer.startServer();

// data

class MemcachedFileStore extends arsenal.storage.data.file.DataFileStore {
    constructor(dataConfig, logApi) {
	super(dataConfig, logApi);
	console.log('filestore constructor');
    }

    setup(callback) {
	console.log('data setup');
	callback(null);
    }

    put(dataStream, size, log, callback) {
	console.log('data put');
    }

    stat(key, log, callback) {
	console.log('data stat');
    }

    get(key, byteRange, log, callback) {
	console.log('data get');
    }

    delete(key, log, callback) {
	console.log('data delete');
    }

    getDiskUsage(callback) {
	console.log('data getDiskUsage');
    }
}

const dataServer = new arsenal.network.rest.RESTServer(
    { bindAddress: '0.0.0.0',
      port: 9991,
      dataStore: new MemcachedFileStore(
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
