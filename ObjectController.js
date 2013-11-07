var Storage = require('../../util/Storage').Storage;

var elastical = require('elastical');
var elasticalClient = new elastical.Client();

function ObjectController(db) {
	this.db = db;

	this.pageSize = 25;

	this.params = {
		"user": ['id', 'email', 'firstname', 'lastname'],
		"dog": ['id', 'user_id', 'name'],
		"route": ['id', 'name', 'length'],
		"meetingpoint": ['id', 'name', 'date'],
		"gassicall": ['id', 'date'],
		"offer": ['id', 'title', 'category_name'],
		"poi": ['id', 'name', 'address', 'city', 'mail'],
		"photo": ['id', 'user_id', 'route_id'],
		"premium_user": ['id', 'email', 'pois']
	}
}

ObjectController.prototype.getObjectPage = function getObjectPage(type, req, res) {
	var page = req.query.page || 1;

	this.makeObjectList(type, this.params[type], page, function(err, html) {
		if (err) {
			res.render('layout', {title: 'Error', content: err});
			return;
		};

		res.render('layout', {title: type + 's', search: {type: type}, content: html});
	});
}

ObjectController.prototype.makeObjectList = function makeObjectList(type, params, page, cb) {
	var that = this;

	page = parseInt(page);

	this.db.bucket.view('objects', 'objectCountByType', {key: type, stale: false, group: true, group_level: 1}, function(err, view) {
		if (err || view.length == 0) {
			cb('No objects found');
			return;
		};

		var count = view[0].value;

		if (count == 0) {
			cb('No objects found');
			return;
		};

		var skip = (page - 1) * that.pageSize;

		that.db.bucket.view('objects', 'objectsByType', {key: type, stale: false, include_docs: true, limit: that.pageSize, skip: skip}, function(err2, view2) {
			if (err2 || view2.length == 0) {
				cb('No objects found');
				return;
			};

			var objects = new Array();

			view2.forEach(function(object) {
				object.doc.json.id = object.doc.meta.id;
				objects.push(object.doc.json);
			});


			var html = that.renderObjectList(objects, params, type);

			html += '<ul class="pager pull-right">';

			if (page > 1) {
				html += '<li><a href="/' + type + '?page=' + (page - 1)  + '">Previous</a></li>';
			};

			if (count > skip + that.pageSize) {
				html += '<li><a href="/' + type + '?page=' + (page + 1)  + '">Next</a></li>';
			};

			html += '</ul>';

			cb(null, html);
		});
	});
}

ObjectController.prototype.renderObjectList = function renderObjectList(objects, params, type) {
	// render html manually because it is not possible in this way with mustache
	var html = '<table class="table table-striped"><thead><tr>';

	params.forEach(function(param) {
		html += '<th>' + param + '</th>';
	});

	html += '<th></th></thead>';

	objects.forEach(function(object) {
		html += '<tr id="object_' + object.id + '">';

		params.forEach(function(param) {
			var value = object[param] || '';

			if(param == 'pois') {
                value = '';
                for(var o in object[param]) {
                    value += '<a href="/object/' + object[param][o] +'">' + object[param][o] +'</a>, ';
                }
			}

			html += '<td>' + value + '</td>';
		});

        var add = '';
        if(type == 'premium_user') {
            add = '| <a href="/premium/show_create?email=' + object['email'] +'">Add POI</a>';
        }

		html += '<td><a class="object_list_delete_button" href="javascript:;" data-id="' + object.id + '">Delete</a>&nbsp;|&nbsp;<a class="object_list_edit_button" href="/object/' + object.id + '">Edit</a> ' + add + '</td>';

		html += '</tr>';
	});

	html += '</table>';

	return html;
}

