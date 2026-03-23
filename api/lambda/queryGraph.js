"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// Node 22+ defines a global WebSocket via undici. gremlin-aws-sigv4 injects
// SigV4 headers through the ws-npm API; if gremlin picks up the built-in
// WebSocket instead, auth headers are dropped and Neptune returns non-101.
// Removing the global forces gremlin to use the bundled ws npm package.
delete globalThis.WebSocket;
const gremlin = require("gremlin");
const utils_1 = require("gremlin-aws-sigv4/lib/utils");
const DriverRemoteConnection = gremlin.driver.DriverRemoteConnection;
const P = gremlin.process.P;
const traversal = gremlin.process.AnonymousTraversalSource.traversal;
const __ = gremlin.process.statics;
const TextP = gremlin.process.TextP;
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
        // Entity search handlers
        const searchConfig = {
            Company: { label: 'Entity', fields: ['companyName'], entityType: 'Company' },
            Customer: { label: 'Entity', fields: ['name'], entityType: 'Customer' },
            Estimator: { label: 'Entity', fields: ['name'], entityType: 'Estimator' },
            Jobber: { label: 'Entity', fields: ['companyName'], entityType: 'Jobber' },
            Asset: { label: 'Asset', fields: ['make', 'model', 'vin'] },
            Job: { label: 'Job', fields: ['jobName'] },
            Part: { label: 'Part', fields: ['partName'] },
            Project_Data: { label: 'Project_Data', fields: ['projectName'] },
        };
        if (event.field === "searchEntities") {
            const { vertexType, searchValue } = event.arguments;
            const cfg = searchConfig[vertexType];
            if (!cfg)
                throw new Error(`Unknown vertex type: ${vertexType}`);
            let searchQuery = g.V().hasLabel(cfg.label);
            if (cfg.entityType) {
                searchQuery = searchQuery.has('entityTypes', cfg.entityType);
            }
            // Only apply text filter if searchValue is non-empty
            const trimmed = (searchValue || '').trim();
            if (trimmed && trimmed !== '*') {
                if (cfg.fields.length === 1) {
                    searchQuery = searchQuery.has(cfg.fields[0], TextP.containing(trimmed));
                }
                else {
                    searchQuery = searchQuery.or(...cfg.fields.map((f) => __.has(f, TextP.containing(trimmed))));
                }
            }
            const results = await searchQuery
                .project('id', 'name', 'label', 'entityType')
                .by(__.id())
                .by(__.coalesce(__.values('companyName'), __.values('name'), __.values('jobName'), __.values('partName'), __.values('make'), __.constant('Unknown')))
                .by(__.label())
                .by(__.coalesce(__.values('entityTypes'), __.constant('')))
                .limit(50)
                .toList();
            return results.map((r) => ({
                id: r.id ?? (r.get ? r.get('id') : undefined),
                name: r.name ?? (r.get ? r.get('name') : undefined),
                label: r.label ?? (r.get ? r.get('label') : undefined),
                entityType: r.entityType || (r.get ? r.get('entityType') : null) || null,
            }));
        }
        if (event.field === "searchProjects") {
            const { searchValue } = event.arguments;
            const trimmed = (searchValue || '').trim();
            let searchQuery = g.V().hasLabel('Project_Data');
            if (trimmed) {
                searchQuery = searchQuery.has('projectName', TextP.containing(trimmed));
            }
            const results = await searchQuery
                .project('id', 'projectName', 'DepartmentNumber', 'DataClassification', 'Team', 'OwnerGroup', 'Recovery', 'Tier')
                .by(__.id())
                .by(__.coalesce(__.values('projectName'), __.constant('')))
                .by(__.coalesce(__.values('DepartmentNumber'), __.constant('')))
                .by(__.coalesce(__.values('DataClassification'), __.constant('')))
                .by(__.coalesce(__.values('Team'), __.constant('')))
                .by(__.coalesce(__.values('OwnerGroup'), __.constant('')))
                .by(__.coalesce(__.values('Recovery'), __.constant('')))
                .by(__.coalesce(__.values('Tier'), __.constant('')))
                .limit(200)
                .toList();
            return results.map((r) => ({
                id: r.id ?? (r.get ? r.get('id') : undefined),
                projectName: r.projectName ?? (r.get ? r.get('projectName') : ''),
                DepartmentNumber: r.DepartmentNumber ?? (r.get ? r.get('DepartmentNumber') : ''),
                DataClassification: r.DataClassification ?? (r.get ? r.get('DataClassification') : ''),
                Team: r.Team ?? (r.get ? r.get('Team') : ''),
                OwnerGroup: r.OwnerGroup ?? (r.get ? r.get('OwnerGroup') : ''),
                Recovery: r.Recovery ?? (r.get ? r.get('Recovery') : ''),
                Tier: r.Tier ?? (r.get ? r.get('Tier') : ''),
            }));
        }
        if (event.field === "getProjectAccounts") {
            const { projectName } = event.arguments;
            const results = await g.V()
                .hasLabel('Project_Data')
                .has('projectName', projectName)
                .in_('owned_by')
                .hasLabel('Account')
                .project('id', 'Account_Name', 'Account_Id', 'Cloud', 'Environments')
                .by(__.id())
                .by(__.coalesce(__.values('Account_Name'), __.constant('')))
                .by(__.coalesce(__.values('Account_Id'), __.constant('')))
                .by(__.coalesce(__.values('Cloud'), __.constant('')))
                .by(__.coalesce(__.values('Environments'), __.constant('')))
                .toList();
            return results.map((r) => ({
                id: r.id ?? (r.get ? r.get('id') : undefined),
                Account_Name: r.Account_Name ?? (r.get ? r.get('Account_Name') : ''),
                Account_Id: r.Account_Id ?? (r.get ? r.get('Account_Id') : ''),
                Cloud: r.Cloud ?? (r.get ? r.get('Cloud') : ''),
                Environments: r.Environments ?? (r.get ? r.get('Environments') : ''),
            }));
        }
        if (event.field === "getEntityProperties" || event.field === "getEntityEdges") {
            const { vertexType, searchValue, vertexId: directVertexId } = event.arguments;
            const cfg = searchConfig[vertexType];
            if (!cfg)
                throw new Error(`Unknown vertex type: ${vertexType}`);
            let vertexId = directVertexId;
            if (!vertexId) {
                let searchQuery = g.V().hasLabel(cfg.label);
                if (cfg.entityType) {
                    searchQuery = searchQuery.has('entityTypes', cfg.entityType);
                }
                const trimmedSv = (searchValue || '').trim();
                if (trimmedSv && trimmedSv !== '*') {
                    if (cfg.fields.length === 1) {
                        searchQuery = searchQuery.has(cfg.fields[0], TextP.containing(trimmedSv));
                    }
                    else {
                        searchQuery = searchQuery.or(...cfg.fields.map((f) => __.has(f, TextP.containing(trimmedSv))));
                    }
                }
                const vertexIds = await searchQuery.id().limit(1).toList();
                if (vertexIds.length === 0)
                    return [];
                vertexId = vertexIds[0];
            }
            if (event.field === "getEntityProperties") {
                const result = await g.V(vertexId).valueMap().toList();
                if (result.length === 0)
                    return [];
                const vertexMap = result[0];
                const properties = [];
                const entries = vertexMap instanceof Map ? Array.from(vertexMap.entries()) : Object.entries(vertexMap);
                for (const [key, val] of entries) {
                    const propValue = Array.isArray(val) ? String(val[0]) : String(val);
                    if (propValue !== undefined && propValue !== 'undefined' && propValue !== '') {
                        properties.push({ key: String(key), value: propValue });
                    }
                }
                return properties;
            }
            if (event.field === "getEntityEdges") {
                const outEdges = await g.V(vertexId)
                    .outE()
                    .project('edgeLabel', 'targetLabel', 'targetName')
                    .by(__.label())
                    .by(__.inV().label())
                    .by(__.inV().coalesce(__.values('companyName'), __.values('name'), __.values('jobName'), __.values('partName'), __.values('make'), __.constant('Unknown')))
                    .toList();
                const inEdges = await g.V(vertexId)
                    .inE()
                    .project('edgeLabel', 'targetLabel', 'targetName')
                    .by(__.label())
                    .by(__.outV().label())
                    .by(__.outV().coalesce(__.values('companyName'), __.values('name'), __.values('jobName'), __.values('partName'), __.values('make'), __.constant('Unknown')))
                    .toList();
                const edges = [];
                for (const e of outEdges) {
                    edges.push({
                        edgeLabel: e.edgeLabel ?? (e.get ? e.get('edgeLabel') : ''),
                        direction: 'outgoing',
                        targetLabel: e.targetLabel ?? (e.get ? e.get('targetLabel') : ''),
                        targetName: e.targetName ?? (e.get ? e.get('targetName') : ''),
                    });
                }
                for (const e of inEdges) {
                    edges.push({
                        edgeLabel: e.edgeLabel ?? (e.get ? e.get('edgeLabel') : ''),
                        direction: 'incoming',
                        targetLabel: e.targetLabel ?? (e.get ? e.get('targetLabel') : ''),
                        targetName: e.targetName ?? (e.get ? e.get('targetName') : ''),
                    });
                }
                return edges;
            }
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
        throw error;
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVlcnlHcmFwaC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInF1ZXJ5R3JhcGgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsNEVBQTRFO0FBQzVFLHlFQUF5RTtBQUN6RSwyRUFBMkU7QUFDM0Usd0VBQXdFO0FBQ3hFLE9BQVEsVUFBa0IsQ0FBQyxTQUFTLENBQUM7QUFFckMsbUNBQW1DO0FBQ25DLHVEQUErRDtBQUUvRCxNQUFNLHNCQUFzQixHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsc0JBQXNCLENBQUM7QUFDckUsTUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDNUIsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLENBQUM7QUFDckUsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7QUFDbkMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7QUFDN0IsTUFBTSxPQUFPLEdBQVksS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFO0lBQzlDLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQztJQUNoQixNQUFNLG9CQUFvQixHQUFHLEdBQUcsRUFBRTtRQUNoQyxPQUFPLElBQUEsd0JBQWdCLEVBQ3JCLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQzVCLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUN4QixFQUFFLEVBQ0YsVUFBVSxFQUNWLEtBQUssQ0FDTixDQUFDO0lBQ0osQ0FBQyxDQUFDO0lBRUYsTUFBTSxzQkFBc0IsR0FBRyxHQUFHLEVBQUU7UUFDbEMsTUFBTSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsR0FBRyxvQkFBb0IsRUFBRSxDQUFDO1FBRWhELE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDakIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFP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LENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDakUsQ0FBQyxDQUFDLENBQUM7WUFDSCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUM7UUFDeEMsQ0FBQztJQUNILENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ3BCLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkIsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDckMsTUFBTSxLQUFLLENBQUM7SUFDZCxDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBaGRXLFFBQUEsT0FBTyxXQWdkbEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBIYW5kbGVyIH0gZnJvbSBcImF3cy1sYW1iZGFcIjtcblxuLy8gTm9kZSAyMisgZGVmaW5lcyBhIGdsb2JhbCBXZWJTb2NrZXQgdmlhIHVuZGljaS4gZ3JlbWxpbi1hd3Mtc2lndjQgaW5qZWN0c1xuLy8gU2lnVjQgaGVhZGVycyB0aHJvdWdoIHRoZSB3cy1ucG0gQVBJOyBpZiBncmVtbGluIHBpY2tzIHVwIHRoZSBidWlsdC1pblxuLy8gV2ViU29ja2V0IGluc3RlYWQsIGF1dGggaGVhZGVycyBhcmUgZHJvcHBlZCBhbmQgTmVwdHVuZSByZXR1cm5zIG5vbi0xMDEuXG4vLyBSZW1vdmluZyB0aGUgZ2xvYmFsIGZvcmNlcyBncmVtbGluIHRvIHVzZSB0aGUgYnVuZGxlZCB3cyBucG0gcGFja2FnZS5cbmRlbGV0ZSAoZ2xvYmFsVGhpcyBhcyBhbnkpLldlYlNvY2tldDtcblxuaW1wb3J0ICogYXMgZ3JlbWxpbiBmcm9tIFwiZ3JlbWxpblwiO1xuaW1wb3J0IHsgZ2V0VXJsQW5kSGVhZGVycyB9IGZyb20gXCJncmVtbGluLWF3cy1zaWd2NC9saWIvdXRpbHNcIjtcblxuY29uc3QgRHJpdmVyUmVtb3RlQ29ubmVjdGlvbiA9IGdyZW1saW4uZHJpdmVyLkRyaXZlclJlbW90ZUNvbm5lY3Rpb247XG5jb25zdCBQID0gZ3JlbWxpbi5wcm9jZXNzLlA7XG5jb25zdCB0cmF2ZXJzYWwgPSBncmVtbGluLnByb2Nlc3MuQW5vbnltb3VzVHJhdmVyc2FsU291cmNlLnRyYXZlcnNhbDtcbmNvbnN0IF9fID0gZ3JlbWxpbi5wcm9jZXNzLnN0YXRpY3M7XG5jb25zdCBUZXh0UCA9IGdyZW1saW4ucHJvY2Vzcy5UZXh0UDtcbmV4cG9ydCBjb25zdCBoYW5kbGVyOiBIYW5kbGVyID0gYXN5bmMgKGV2ZW50KSA9PiB7XG4gIGxldCBjb25uID0gbnVsbDtcbiAgY29uc3QgZ2V0Q29ubmVjdGlvbkRldGFpbHMgPSAoKSA9PiB7XG4gICAgcmV0dXJuIGdldFVybEFuZEhlYWRlcnMoXG4gICAgICBwcm9jZXNzLmVudi5ORVBUVU5FX0VORFBPSU5ULFxuICAgICAgcHJvY2Vzcy5lbnYuTkVQVFVORV9QT1JULFxuICAgICAge30sXG4gICAgICBcIi9ncmVtbGluXCIsXG4gICAgICBcIndzc1wiXG4gICAgKTtcbiAgfTtcblxuICBjb25zdCBjcmVhdGVSZW1vdGVDb25uZWN0aW9uID0gKCkgPT4ge1xuICAgIGNvbnN0IHsgdXJsLCBoZWFkZXJzIH0gPSBnZXRDb25uZWN0aW9uRGV0YWlscygpO1xuXG4gICAgY29uc29sZS5sb2codXJsKTtcbiAgICBjb25zb2xlLmxvZyhoZWFkZXJzKTtcbiAgICBjb25zdCBjID0gbmV3IERyaXZlclJlbW90ZUNvbm5lY3Rpb24odXJsLCB7XG4gICAgICBtaW1lVHlwZTogXCJhcHBsaWNhdGlvbi92bmQuZ3JlbWxpbi12Mi4wK2pzb25cIixcbiAgICAgIGhlYWRlcnM6IGhlYWRlcnMsXG4gICAgfSk7XG4gICAgYy5fY2xpZW50Ll9jb25uZWN0aW9uLm9uKFwiY2xvc2VcIiwgKGNvZGUsIG1lc3NhZ2UpID0+IHtcbiAgICAgIGNvbnNvbGUuaW5mbyhgY2xvc2UgLSAke2NvZGV9ICR7bWVzc2FnZX1gKTtcbiAgICAgIGlmIChjb2RlID09IDEwMDYpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkNvbm5lY3Rpb24gY2xvc2VkIHByZW1hdHVyZWx5XCIpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb25uZWN0aW9uIGNsb3NlZCBwcmVtYXR1cmVseVwiKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gYztcbiAgfTtcblxuICBsZXQgZztcblxuICBjb25zdCB0eXBlID0gZXZlbnQuYXJndW1lbnRzLnR5cGU7XG4gIGNvbnNvbGUubG9nKHR5cGUpO1xuICB0cnkge1xuICAgIGlmIChjb25uID09IG51bGwpIHtcbiAgICAgIGNvbnNvbGUuaW5mbyhcIkluaXRpYWxpemluZyBjb25uZWN0aW9uXCIpO1xuICAgICAgY29ubiA9IGNyZWF0ZVJlbW90ZUNvbm5lY3Rpb24oKTtcbiAgICAgIGcgPSB0cmF2ZXJzYWwoKS53aXRoUmVtb3RlKGNvbm4pO1xuICAgIH1cblxuICAgIC8vIEVudGl0eSBzZWFyY2ggaGFuZGxlcnNcbiAgICBjb25zdCBzZWFyY2hDb25maWc6IFJlY29yZDxzdHJpbmcsIHsgbGFiZWw6IHN0cmluZzsgZmllbGRzOiBzdHJpbmdbXTsgZW50aXR5VHlwZT86IHN0cmluZyB9PiA9IHtcbiAgICAgIENvbXBhbnk6IHsgbGFiZWw6ICdFbnRpdHknLCBmaWVsZHM6IFsnY29tcGFueU5hbWUnXSwgZW50aXR5VHlwZTogJ0NvbXBhbnknIH0sXG4gICAgICBDdXN0b21lcjogeyBsYWJlbDogJ0VudGl0eScsIGZpZWxkczogWyduYW1lJ10sIGVudGl0eVR5cGU6ICdDdXN0b21lcicgfSxcbiAgICAgIEVzdGltYXRvcjogeyBsYWJlbDogJ0VudGl0eScsIGZpZWxkczogWyduYW1lJ10sIGVudGl0eVR5cGU6ICdFc3RpbWF0b3InIH0sXG4gICAgICBKb2JiZXI6IHsgbGFiZWw6ICdFbnRpdHknLCBmaWVsZHM6IFsnY29tcGFueU5hbWUnXSwgZW50aXR5VHlwZTogJ0pvYmJlcicgfSxcbiAgICAgIEFzc2V0OiB7IGxhYmVsOiAnQXNzZXQnLCBmaWVsZHM6IFsnbWFrZScsICdtb2RlbCcsICd2aW4nXSB9LFxuICAgICAgSm9iOiB7IGxhYmVsOiAnSm9iJywgZmllbGRzOiBbJ2pvYk5hbWUnXSB9LFxuICAgICAgUGFydDogeyBsYWJlbDogJ1BhcnQnLCBmaWVsZHM6IFsncGFydE5hbWUnXSB9LFxuICAgICAgUHJvamVjdF9EYXRhOiB7IGxhYmVsOiAnUHJvamVjdF9EYXRhJywgZmllbGRzOiBbJ3Byb2plY3ROYW1lJ10gfSxcbiAgICB9O1xuXG4gICAgaWYgKGV2ZW50LmZpZWxkID09PSBcInNlYXJjaEVudGl0aWVzXCIpIHtcbiAgICAgIGNvbnN0IHsgdmVydGV4VHlwZSwgc2VhcmNoVmFsdWUgfSA9IGV2ZW50LmFyZ3VtZW50cztcbiAgICAgIGNvbnN0IGNmZyA9IHNlYXJjaENvbmZpZ1t2ZXJ0ZXhUeXBlXTtcbiAgICAgIGlmICghY2ZnKSB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdmVydGV4IHR5cGU6ICR7dmVydGV4VHlwZX1gKTtcblxuICAgICAgbGV0IHNlYXJjaFF1ZXJ5ID0gZyEuVigpLmhhc0xhYmVsKGNmZy5sYWJlbCk7XG4gICAgICBpZiAoY2ZnLmVudGl0eVR5cGUpIHtcbiAgICAgICAgc2VhcmNoUXVlcnkgPSBzZWFyY2hRdWVyeS5oYXMoJ2VudGl0eVR5cGVzJywgY2ZnLmVudGl0eVR5cGUpO1xuICAgICAgfVxuXG4gICAgICAvLyBPbmx5IGFwcGx5IHRleHQgZmlsdGVyIGlmIHNlYXJjaFZhbHVlIGlzIG5vbi1lbXB0eVxuICAgICAgY29uc3QgdHJpbW1lZCA9IChzZWFyY2hWYWx1ZSB8fCAnJykudHJpbSgpO1xuICAgICAgaWYgKHRyaW1tZWQgJiYgdHJpbW1lZCAhPT0gJyonKSB7XG4gICAgICAgIGlmIChjZmcuZmllbGRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgIHNlYXJjaFF1ZXJ5ID0gc2VhcmNoUXVlcnkuaGFzKGNmZy5maWVsZHNbMF0sIFRleHRQLmNvbnRhaW5pbmcodHJpbW1lZCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNlYXJjaFF1ZXJ5ID0gc2VhcmNoUXVlcnkub3IoXG4gICAgICAgICAgICAuLi5jZmcuZmllbGRzLm1hcCgoZjogc3RyaW5nKSA9PiBfXy5oYXMoZiwgVGV4dFAuY29udGFpbmluZyh0cmltbWVkKSkpXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgc2VhcmNoUXVlcnlcbiAgICAgICAgLnByb2plY3QoJ2lkJywgJ25hbWUnLCAnbGFiZWwnLCAnZW50aXR5VHlwZScpXG4gICAgICAgIC5ieShfXy5pZCgpKVxuICAgICAgICAuYnkoX18uY29hbGVzY2UoXG4gICAgICAgICAgX18udmFsdWVzKCdjb21wYW55TmFtZScpLFxuICAgICAgICAgIF9fLnZhbHVlcygnbmFtZScpLFxuICAgICAgICAgIF9fLnZhbHVlcygnam9iTmFtZScpLFxuICAgICAgICAgIF9fLnZhbHVlcygncGFydE5hbWUnKSxcbiAgICAgICAgICBfXy52YWx1ZXMoJ21ha2UnKSxcbiAgICAgICAgICBfXy5jb25zdGFudCgnVW5rbm93bicpXG4gICAgICAgICkpXG4gICAgICAgIC5ieShfXy5sYWJlbCgpKVxuICAgICAgICAuYnkoX18uY29hbGVzY2UoX18udmFsdWVzKCdlbnRpdHlUeXBlcycpLCBfXy5jb25zdGFudCgnJykpKVxuICAgICAgICAubGltaXQoNTApXG4gICAgICAgIC50b0xpc3QoKTtcblxuICAgICAgcmV0dXJuIHJlc3VsdHMubWFwKChyOiBhbnkpID0+ICh7XG4gICAgICAgIGlkOiByLmlkID8/IChyLmdldCA/IHIuZ2V0KCdpZCcpIDogdW5kZWZpbmVkKSxcbiAgICAgICAgbmFtZTogci5uYW1lID8/IChyLmdldCA/IHIuZ2V0KCduYW1lJykgOiB1bmRlZmluZWQpLFxuICAgICAgICBsYWJlbDogci5sYWJlbCA/PyAoci5nZXQgPyByLmdldCgnbGFiZWwnKSA6IHVuZGVmaW5lZCksXG4gICAgICAgIGVudGl0eVR5cGU6IHIuZW50aXR5VHlwZSB8fCAoci5nZXQgPyByLmdldCgnZW50aXR5VHlwZScpIDogbnVsbCkgfHwgbnVsbCxcbiAgICAgIH0pKTtcbiAgICB9XG5cbiAgICBpZiAoZXZlbnQuZmllbGQgPT09IFwic2VhcmNoUHJvamVjdHNcIikge1xuICAgICAgY29uc3QgeyBzZWFyY2hWYWx1ZSB9ID0gZXZlbnQuYXJndW1lbnRzO1xuICAgICAgY29uc3QgdHJpbW1lZCA9IChzZWFyY2hWYWx1ZSB8fCAnJykudHJpbSgpO1xuXG4gICAgICBsZXQgc2VhcmNoUXVlcnkgPSBnIS5WKCkuaGFzTGFiZWwoJ1Byb2plY3RfRGF0YScpO1xuICAgICAgaWYgKHRyaW1tZWQpIHtcbiAgICAgICAgc2VhcmNoUXVlcnkgPSBzZWFyY2hRdWVyeS5oYXMoJ3Byb2plY3ROYW1lJywgVGV4dFAuY29udGFpbmluZyh0cmltbWVkKSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBzZWFyY2hRdWVyeVxuICAgICAgICAucHJvamVjdCgnaWQnLCAncHJvamVjdE5hbWUnLCAnRGVwYXJ0bWVudE51bWJlcicsICdEYXRhQ2xhc3NpZmljYXRpb24nLCAnVGVhbScsICdPd25lckdyb3VwJywgJ1JlY292ZXJ5JywgJ1RpZXInKVxuICAgICAgICAuYnkoX18uaWQoKSlcbiAgICAgICAgLmJ5KF9fLmNvYWxlc2NlKF9fLnZhbHVlcygncHJvamVjdE5hbWUnKSwgX18uY29uc3RhbnQoJycpKSlcbiAgICAgICAgLmJ5KF9fLmNvYWxlc2NlKF9fLnZhbHVlcygnRGVwYXJ0bWVudE51bWJlcicpLCBfXy5jb25zdGFudCgnJykpKVxuICAgICAgICAuYnkoX18uY29hbGVzY2UoX18udmFsdWVzKCdEYXRhQ2xhc3NpZmljYXRpb24nKSwgX18uY29uc3RhbnQoJycpKSlcbiAgICAgICAgLmJ5KF9fLmNvYWxlc2NlKF9fLnZhbHVlcygnVGVhbScpLCBfXy5jb25zdGFudCgnJykpKVxuICAgICAgICAuYnkoX18uY29hbGVzY2UoX18udmFsdWVzKCdPd25lckdyb3VwJyksIF9fLmNvbnN0YW50KCcnKSkpXG4gICAgICAgIC5ieShfXy5jb2FsZXNjZShfXy52YWx1ZXMoJ1JlY292ZXJ5JyksIF9fLmNvbnN0YW50KCcnKSkpXG4gICAgICAgIC5ieShfXy5jb2FsZXNjZShfXy52YWx1ZXMoJ1RpZXInKSwgX18uY29uc3RhbnQoJycpKSlcbiAgICAgICAgLmxpbWl0KDIwMClcbiAgICAgICAgLnRvTGlzdCgpO1xuXG4gICAgICByZXR1cm4gcmVzdWx0cy5tYXAoKHI6IGFueSkgPT4gKHtcbiAgICAgICAgaWQ6IHIuaWQgPz8gKHIuZ2V0ID8gci5nZXQoJ2lkJykgOiB1bmRlZmluZWQpLFxuICAgICAgICBwcm9qZWN0TmFtZTogci5wcm9qZWN0TmFtZSA/PyAoci5nZXQgPyByLmdldCgncHJvamVjdE5hbWUnKSA6ICcnKSxcbiAgICAgICAgRGVwYXJ0bWVudE51bWJlcjogci5EZXBhcnRtZW50TnVtYmVyID8/IChyLmdldCA/IHIuZ2V0KCdEZXBhcnRtZW50TnVtYmVyJykgOiAnJyksXG4gICAgICAgIERhdGFDbGFzc2lmaWNhdGlvbjogci5EYXRhQ2xhc3NpZmljYXRpb24gPz8gKHIuZ2V0ID8gci5nZXQoJ0RhdGFDbGFzc2lmaWNhdGlvbicpIDogJycpLFxuICAgICAgICBUZWFtOiByLlRlYW0gPz8gKHIuZ2V0ID8gci5nZXQoJ1RlYW0nKSA6ICcnKSxcbiAgICAgICAgT3duZXJHcm91cDogci5Pd25lckdyb3VwID8/IChyLmdldCA/IHIuZ2V0KCdPd25lckdyb3VwJykgOiAnJyksXG4gICAgICAgIFJlY292ZXJ5OiByLlJlY292ZXJ5ID8/IChyLmdldCA/IHIuZ2V0KCdSZWNvdmVyeScpIDogJycpLFxuICAgICAgICBUaWVyOiByLlRpZXIgPz8gKHIuZ2V0ID8gci5nZXQoJ1RpZXInKSA6ICcnKSxcbiAgICAgIH0pKTtcbiAgICB9XG5cbiAgICBpZiAoZXZlbnQuZmllbGQgPT09IFwiZ2V0UHJvamVjdEFjY291bnRzXCIpIHtcbiAgICAgIGNvbnN0IHsgcHJvamVjdE5hbWUgfSA9IGV2ZW50LmFyZ3VtZW50cztcblxuICAgICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IGchLlYoKVxuICAgICAgICAuaGFzTGFiZWwoJ1Byb2plY3RfRGF0YScpXG4gICAgICAgIC5oYXMoJ3Byb2plY3ROYW1lJywgcHJvamVjdE5hbWUpXG4gICAgICAgIC5pbl8oJ293bmVkX2J5JylcbiAgICAgICAgLmhhc0xhYmVsKCdBY2NvdW50JylcbiAgICAgICAgLnByb2plY3QoJ2lkJywgJ0FjY291bnRfTmFtZScsICdBY2NvdW50X0lkJywgJ0Nsb3VkJywgJ0Vudmlyb25tZW50cycpXG4gICAgICAgIC5ieShfXy5pZCgpKVxuICAgICAgICAuYnkoX18uY29hbGVzY2UoX18udmFsdWVzKCdBY2NvdW50X05hbWUnKSwgX18uY29uc3RhbnQoJycpKSlcbiAgICAgICAgLmJ5KF9fLmNvYWxlc2NlKF9fLnZhbHVlcygnQWNjb3VudF9JZCcpLCBfXy5jb25zdGFudCgnJykpKVxuICAgICAgICAuYnkoX18uY29hbGVzY2UoX18udmFsdWVzKCdDbG91ZCcpLCBfXy5jb25zdGFudCgnJykpKVxuICAgICAgICAuYnkoX18uY29hbGVzY2UoX18udmFsdWVzKCdFbnZpcm9ubWVudHMnKSwgX18uY29uc3RhbnQoJycpKSlcbiAgICAgICAgLnRvTGlzdCgpO1xuXG4gICAgICByZXR1cm4gcmVzdWx0cy5tYXAoKHI6IGFueSkgPT4gKHtcbiAgICAgICAgaWQ6IHIuaWQgPz8gKHIuZ2V0ID8gci5nZXQoJ2lkJykgOiB1bmRlZmluZWQpLFxuICAgICAgICBBY2NvdW50X05hbWU6IHIuQWNjb3VudF9OYW1lID8/IChyLmdldCA/IHIuZ2V0KCdBY2NvdW50X05hbWUnKSA6ICcnKSxcbiAgICAgICAgQWNjb3VudF9JZDogci5BY2NvdW50X0lkID8/IChyLmdldCA/IHIuZ2V0KCdBY2NvdW50X0lkJykgOiAnJyksXG4gICAgICAgIENsb3VkOiByLkNsb3VkID8/IChyLmdldCA/IHIuZ2V0KCdDbG91ZCcpIDogJycpLFxuICAgICAgICBFbnZpcm9ubWVudHM6IHIuRW52aXJvbm1lbnRzID8/IChyLmdldCA/IHIuZ2V0KCdFbnZpcm9ubWVudHMnKSA6ICcnKSxcbiAgICAgIH0pKTtcbiAgICB9XG5cbiAgICBpZiAoZXZlbnQuZmllbGQgPT09IFwiZ2V0RW50aXR5UHJvcGVydGllc1wiIHx8IGV2ZW50LmZpZWxkID09PSBcImdldEVudGl0eUVkZ2VzXCIpIHtcbiAgICAgIGNvbnN0IHsgdmVydGV4VHlwZSwgc2VhcmNoVmFsdWUsIHZlcnRleElkOiBkaXJlY3RWZXJ0ZXhJZCB9ID0gZXZlbnQuYXJndW1lbnRzO1xuICAgICAgY29uc3QgY2ZnID0gc2VhcmNoQ29uZmlnW3ZlcnRleFR5cGVdO1xuICAgICAgaWYgKCFjZmcpIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB2ZXJ0ZXggdHlwZTogJHt2ZXJ0ZXhUeXBlfWApO1xuXG4gICAgICBsZXQgdmVydGV4SWQgPSBkaXJlY3RWZXJ0ZXhJZDtcbiAgICAgIGlmICghdmVydGV4SWQpIHtcbiAgICAgICAgbGV0IHNlYXJjaFF1ZXJ5ID0gZyEuVigpLmhhc0xhYmVsKGNmZy5sYWJlbCk7XG4gICAgICAgIGlmIChjZmcuZW50aXR5VHlwZSkge1xuICAgICAgICAgIHNlYXJjaFF1ZXJ5ID0gc2VhcmNoUXVlcnkuaGFzKCdlbnRpdHlUeXBlcycsIGNmZy5lbnRpdHlUeXBlKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB0cmltbWVkU3YgPSAoc2VhcmNoVmFsdWUgfHwgJycpLnRyaW0oKTtcbiAgICAgICAgaWYgKHRyaW1tZWRTdiAmJiB0cmltbWVkU3YgIT09ICcqJykge1xuICAgICAgICAgIGlmIChjZmcuZmllbGRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgc2VhcmNoUXVlcnkgPSBzZWFyY2hRdWVyeS5oYXMoY2ZnLmZpZWxkc1swXSwgVGV4dFAuY29udGFpbmluZyh0cmltbWVkU3YpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VhcmNoUXVlcnkgPSBzZWFyY2hRdWVyeS5vcihcbiAgICAgICAgICAgICAgLi4uY2ZnLmZpZWxkcy5tYXAoKGY6IHN0cmluZykgPT4gX18uaGFzKGYsIFRleHRQLmNvbnRhaW5pbmcodHJpbW1lZFN2KSkpXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zdCB2ZXJ0ZXhJZHMgPSBhd2FpdCBzZWFyY2hRdWVyeS5pZCgpLmxpbWl0KDEpLnRvTGlzdCgpO1xuICAgICAgICBpZiAodmVydGV4SWRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFtdO1xuICAgICAgICB2ZXJ0ZXhJZCA9IHZlcnRleElkc1swXTtcbiAgICAgIH1cblxuICAgICAgaWYgKGV2ZW50LmZpZWxkID09PSBcImdldEVudGl0eVByb3BlcnRpZXNcIikge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBnIS5WKHZlcnRleElkKS52YWx1ZU1hcCgpLnRvTGlzdCgpO1xuICAgICAgICBpZiAocmVzdWx0Lmxlbmd0aCA9PT0gMCkgcmV0dXJuIFtdO1xuICAgICAgICBjb25zdCB2ZXJ0ZXhNYXAgPSByZXN1bHRbMF07XG4gICAgICAgIGNvbnN0IHByb3BlcnRpZXM6IEFycmF5PHsga2V5OiBzdHJpbmc7IHZhbHVlOiBzdHJpbmcgfT4gPSBbXTtcbiAgICAgICAgY29uc3QgZW50cmllcyA9IHZlcnRleE1hcCBpbnN0YW5jZW9mIE1hcCA/IEFycmF5LmZyb20odmVydGV4TWFwLmVudHJpZXMoKSkgOiBPYmplY3QuZW50cmllcyh2ZXJ0ZXhNYXApO1xuICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbF0gb2YgZW50cmllcykge1xuICAgICAgICAgIGNvbnN0IHByb3BWYWx1ZSA9IEFycmF5LmlzQXJyYXkodmFsKSA/IFN0cmluZyh2YWxbMF0pIDogU3RyaW5nKHZhbCk7XG4gICAgICAgICAgaWYgKHByb3BWYWx1ZSAhPT0gdW5kZWZpbmVkICYmIHByb3BWYWx1ZSAhPT0gJ3VuZGVmaW5lZCcgJiYgcHJvcFZhbHVlICE9PSAnJykge1xuICAgICAgICAgICAgcHJvcGVydGllcy5wdXNoKHsga2V5OiBTdHJpbmcoa2V5KSwgdmFsdWU6IHByb3BWYWx1ZSB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByb3BlcnRpZXM7XG4gICAgICB9XG5cbiAgICAgIGlmIChldmVudC5maWVsZCA9PT0gXCJnZXRFbnRpdHlFZGdlc1wiKSB7XG4gICAgICAgIGNvbnN0IG91dEVkZ2VzID0gYXdhaXQgZyEuVih2ZXJ0ZXhJZClcbiAgICAgICAgICAub3V0RSgpXG4gICAgICAgICAgLnByb2plY3QoJ2VkZ2VMYWJlbCcsICd0YXJnZXRMYWJlbCcsICd0YXJnZXROYW1lJylcbiAgICAgICAgICAuYnkoX18ubGFiZWwoKSlcbiAgICAgICAgICAuYnkoX18uaW5WKCkubGFiZWwoKSlcbiAgICAgICAgICAuYnkoX18uaW5WKCkuY29hbGVzY2UoXG4gICAgICAgICAgICBfXy52YWx1ZXMoJ2NvbXBhbnlOYW1lJyksXG4gICAgICAgICAgICBfXy52YWx1ZXMoJ25hbWUnKSxcbiAgICAgICAgICAgIF9fLnZhbHVlcygnam9iTmFtZScpLFxuICAgICAgICAgICAgX18udmFsdWVzKCdwYXJ0TmFtZScpLFxuICAgICAgICAgICAgX18udmFsdWVzKCdtYWtlJyksXG4gICAgICAgICAgICBfXy5jb25zdGFudCgnVW5rbm93bicpXG4gICAgICAgICAgKSlcbiAgICAgICAgICAudG9MaXN0KCk7XG5cbiAgICAgICAgY29uc3QgaW5FZGdlcyA9IGF3YWl0IGchLlYodmVydGV4SWQpXG4gICAgICAgICAgLmluRSgpXG4gICAgICAgICAgLnByb2plY3QoJ2VkZ2VMYWJlbCcsICd0YXJnZXRMYWJlbCcsICd0YXJnZXROYW1lJylcbiAgICAgICAgICAuYnkoX18ubGFiZWwoKSlcbiAgICAgICAgICAuYnkoX18ub3V0VigpLmxhYmVsKCkpXG4gICAgICAgICAgLmJ5KF9fLm91dFYoKS5jb2FsZXNjZShcbiAgICAgICAgICAgIF9fLnZhbHVlcygnY29tcGFueU5hbWUnKSxcbiAgICAgICAgICAgIF9fLnZhbHVlcygnbmFtZScpLFxuICAgICAgICAgICAgX18udmFsdWVzKCdqb2JOYW1lJyksXG4gICAgICAgICAgICBfXy52YWx1ZXMoJ3BhcnROYW1lJyksXG4gICAgICAgICAgICBfXy52YWx1ZXMoJ21ha2UnKSxcbiAgICAgICAgICAgIF9fLmNvbnN0YW50KCdVbmtub3duJylcbiAgICAgICAgICApKVxuICAgICAgICAgIC50b0xpc3QoKTtcblxuICAgICAgICBjb25zdCBlZGdlczogQXJyYXk8eyBlZGdlTGFiZWw6IHN0cmluZzsgZGlyZWN0aW9uOiBzdHJpbmc7IHRhcmdldExhYmVsOiBzdHJpbmc7IHRhcmdldE5hbWU6IHN0cmluZyB9PiA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGUgb2Ygb3V0RWRnZXMpIHtcbiAgICAgICAgICBlZGdlcy5wdXNoKHtcbiAgICAgICAgICAgIGVkZ2VMYWJlbDogZS5lZGdlTGFiZWwgPz8gKGUuZ2V0ID8gZS5nZXQoJ2VkZ2VMYWJlbCcpIDogJycpLFxuICAgICAgICAgICAgZGlyZWN0aW9uOiAnb3V0Z29pbmcnLFxuICAgICAgICAgICAgdGFyZ2V0TGFiZWw6IGUudGFyZ2V0TGFiZWwgPz8gKGUuZ2V0ID8gZS5nZXQoJ3RhcmdldExhYmVsJykgOiAnJyksXG4gICAgICAgICAgICB0YXJnZXROYW1lOiBlLnRhcmdldE5hbWUgPz8gKGUuZ2V0ID8gZS5nZXQoJ3RhcmdldE5hbWUnKSA6ICcnKSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGUgb2YgaW5FZGdlcykge1xuICAgICAgICAgIGVkZ2VzLnB1c2goe1xuICAgICAgICAgICAgZWRnZUxhYmVsOiBlLmVkZ2VMYWJlbCA/PyAoZS5nZXQgPyBlLmdldCgnZWRnZUxhYmVsJykgOiAnJyksXG4gICAgICAgICAgICBkaXJlY3Rpb246ICdpbmNvbWluZycsXG4gICAgICAgICAgICB0YXJnZXRMYWJlbDogZS50YXJnZXRMYWJlbCA/PyAoZS5nZXQgPyBlLmdldCgndGFyZ2V0TGFiZWwnKSA6ICcnKSxcbiAgICAgICAgICAgIHRhcmdldE5hbWU6IGUudGFyZ2V0TmFtZSA/PyAoZS5nZXQgPyBlLmdldCgndGFyZ2V0TmFtZScpIDogJycpLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlZGdlcztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodHlwZSA9PT0gXCJwcm9maWxlXCIpIHtcbiAgICAgIGNvbnNvbGUubG9nKGcpO1xuICAgICAgbGV0IHVzYWdlO1xuICAgICAgbGV0IGJlbG9uZ190bztcbiAgICAgIGxldCBhdXRob3JlZF9ieTtcbiAgICAgIGxldCBhZmZpbGlhdGVkX3dpdGg7XG4gICAgICBsZXQgcGVvcGxlO1xuICAgICAgbGV0IG1hZGVfYnk7XG4gICAgICBsZXQgc2VhcmNoX25hbWUgPSBhd2FpdCBnIVxuICAgICAgICAuVihldmVudC5hcmd1bWVudHMubmFtZSlcbiAgICAgICAgLnZhbHVlcyhcIm5hbWVcIilcbiAgICAgICAgLnRvTGlzdCgpO1xuICAgICAgc3dpdGNoIChldmVudC5hcmd1bWVudHMudmFsdWUpIHtcbiAgICAgICAgY2FzZSBcInBlcnNvblwiOlxuICAgICAgICAgIHVzYWdlID0gYXdhaXQgZ1xuICAgICAgICAgICAgLlYoKVxuICAgICAgICAgICAgLmhhcyhldmVudC5hcmd1bWVudHMudmFsdWUsIFwibmFtZVwiLCBldmVudC5hcmd1bWVudHMubmFtZSlcbiAgICAgICAgICAgIC5ib3RoRSgpXG4gICAgICAgICAgICAuaGFzTGFiZWwoXCJ1c2FnZVwiKVxuICAgICAgICAgICAgLm90aGVyVigpXG4gICAgICAgICAgICAudmFsdWVzKFwibmFtZVwiKVxuICAgICAgICAgICAgLnRvTGlzdCgpO1xuICAgICAgICAgIGJlbG9uZ190byA9IGF3YWl0IGdcbiAgICAgICAgICAgIC5WKClcbiAgICAgICAgICAgIC5oYXMoZXZlbnQuYXJndW1lbnRzLnZhbHVlLCBcIm5hbWVcIiwgZXZlbnQuYXJndW1lbnRzLm5hbWUpXG4gICAgICAgICAgICAuYm90aEUoKVxuICAgICAgICAgICAgLmhhc0xhYmVsKFwiYmVsb25nX3RvXCIpXG4gICAgICAgICAgICAub3RoZXJWKClcbiAgICAgICAgICAgIC52YWx1ZXMoXCJuYW1lXCIpXG4gICAgICAgICAgICAudG9MaXN0KCk7XG4gICAgICAgICAgYXV0aG9yZWRfYnkgPSBhd2FpdCBnXG4gICAgICAgICAgICAuVigpXG4gICAgICAgICAgICAuaGFzKGV2ZW50LmFyZ3VtZW50cy52YWx1ZSwgXCJuYW1lXCIsIGV2ZW50LmFyZ3VtZW50cy5uYW1lKVxuICAgICAgICAgICAgLmJvdGhFKClcbiAgICAgICAgICAgIC5oYXNMYWJlbChcImF1dGhvcmVkX2J5XCIpXG4gICAgICAgICAgICAub3RoZXJWKClcbiAgICAgICAgICAgIC52YWx1ZXMoXCJuYW1lXCIpXG4gICAgICAgICAgICAudG9MaXN0KCk7XG4gICAgICAgICAgYWZmaWxpYXRlZF93aXRoID0gYXdhaXQgZ1xuICAgICAgICAgICAgLlYoKVxuICAgICAgICAgICAgLmhhcyhldmVudC5hcmd1bWVudHMudmFsdWUsIFwibmFtZVwiLCBldmVudC5hcmd1bWVudHMubmFtZSlcbiAgICAgICAgICAgIC5ib3RoRSgpXG4gICAgICAgICAgICAuaGFzTGFiZWwoXCJhZmZpbGlhdGVkX3dpdGhcIilcbiAgICAgICAgICAgIC5vdGhlclYoKVxuICAgICAgICAgICAgLnZhbHVlcyhcIm5hbWVcIilcbiAgICAgICAgICAgIC50b0xpc3QoKTtcbiAgICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgeyBzZWFyY2hfbmFtZSwgdXNhZ2UsIGJlbG9uZ190bywgYXV0aG9yZWRfYnksIGFmZmlsaWF0ZWRfd2l0aCB9LFxuICAgICAgICAgIF07XG4gICAgICAgIGNhc2UgXCJpZFwiOlxuICAgICAgICAgIHVzYWdlID0gYXdhaXQgZ1xuICAgICAgICAgICAgLlYoKVxuICAgICAgICAgICAgLmhhc0lkKGV2ZW50LmFyZ3VtZW50cy5uYW1lKVxuICAgICAgICAgICAgLmJvdGhFKClcbiAgICAgICAgICAgIC5oYXNMYWJlbChcInVzYWdlXCIpXG4gICAgICAgICAgICAub3RoZXJWKClcbiAgICAgICAgICAgIC52YWx1ZXMoXCJuYW1lXCIpXG4gICAgICAgICAgICAudG9MaXN0KCk7XG4gICAgICAgICAgaWYgKGV2ZW50LmFyZ3VtZW50cy5uYW1lLm1hdGNoKC9Eb2MvKSkge1xuICAgICAgICAgICAgYmVsb25nX3RvID0gYXdhaXQgZ1xuICAgICAgICAgICAgICAuVigpXG4gICAgICAgICAgICAgIC5oYXNJZChldmVudC5hcmd1bWVudHMubmFtZSlcbiAgICAgICAgICAgICAgLmJvdGhFKClcbiAgICAgICAgICAgICAgLmhhc0xhYmVsKFwiYmVsb25nX3RvXCIpXG4gICAgICAgICAgICAgIC5vdGhlclYoKVxuICAgICAgICAgICAgICAudmFsdWVzKFwibmFtZVwiKVxuICAgICAgICAgICAgICAudG9MaXN0KCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJlbG9uZ190byA9IFtdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBhdXRob3JlZF9ieSA9IGF3YWl0IGdcbiAgICAgICAgICAgIC5WKClcbiAgICAgICAgICAgIC5oYXNJZChldmVudC5hcmd1bWVudHMubmFtZSlcbiAgICAgICAgICAgIC5ib3RoRSgpXG4gICAgICAgICAgICAuaGFzTGFiZWwoXCJhdXRob3JlZF9ieVwiKVxuICAgICAgICAgICAgLm90aGVyVigpXG4gICAgICAgICAgICAudmFsdWVzKFwibmFtZVwiKVxuICAgICAgICAgICAgLnRvTGlzdCgpO1xuICAgICAgICAgIGFmZmlsaWF0ZWRfd2l0aCA9IGF3YWl0IGdcbiAgICAgICAgICAgIC5WKClcbiAgICAgICAgICAgIC5oYXNJZChldmVudC5hcmd1bWVudHMubmFtZSlcbiAgICAgICAgICAgIC5ib3RoRSgpXG4gICAgICAgICAgICAuaGFzTGFiZWwoXCJhZmZpbGlhdGVkX3dpdGhcIilcbiAgICAgICAgICAgIC5vdGhlclYoKVxuICAgICAgICAgICAgLnZhbHVlcyhcIm5hbWVcIilcbiAgICAgICAgICAgIC50b0xpc3QoKTtcbiAgICAgICAgICBpZiAoZXZlbnQuYXJndW1lbnRzLm5hbWUubWF0Y2goL1Byb2QvKSkge1xuICAgICAgICAgICAgbWFkZV9ieSA9IGF3YWl0IGdcbiAgICAgICAgICAgICAgLlYoKVxuICAgICAgICAgICAgICAuaGFzSWQoZXZlbnQuYXJndW1lbnRzLm5hbWUpXG4gICAgICAgICAgICAgIC5vdXQoXCJtYWRlX2J5XCIpXG4gICAgICAgICAgICAgIC52YWx1ZXMoXCJuYW1lXCIpXG4gICAgICAgICAgICAgIC50b0xpc3QoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbWFkZV9ieSA9IFtdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZXZlbnQuYXJndW1lbnRzLm5hbWUubWF0Y2goL0NvbmYvKSkge1xuICAgICAgICAgICAgcGVvcGxlID0gYXdhaXQgZ1xuICAgICAgICAgICAgICAuVigpXG4gICAgICAgICAgICAgIC5oYXNJZChldmVudC5hcmd1bWVudHMubmFtZSlcbiAgICAgICAgICAgICAgLmluXygpXG4gICAgICAgICAgICAgIC52YWx1ZXMoXCJuYW1lXCIpXG4gICAgICAgICAgICAgIC50b0xpc3QoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVvcGxlID0gW107XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChldmVudC5hcmd1bWVudHMubmFtZS5tYXRjaCgvSW5zdC8pKSB7XG4gICAgICAgICAgICBhZmZpbGlhdGVkX3dpdGggPSBbXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgc2VhcmNoX25hbWUsXG4gICAgICAgICAgICAgIHVzYWdlLFxuICAgICAgICAgICAgICBiZWxvbmdfdG8sXG4gICAgICAgICAgICAgIGF1dGhvcmVkX2J5LFxuICAgICAgICAgICAgICBhZmZpbGlhdGVkX3dpdGgsXG4gICAgICAgICAgICAgIG1hZGVfYnksXG4gICAgICAgICAgICAgIHBlb3BsZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXTtcbiAgICAgICAgY2FzZSBcInByb2R1Y3RcIjpcbiAgICAgICAgICBjb25zb2xlLmxvZyhldmVudC5hcmd1bWVudHMpO1xuICAgICAgICAgIG1hZGVfYnkgPSBhd2FpdCBnXG4gICAgICAgICAgICAuVigpXG4gICAgICAgICAgICAuaGFzKGV2ZW50LmFyZ3VtZW50cy52YWx1ZSwgXCJuYW1lXCIsIGV2ZW50LmFyZ3VtZW50cy5uYW1lKVxuICAgICAgICAgICAgLm91dChcIm1hZGVfYnlcIilcbiAgICAgICAgICAgIC52YWx1ZXMoXCJuYW1lXCIpXG4gICAgICAgICAgICAudG9MaXN0KCk7XG4gICAgICAgICAgcmV0dXJuIFt7IHNlYXJjaF9uYW1lLCBtYWRlX2J5IH1dO1xuICAgICAgICBjYXNlIFwiY29uZmVyZW5jZVwiOlxuICAgICAgICAgIGNvbnNvbGUubG9nKGV2ZW50LmFyZ3VtZW50cyk7XG4gICAgICAgICAgcGVvcGxlID0gYXdhaXQgZ1xuICAgICAgICAgICAgLlYoKVxuICAgICAgICAgICAgLmhhcyhldmVudC5hcmd1bWVudHMudmFsdWUsIFwibmFtZVwiLCBldmVudC5hcmd1bWVudHMubmFtZSlcbiAgICAgICAgICAgIC5pbl8oKVxuICAgICAgICAgICAgLnZhbHVlcyhcIm5hbWVcIilcbiAgICAgICAgICAgIC50b0xpc3QoKTtcbiAgICAgICAgICByZXR1cm4gW3sgc2VhcmNoX25hbWUsIHBlb3BsZSB9XTtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBjb25zb2xlLmxvZyhcImRlZmF1bHRcIik7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSBcInJlbGF0aW9uXCIpIHtcbiAgICAgIHN3aXRjaCAoZXZlbnQuYXJndW1lbnRzLnZhbHVlKSB7XG4gICAgICAgIGNhc2UgXCJwZXJzb25cIjpcbiAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBnXG4gICAgICAgICAgICAuVigpXG4gICAgICAgICAgICAuaGFzKGV2ZW50LmFyZ3VtZW50cy52YWx1ZSwgXCJuYW1lXCIsIGV2ZW50LmFyZ3VtZW50cy5uYW1lKVxuICAgICAgICAgICAgLmFzKGV2ZW50LmFyZ3VtZW50cy52YWx1ZSlcbiAgICAgICAgICAgIC5vdXQoXCJiZWxvbmdfdG9cIilcbiAgICAgICAgICAgIC5pbl8oKVxuICAgICAgICAgICAgLndoZXJlKFAubmVxKGV2ZW50LmFyZ3VtZW50cy52YWx1ZSkpXG4gICAgICAgICAgICAudmFsdWVzKFwibmFtZVwiKVxuICAgICAgICAgICAgLmRlZHVwKClcbiAgICAgICAgICAgIC50b0xpc3QoKTtcbiAgICAgICAgICByZXR1cm4gcmVzdWx0Lm1hcCgocjogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4geyBuYW1lOiByIH07XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgY2FzZSBcInByb2R1Y3RcIjpcbiAgICAgICAgICBjb25zdCByZXN1bHQyID0gYXdhaXQgZ1xuICAgICAgICAgICAgLlYoKVxuICAgICAgICAgICAgLmhhcyhldmVudC5hcmd1bWVudHMudmFsdWUsIFwibmFtZVwiLCBldmVudC5hcmd1bWVudHMubmFtZSlcbiAgICAgICAgICAgIC5hcyhldmVudC5hcmd1bWVudHMudmFsdWUpXG4gICAgICAgICAgICAuaW5fKFwidXNhZ2VcIilcbiAgICAgICAgICAgIC5hcyhcInBcIilcbiAgICAgICAgICAgIC5pbl8oXCJhdXRob3JlZF9ieVwiKVxuICAgICAgICAgICAgLm91dCgpXG4gICAgICAgICAgICAud2hlcmUoUC5uZXEoXCJwXCIpKVxuICAgICAgICAgICAgLnZhbHVlcyhcIm5hbWVcIilcbiAgICAgICAgICAgIC5kZWR1cCgpXG4gICAgICAgICAgICAudG9MaXN0KCk7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdDIubWFwKChyOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgIHJldHVybiB7IG5hbWU6IHIgfTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgY2FzZSBcImNvbmZlcmVuY2VcIjpcbiAgICAgICAgICBjb25zb2xlLmxvZyhldmVudC5hcmd1bWVudHMpO1xuICAgICAgICAgIGNvbnN0IHJlc3VsdDMgPSBhd2FpdCBnXG4gICAgICAgICAgICAuVigpXG4gICAgICAgICAgICAuaGFzKGV2ZW50LmFyZ3VtZW50cy52YWx1ZSwgXCJuYW1lXCIsIGV2ZW50LmFyZ3VtZW50cy5uYW1lKVxuICAgICAgICAgICAgLmFzKGV2ZW50LmFyZ3VtZW50cy52YWx1ZSlcbiAgICAgICAgICAgIC5pbl8oKVxuICAgICAgICAgICAgLmFzKFwicFwiKVxuICAgICAgICAgICAgLm91dCgpXG4gICAgICAgICAgICAuaGFzTGFiZWwoXCJwZXJzb25cIilcbiAgICAgICAgICAgIC53aGVyZShQLm5lcShcInBcIikpXG4gICAgICAgICAgICAudmFsdWVzKFwibmFtZVwiKVxuICAgICAgICAgICAgLmRlZHVwKClcbiAgICAgICAgICAgIC50b0xpc3QoKTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQzKTtcbiAgICAgICAgICByZXR1cm4gcmVzdWx0My5tYXAoKHI6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogciB9O1xuICAgICAgICAgIH0pO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGVmYXVsdFwiKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZy5WKCkudG9MaXN0KCk7XG4gICAgICBjb25zdCB2ZXJ0ZXggPSByZXN1bHQubWFwKChyOiBhbnkpID0+IHtcbiAgICAgICAgcmV0dXJuIHsgaWQ6IHIuaWQsIGxhYmVsOiByLmxhYmVsIH07XG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHJlc3VsdDIgPSBhd2FpdCBnLkUoKS50b0xpc3QoKTtcbiAgICAgIGNvbnN0IGVkZ2UgPSByZXN1bHQyLm1hcCgocjogYW55KSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKHIpO1xuICAgICAgICByZXR1cm4geyBzb3VyY2U6IHIub3V0Vi5pZCwgdGFyZ2V0OiByLmluVi5pZCwgdmFsdWU6IHIubGFiZWwgfTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHsgbm9kZXM6IHZlcnRleCwgbGlua3M6IGVkZ2UgfTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgY29uc29sZS5lcnJvcihKU09OLnN0cmluZ2lmeShlcnJvcikpO1xuICAgIHRocm93IGVycm9yO1xuICB9XG59O1xuIl19