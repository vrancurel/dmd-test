'use strict'; // eslint-disable-line strict

const arsenal = require('arsenal');
const werelogs = require('werelogs');
const Memcached = require('memcached');
const levelup = require('levelup');
const jsondown = require('jsondown');
const toString = require('stream-to-string');
const toStream = require('string-to-stream');
const crypto = require('crypto');

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

var dbs = {};

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
	    if (dbs[dbName] === undefined) {
		dbs[dbName] = levelup('/tmp/' + dbName + '.json', { db: jsondown });
	    }
	    dbs[dbName].put(key, value);
	    cb(null);
        },
        del: (env, key, options, cb) => {
	    const dbName = env.subLevel.join(SUBLEVEL_SEP);
	    console.log('del', dbName, key, options);
	    if (dbs[dbName] === undefined) {
		dbs[dbName] = levelup('/tmp/' + dbName + '.json', { db: jsondown });
	    }
	    dbs[dbName].del(key);
	    cb(null);
        },
        get: (env, key, options, cb) => {
	    const dbName = env.subLevel.join(SUBLEVEL_SEP);
	    console.log('get', dbName, key, options);
	    if (dbs[dbName] === undefined) {
		console.log(dbName, 'undefined');
		dbs[dbName] = levelup('/tmp/' + dbName + '.json', { db: jsondown });
	    }
	    dbs[dbName].get(key, (err, value) => {
		if (err) {
		    if (err.notFound) {
			return cb(arsenal.errors.ObjNotFound);
		    }
		    return cb(arsenal.errors.InternalError);
		}
		console.log(key, value);
		cb(null, value);
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
	    if (dbs[dbName] === undefined) {
		dbs[dbName] = levelup('/tmp/' + dbName + '.json', { db: jsondown });
	    }
	    return dbs[dbName].createReadStream();
	},
        getUUID: () => this.readUUID(),
    });
    
    console.log('Hooks installed');
}

mdServer.startServer();

// data
function randomValueHex(len) {
    return crypto.randomBytes(Math.ceil(len / 2))
        .toString('hex') // convert to hexadecimal format
        .slice(0, len);   // return required number of characters
}

class MemcachedFileStore extends arsenal.storage.data.file.DataFileStore {
    constructor(dataConfig, logApi) {
	super(dataConfig, logApi);
	console.log('filestore constructor');
    }

    setup(cb) {
	console.log('data setup');
	cb(null);
    }

    put(dataStream, size, log, cb) {
	console.log('data put');
	toString(dataStream, (err, data) => {
	    const key = randomValueHex(20);
	    memcached.set(key, data, MEMCACHED_LIFETIME,
			  (err) => {
			      if (err) {
				  console.log(err);
				  cb(err);
			      } else {
				  cb(null, key);
			      }
			  });
	});
    }

    stat(key, log, cb) {
	console.log('data stat');
	memcached.get(key, (err, data) => {
	    if (err) {
		console.log(err);
		cb(err);
	    } else {
		console.log(key, data.length);
		cb(null, { objectSize: data.length});
	    }
	});

    }

    get(key, byteRange, log, cb) {
	console.log('data get');
	memcached.get(key, (err, data) => {
	    if (err) {
		console.log(err);
		cb(err);
	    } else {
		cb(null, toStream(data));
	    }
	});
    }

    delete(key, log, cb) {
	console.log('data delete');
	memcached.del(key, (err) => {
	    if (err) {
		console.log(err);
		cb(err);
	    } else {
		cb(null);
	    }
	});
    }

    getDiskUsage(cb) {
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
