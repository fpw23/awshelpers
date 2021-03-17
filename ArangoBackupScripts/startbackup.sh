#!/bin/bash
tail -n 2000 runbackup.log > runbackup.log.tmp
mv -f runbackup.log.tmp runbackup.log
./runbackup.sh | gawk '{ print strftime("[%Y-%m-%d %H:%M:%S]"), $0 }' >> ./runbackup.log