const { LambdaClient, UpdateFunctionCodeCommand } = require("@aws-sdk/client-lambda");
const { CodePipelineClient, PutJobFailureResultCommand, PutJobSuccessResultCommand  } = require("@aws-sdk/client-codepipeline");
const qs = require('querystring')

const lcclient = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-2' });
const cpclient = new CodePipelineClient({ region: process.env.AWS_REGION || 'us-east-2' })

exports.handler = async function (event, context) {
    if (event["CodePipeline.job"]) {
        await PipelineSource(event, context)
    } else {
        await BasicSource(event, context)
    } 
};

async function BasicSource (event, context) {
    try {
        await lcclient.send(new UpdateFunctionCodeCommand({
            DryRun: event.DryRun,
            FunctionName: event.FunctionName,
            ImageUri: event.ImageUri
        }));
        context.succeed()
    } catch (error) {
        context.fail(error)
    }
}

async function PipelineSource (event, context) {
    try {
        // Retrieve the Job ID from the Lambda action
        var jobId = event["CodePipeline.job"].id;
        
        // Retrieve the value of UserParameters from the Lambda action configuration in AWS CodePipeline, in this case a URL which will be
        // health checked by this function.
        var jobParams = qs.parse(event["CodePipeline.job"].data.actionConfiguration.configuration.UserParameters); 

        await lcclient.send(new UpdateFunctionCodeCommand({
            DryRun: jobParams.DryRun,
            FunctionName: jobParams.FunctionName,
            ImageUri: jobParams.ImageUri
        }));

        //it's good, try to update the pipeline with success
        await cpclient.send(new PutJobSuccessResultCommand({
            jobId: jobId
        }))

        //let lambda know we are good
        context.succeed()
    } catch (error) {
        await (cpclient.send(new PutJobFailureResultCommand({
            jobId: jobId,
            failureDetails: {
                message: JSON.stringify(error.message),
                type: 'JobFailed',
                externalExecutionId: context.awsRequestId
            }
        })))
        context.fail(error)
    }
}