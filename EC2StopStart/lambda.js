const { EC2Client, StartInstancesCommand, StopInstancesCommand, DescribeInstanceStatusCommand } = require("@aws-sdk/client-ec2");

const client = new EC2Client({ region: process.env.AWS_REGION || 'us-east-2' });

exports.handler = async function (event, context) {
    if (event.Action === "start") {
        await StartInstances(event, context)
    } else if (event.Action === "stop") {
        await StopInstances(event, context)
    } else if (event.Action === "check" ) {
        await CheckInstances(event, context)
    } else {
        context.fail(`Invalid Action Requested: ${event.Action}`)
    }
};

async function StartInstances (event, context) {
    try {
        await client.send(new StartInstancesCommand({
            DryRun: event.DryRun,
            InstanceIds: event.InstanceIds
        }));
        context.succeed()
    } catch (error) {
        context.fail(error)
    }
}

async function StopInstances (event, context) {
    try {
        await client.send(new StopInstancesCommand({
            DryRun: event.DryRun,
            InstanceIds: event.InstanceIds
        }));
        context.succeed()
    } catch (error) {
        context.fail(error)
    }
}

async function CheckInstances (event, context) {
    try {
        const results = await client.send(new DescribeInstanceStatusCommand({
            DryRun: event.DryRun,
            InstanceIds: event.InstanceIds,
            IncludeAllInstances: true
        }));
        context.succeed(results)
    } catch (error) {
        context.fail(error)
    }
}
