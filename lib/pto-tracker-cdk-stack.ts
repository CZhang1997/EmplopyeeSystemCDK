import {
  Stack,
  StackProps,
  aws_s3 as s3,
  aws_lambda as lambda,
  aws_apigateway as apigw,
  aws_dynamodb as dynamodb,
  aws_iam as iam,
  Fn,
  CfnOutput,
} from "aws-cdk-lib";
import { RestApi } from "aws-cdk-lib/aws-apigateway";
import { Bucket, HttpMethods } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { AuthorizerWrapper } from "./auth/AuthorizerWrapper";
import { TABLE_NAME } from "./constant";
import { GenericTable } from "./database/generic-table";
import { Policies } from "./database/policies";
import { WebAppDeployment } from "./webapp/WebAppDeployment";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class PtoTrackerCdkStack extends Stack {
  private api = new RestApi(this, "PTOAPI");
  private authorizer: AuthorizerWrapper;
  private suffix: string;
  private profilePhotosBucket: Bucket;
  private policies: Policies;

  private dbTable: GenericTable;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.initializeSuffix();
    this.initializeProfilePhotosBucket();

    this.policies = new Policies(this.profilePhotosBucket);
    this.authorizer = new AuthorizerWrapper(this, this.api, this.policies);
    // new WebAppDeployment(this, this.suffix);
    const optionsWithAuthorizer: apigw.MethodOptions = {
      authorizationType: apigw.AuthorizationType.COGNITO,
      authorizer: {
        authorizerId: this.authorizer.authorizer.authorizerId,
      },
    };

    const optionsWithCors: apigw.ResourceOptions = {
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
      },
    };

    this.dbTable = new GenericTable(this, {
      tableName: TABLE_NAME,
      primaryKey: "PK",
      sortkey: "SK",
      createLambdaPath: "create-user",
      UserPoolId: this.authorizer.getUserPoolID(),
      // readLambdaPath: "search-record",
      // updateLambdaPath: "Update",
      // deleteLambdaPath: "Delete",
      // secondaryIndexes: ["location"],
    });

    this.authorizer.userPool.grant(
      this.dbTable.createLambda!,
      "cognito-idp:AdminAddUserToGroup",
      "cognito-idp:AdminCreateUser",
      "cognito-idp:AdminSetUserPassword"
    );

    const clientsResources = this.api.root.addResource(
      "pto-service",
      optionsWithCors
    );
    clientsResources.addMethod(
      "POST",
      this.dbTable.createLambdaIntegration,
      optionsWithAuthorizer
    );
    // clientsResources.addMethod(
    //   "GET",
    //   this.dbTable.readLambdaIntegration,
    //   optionsWithAuthorizer
    // );
  }

  private initializeSuffix() {
    const shortStackId = Fn.select(2, Fn.split("/", this.stackId));
    const Suffix = Fn.select(4, Fn.split("-", shortStackId));
    this.suffix = Suffix;
  }

  private initializeProfilePhotosBucket() {
    this.profilePhotosBucket = new Bucket(this, "profile-photos", {
      bucketName: "profile-photos-" + this.suffix,
      cors: [
        {
          allowedMethods: [HttpMethods.HEAD, HttpMethods.GET, HttpMethods.PUT],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
    });
    new CfnOutput(this, "profile-photos-bucket-name", {
      value: this.profilePhotosBucket.bucketName,
    });
  }
}
