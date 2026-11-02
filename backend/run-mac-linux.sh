#!/usr/bin/env sh
cd "$(dirname "$0")"
# Mail settings are read from backend/application.properties (edit the password there).
mvn clean spring-boot:run
