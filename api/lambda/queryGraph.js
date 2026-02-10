"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const gremlin = require("gremlin");
const utils_1 = require("gremlin-aws-sigv4/lib/utils");
const DriverRemoteConnection = gremlin.driver.DriverRemoteConnection;
const P = gremlin.process.P;
const traversal = gremlin.process.AnonymousTraversalSource.traversal;
const handler = async (event) => {
    let conn = null;
    const getConnectionDetails = () => {
        return (0, utils_1.getUrlAndHeaders)(process.env.NEPTUNE_ENDPOINT, process.env.NEPTUNE_PORT, {}, "/gremlin", "wss");
    };
    const createRemoteConnection = () => {
        const { url, headers } = getConnectionDetails();
        console.log(url);
        console.log(headers);
        const c = new DriverRemoteConnection(url, {
            mimeType: "application/vnd.gremlin-v2.0+json",
            headers: headers,
        });
        c._client._connection.on("close", (code, message) => {
            console.info(`close - ${code} ${message}`);
            if (code == 1006) {
                console.error("Connection closed prematurely");
                throw new Error("Connection closed prematurely");
            }
        });
        return c;
    };
    let g;
    const type = event.arguments.type;
    console.log(type);
    try {
        if (conn == null) {
            console.info("Initializing connection");
            conn = createRemoteConnection();
            g = traversal().withRemote(conn);
        }
        if (type === "profile") {
            console.log(g);
            let usage;
            let belong_to;
            let authored_by;
            let affiliated_with;
            let people;
            let made_by;
            let search_name = await g
                .V(event.arguments.name)
                .values("name")
                .toList();
            switch (event.arguments.value) {
                case "person":
                    usage = await g
                        .V()
                        .has(event.arguments.value, "name", event.arguments.name)
                        .bothE()
                        .hasLabel("usage")
                        .otherV()
                        .values("name")
                        .toList();
                    belong_to = await g
                        .V()
                        .has(event.arguments.value, "name", event.arguments.name)
                        .bothE()
                        .hasLabel("belong_to")
                        .otherV()
                        .values("name")
                        .toList();
                    authored_by = await g
                        .V()
                        .has(event.arguments.value, "name", event.arguments.name)
                        .bothE()
                        .hasLabel("authored_by")
                        .otherV()
                        .values("name")
                        .toList();
                    affiliated_with = await g
                        .V()
                        .has(event.arguments.value, "name", event.arguments.name)
                        .bothE()
                        .hasLabel("affiliated_with")
                        .otherV()
                        .values("name")
                        .toList();
                    return [
                        { search_name, usage, belong_to, authored_by, affiliated_with },
                    ];
                case "id":
                    usage = await g
                        .V()
                        .hasId(event.arguments.name)
                        .bothE()
                        .hasLabel("usage")
                        .otherV()
                        .values("name")
                        .toList();
                    if (event.arguments.name.match(/Doc/)) {
                        belong_to = await g
                            .V()
                            .hasId(event.arguments.name)
                            .bothE()
                            .hasLabel("belong_to")
                            .otherV()
                            .values("name")
                            .toList();
                    }
                    else {
                        belong_to = [];
                    }
                    authored_by = await g
                        .V()
                        .hasId(event.arguments.name)
                        .bothE()
                        .hasLabel("authored_by")
                        .otherV()
                        .values("name")
                        .toList();
                    affiliated_with = await g
                        .V()
                        .hasId(event.arguments.name)
                        .bothE()
                        .hasLabel("affiliated_with")
                        .otherV()
                        .values("name")
                        .toList();
                    if (event.arguments.name.match(/Prod/)) {
                        made_by = await g
                            .V()
                            .hasId(event.arguments.name)
                            .out("made_by")
                            .values("name")
                            .toList();
                    }
                    else {
                        made_by = [];
                    }
                    if (event.arguments.name.match(/Conf/)) {
                        people = await g
                            .V()
                            .hasId(event.arguments.name)
                            .in_()
                            .values("name")
                            .toList();
                    }
                    else {
                        people = [];
                    }
                    if (event.arguments.name.match(/Inst/)) {
                        affiliated_with = [];
                    }
                    return [
                        {
                            search_name,
                            usage,
                            belong_to,
                            authored_by,
                            affiliated_with,
                            made_by,
                            people,
                        },
                    ];
                case "product":
                    console.log(event.arguments);
                    made_by = await g
                        .V()
                        .has(event.arguments.value, "name", event.arguments.name)
                        .out("made_by")
                        .values("name")
                        .toList();
                    return [{ search_name, made_by }];
                case "conference":
                    console.log(event.arguments);
                    people = await g
                        .V()
                        .has(event.arguments.value, "name", event.arguments.name)
                        .in_()
                        .values("name")
                        .toList();
                    return [{ search_name, people }];
                default:
                    console.log("default");
            }
        }
        else if (type === "relation") {
            switch (event.arguments.value) {
                case "person":
                    const result = await g
                        .V()
                        .has(event.arguments.value, "name", event.arguments.name)
                        .as(event.arguments.value)
                        .out("belong_to")
                        .in_()
                        .where(P.neq(event.arguments.value))
                        .values("name")
                        .dedup()
                        .toList();
                    return result.map((r) => {
                        return { name: r };
                    });
                case "product":
                    const result2 = await g
                        .V()
                        .has(event.arguments.value, "name", event.arguments.name)
                        .as(event.arguments.value)
                        .in_("usage")
                        .as("p")
                        .in_("authored_by")
                        .out()
                        .where(P.neq("p"))
                        .values("name")
                        .dedup()
                        .toList();
                    return result2.map((r) => {
                        return { name: r };
                    });
                case "conference":
                    console.log(event.arguments);
                    const result3 = await g
                        .V()
                        .has(event.arguments.value, "name", event.arguments.name)
                        .as(event.arguments.value)
                        .in_()
                        .as("p")
                        .out()
                        .hasLabel("person")
                        .where(P.neq("p"))
                        .values("name")
                        .dedup()
                        .toList();
                    console.log(result3);
                    return result3.map((r) => {
                        return { name: r };
                    });
                default:
                    console.log("default");
            }
        }
        else {
            const result = await g.V().toList();
            const vertex = result.map((r) => {
                return { id: r.id, label: r.label };
            });
            const result2 = await g.E().toList();
            const edge = result2.map((r) => {
                console.log(r);
                return { source: r.outV.id, target: r.inV.id, value: r.label };
            });
            return { nodes: vertex, links: edge };
        }
    }
    catch (error) {
        console.log(error);
        console.error(JSON.stringify(error));
        return { error: error.message };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVlcnlHcmFwaC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInF1ZXJ5R3JhcGgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsbUNBQW1DO0FBQ25DLHVEQUErRDtBQUUvRCxNQUFNLHNCQUFzQixHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsc0JBQXNCLENBQUM7QUFDckUsTUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDNUIsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLENBQUM7QUFDOUQsTUFBTSxPQUFPLEdBQVksS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFO0lBQzlDLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQztJQUNoQixNQUFNLG9CQUFvQixHQUFHLEdBQUcsRUFBRTtRQUNoQyxPQUFPLElBQUEsd0JBQWdCLEVBQ3JCLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQzVCLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUN4QixFQUFFLEVBQ0YsVUFBVSxFQUNWLEtBQUssQ0FDTixDQUFDO0lBQ0osQ0FBQyxDQUFDO0lBRUYsTUFBTSxzQkFBc0IsR0FBRyxHQUFHLEVBQUU7UUFDbEMsTUFBTSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsR0FBRyxvQkFBb0IsRUFBRSxDQUFDO1FBRWhELE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDakIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNyQixNQUFNLENBQUMsR0FBRyxJQUFJLHNCQUFzQixDQUFDLEdBQUcsRUFBRTtZQUN4QyxRQUFRLEVBQUUsbUNBQW1DO1lBQzdDLE9BQU8sRUFBRSxPQUFPO1NBQ2pCLENBQUMsQ0FBQztRQUNILENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVB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RyxDQUFDLENBQUMsQ0FBTSxFQUFFLEVBQUU7Z0JBQ25DLE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3RDLENBQUMsQ0FBQyxDQUFDO1lBQ0gsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDckMsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFO2dCQUNsQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNmLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDakUsQ0FBQyxDQUFDLENBQUM7WUFDSCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUM7UUFDeEMsQ0FBQztJQUNILENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ3BCLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkIsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDckMsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDbEMsQ0FBQztBQUNILENBQUMsQ0FBQztBQTdQVyxRQUFBLE9BQU8sV0E2UGxCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgSGFuZGxlciB9IGZyb20gXCJhd3MtbGFtYmRhXCI7XG5cbmltcG9ydCAqIGFzIGdyZW1saW4gZnJvbSBcImdyZW1saW5cIjtcbmltcG9ydCB7IGdldFVybEFuZEhlYWRlcnMgfSBmcm9tIFwiZ3JlbWxpbi1hd3Mtc2lndjQvbGliL3V0aWxzXCI7XG5cbmNvbnN0IERyaXZlclJlbW90ZUNvbm5lY3Rpb24gPSBncmVtbGluLmRyaXZlci5Ecml2ZXJSZW1vdGVDb25uZWN0aW9uO1xuY29uc3QgUCA9IGdyZW1saW4ucHJvY2Vzcy5QO1xuY29uc3QgdHJhdmVyc2FsID0gZ3JlbWxpbi5wcm9jZXNzLkFub255bW91c1RyYXZlcnNhbFNvdXJjZS50cmF2ZXJzYWw7XG5leHBvcnQgY29uc3QgaGFuZGxlcjogSGFuZGxlciA9IGFzeW5jIChldmVudCkgPT4ge1xuICBsZXQgY29ubiA9IG51bGw7XG4gIGNvbnN0IGdldENvbm5lY3Rpb25EZXRhaWxzID0gKCkgPT4ge1xuICAgIHJldHVybiBnZXRVcmxBbmRIZWFkZXJzKFxuICAgICAgcHJvY2Vzcy5lbnYuTkVQVFVORV9FTkRQT0lOVCxcbiAgICAgIHByb2Nlc3MuZW52Lk5FUFRVTkVfUE9SVCxcbiAgICAgIHt9LFxuICAgICAgXCIvZ3JlbWxpblwiLFxuICAgICAgXCJ3c3NcIlxuICAgICk7XG4gIH07XG5cbiAgY29uc3QgY3JlYXRlUmVtb3RlQ29ubmVjdGlvbiA9ICgpID0+IHtcbiAgICBjb25zdCB7IHVybCwgaGVhZGVycyB9ID0gZ2V0Q29ubmVjdGlvbkRldGFpbHMoKTtcblxuICAgIGNvbnNvbGUubG9nKHVybCk7XG4gICAgY29uc29sZS5sb2coaGVhZGVycyk7XG4gICAgY29uc3QgYyA9IG5ldyBEcml2ZXJSZW1vdGVDb25uZWN0aW9uKHVybCwge1xuICAgICAgbWltZVR5cGU6IFwiYXBwbGljYXRpb24vdm5kLmdyZW1saW4tdjIuMCtqc29uXCIsXG4gICAgICBoZWFkZXJzOiBoZWFkZXJzLFxuICAgIH0pO1xuICAgIGMuX2NsaWVudC5fY29ubmVjdGlvbi5vbihcImNsb3NlXCIsIChjb2RlLCBtZXNzYWdlKSA9PiB7XG4gICAgICBjb25zb2xlLmluZm8oYGNsb3NlIC0gJHtjb2RlfSAke21lc3NhZ2V9YCk7XG4gICAgICBpZiAoY29kZSA9PSAxMDA2KSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJDb25uZWN0aW9uIGNsb3NlZCBwcmVtYXR1cmVseVwiKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ29ubmVjdGlvbiBjbG9zZWQgcHJlbWF0dXJlbHlcIik7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGM7XG4gIH07XG5cbiAgbGV0IGc7XG5cbiAgY29uc3QgdHlwZSA9IGV2ZW50LmFyZ3VtZW50cy50eXBlO1xuICBjb25zb2xlLmxvZyh0eXBlKTtcbiAgdHJ5IHtcbiAgICBpZiAoY29ubiA9PSBudWxsKSB7XG4gICAgICBjb25zb2xlLmluZm8oXCJJbml0aWFsaXppbmcgY29ubmVjdGlvblwiKTtcbiAgICAgIGNvbm4gPSBjcmVhdGVSZW1vdGVDb25uZWN0aW9uKCk7XG4gICAgICBnID0gdHJhdmVyc2FsKCkud2l0aFJlbW90ZShjb25uKTtcbiAgICB9XG4gICAgaWYgKHR5cGUgPT09IFwicHJvZmlsZVwiKSB7XG4gICAgICBjb25zb2xlLmxvZyhnKTtcbiAgICAgIGxldCB1c2FnZTtcbiAgICAgIGxldCBiZWxvbmdfdG87XG4gICAgICBsZXQgYXV0aG9yZWRfYnk7XG4gICAgICBsZXQgYWZmaWxpYXRlZF93aXRoO1xuICAgICAgbGV0IHBlb3BsZTtcbiAgICAgIGxldCBtYWRlX2J5O1xuICAgICAgbGV0IHNlYXJjaF9uYW1lID0gYXdhaXQgZyFcbiAgICAgICAgLlYoZXZlbnQuYXJndW1lbnRzLm5hbWUpXG4gICAgICAgIC52YWx1ZXMoXCJuYW1lXCIpXG4gICAgICAgIC50b0xpc3QoKTtcbiAgICAgIHN3aXRjaCAoZXZlbnQuYXJndW1lbnRzLnZhbHVlKSB7XG4gICAgICAgIGNhc2UgXCJwZXJzb25cIjpcbiAgICAgICAgICB1c2FnZSA9IGF3YWl0IGdcbiAgICAgICAgICAgIC5WKClcbiAgICAgICAgICAgIC5oYXMoZXZlbnQuYXJndW1lbnRzLnZhbHVlLCBcIm5hbWVcIiwgZXZlbnQuYXJndW1lbnRzLm5hbWUpXG4gICAgICAgICAgICAuYm90aEUoKVxuICAgICAgICAgICAgLmhhc0xhYmVsKFwidXNhZ2VcIilcbiAgICAgICAgICAgIC5vdGhlclYoKVxuICAgICAgICAgICAgLnZhbHVlcyhcIm5hbWVcIilcbiAgICAgICAgICAgIC50b0xpc3QoKTtcbiAgICAgICAgICBiZWxvbmdfdG8gPSBhd2FpdCBnXG4gICAgICAgICAgICAuVigpXG4gICAgICAgICAgICAuaGFzKGV2ZW50LmFyZ3VtZW50cy52YWx1ZSwgXCJuYW1lXCIsIGV2ZW50LmFyZ3VtZW50cy5uYW1lKVxuICAgICAgICAgICAgLmJvdGhFKClcbiAgICAgICAgICAgIC5oYXNMYWJlbChcImJlbG9uZ190b1wiKVxuICAgICAgICAgICAgLm90aGVyVigpXG4gICAgICAgICAgICAudmFsdWVzKFwibmFtZVwiKVxuICAgICAgICAgICAgLnRvTGlzdCgpO1xuICAgICAgICAgIGF1dGhvcmVkX2J5ID0gYXdhaXQgZ1xuICAgICAgICAgICAgLlYoKVxuICAgICAgICAgICAgLmhhcyhldmVudC5hcmd1bWVudHMudmFsdWUsIFwibmFtZVwiLCBldmVudC5hcmd1bWVudHMubmFtZSlcbiAgICAgICAgICAgIC5ib3RoRSgpXG4gICAgICAgICAgICAuaGFzTGFiZWwoXCJhdXRob3JlZF9ieVwiKVxuICAgICAgICAgICAgLm90aGVyVigpXG4gICAgICAgICAgICAudmFsdWVzKFwibmFtZVwiKVxuICAgICAgICAgICAgLnRvTGlzdCgpO1xuICAgICAgICAgIGFmZmlsaWF0ZWRfd2l0aCA9IGF3YWl0IGdcbiAgICAgICAgICAgIC5WKClcbiAgICAgICAgICAgIC5oYXMoZXZlbnQuYXJndW1lbnRzLnZhbHVlLCBcIm5hbWVcIiwgZXZlbnQuYXJndW1lbnRzLm5hbWUpXG4gICAgICAgICAgICAuYm90aEUoKVxuICAgICAgICAgICAgLmhhc0xhYmVsKFwiYWZmaWxpYXRlZF93aXRoXCIpXG4gICAgICAgICAgICAub3RoZXJWKClcbiAgICAgICAgICAgIC52YWx1ZXMoXCJuYW1lXCIpXG4gICAgICAgICAgICAudG9MaXN0KCk7XG4gICAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHsgc2VhcmNoX25hbWUsIHVzYWdlLCBiZWxvbmdfdG8sIGF1dGhvcmVkX2J5LCBhZmZpbGlhdGVkX3dpdGggfSxcbiAgICAgICAgICBdO1xuICAgICAgICBjYXNlIFwiaWRcIjpcbiAgICAgICAgICB1c2FnZSA9IGF3YWl0IGdcbiAgICAgICAgICAgIC5WKClcbiAgICAgICAgICAgIC5oYXNJZChldmVudC5hcmd1bWVudHMubmFtZSlcbiAgICAgICAgICAgIC5ib3RoRSgpXG4gICAgICAgICAgICAuaGFzTGFiZWwoXCJ1c2FnZVwiKVxuICAgICAgICAgICAgLm90aGVyVigpXG4gICAgICAgICAgICAudmFsdWVzKFwibmFtZVwiKVxuICAgICAgICAgICAgLnRvTGlzdCgpO1xuICAgICAgICAgIGlmIChldmVudC5hcmd1bWVudHMubmFtZS5tYXRjaCgvRG9jLykpIHtcbiAgICAgICAgICAgIGJlbG9uZ190byA9IGF3YWl0IGdcbiAgICAgICAgICAgICAgLlYoKVxuICAgICAgICAgICAgICAuaGFzSWQoZXZlbnQuYXJndW1lbnRzLm5hbWUpXG4gICAgICAgICAgICAgIC5ib3RoRSgpXG4gICAgICAgICAgICAgIC5oYXNMYWJlbChcImJlbG9uZ190b1wiKVxuICAgICAgICAgICAgICAub3RoZXJWKClcbiAgICAgICAgICAgICAgLnZhbHVlcyhcIm5hbWVcIilcbiAgICAgICAgICAgICAgLnRvTGlzdCgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBiZWxvbmdfdG8gPSBbXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYXV0aG9yZWRfYnkgPSBhd2FpdCBnXG4gICAgICAgICAgICAuVigpXG4gICAgICAgICAgICAuaGFzSWQoZXZlbnQuYXJndW1lbnRzLm5hbWUpXG4gICAgICAgICAgICAuYm90aEUoKVxuICAgICAgICAgICAgLmhhc0xhYmVsKFwiYXV0aG9yZWRfYnlcIilcbiAgICAgICAgICAgIC5vdGhlclYoKVxuICAgICAgICAgICAgLnZhbHVlcyhcIm5hbWVcIilcbiAgICAgICAgICAgIC50b0xpc3QoKTtcbiAgICAgICAgICBhZmZpbGlhdGVkX3dpdGggPSBhd2FpdCBnXG4gICAgICAgICAgICAuVigpXG4gICAgICAgICAgICAuaGFzSWQoZXZlbnQuYXJndW1lbnRzLm5hbWUpXG4gICAgICAgICAgICAuYm90aEUoKVxuICAgICAgICAgICAgLmhhc0xhYmVsKFwiYWZmaWxpYXRlZF93aXRoXCIpXG4gICAgICAgICAgICAub3RoZXJWKClcbiAgICAgICAgICAgIC52YWx1ZXMoXCJuYW1lXCIpXG4gICAgICAgICAgICAudG9MaXN0KCk7XG4gICAgICAgICAgaWYgKGV2ZW50LmFyZ3VtZW50cy5uYW1lLm1hdGNoKC9Qcm9kLykpIHtcbiAgICAgICAgICAgIG1hZGVfYnkgPSBhd2FpdCBnXG4gICAgICAgICAgICAgIC5WKClcbiAgICAgICAgICAgICAgLmhhc0lkKGV2ZW50LmFyZ3VtZW50cy5uYW1lKVxuICAgICAgICAgICAgICAub3V0KFwibWFkZV9ieVwiKVxuICAgICAgICAgICAgICAudmFsdWVzKFwibmFtZVwiKVxuICAgICAgICAgICAgICAudG9MaXN0KCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1hZGVfYnkgPSBbXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGV2ZW50LmFyZ3VtZW50cy5uYW1lLm1hdGNoKC9Db25mLykpIHtcbiAgICAgICAgICAgIHBlb3BsZSA9IGF3YWl0IGdcbiAgICAgICAgICAgICAgLlYoKVxuICAgICAgICAgICAgICAuaGFzSWQoZXZlbnQuYXJndW1lbnRzLm5hbWUpXG4gICAgICAgICAgICAgIC5pbl8oKVxuICAgICAgICAgICAgICAudmFsdWVzKFwibmFtZVwiKVxuICAgICAgICAgICAgICAudG9MaXN0KCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlb3BsZSA9IFtdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZXZlbnQuYXJndW1lbnRzLm5hbWUubWF0Y2goL0luc3QvKSkge1xuICAgICAgICAgICAgYWZmaWxpYXRlZF93aXRoID0gW107XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHNlYXJjaF9uYW1lLFxuICAgICAgICAgICAgICB1c2FnZSxcbiAgICAgICAgICAgICAgYmVsb25nX3RvLFxuICAgICAgICAgICAgICBhdXRob3JlZF9ieSxcbiAgICAgICAgICAgICAgYWZmaWxpYXRlZF93aXRoLFxuICAgICAgICAgICAgICBtYWRlX2J5LFxuICAgICAgICAgICAgICBwZW9wbGUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF07XG4gICAgICAgIGNhc2UgXCJwcm9kdWN0XCI6XG4gICAgICAgICAgY29uc29sZS5sb2coZXZlbnQuYXJndW1lbnRzKTtcbiAgICAgICAgICBtYWRlX2J5ID0gYXdhaXQgZ1xuICAgICAgICAgICAgLlYoKVxuICAgICAgICAgICAgLmhhcyhldmVudC5hcmd1bWVudHMudmFsdWUsIFwibmFtZVwiLCBldmVudC5hcmd1bWVudHMubmFtZSlcbiAgICAgICAgICAgIC5vdXQoXCJtYWRlX2J5XCIpXG4gICAgICAgICAgICAudmFsdWVzKFwibmFtZVwiKVxuICAgICAgICAgICAgLnRvTGlzdCgpO1xuICAgICAgICAgIHJldHVybiBbeyBzZWFyY2hfbmFtZSwgbWFkZV9ieSB9XTtcbiAgICAgICAgY2FzZSBcImNvbmZlcmVuY2VcIjpcbiAgICAgICAgICBjb25zb2xlLmxvZyhldmVudC5hcmd1bWVudHMpO1xuICAgICAgICAgIHBlb3BsZSA9IGF3YWl0IGdcbiAgICAgICAgICAgIC5WKClcbiAgICAgICAgICAgIC5oYXMoZXZlbnQuYXJndW1lbnRzLnZhbHVlLCBcIm5hbWVcIiwgZXZlbnQuYXJndW1lbnRzLm5hbWUpXG4gICAgICAgICAgICAuaW5fKClcbiAgICAgICAgICAgIC52YWx1ZXMoXCJuYW1lXCIpXG4gICAgICAgICAgICAudG9MaXN0KCk7XG4gICAgICAgICAgcmV0dXJuIFt7IHNlYXJjaF9uYW1lLCBwZW9wbGUgfV07XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgY29uc29sZS5sb2coXCJkZWZhdWx0XCIpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gXCJyZWxhdGlvblwiKSB7XG4gICAgICBzd2l0Y2ggKGV2ZW50LmFyZ3VtZW50cy52YWx1ZSkge1xuICAgICAgICBjYXNlIFwicGVyc29uXCI6XG4gICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ1xuICAgICAgICAgICAgLlYoKVxuICAgICAgICAgICAgLmhhcyhldmVudC5hcmd1bWVudHMudmFsdWUsIFwibmFtZVwiLCBldmVudC5hcmd1bWVudHMubmFtZSlcbiAgICAgICAgICAgIC5hcyhldmVudC5hcmd1bWVudHMudmFsdWUpXG4gICAgICAgICAgICAub3V0KFwiYmVsb25nX3RvXCIpXG4gICAgICAgICAgICAuaW5fKClcbiAgICAgICAgICAgIC53aGVyZShQLm5lcShldmVudC5hcmd1bWVudHMudmFsdWUpKVxuICAgICAgICAgICAgLnZhbHVlcyhcIm5hbWVcIilcbiAgICAgICAgICAgIC5kZWR1cCgpXG4gICAgICAgICAgICAudG9MaXN0KCk7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdC5tYXAoKHI6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogciB9O1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgIGNhc2UgXCJwcm9kdWN0XCI6XG4gICAgICAgICAgY29uc3QgcmVzdWx0MiA9IGF3YWl0IGdcbiAgICAgICAgICAgIC5WKClcbiAgICAgICAgICAgIC5oYXMoZXZlbnQuYXJndW1lbnRzLnZhbHVlLCBcIm5hbWVcIiwgZXZlbnQuYXJndW1lbnRzLm5hbWUpXG4gICAgICAgICAgICAuYXMoZXZlbnQuYXJndW1lbnRzLnZhbHVlKVxuICAgICAgICAgICAgLmluXyhcInVzYWdlXCIpXG4gICAgICAgICAgICAuYXMoXCJwXCIpXG4gICAgICAgICAgICAuaW5fKFwiYXV0aG9yZWRfYnlcIilcbiAgICAgICAgICAgIC5vdXQoKVxuICAgICAgICAgICAgLndoZXJlKFAubmVxKFwicFwiKSlcbiAgICAgICAgICAgIC52YWx1ZXMoXCJuYW1lXCIpXG4gICAgICAgICAgICAuZGVkdXAoKVxuICAgICAgICAgICAgLnRvTGlzdCgpO1xuICAgICAgICAgIHJldHVybiByZXN1bHQyLm1hcCgocjogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4geyBuYW1lOiByIH07XG4gICAgICAgICAgfSk7XG4gICAgICAgIGNhc2UgXCJjb25mZXJlbmNlXCI6XG4gICAgICAgICAgY29uc29sZS5sb2coZXZlbnQuYXJndW1lbnRzKTtcbiAgICAgICAgICBjb25zdCByZXN1bHQzID0gYXdhaXQgZ1xuICAgICAgICAgICAgLlYoKVxuICAgICAgICAgICAgLmhhcyhldmVudC5hcmd1bWVudHMudmFsdWUsIFwibmFtZVwiLCBldmVudC5hcmd1bWVudHMubmFtZSlcbiAgICAgICAgICAgIC5hcyhldmVudC5hcmd1bWVudHMudmFsdWUpXG4gICAgICAgICAgICAuaW5fKClcbiAgICAgICAgICAgIC5hcyhcInBcIilcbiAgICAgICAgICAgIC5vdXQoKVxuICAgICAgICAgICAgLmhhc0xhYmVsKFwicGVyc29uXCIpXG4gICAgICAgICAgICAud2hlcmUoUC5uZXEoXCJwXCIpKVxuICAgICAgICAgICAgLnZhbHVlcyhcIm5hbWVcIilcbiAgICAgICAgICAgIC5kZWR1cCgpXG4gICAgICAgICAgICAudG9MaXN0KCk7XG4gICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0Myk7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdDMubWFwKChyOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgIHJldHVybiB7IG5hbWU6IHIgfTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBjb25zb2xlLmxvZyhcImRlZmF1bHRcIik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGcuVigpLnRvTGlzdCgpO1xuICAgICAgY29uc3QgdmVydGV4ID0gcmVzdWx0Lm1hcCgocjogYW55KSA9PiB7XG4gICAgICAgIHJldHVybiB7IGlkOiByLmlkLCBsYWJlbDogci5sYWJlbCB9O1xuICAgICAgfSk7XG4gICAgICBjb25zdCByZXN1bHQyID0gYXdhaXQgZy5FKCkudG9MaXN0KCk7XG4gICAgICBjb25zdCBlZGdlID0gcmVzdWx0Mi5tYXAoKHI6IGFueSkgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhyKTtcbiAgICAgICAgcmV0dXJuIHsgc291cmNlOiByLm91dFYuaWQsIHRhcmdldDogci5pblYuaWQsIHZhbHVlOiByLmxhYmVsIH07XG4gICAgICB9KTtcbiAgICAgIHJldHVybiB7IG5vZGVzOiB2ZXJ0ZXgsIGxpbmtzOiBlZGdlIH07XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgY29uc29sZS5sb2coZXJyb3IpO1xuICAgIGNvbnNvbGUuZXJyb3IoSlNPTi5zdHJpbmdpZnkoZXJyb3IpKTtcbiAgICByZXR1cm4geyBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICB9XG59O1xuIl19