curl -XPUT 'localhost:9200/test/default/_meta' -d '{
	"type" : "couchdb",
	"couchdb" : {
		"host" : "127.0.0.1",
		"port" : 8092,
		"db" : "default",
		"heartbeat": "5s",
		"read_timeout": "15s",
		"filter" : "testfilter",
		"filter_params" : {
			"param1" : "value1",
			"param2" : "value2"
		}
	},
	"index" : {
		"index" : "testindex",
		"type" : "default",
		"bulk_size" : "100",
		"bulk_timeout" : "10ms"
	}
}'