ObjectController.prototype.searchObjects = function searchObjects(type, term, res) {
	var that = this;

    var queryObject = {
        "query": {
            "query_string": {
                // "fields": ["firstname", "lastname"],
                "query": '*' + term + '*'
            }
        }
    };

    elasticalClient.search(queryObject, function (err, results) {
        if (err || !results.hits || results.hits.length == 0) {
            res.render('layout', {title: 'Error', content: 'Nothing found for term "' + term + '".'})
            return;
        };

        var doc_ids = new Array();

        for(var element in results.hits) {
            var hit = results.hits[element];
            if (hit._source.doc.type == type) {
            	doc_ids.push(hit._source.meta.id);
            };
        }

        that.db.bucket.get(doc_ids, null, function(errs, docs, metas) {
            var resultArray = [];

            for(var i in docs) {
                // May be undefined
                if(!docs[i]) {
                    continue;
                }

                docs[i].id = metas[i].id;

                resultArray.push(docs[i]);
            }

            var params = that.params[type];

            var html = that.renderObjectList(resultArray, params);

            res.render('layout', {title: 'Results for "' + term + '"', search: {type: type, term: term}, content: html});
        });
    });
}

ObjectController.prototype.getObject = function getObject(id, res) {
	this.db.bucket.get(id, function(err, doc, meta) {
		if (err) {
			res.render('layout', {title: 'Error', content: 'Object not found'});
			return;
		};

		var json = JSON.stringify(doc, undefined, 2);

		res.render('object_edit', {id: id, type: doc.type, data: json}, function(err2, html) {
			res.render('layout', {title: doc.type + ' ' + id, content: html});
		});
	});
}

ObjectController.prototype.updateObject = function updateObject(id, content, res) {
    try {
        var json = JSON.parse(content);
        this.db.bucket.replace(id, json, function(err, meta) {
            if (err) {
                res.send({success: false, error: err});
                return;
            };

            res.send({success: true});
        });
    } catch (e) {
        console.log('invalid json');

        res.send({success: false, error: 'Invalid JSON'});
    }



}

ObjectController.prototype.deleteObject = function deleteObject(id, res) {
	this.db.bucket.remove(id, function(err, meta) {
		if (err) {
			res.send({success: false, error: err});
			return;
		};

		res.send({success: true});
	});
}

exports.ObjectController = ObjectController;










// vb@mygassi.com
// writes "is_deleted" rather than "delete"s like it is for real
ObjectController.prototype.writeObjectIsDeleted = function writeObjectIsDeleted(req, res)
{
	ref = this;	
	id = req.params.id;
	this.db.bucket.get(id, function(err, result){
		if(err){
			console.logError(err);
		}
		if(result){
			doc = result;
			doc.is_deleted = true;
			ref.db.bucket.replace(id, doc, function(err, meta){
				if(err){
					console.log(err);
					res.send({success: false});
				}
				if(meta){
					res.send({success: true});
				}
			});
		}
	});
}

