import { Handler } from "aws-lambda";

import * as gremlin from "gremlin";
import { getUrlAndHeaders } from "gremlin-aws-sigv4/lib/utils";

const DriverRemoteConnection = gremlin.driver.DriverRemoteConnection;
const traversal = gremlin.process.AnonymousTraversalSource.traversal;
const __ = gremlin.process.statics;

export const handler: Handler = async (event) => {
  let conn = null;
  const getConnectionDetails = () => {
    return getUrlAndHeaders(
      process.env.NEPTUNE_ENDPOINT,
      process.env.NEPTUNE_PORT,
      {},
      "/gremlin",
      "wss"
    );
  };

  const createRemoteConnection = () => {
    const { url, headers } = getConnectionDetails();

    console.log(url);
    console.log(headers);
    const c = new DriverRemoteConnection(url, {
      mimeType: "application/vnd.gremlin-v2.0+json",
      headers: headers,
    });
    c._client._connection.on("close", (code: number, message: string) => {
      console.info(`close - ${code} ${message}`);
      if (code == 1006) {
        console.error("Connection closed prematurely");
        throw new Error("Connection closed prematurely");
      }
    });
    return c;
  };

  let g;
  const id = gremlin.process.t.id;
  const {
    value,
    edge,
    vertex,
    source,
    sourceLabel,
    destination,
    destLabel,
    properties: propertiesJson,
  } = event.arguments.input;

  // Parse properties JSON (new generic approach)
  const props: Record<string, unknown> =
    propertiesJson ? JSON.parse(propertiesJson) : {};

  try {
    if (conn == null) {
      console.info("Initializing connection");
      conn = createRemoteConnection();
      g = traversal().withRemote(conn);
    }

    switch (value) {
      case "vertex": {
        // Generate a unique vertex ID using label prefix + timestamp
        const vertexId = `${vertex.toLowerCase()}_${Date.now()}`;

        // Start the addV traversal
        let t = g!.addV(vertex).property(id, vertexId);

        // Add all properties from the properties JSON
        for (const [key, val] of Object.entries(props)) {
          if (val !== undefined && val !== null && val !== "") {
            t = t.property(key, val);
          }
        }

        const result = await t.next();
        console.log("Created vertex:", vertexId, vertex, props);
        return { result: JSON.stringify(result) };
      }

      default: {
        // Edge creation
        console.log("Creating edge:", edge, "from", sourceLabel, source, "to", destLabel, destination);

        // Find source vertex by label and any name-like property
        let t = g!
          .V()
          .hasLabel(sourceLabel)
          .or(
            __.has("name", source),
            __.has("companyName", source),
            __.has("jobName", source),
            __.has("partName", source)
          );

        // Add edge to destination vertex found by label and name-like property
        let edgeTraversal = t.addE(edge).to(
          __.V()
            .hasLabel(destLabel)
            .or(
              __.has("name", destination),
              __.has("companyName", destination),
              __.has("jobName", destination),
              __.has("partName", destination)
            )
        );

        // Add edge properties from the properties JSON
        for (const [key, val] of Object.entries(props)) {
          if (val !== undefined && val !== null && val !== "") {
            edgeTraversal = edgeTraversal.property(key, val);
          }
        }

        const res = await edgeTraversal.next();
        console.log("Created edge:", edge, props);
        return { result: JSON.stringify(res) };
      }
    }
  } catch (error: unknown) {
    console.log(error);
    console.error(JSON.stringify(error));
    const message = error instanceof Error ? error.message : String(error);
    return { error: message };
  }
};
