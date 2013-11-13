/*
 

 indexes all documents of a couchbase instance 
 "into" a given elasticsearch instance
 (none of the "transport" thingies worked...
  i decided to download the documents (fthis.js) 
  and then index the documents "zu fuss"
 
 it uses a couchbase view:  
 http://127.0.0.1:8092/default/_design/export/_view/user?connection_timeout=60000&limit=5000&skip=0
 export : user 
	===
	function (doc, meta){
		emit(meta, doc);
	}

                                                     */

Elastical = require("elastical");
client = new Elastical.Client("127.0.0.1", { port: 9200 } );

require("request")("http://127.0.0.1:8092/default/_design/export/_view/user?connection_timeout=50000&limit=100000&skip=0",
	function(err, response, body){
		if(err){
			console.log("err: " +err);
		} 
		if(response){
			console.log("response: " +response);
		} 
		if(null == body){
			return false;
		}
		res = JSON.parse(body);
		index(res.rows);
	}
);

index = function(coll)
{
	doc = coll.pop();
	if(null == doc){
		process.exit();
	}
	console.log("........................................");
	console.log(doc);
	doc.value.meta = doc.key;
	client.index("default", "default", doc.value, function(err, result, res){
		if(err){
			console.log("error while indexing: ");
			console.log(err);
			console.log(doc);
		}
		if(result){
			console.log("result: ");
			console.log(result);
			index(coll);
		}
		if(res){
			console.log("res: ");
			console.log(res);	
		}
	});
}

