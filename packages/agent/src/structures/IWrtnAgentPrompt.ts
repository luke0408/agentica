import { IHttpLlmFunction, IHttpResponse } from "@samchon/openapi";
import { ILlmFunctionOfValidate } from "typia";

import { IWrtnAgentController } from "./IWrtnAgentController";
import { IWrtnAgentOperationSelection } from "./IWrtnAgentOperationSelection";

/**
 * Nestia A.I. chatbot prompt.
 *
 * `IWrtnChatPrompt` is an union type of all possible prompts that can
 * be generated by the A.I. chatbot of the {@link WrtnChatAgent} class.
 *
 * In other words, `IWrtnChatPrompt` is a type of chat history that
 * is occurred during the conversation between the user and the A.I. chatbot
 * in the {@link WrtnChatAgent} class.
 *
 * If you want to continue the previous A.I. chatbot session, you can
 * accomplish it by assigning the {@link IWrtnAgentProps.histories}
 * property when creating a new {@link WrtnAgent} instance.
 *
 * @author Samchon
 */
export type IWrtnAgentPrompt =
  | IWrtnAgentPrompt.IText
  | IWrtnAgentPrompt.ISelect
  | IWrtnAgentPrompt.ICancel
  | IWrtnAgentPrompt.IExecute
  | IWrtnAgentPrompt.IDescribe;
export namespace IWrtnAgentPrompt {
  /**
   * Select prompt.
   *
   * Selection prompt about candidate functions to call.
   */
  export interface ISelect extends IBase<"select"> {
    /**
     * ID of the LLM tool call result.
     */
    id: string;

    /**
     * Operations that have been selected.
     */
    operations: IWrtnAgentOperationSelection[];
  }

  /**
   * Cancel prompt.
   *
   * Cancellation prompt about the candidate functions to be discarded.
   */
  export interface ICancel extends IBase<"cancel"> {
    /**
     * ID of the LLM tool call result.
     */
    id: string;

    /**
     * Operations that have been cancelled.
     */
    operations: IWrtnAgentOperationSelection[];
  }

  /**
   * Execute prompt.
   *
   * Execution prompt about the LLM function calling.
   */
  export type IExecute = IExecute.IHttp | IExecute.IClass;
  export namespace IExecute {
    export type IHttp = IBase<
      "http",
      IWrtnAgentController.IHttp,
      IHttpLlmFunction<"chatgpt">,
      IHttpResponse
    >;
    export type IClass = IBase<
      "class",
      IWrtnAgentController.IClass,
      ILlmFunctionOfValidate<"chatgpt">,
      any
    >;
    interface IBase<Protocol, Controller, Function, Value> {
      /**
       * Discriminator type.
       */
      type: "execute";

      /**
       * Protocol discriminator.
       */
      protocol: Protocol;

      /**
       * Belonged controller of the target function.
       */
      controller: Controller;

      /**
       * Target function to call.
       */
      function: Function;

      /**
       * ID of the LLM tool call result.
       */
      id: string;

      /**
       * Identifier name of the function.
       *
       * If {@link WrtnAgent} has multiple {@link IWrtnAgentController}s,
       * the `name` can be different from target function's name.
       */
      name: string;

      /**
       * Arguments of the LLM function calling.
       */
      arguments: object;

      /**
       * Return value.
       */
      value: Value;

      toJSON(): Omit<IBase<Protocol, string, string, Value>, "toJSON">;
    }
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
    executions: IExecute[];

    /**
     * Description text.
     */
    text: string;
  }

  /**
   * Text prompt.
   */
  export interface IText<
    Role extends "assistant" | "user" = "assistant" | "user",
  > extends IBase<"text"> {
    /**
     * Role of the orator.
     */
    role: Role;

    /**
     * The text content.
     */
    text: string;
  }

  interface IBase<Type extends string> {
    /**
     * Discriminator type.
     */
    type: Type;
  }
}
