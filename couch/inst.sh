curl -X PUT -H 'Content-Type: application/json' http://viktor:Kn3#80r9@localhost:9200/_template/couchbase -d ' 
{
	"template": "*",
	"order": 10,
	"settings": {
		"number_of_shards": 1
	},
	"mappings": {
		"default": {
			"_source": {
				"includes": ["meta"]
			},	
			"properties": {
				"meta": {
					"type": "object",
					"include_in_all": false 
				}
			}
		}
	}
}'
