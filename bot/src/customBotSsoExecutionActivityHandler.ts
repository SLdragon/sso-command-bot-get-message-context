// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  BotState,
  ConversationState,
  MemoryStorage,
  SigninStateVerificationQuery,
  StatePropertyAccessor,
  TeamsActivityHandler,
  TurnContext,
  UserState,
} from "botbuilder";
import {
  BotSsoConfig, 
  TeamsFx,
  BotSsoExecutionActivityHandler, 
  TeamsBotSsoPromptSettings,
  BotSsoExecutionDialogHandler, 
  IdentityType,
  TriggerPatterns, 
  BotSsoExecutionDialog
} from "@microsoft/teamsfx";
import { originalMessageContextAccessor } from "./internal/initialize";
;

/**
 * Default SSO execution activity handler
 */
export class CustomBotSsoExecutionActivityHandler
  extends TeamsActivityHandler
  implements BotSsoExecutionActivityHandler
{
  private ssoExecutionDialog: BotSsoExecutionDialog;
  private userState: BotState;
  private conversationState: BotState;
  private dialogState: StatePropertyAccessor;

  /**
   * Creates a new instance of the DefaultBotSsoExecutionActivityHandler.
   * @param ssoConfig configuration for SSO command bot
   *
   * @remarks
   * In the constructor, it uses BotSsoConfig parameter which from {@link ConversationBot} options to initialize {@link BotSsoExecutionDialog}.
   * It also need to register an event handler for the message event which trigger {@link BotSsoExecutionDialog} instance.
   */
  constructor(ssoConfig: BotSsoConfig) {
    super();
    const memoryStorage = new MemoryStorage();
    const userState = ssoConfig.dialog?.userState ?? new UserState(memoryStorage);
    const conversationState =
      ssoConfig.dialog?.conversationState ?? new ConversationState(memoryStorage);
    const dedupStorage = ssoConfig.dialog?.dedupStorage ?? memoryStorage;

    const { scopes, ...customConfig } = ssoConfig.aad;
    const settings: TeamsBotSsoPromptSettings = {
      scopes: scopes,
      timeout: ssoConfig.dialog?.ssoPromptConfig?.timeout,
      endOnInvalidMessage: ssoConfig.dialog?.ssoPromptConfig?.endOnInvalidMessage,
    };

    const teamsfx = new TeamsFx(IdentityType.User, { ...customConfig });

    this.ssoExecutionDialog = new BotSsoExecutionDialog(dedupStorage, settings, teamsfx);
    this.conversationState = conversationState;
    this.dialogState = conversationState.createProperty("DialogState");
    this.userState = userState;

    this.onMessage(async (context, next) => {
      await this.ssoExecutionDialog.run(context, this.dialogState);
      await next();
    });
  }

  /**
   * Add TeamsFxBotSsoCommandHandler instance to SSO execution dialog
   * @param handler {@link BotSsoExecutionDialogHandler} callback function
   * @param triggerPatterns The trigger pattern
   *
   * @remarks
   * This function is used to add SSO command to {@link BotSsoExecutionDialog} instance.
   */
  addCommand(handler: BotSsoExecutionDialogHandler, triggerPatterns: TriggerPatterns): void {
    this.ssoExecutionDialog.addCommand(handler, triggerPatterns);
  }

  /**
   * Called to initiate the event emission process.
   * @param context The context object for the current turn.
   */
  async run(context: TurnContext) {
    try {
      if (context.activity.type === "message") {
        originalMessageContextAccessor.set(context, context);
      }
      await super.run(context);
    } finally {
      await this.conversationState.saveChanges(context, false);
      await this.userState.saveChanges(context, false);
    }
  }

  /**
   * Receives invoke activities with Activity name of 'signin/verifyState'.
   * @param context A context object for this turn.
   * @param query Signin state (part of signin action auth flow) verification invoke query.
   * @returns A promise that represents the work queued.
   *
   * @remarks
   * It should trigger {@link BotSsoExecutionDialog} instance to handle signin process
   */
  async handleTeamsSigninVerifyState(context: TurnContext, query: SigninStateVerificationQuery) {
    await this.ssoExecutionDialog.run(context, this.dialogState);
  }

  /**
   * Receives invoke activities with Activity name of 'signin/tokenExchange'
   * @param context A context object for this turn.
   * @param query Signin state (part of signin action auth flow) verification invoke query
   * @returns A promise that represents the work queued.
   *
   * @remark
   * It should trigger {@link BotSsoExecutionDialog} instance to handle signin process
   */
  async handleTeamsSigninTokenExchange(context: TurnContext, query: SigninStateVerificationQuery) {
    await this.ssoExecutionDialog.run(context, this.dialogState);
  }
}
