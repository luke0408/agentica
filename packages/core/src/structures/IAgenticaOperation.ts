import { IHttpLlmFunction, ILlmSchema } from "@samchon/openapi";
import { ILlmFunctionOfValidate } from "typia";

import { IAgenticaController } from "./IAgenticaController";

/**
 * Operation information in the Nestia Agent.
 *
 * `IAgenticaOperation` is a type represents an operation that would
 * be selected by the A.I. chatbot of {@link Agentica} class to
 * perform the LLM (Large Language Model) function calling.
 *
 * Also, it is an union type that is discriminated by the {@link protocol}
 * property. If the protocol value is `http`, it means that the HTTP API
 * operation would be called by the A.I. chatbot. Otherwise, if the protocol
 * value is `class`, it means that the operation has come from a
 * TypeScript class.
 *
 * @author Samchon
 */
export type IAgenticaOperation<Model extends ILlmSchema.Model> =
  | IAgenticaOperation.IHttp<Model>
  | IAgenticaOperation.IClass<Model>;
export namespace IAgenticaOperation {
  /**
   * HTTP API operation.
   */
  export type IHttp<Model extends ILlmSchema.Model> = IBase<
    "http",
    IAgenticaController.IHttp<Model>,
    IHttpLlmFunction<Model>
  >;

  /**
   * TypeScript class operation.
   */
  export type IClass<Model extends ILlmSchema.Model> = IBase<
    "class",
    IAgenticaController.IClass<Model>,
    ILlmFunctionOfValidate<Model>
  >;

  interface IBase<Protocol, Application, Function> {
    /**
     * Protocol discriminator.
     */
    protocol: Protocol;

    /**
     * Belonged controller of the target function.
     */
    controller: Application;

    /**
     * Target function to call.
     */
    function: Function;

    /**
     * Identifier name.
     */
    name: string;
  }
}
