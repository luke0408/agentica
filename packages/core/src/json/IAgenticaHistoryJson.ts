import type { tags } from "typia";

import type { AgenticaUserMessageContent } from "../histories";

import type { IAgenticaOperationJson } from "./IAgenticaOperationJson";
import type { IAgenticaOperationSelectionJson } from "./IAgenticaOperationSelectionJson";

/**
 * Agentic AI agent prompt.
 *
 * `IAgenticaHistoryJson` is an union type of all possible prompts that
 * can be generated by the AI chatbot of the {@link Agentica} class.
 *
 * In other words, `IAgenticaHistoryJson` is a type of chat history that
 * is occurred during the conversation between the user and the AI
 * chatbot in the {@link Agentica} class.
 *
 * If you want to continue the previous A.I. chatbot session, you can
 * accomplish it by assigning the {@link IAgenticaProps.histories}
 * property when creating a new {@link Agentica} instance.
 *
 * @author Samchon
 */
export type IAgenticaHistoryJson =
  | IAgenticaHistoryJson.ISelect
  | IAgenticaHistoryJson.ICancel
  | IAgenticaHistoryJson.IExecute
  | IAgenticaHistoryJson.IDescribe
  | IAgenticaHistoryJson.IAssistantMessage
  | IAgenticaHistoryJson.ISystemMessage
  | IAgenticaHistoryJson.IUserMessage;
export namespace IAgenticaHistoryJson {
  export type Type = IAgenticaHistoryJson["type"];
  export interface Mapper {
    select: ISelect;
    cancel: ICancel;
    execute: IExecute;
    describe: IDescribe;
    assistantMessage: IAssistantMessage;
    systemMessage: ISystemMessage;
    userMessage: IUserMessage;
  }

  /**
   * User message.
   *
   * User message about the user's input.
   */
  export interface IUserMessage extends IBase<"userMessage"> {
    /**
     * User input.
     */
    contents: Array<AgenticaUserMessageContent>;
  }

  /**
   * System message.
   */
  export interface ISystemMessage extends IBase<"systemMessage"> {
    /**
     * The text content.
     */
    text: string;
  }

  /**
   * Assistant message.
   */
  export interface IAssistantMessage extends IBase<"assistantMessage"> {
    /**
     * The text content.
     */
    text: string;
  }

  /**
   * Select prompt.
   *
   * Selection prompt about candidate functions to call.
   */
  export interface ISelect extends IBase<"select"> {
    /**
     * Operations that have been selected.
     */
    selection: IAgenticaOperationSelectionJson;
  }

  /**
   * Cancel prompt.
   *
   * Cancellation prompt about the candidate functions to be discarded.
   */
  export interface ICancel extends IBase<"cancel"> {
    /**
     * Operations that have been cancelled.
     */
    selection: IAgenticaOperationSelectionJson;
  }

  /**
   * Execute prompt.
   *
   * Execution prompt about the LLM function calling.
   */
  export interface IExecute extends IBase<"execute"> {
    /**
     * Target operation to call.
     */
    operation: IAgenticaOperationJson;

    /**
     * Arguments of the LLM function calling.
     */
    arguments: Record<string, any>;

    /**
     * Return value.
     */
    value: unknown;
  }

  /**
   * Description prompt.
   *
   * Description prompt about the return value of the LLM function calling.
   */
  export interface IDescribe extends IBase<"describe"> {
    /**
     * Executions of the LLM function calling.
     *
     * This prompt describes the return value of them.
     */
    executes: IExecute[];

    /**
     * Description text.
     */
    text: string;
  }

  interface IBase<Type extends string> {
    /**
     * Primary key of the history.
     */
    id: string;

    /**
     * Discriminator type.
     */
    type: Type;

    /**
     * Creation timestamp of the history.
     */
    created_at: string & tags.Format<"date-time">;
  }
}
