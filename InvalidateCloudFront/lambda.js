const { CloudFrontClient, CreateInvalidationCommand  } = require("@aws-sdk/client-cloudfront");
const { CodePipelineClient, PutJobFailureResultCommand, PutJobSuccessResultCommand  } = require("@aws-sdk/client-codepipeline");

const cfclient = new CloudFrontClient({ region: process.env.AWS_REGION || 'us-east-2' });
const cpclient = new CodePipelineClient({ region: process.env.AWS_REGION || 'us-east-2' })

const moment = require('moment')

exports.handler = async function (event, context) {
    if (event["CodePipeline.job"]) {
        await PipelineSource(event, context)
    } else {
        await BasicSource(event, context)
    } 
};

async function BasicSource (event, context) {
    try {
        await cfclient.send(new CreateInvalidationCommand({
            ...event,
            InvalidationBatch: {
                Paths: {
                  Quantity: 1,
                  Items: ['/*']
                },
                CallerReference: moment().toISOString()
              }
        }));
        context.succeed()
    } catch (error) {
        console.log(error)
        context.fail()
    }
}

async function PipelineSource (event, context) {
    try {
        // Retrieve the Job ID from the Lambda action
        var jobId = event["CodePipeline.job"].id;
        
        // Retrieve the value of UserParameters from the Lambda action configuration in AWS CodePipeline, in this case a URL which will be
        // health checked by this function.
        var distributionId = event["CodePipeline.job"].data.actionConfiguration.configuration.UserParameters; 

        await cfclient.send(new CreateInvalidationCommand({
            DistributionId: distributionId,
            InvalidationBatch: {
                Paths: {
                  Quantity: 1,
                  Items: ['/*']
                },
                CallerReference: moment().toISOString()
              }
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