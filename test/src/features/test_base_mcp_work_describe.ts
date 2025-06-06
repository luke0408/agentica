import type { AgenticaEvent, IAgenticaController } from "@agentica/core";

import { Agentica, assertMcpController } from "@agentica/core";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "@wrtnlabs/calculator-mcp";
import OpenAI from "openai";
import typia from "typia";

import { TestGlobal } from "../TestGlobal";

export async function test_base_mcp_work_describe(): Promise<void | false> {
  if (TestGlobal.chatgptApiKey.length === 0) {
    return false;
  }

  // for trace event
  const events: AgenticaEvent<"chatgpt">[] = [];
  let functionCalled = false;

  const server = await createServer({
    name: "calculator",
    version: "1.0.0",
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  // calculator controller
  const client = new Client({
    name: "calculator",
    version: "1.0.0",
  });

  await client.connect(clientTransport);
  await server.connect(serverTransport);

  const calculatorController: IAgenticaController<"chatgpt"> = await assertMcpController({
    name: "calculator",
    model: "chatgpt",
    client,
  });

  // Agentica instance
  const agent: Agentica<"chatgpt"> = new Agentica({
    model: "chatgpt",
    vendor: {
      model: "gpt-4o-mini",
      api: new OpenAI({
        apiKey: TestGlobal.env.CHATGPT_API_KEY,
      }),
    },
    controllers: [calculatorController],
  });

  // event listener
  agent.on("select", (event) => {
    events.push(event);
  });

  agent.on("call", (event) => {
    events.push(event);
    if (event.operation.name.includes("add") || event.operation.name.includes("subtract")) {
      functionCalled = true;
    }
  });

  agent.on("execute", (event) => {
    events.push(event);
  });

  const a = 5123123123;
  const b = 3412342134;
  // start conversation - induce function call
  await agent.conversate(
    `Could you add ${a} and ${b} for me?; You should use calculator`,
  );

  // check function call
  if (!functionCalled) {
    throw new Error("Function was not called during conversation");
  }

  // check result
  const executeEvent = events.find(e => e.type === "execute");

  if (executeEvent === undefined) {
    throw new Error("Execute event not found");
  }

  if (!typia.is<[{ type: "text"; text: string }]>(executeEvent.value) || !executeEvent.value[0].text.includes(`${a + b}`)) {
    throw new TypeError(
      `Expected result to be ${a + b}, but got ${JSON.stringify(executeEvent.value)}`,
    );
  }
}
