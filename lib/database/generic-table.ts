import {
  Stack,
  StackProps,
  aws_s3 as s3,
  aws_lambda as lambda,
  aws_apigateway as apigw,
  aws_dynamodb as dynamodb,
  aws_iam as iam,
  aws_lambda_nodejs,
} from "aws-cdk-lib";
import { join } from "path";

export interface TableProps {
  tableName: string;
  primaryKey: string;
  sortkey: string;
  UserPoolId?: string;
  createLambdaPath?: string;
  readLambdaPath?: string;
  updateLambdaPath?: string;
  deleteLambdaPath?: string;
  secondaryIndexes?: string[];
}

export class GenericTable {
  private stack: Stack;
  private table: dynamodb.Table;
  private props: TableProps;

  public createLambda: aws_lambda_nodejs.NodejsFunction | undefined;
  private readLambda: aws_lambda_nodejs.NodejsFunction | undefined;
  private updateLambda: aws_lambda_nodejs.NodejsFunction | undefined;
  private deleteLambda: aws_lambda_nodejs.NodejsFunction | undefined;

  public createLambdaIntegration: apigw.LambdaIntegration;
  public readLambdaIntegration: apigw.LambdaIntegration;
  public updateLambdaIntegration: apigw.LambdaIntegration;
  public deleteLambdaIntegration: apigw.LambdaIntegration;

  public constructor(stack: Stack, props: TableProps) {
    this.stack = stack;
    this.props = props;
    this.initialize();
  }

  private initialize() {
    this.createTable();
    this.addSecondaryIndexes();
    this.createLambdas();
    this.grantTableRights();
  }
  private createTable() {
    this.table = new dynamodb.Table(this.stack, this.props.tableName, {
      partitionKey: {
        name: this.props.primaryKey,
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: this.props.sortkey,
        type: dynamodb.AttributeType.STRING,
      },
      tableName: this.props.tableName,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });
  }
  private addSecondaryIndexes() {
    if (this.props.secondaryIndexes) {
      for (const secondaryIndex of this.props.secondaryIndexes) {
        this.table.addGlobalSecondaryIndex({
          indexName: secondaryIndex,
          partitionKey: {
            name: secondaryIndex,
            type: dynamodb.AttributeType.STRING,
          },
        });
      }
    }
  }
  private createLambdas() {
    if (this.props.createLambdaPath) {
      this.createLambda = this.createSingleLambda(this.props.createLambdaPath);
      this.createLambdaIntegration = new apigw.LambdaIntegration(
        this.createLambda!
      );
    }
    if (this.props.readLambdaPath) {
      this.readLambda = this.createSingleLambda(this.props.readLambdaPath);
      this.readLambdaIntegration = new apigw.LambdaIntegration(this.readLambda);
    }
    // if (this.props.updateLambdaPath) {
    //   this.updateLambda = this.createSingleLambda(this.props.updateLambdaPath);
    //   this.updateLambdaIntegration = new apigw.LambdaIntegration(this.updateLambda);
    // }
    // if (this.props.deleteLambdaPath) {
    //   this.deleteLambda = this.createSingleLambda(this.props.deleteLambdaPath);
    //   this.deleteLambdaIntegration = new apigw.LambdaIntegration(this.deleteLambda);
    // }
  }

  private grantTableRights() {
    if (this.createLambda) {
      this.table.grantWriteData(this.createLambda);
    }
    if (this.readLambda) {
      this.table.grantReadData(this.readLambda);
    }
    // if (this.updateLambda) {
    //   this.table.grantWriteData(this.updateLambda);
    // }
    // if (this.deleteLambda) {
    //   this.table.grantWriteData(this.deleteLambda);
    // }
  }

  private createSingleLambda(
    lambdaName: string
  ): aws_lambda_nodejs.NodejsFunction {
    const lambdaId = `${this.props.tableName}-${lambdaName}`;
    return new aws_lambda_nodejs.NodejsFunction(this.stack, lambdaId, {
      entry: join(__dirname, "../..", "lambda", `${lambdaName}.ts`),
      handler: "handler",
      functionName: lambdaId,
      environment: {
        TABLE_NAME: this.props.tableName,
        PRIMARY_KEY: this.props.primaryKey,
        UserPoolId: this.props.UserPoolId!,
      },
    });
  }
}
