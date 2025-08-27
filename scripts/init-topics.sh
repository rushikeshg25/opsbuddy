#!/bin/bash

echo "Creating Kafka topics..."
docker exec broker /opt/kafka/bin/kafka-topics.sh --create --topic logs --partitions 2 --replication-factor 1 --bootstrap-server localhost:9092 --if-not-exists
docker exec broker /opt/kafka/bin/kafka-topics.sh --create --topic notifications --partitions 2 --replication-factor 1 --bootstrap-server localhost:9092 --if-not-exists


echo "Topics created successfully!"
echo "Current topics:"
docker exec broker /opt/kafka/bin/kafka-topics.sh --list --bootstrap-server localhost:9092