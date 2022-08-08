import { CfnOutput } from "aws-cdk-lib";
import {
  CognitoUserPoolsAuthorizer,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import {
  UserPool,
  UserPoolClient,
  CfnUserPoolGroup,
  AccountRecovery,
  UserPoolEmail,
} from "aws-cdk-lib/aws-cognito";

import { Construct } from "constructs";
import { USER_POOL_NAME, SERVICE_NAME } from "../constant";
import { Policies } from "../database/policies";
import { IdentityPoolWrapper } from "./IdentityPoolWrapper";

export class AuthorizerWrapper {
  private scope: Construct;
  private api: RestApi;
  private policies: Policies;

  public userPool: UserPool;
  private userPoolClient: UserPoolClient;
  public authorizer: CognitoUserPoolsAuthorizer;
  private identityPoolWrapper: IdentityPoolWrapper;

  constructor(scope: Construct, api: RestApi, policies: Policies) {
    this.scope = scope;
    this.api = api;
    this.policies = policies;
    this.initialize();
  }

  private initialize() {
    this.createUserPool();
    this.addUserPoolClient();
    this.createAuthorizer();
    this.initializeIdentityPoolWrapper();
    this.createAdminsGroup();
  }

  private createUserPool() {
    this.userPool = new UserPool(this.scope, USER_POOL_NAME, {
      userPoolName: USER_POOL_NAME,
      selfSignUpEnabled: false,
      signInAliases: {
        username: true,
        email: true,
        phone: false,
      },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      //   email:UserPoolEmail.withCognito("")
    });
    new CfnOutput(this.scope, "UserPoolId", {
      value: this.userPool.userPoolId,
    });
  }

  private addUserPoolClient() {
    this.userPoolClient = this.userPool.addClient(`${USER_POOL_NAME}-client`, {
      userPoolClientName: `${USER_POOL_NAME}-client`,
      authFlows: {
        adminUserPassword: true,
        custom: true,
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
    });
    new CfnOutput(this.scope, "UserPoolClientId", {
      value: this.userPoolClient.userPoolClientId,
    });
  }

  public getUserPoolID() {
    return this.userPool.userPoolId;
  }

  private createAuthorizer() {
    this.authorizer = new CognitoUserPoolsAuthorizer(
      this.scope,
      `${SERVICE_NAME}UserAuthorizer`,
      {
        cognitoUserPools: [this.userPool],
        authorizerName: `${SERVICE_NAME}UserAuthorizer`,
        identitySource: "method.request.header.Authorization",
      }
    );
    this.authorizer._attachToApi(this.api);
  }

  private initializeIdentityPoolWrapper() {
    this.identityPoolWrapper = new IdentityPoolWrapper(
      this.scope,
      this.userPool,
      this.userPoolClient,
      this.policies
    );
  }

  private createAdminsGroup() {
    new CfnUserPoolGroup(this.scope, "admins", {
      groupName: "admins",
      userPoolId: this.userPool.userPoolId,
      roleArn: this.identityPoolWrapper.adminRole.roleArn,
    });
  }
}