ObjectController.prototype.elasticSearchObjects = function searchObjects(req, res)
{
	ref = this;

	type = req.query.type;
	term = req.query.term;


	// todo ?? pageing ?? 
	page = req.query.page ? req.query.page : 0;
	skip = page *ref.pageSize;
	count = 0;
	next = parseInt(page) +1;
	prev = parseInt(page) -1;
	max = 1000;

	// there is no elasticsearch "buckets" so far 
	if("user" != type){
		// res.render('layout', {title: 'Error', content: 'No results for term "' +term +'".'})
		args = { key: type, startkey_docid: term, stale: false, limit: ref.pageSize, skip: skip};
		docs = [];
		ref.db.bucket.view("adminpanel", "documents_by_type_and_id", args, function(err, view){
			if(err){
				res.render('layout', {title: 'Error', content: 'Nothing found for term "' + term + '".'})
				return false;
			}
			if(view){
				if(view.length == 0){
					res.render('layout', {title: 'Error', content: 'No results for term "' +term +'".'})
					return false;
				}
				for(idx in view){
					doc = view[idx].value;
					doc.id = view[idx].id;
					docs.push(doc);
				}
				buff = ref.renderObjectList(docs, ref.params[type]);
				res.render('layout', {title: 'Results for ['+type+'] "' + term + '"', search: {type: type, term: term}, content: buff});
			}
		});
	}
	else{
		// to do remove ??filter chars in term 
		eterm = term;
		evils = "@-";
		good = " ";
		for(idx in evils){
			eterm = eterm.split(evils[idx]).join(good);
		}

		q = {"query":{"bool":{"must":[{"query_string":{"default_field":"_all","query":"*"+eterm+"*"}}],"must_not":[],"should":[]}},"from":0,"size":max,"sort":[],"facets":{}};
		q.index = "default";

		elasticalClient.search(q, function (err, results) {
			if(err){
				console.log(err);
			}
			if(results){
				count = results.hits.length;
				start = skip;
				stop = skip +ref.pageSize;
				if(stop > count){
					stop = count;
				}
				docs = [];
				for(index = start; index < stop; index++){
					hit = results.hits[index]._source;
					docs.push(hit.meta.id);
				};
				if(1 > docs.length){
					res.render('layout', {title: 'Nothing found for term: "' +term +'"', search: {type: type, term: term}});
				} 
				else {
					ref.db.bucket.view("adminpanel", "documents_by_ids", { keys: docs, stale: false }, function(err, view) {
						if(err){
							console.log(err);
						}
						if(view){
							docs = [];
							for(idx in view){
								doc = view[idx].value;
								// the "meta.id" gets stored for the "edit" (download the *real document)
								doc.id = view[idx].id;
								docs.push(doc);
							}
            						// 
							if(1 > docs.length){
								res.render('layout', {title: 'Nothing found for term: "' +term +'"', search: {type: type, term: term}});
							}
							else {
								html = ref.renderObjectList(docs, ref.params[type], type);
						
								// pageing	
								html += '<ul class="pager pull-right">';
								if (page > 1) {
									html += '<li><a href="/search?term=' +term +'&type='+type +'&page=' +prev  +'">Previous</a></li>';
								};
								if (count > skip + ref.pageSize) {
									html += '<li><a href="/search?term=' +term +'&type='+type +'&page=' +next  +'">Next</a></li>';
								};
								html += '</ul>';
							
								// 	
								res.render('layout', {title: 'Results for [User] "'+ term + '"', search: {type: type, term: term}, content: html});
							}
						}
					});
				}
			}
		});;
	}
};;

ObjectController.prototype.searchUserCreds = function searchUserCreds(req, res){
	userCredsCmd = new UserCredsCmd(req, this.db, res);
	userCredsCmd.execute();
	// userCredsCmd.execute(function(){ console.log(userCredsCmd.model); });
};

UserCredsCmd = function(req, storage, res)
{
	ref = this;
	
	ref.id = req.query.id;
	ref.term = req.query.term;
	ref.type = req.query.type;
	ref.storage = storage;
	ref.model = {};

	// whiley	
	ref.compute = function(index){
		ref.logMessage("UserCreds:compute(): " +index);
		switch(index){
			case "init":
				ref.fetch("adminpanel", "user", [ref.id]);
				break;
			case "user_fetched":
				ref.fetchFriends();
				break;
			case "friend_fetched":
				ref.fetch("adminpanel", "dog", [ref.id]);
				break;
			case "dog_fetched":
				ref.fetch("adminpanel", "route", [ref.id]);
				break;
			case "route_fetched":
				ref.fetch("adminpanel", "poi", [ref.id]);
				break;
			case "poi_fetched":
				ref.fetch("adminpanel", "photo", [ref.id]);
				break;
			case "photo_fetched":
				ref.fetch("adminpanel", "gassicall", [ref.id]);
				break;
			case "gassicall_fetched":
				ref.fetch("adminpanel", "notification", [ref.id]);
				break;
			case "notification_fetched":
				ref.done();
				break;
		}
	};;

	// renders the creds and the page	
	ref.render = function(){ 
		ref.logMessage("UserCreds:render(): " +ref.id);
		ref.logMessage(ref.model);
		res.render("creds", { model: ref.model }, function(err, buff){
			if(err){
				console.log(err);
			}
			if(buff){
				res.render("layout", {title: "Usercreds " +ref.id, search: {type: ref.type, term: ref.term}, content: buff});
			}
		});
		ref.logMessage("--°");
	};;

	// fetches view and then the docs	
	ref.fetchFriends = function(){
		ref.logMessage("UserCreds:fetchFriends(): " +ref.id);
		ref.storage.bucket.view("adminpanel", "documents_by_user_id", { key: [ref.id, "friendship"], stale: false }, function(err, view){
			if(err){ 
				ref.logError("loadFriends(): " +err); 
			}
			if(view){
				ids = [];
				for(index in view){
					ids.push(view[index].value);
				}
				ref.fetch("adminpanel", "friend", ids);
			}
		});
	};;

	// fetches views by bucket, key and ids
	ref.fetch = function(bucket, key, ids){
		ref.logMessage("UserCreds:fetch(): " +ref.id +": " +bucket +": " +key +": " +ids)
		view = "documents_by_user_id";
		args = { key: [ids[0], key], stale: false };
		switch(key){
			case "friend":
			case "user":
				// searches in the view "adminpanel": "documents_by_ids" with an array of ids as a key
				view = "documents_by_ids";
				args = { keys: ids, stale: false };
				break;
		}
		ref.storage.bucket.view(bucket, view, args, function(err, view){
			if(err){
				ref.logError("fetch(): " +ref.id +": "+key +": "+err); 
			}
			if(view){
				docs = [];
				for(idx in view){
					doc = view[idx].value;
					doc.id = view[idx].id;
					docs.push(doc);
				}
				ref.model[key] = docs;
				state = key +"_fetched";
				ref.compute(state);
			}
		});
	};;
	
	ref.logError = function(err){
		// console.log(err);
	};;
	
	ref.logMessage = function(message){
		// console.log(message);
	};;
	
	ref.done = function(){
		ref.logMessage("UserCreds:done(): " +ref.id);
		ref.render();
	};;
			
	ref.execute = function(done){
		ref.done = null == done ? ref.done : done;
		ref.compute("init");
	};;	
}

