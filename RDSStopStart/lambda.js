const { RDSClient, StopDBInstanceCommand, StartDBInstanceCommand } = require("@aws-sdk/client-rds");
const qs = require('querystring')

const client = new RDSClient({ region: process.env.AWS_REGION || 'us-east-2' });

exports.handler = async function (event, context) {
    if (event.Action === "start") {
        await StartInstance(event, context)
    } else if (event.Action === "stop") {
        await StopInstance(event, context)
    } else {
        context.fail(`Invalid Action Requested: ${event.Action}`)
    }
};

async function StartInstance (event, context) {
    try {
        await client.send(new StartDBInstanceCommand({
            DBInstanceIdentifier: event.DBInstanceIdentifier
        }));
        context.succeed()
    } catch (error) {
        context.fail(error)
    }
}

async function StopInstance (event, context) {
    try {
        await client.send(new StopDBInstanceCommand({
            DBInstanceIdentifier: event.DBInstanceIdentifier
        }));
        context.succeed()
    } catch (error) {
        context.fail(error)
    }
}
