#!/bin/bash
echo "Creating Backup Set"
runDate=$(date +%Y%m%d%H%M%S)
arangodump --output-directory ./sets/$runDate --server.database {DBNAME} --server.password {BDPASSWORD}
echo "Compressing Backup Set"
zip -q -r ./sets/$runDate.zip ./sets/$runDate
echo "Cleaning Up Temp Backup Set Data"
rm -r ./sets/$runDate
echo "Prune Backup Set Folder"
# Keep only the last 10 days of backups
find ./sets -name '*.zip' -mtime +10 | xargs rm -f
echo "Syncing Backup Sets to S3"
aws s3 sync ./sets s3://{S3BUCKETNAME} --delete --quiet
echo "Backup Complete"