ObjectController.prototype.deleteCreds = function deleteCreds(req, res)
{
	type = req.params.type;
	switch(type){
		case "user":
			deleteUserCmd = new DeleteUserCmd(req, this.db, res);
			// deleteUserCmd.execute(function(){ console.log(deleteUserCmd.model) });
			deleteUserCmd.execute();
			break;
	}
}

DeleteUserCmd = function(req, storage, res)
{
	ref = this;
	
	ref.storage = storage;
	ref.id = req.params.id;
	ref.type = req.params.type;
	ref.model = {};

	ref.execute = function(done){
		ref.done = null == done ? ref.done : done;
		ref.compute("init");
	};;
	
	ref.compute = function(index){
		switch(index){
			case "init":
				ref.fetchAllDocumentsByUserId();
				break;
			
			case "ids_fetched":
				ref.compute("document_is_deleted");
				break;
			
			case "document_is_deleted":
				id = ref.model.ids.pop();
				if(null == id){
					ref.compute("all_documents_deleted");
					break;
				}	
				ref.fetch(id, "document_is_fetched");
				break;
			
			case "all_documents_deleted":
				ref.fetch(ref.id, "user_is_fetched");
				break;
			
			case "document_is_fetched":
				if(null == ref.model.fetchId){
					ref.compute("all_documents_deleted");
					break;
				}
				ref.writeDocumentIsDeleted();
				break;
			
			case "user_is_fetched":
				ref.writeUserIsDeleted();
				break;
			
			case "user_is_deleted":
				ref.done();
				break;
		}
	};;

	ref.done = function(){
		res.send({status: "success", "type": "done", code: "696", message: "User: " +ref.id +" is deleted."});
	}
		
	ref.writeUserIsDeleted = function()
	{
		doc = ref.model.current;
		doc.is_deleted = true;
		ref.storage.bucket.replace(ref.id, doc, function(err, meta){
			if(err){
				ref.logError(err);
			}
			if(meta){
				ref.logMessage(meta);
				ref.compute("user_is_deleted");
			}
		});
	};;
	
	ref.fetchAllDocumentsByUserId = function(){
		ref.logMessage("fetchAllDocumentsByUserId(): " +ref.id);
		ref.storage.bucket.view("adminpanel", "document_ids_by_user_id", { key: ref.id, stale: false }, function(err, view){
			if(err){
				ref.logError(err);
			}
			if(view){
				ref.model.ids = [];
				for(idx in view){
					ref.model.ids.push(view[idx].value);
				}
				ref.compute("ids_fetched");
			}
		});
	};;
	
	ref.fetch = function(id, ctrl){
		ref.logMessage("fetch(): " +id);
		ref.model.fetchId = id;
		/* does not work with couchlib > 2.07 */
		ref.storage.bucket.get(id, function(err, res){
			if(err){
				ref.logError(err);
			}
			if(res){
				ref.model.current = res;
				ref.compute(ctrl);
			}
		});
		/* does not fetch "route" with couchlib < 2.07
		ref.storage.bucket.view("adminpanel", "documents_by_ids", { keys: [id], stale: false }, function(err, view) {
			if (err) {
				ref.logError(err);
			};
			if(view){
				doc = view[0].value;
				doc.id = view[0].id;
				ref.model.current = doc;
				ref.compute(ctrl);
			}
		});
		*/
	};;
	
	ref.writeDocumentIsDeleted = function(){
		id = ref.model.fetchId;
		ref.logMessage("writeDocumentIsDeleted(): " +id);
		doc = ref.model.current;
		doc.is_deleted = true;
		/* does not work with couchlib > 2.0.7 either */
		ref.storage.bucket.replace(id, doc, function(err, meta){
			if(err){
				ref.logError(err);
			}
			if(meta){
				ref.logMessage(meta);
				ref.compute("document_is_deleted");
			}
		});
	};;
	
	ref.logMessage = function(message){
		// console.log(message);
	};;

	ref.logError = function(err){
		console.log(err);
	};;
}

