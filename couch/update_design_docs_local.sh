#!/bin/bash

curl -X PUT -H 'Content-Type: application/json' http://viktor:Kn3#80r9@localhost:8092/default/_design/user -d @designdocs/user.json
curl -X PUT -H 'Content-Type: application/json' http://viktor:Kn3#80r9@localhost:8092/default/_design/poi -d @designdocs/poi.json
curl -X PUT -H 'Content-Type: application/json' http://viktor:Kn3#80r9@localhost:8092/default/_design/dog -d @designdocs/dog.json
curl -X PUT -H 'Content-Type: application/json' http://viktor:Kn3#80r9@localhost:8092/default/_design/meetingpoint -d @designdocs/meetingpoint.json
curl -X PUT -H 'Content-Type: application/json' http://viktor:Kn3#80r9@localhost:8092/default/_design/offer -d @designdocs/offer.json
curl -X PUT -H 'Content-Type: application/json' http://viktor:Kn3#80r9@localhost:8092/default/_design/photo -d @designdocs/photo.json
curl -X PUT -H 'Content-Type: application/json' http://viktor:Kn3#80r9@localhost:8092/default/_design/gassicall -d @designdocs/gassicalls.json
curl -X PUT -H 'Content-Type: application/json' http://viktor:Kn3#80r9@localhost:8092/default/_design/admin -d @designdocs/admin.json
curl -X PUT -H 'Content-Type: application/json' http://viktor:Kn3#80r9@localhost:8092/default/_design/objects -d @designdocs/objects.json

curl -X PUT -H 'Content-Type: application/json' http://viktor:Kn3#80r9@localhost:8092/default/_design/adminpanel -d @designdocs/design.admin.4.json
