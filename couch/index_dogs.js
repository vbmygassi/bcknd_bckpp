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

require("request")("http://127.0.0.1:8092/default/_design/export/_view/dog?connection_timeout=50000&limit=100000&skip=0",
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
		for(index in res.rows){
			doc = res.rows[index];
			console.log("........................................");
			console.log(doc);
			console.log("//////////////////////////////////////////");
			console.log(index);
			console.log("   .");
			/*
			if(null == doc.id){
				console.log("no doc id: ");
				console.log(doc);
				continue;
			}
			*/
			// i add the doc key to the index: 
			// the idea is: find a string (elastical) and return the "key" so i can download the doc from "couch"
			// rather then "contents" of a document
			doc.value.meta = doc.key;
			// -->
			client.index("dogs", "default", doc.value, function(err, result, res){
				if(err){
					console.log("error while indexing: ");
					console.log(err);
					console.log(doc);
				}
				if(result){
					console.log("result: ");
					console.log(result);
				}
				if(res){
					console.log("res: ");
					console.log(res);
				}
			});
		}
	}
);