// writes "is_deleted" rather than "delete"s like it is for real
ObjectController.prototype.writeObjectIsDeleted = function writeObjectIsDeleted(req, res)
{
	ref = this;	
	id = req.params.id;
	this.db.bucket.get(id, function(err, result){
		if(err){
			console.log(err);
		}
		if(result){
			doc = result;
			doc.is_deleted = true;
			ref.db.bucket.replace(id, doc, function(err, meta){
				if(err){
					console.log(err);
					res.send({success: false});
				}
				if(meta){
					res.send({success: true});
				}
			});
		}
	});
}

/*
 @overloads "renderObjectList"
	added a "link", removed the "delete" button 
 */
ObjectController.prototype.renderObjectList = function renderObjectList(objects, params, type)
{
	// render html manually because it is not possible in this way with mustache
	var html = '<table class="table table-striped"><thead><tr>';
	params.forEach(function(param) {
		html += '<th>' + param + '</th>';
	});
	html += '<th></th></thead>';
	objects.forEach(function(object) {
		html += '<tr id="object_' + object.id + '">';
		params.forEach(function(param) {
			var value = object[param] || '';
			if(param == 'pois') {
                		value = '';
                		for(var o in object[param]) {
                    			value += '<a href="/object/' + object[param][o] +'">' + object[param][o] +'</a>, ';
                		}
			}
			if(("id" == param) && ("user" == type) && (true != object.is_deleted)){
				html += '<td><a href="/creds?id='+value +'&type='+type+'">' +value +'</a></td>';
			}
			else if(("id" == param) && true == object.is_deleted){
				html += '<td>' +value +'&nbsp;<sub>[deleted]</sub></td>';
			}
			else{
				html += '<td>' +value +'</td>';
			}
		});

        	var add = '';
        	if(type == 'premium_user') {
            		add = '| <a href="/premium/show_create?email=' + object['email'] +'">Add POI</a>';
		}
		html += '<td><a class="object_list_edit_button" href="/object/' + object.id + '">Edit</a> ' + add + '</td>';
		html += '</tr>';
	});
	html += '</table>';
	return html;
}

/*
ObjectController.prototype.getObject = function getObject(id, res) {
	// "get" does not compute with libcouchbase > 2.07...
	// i downgraded to 2.07 (2.07 still fails with documents of type "route" sometimes
	// the latest libcouchbase computes (hence there is no bucket.get, bucket.replace...
	this.db.bucket.view("adminpanel", "documents_by_ids", { keys: [id], stale: false }, function(err, view) {
		if (err) {
			res.render('layout', {title: 'Error', content: 'Object not found'});
		};
		if(view){
			doc = view[0].value;
			json = JSON.stringify(doc, undefined, 2);
			res.render('object_edit', {id: id, type: doc.type, data: json}, function(err2, html) {
				res.render('layout', {title: doc.type + ' ' + id, content: html});
			});
		}
	});
}
*/

// vb@mygassi.com
