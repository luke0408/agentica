import { Agentica, AgenticaTokenUsage } from "@agentica/core";
import { ILlmSchema } from "@samchon/openapi";
import { Semaphore } from "tstl";
import { tags } from "typia";

import { AgenticaBenchmarkPredicator } from "./internal/AgenticaBenchmarkPredicator";
import { AgenticaCallBenchmarkReporter } from "./internal/AgenticaCallBenchmarkReporter";
import { IAgenticaCallBenchmarkEvent } from "./structures/IAgenticaCallBenchmarkEvent";
import { IAgenticaCallBenchmarkResult } from "./structures/IAgenticaCallBenchmarkResult";
import { IAgenticaCallBenchmarkScenario } from "./structures/IAgenticaCallBenchmarkScenario";

/**
 * LLM function calling selection benchmark.
 *
 * `AgenticaCallBenchmark` is a class for the benchmark of the
 * LLM (Large Model Language) function calling part. It utilizes both
 * `selector` and `caller` agents and tests whether the expected
 * {@link IAgenticaOperation operations} are properly selected and
 * called from the given
 * {@link IAgenticaCallBenchmarkScenario scenarios}.
 *
 * Note that, this `AgenticaCallBenchmark` consumes a lot of time and
 * LLM token costs because it needs the whole process of the
 * {@link Agentica} class with a lot of repetitions. If you don't want
 * such a heavy benchmark, consider to using
 * {@link AgenticaSelectBenchmark} instead. In my experience,
 * {@link Agentica} does not fail to function calling, so the function
 * selection benchmark is much economical.
 *
 * @author Samchon
 */
export class AgenticaCallBenchmark<Model extends ILlmSchema.Model> {
  private agent_: Agentica<Model>;
  private scenarios_: IAgenticaCallBenchmarkScenario<Model>[];
  private config_: AgenticaCallBenchmark.IConfig;
  private result_: IAgenticaCallBenchmarkResult<Model> | null;

  /**
   * Initializer Constructor.
   *
   * @param props Properties of the selection benchmark
   */
  public constructor(props: AgenticaCallBenchmark.IProps<Model>) {
    this.agent_ = props.agent;
    this.scenarios_ = props.scenarios.slice();
    this.config_ = {
      repeat: props.config?.repeat ?? 10,
      simultaneous: props.config?.simultaneous ?? 10,
      consent: props.config?.consent ?? 3,
    };
    this.result_ = null;
  }

  /**
   * Execute the benchmark.
   *
   * Execute the benchmark of the LLM function calling, and returns
   * the result of the benchmark.
   *
   * If you wanna see progress of the benchmark, you can pass a callback
   * function as the argument of the `listener`. The callback function
   * would be called whenever a benchmark event is occurred.
   *
   * Also, you can publish a markdown format report by calling
   * the {@link report} function after the benchmark execution.
   *
   * @param listener Callback function listening the benchmark events
   * @returns Results of the function calling benchmark
   */
  public async execute(
    listener?: (event: IAgenticaCallBenchmarkEvent<Model>) => void,
  ): Promise<IAgenticaCallBenchmarkResult<Model>> {
    const started_at: Date = new Date();
    const semaphore: Semaphore = new Semaphore(this.config_.simultaneous);
    const experiments: IAgenticaCallBenchmarkResult.IExperiment<Model>[] =
      await Promise.all(
        this.scenarios_.map(async (scenario) => {
          const events: IAgenticaCallBenchmarkEvent<Model>[] =
            await Promise.all(
              new Array(this.config_.repeat).fill(0).map(async () => {
                await semaphore.acquire();
                const e: IAgenticaCallBenchmarkEvent<Model> =
                  await this.step(scenario);
                await semaphore.release();
                if (listener !== undefined) listener(e);
                return e;
              }),
            );
          return {
            scenario,
            events,
            usage: events
              .filter((e) => e.type !== "error")
              .map((e) => e.usage)
              .reduce(AgenticaTokenUsage.plus, AgenticaTokenUsage.zero()),
          };
        }),
      );
    return (this.result_ = {
      experiments,
      started_at,
      completed_at: new Date(),
      usage: experiments
        .map((p) => p.usage)
        .reduce(AgenticaTokenUsage.plus, AgenticaTokenUsage.zero()),
    });
  }

