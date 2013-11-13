/** 

 downloads all documents from a given couchdb instance
 to a "local" instance... "zu fuss" 
 since cbbackup and cbrestore did not work (missing ids, missing vbuckets

 it uses a couchbase view called 
 export | all
 dev_export | all (the non published view)
 function(doc, meta){
 	emit(doc.id, doc);
 }

                                  */

Storage = { 
	bucket: null,
	client: null,
	connect: function(cb)
	{
		Couchbase.connect({
			debug    : Config.DB.DEBUG,
			user     : Config.DB.USER,
			password : Config.DB.PASSWORD,
			hosts    : Config.DB.HOSTS,
			bucket   : Config.DB.BUCKET
		},
		onConnect = function(err, bucket)
		{
			if(err){ throw(err); };
			Storage.bucket = bucket;
			cb();
		});
		/*
		bucket = new Couchbase.Connection({bucket: "default"}, function(err){
			if(err){
				throw(err);
			}
			Storage.bucket = bucket;
		});
		*/
	}
}

Fthis = {
	skip: 0,
	main: function()
	{
		Elastical = require('elastical');
		Couchbase = require("couchbase");
		Fthis.skip = Config.skip;
		Storage.connect(Fthis.next);
	},
	downloadDocument: function()
	{
		console.log("downloadDocument()");
		http = require("http");
		options = { host: Config.DOWNLOAD.HOST, port: Config.DOWNLOAD.PORT, path: Fthis.downloadPath };
		data = "";
		console.log(options);
		request = http.request(options, function(res){
			res.on('data', function(chunk){
				data +=chunk;
			});
			res.on('end', function(){
				Fthis.insertDocument(JSON.parse(data));
			});
		});
		request.on('error', function (e) {
			console.log(e.message);
		});
		request.end();
	},
	insertDocument: function(res)
	{
		console.log("insertDocument():" +res);
		if(res.error){
			console.log("error");
			console.log(res.error);
		}
		for(index in res){
			docs = res[index];
			inserts = 0;
			for(ii in docs){
				doc = docs[ii];
				console.log(doc);
				Storage.bucket.add({ key: doc.id }, doc.value, function(err){
					if(err){ 
						console.log("error");
						console.log(err);
					}
					inserts++;
					if(inserts == docs.length){
						Fthis.next();
					}
				});
			}
		}
	},
	next: function()
	{
		console.log("next();");
		Fthis.downloadPath =  "/default/_design/dev_export/_view/all?full_set=true&connection_timeout=60000&limit="+ Config.bulk +"&skip=" +Fthis.skip;
		Fthis.skip += Config.bulk;
		Fthis.downloadDocument();		
	},
	trace: function(err, result, res)
	{
		console.log("trace()");
		err ? console.log(err) : result ? console.log(result) : res ? console.log(res) : false;
	}
}

Config = {
	bulk: 10,
	skip: 0,
	DB: {
		DEBUG: true,
		HOSTS: ["127.0.0.1:8091"],
		USER: "",
		PASSWORD: "",
		BUCKET: "default"
	},
	DOWNLOAD: {
		HOST: "amazon",
		PORT: "8092",
	}
}

Fthis.main();
