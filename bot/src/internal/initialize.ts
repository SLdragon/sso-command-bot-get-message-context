import { BotBuilderCloudAdapter } from "@microsoft/teamsfx";
import ConversationBot = BotBuilderCloudAdapter.ConversationBot;

import { HelloWorldCommandHandler } from "../helloworldCommandHandler";
import { ProfileSsoCommandHandler } from "../profileSsoCommandHandler";
import { PhotoSsoCommandHandler } from "../photoSsoCommandHandler";
import { CustomBotSsoExecutionActivityHandler } from "../customBotSsoExecutionActivityHandler";
import { MemoryStorage, UserState } from "botbuilder";

// Create the command bot and register the command handlers for your app.
// You can also use the commandBot.command.registerCommands to register other commands
// if you don't want to register all of them in the constructor
const userState = new UserState(new MemoryStorage());
export const originalMessageContextAccessor = userState.createProperty("originalContext");

export const commandBot = new ConversationBot({
  // The bot id and password to create CloudAdapter.
  // See https://aka.ms/about-bot-adapter to learn more about adapters.
  adapterConfig: {
    MicrosoftAppId: process.env.BOT_ID,
    MicrosoftAppPassword: process.env.BOT_PASSWORD,
    MicrosoftAppType: "MultiTenant",
  },

  // See https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-sdk to learn more about ssoConfig
  ssoConfig: {
    aad :{
      scopes:["User.Read"],
    },
    dialog: {
      CustomBotSsoExecutionActivityHandler: CustomBotSsoExecutionActivityHandler,
      userState: userState
    }
  },
  command: {
    enabled: true,
    commands: [new HelloWorldCommandHandler() ],
    ssoCommands: [new ProfileSsoCommandHandler(), new PhotoSsoCommandHandler()],
  },
});