  /**
   * Report the benchmark result as markdown files.
   *
   * Report the benchmark result {@link execute}d by
   * `AgenticaCallBenchmark` as markdown files, and returns a dictionary
   * object of the markdown reporting files. The key of the dictionary
   * would be file name, and the value would be the markdown content.
   *
   * For reference, the markdown files are composed like below:
   *
   * - `./README.md`
   * - `./scenario-1/README.md`
   * - `./scenario-1/1.success.md`
   * - `./scenario-1/2.failure.md`
   * - `./scenario-1/3.error.md`
   *
   * @returns Dictionary of markdown files.
   */
  public report(): Record<string, string> {
    if (this.result_ === null)
      throw new Error("Benchmark is not executed yet.");
    return AgenticaCallBenchmarkReporter.markdown(this.result_);
  }

  private async step(
    scenario: IAgenticaCallBenchmarkScenario<Model>,
  ): Promise<IAgenticaCallBenchmarkEvent<Model>> {
    const agent: Agentica<Model> = this.agent_.clone();
    const started_at: Date = new Date();
    const success = () =>
      AgenticaBenchmarkPredicator.success({
        expected: scenario.expected,
        operations: agent
          .getPromptHistories()
          .filter((p) => p.type === "execute")
          .map((p) => p.operation),
        strict: false,
      });
    const out = (): IAgenticaCallBenchmarkEvent<Model> => {
      const select = AgenticaBenchmarkPredicator.success({
        expected: scenario.expected,
        operations: agent
          .getPromptHistories()
          .filter((p) => p.type === "select")
          .map((p) => p.selections)
          .flat()
          .map((p) => p.operation),
        strict: false,
      });
      const call = success();
      return {
        type: (call ? "success" : "failure") as "failure",
        scenario,
        select,
        call,
        prompts: agent.getPromptHistories(),
        usage: agent.getTokenUsage(),
        started_at,
        completed_at: new Date(),
      } satisfies IAgenticaCallBenchmarkEvent.IFailure<Model>;
    };

    try {
      await agent.conversate(scenario.text);
      if (success()) return out();
      for (let i: number = 0; i < this.config_.consent; ++i) {
        const next: string | null =
          await AgenticaBenchmarkPredicator.isNext(agent);
        if (next === null) break;

        await agent.conversate(next);
        if (success()) return out();
      }
      return out();
    } catch (error) {
      return {
        type: "error",
        scenario,
        prompts: agent.getPromptHistories(),
        usage: agent.getTokenUsage(),
        error,
        started_at,
        completed_at: new Date(),
      };
    }
  }
}
export namespace AgenticaCallBenchmark {
  /**
   * Properties of the {@link AgenticaCallBenchmark} constructor.
   */
  export interface IProps<Model extends ILlmSchema.Model> {
    /**
     * AI agent instance.
     */
    agent: Agentica<Model>;

    /**
     * List of scenarios what you expect.
     */
    scenarios: IAgenticaCallBenchmarkScenario<Model>[];

    /**
     * Configuration for the benchmark.
     */
    config?: Partial<IConfig>;
  }

  /**
   * Configuration for the benchmark.
   *
   * `AgenticaSelectBenchmark.IConfig` is a data structure which
   * represents a configuration for the benchmark, especially the
   * capacity information of the benchmark execution.
   */
  export interface IConfig {
    /**
     * Repeat count.
     *
     * The number of repeating count for the benchmark execution
     * for each scenario.
     *
     * @default 10
     */
    repeat: number & tags.Type<"uint32"> & tags.Minimum<1>;

    /**
     * Simultaneous count.
     *
     * The number of simultaneous count for the parallel benchmark
     * execution.
     *
     * If you configure this property greater than `1`, the benchmark
     * for each scenario would be executed in parallel in the given
     * count.
     *
     * @default 10
     */
    simultaneous: number & tags.Type<"uint32"> & tags.Minimum<1>;

    /**
     * Number of consents.
     *
     * AI agent sometimes asks user to consent to the function
     * calling, and perform it at the next step.
     *
     * This property represents the number of consents to allow.
     * If the number of consents from the AI agent exceeds the
     * configured value, the benchmark will be failed.
     *
     * @default 3
     */
    consent: number;
  }
}
