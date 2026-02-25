"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const gremlin = require("gremlin");
const utils_1 = require("gremlin-aws-sigv4/lib/utils");
const Client = gremlin.driver.Client;
const BEDROCK_REGION = process.env.BEDROCK_REGION || "us-east-1";
const MODEL_ID = process.env.MODEL_ID || "amazon.nova-lite-v1:0";
const GRAPH_SCHEMA = `
Graph Schema:

VERTEX LABELS AND PROPERTIES:

1. Entity (~label: "Entity")
   - entityTypes:String — one of: "Company", "Customer", "Estimator", "Jobber", or "Jobber;Company"
   - companyType:String — e.g. "CollisionShop", "PPFInstaller" (only for Company/Jobber;Company)
   - name:String — person name (for Customer, Estimator)
   - companyName:String — company/business name (for Company, Jobber, Jobber;Company)
   - address:String, country:String, phone:String, email:String, website:String

2. Asset (~label: "Asset")
   - assetType:String — one of: "Vehicle", "Boat", "JetSki", "Camper", "RV", "Phone", "Equipment", "Home"
   - For Vehicle/Camper/RV: vin:String, year:Int, make:String, model:String
   - For Boat/JetSki: hullId:String, year:Int, make:String, model:String
   - For Boat: lengthFt:Double, boatType:String
   - For Phone: imei:String, brand:String, model:String, carrier:String, phoneNumber:String
   - For Equipment: serialNumber:String, brand:String, model:String, equipmentType:String
   - For Home: address:String, squareFeet:Int, yearBuilt:Int
   - For RV: rvClass:String, lengthFt:Double
   - For Camper: lengthFt:Double

3. Job (~label: "Job")
   - roNumber:String — repair order number (e.g. "RO-102938")
   - jobName:String — description (e.g. "Front Bumper PPF Replacement")
   - jobCategory:String — e.g. "PPF"
   - payerType:String — "Insurance" or "Customer"
   - createdDate:String, status:String ("Draft","Approved","Scheduled"), statusDate:String

4. Part (~label: "Part")
   - partId:String — part identifier (e.g. "jb1_front_bumper")
   - partName:String — display name (e.g. "Front Bumper")
   - retailCost:Double — retail price

EDGE LABELS AND PROPERTIES:

1. WORKS_FOR: Entity(Estimator) -> Entity(Company)
   - role:String (e.g. "estimator")

2. REQUESTS_WORK: Entity(Customer) -> Entity(Company), or Entity(Company) -> Entity(Jobber)
   - role:String (e.g. "collision_repair", "ppf_install")

3. DOES_WORK_FOR: Entity(Jobber) -> Entity(Company), or Entity(Company) -> Entity(Customer)
   - role:String (e.g. "ppf_supplier", "collision_repair")
   - discountPercent:Int (optional, on Jobber->Company edges)

4. OWNS_ASSET: Entity(Customer) -> Asset
   - No extra properties

5. MANAGES_JOB: Entity(Estimator) -> Job
   - role:String (e.g. "estimator")

6. SERVICE_ON: Job -> Asset
   - No extra properties

7. PAYS_FOR: Entity(Customer) -> Job
   - payerType:String ("Insurance" or "Customer")

8. OFFERS_PART: Entity(Jobber) -> Part
   - No extra properties

9. HAS_LINE_ITEM: Job -> Part
   - partPosition:String (e.g. "Front", "FrontLeft", "FrontRight", "Left", "Right", "AllDoors", "Rear", "Hull")
   - finalPrice:Double
   - retailCostAtTime:Int
   - discountPercentAtTime:Int
   - isOverridden:Bool

10. JOBBER_FOR_JOB: Entity(Jobber) -> Job
    - No extra properties

VERTEX ID PATTERNS:
- Companies: entity_co_1..entity_co_10
- Customers: entity_cu_1..entity_cu_12
- Estimators: entity_es_1..entity_es_10
- Jobbers: entity_jb_1..entity_jb_5, entity_mr_1
- Vehicles: asset_v_1..asset_v_12
- Boats: asset_b_1..asset_b_2
- JetSkis: asset_js_1..asset_js_2
- Camper: asset_cm_1, RV: asset_rv_1, Phone: asset_ph_1, Equipment: asset_eq_1, Home: asset_hm_1
- Jobs: job_1..job_15
- Parts: part_1..part_20

Example Gremlin queries:
- List all collision shops: g.V().hasLabel('Entity').has('entityTypes','Company').values('companyName').toList()
- List all customers: g.V().hasLabel('Entity').has('entityTypes','Customer').values('name').toList()
- Get vehicles owned by a customer: g.V().has('Entity','name','David Ramirez').out('OWNS_ASSET').has('assetType','Vehicle').valueMap(true).toList()
- Find which company an estimator works for: g.V().has('Entity','name','Sarah Mitchell').out('WORKS_FOR').values('companyName').toList()
- Get all jobs for a vehicle: g.V('asset_v_1').in('SERVICE_ON').valueMap(true).toList()
- Get line items on a job: g.V('job_1').out('HAS_LINE_ITEM').valueMap(true).toList()
- Get total cost of a job: g.V('job_1').outE('HAS_LINE_ITEM').values('finalPrice').sum().next()
- Find which jobber supplied a job: g.V('job_1').in('JOBBER_FOR_JOB').values('companyName').toList()
- List all jobs managed by an estimator: g.V().has('Entity','name','Sarah Mitchell').out('MANAGES_JOB').valueMap(true).toList()
- Find customers of a collision shop: g.V().has('Entity','companyName','Elite Collision Center').in('REQUESTS_WORK').has('entityTypes','Customer').values('name').toList()
- Get parts offered by a jobber: g.V().has('Entity','companyName','Northwest PPF Solutions').out('OFFERS_PART').valueMap(true).toList()
- Count vertices by label: g.V().groupCount().by(label).next()
- Count edges by label: g.E().groupCount().by(label).next()
- Get all vertex labels: g.V().label().dedup().toList()
- Get all edge labels: g.E().label().dedup().toList()
`;
const SYSTEM_PROMPT = `You are a graph database assistant for an Amazon Neptune graph database that models a collision repair and PPF (Paint Protection Film) business network.

The business domain includes:
- **Collision Shops** (Companies) that repair vehicles
- **Customers** who bring vehicles and other assets for service
- **Estimators** who work for collision shops and manage repair jobs
- **Jobbers** (PPF film suppliers/installers) who supply parts to collision shops
- **Assets** owned by customers (Vehicles, Boats, JetSkis, Campers, RVs, Phones, Equipment, Homes)
- **Jobs** (repair orders) that track PPF installation work
- **Parts** (PPF film pieces like bumpers, fenders, hoods) offered by jobbers

${GRAPH_SCHEMA}

When a user asks a question about the graph data:
1. Determine if you need to query the graph to answer
2. If yes, generate a Gremlin query
3. Return your response as JSON

IMPORTANT RULES:
- Only generate READ queries (no mutations/drops)
- Use the Gremlin traversal language
- Edge labels are UPPERCASE (e.g. WORKS_FOR, OWNS_ASSET, HAS_LINE_ITEM)
- Use 'name' for people (Customers, Estimators) and 'companyName' for businesses (Companies, Jobbers)
- Always return valid JSON in this exact format:

If a query is needed:
{"needsQuery": true, "gremlinQuery": "<the gremlin traversal after g.>", "explanation": "<brief explanation of what the query does>"}

If no query is needed (general question about the schema, greetings, etc.):
{"needsQuery": false, "answer": "<your answer>", "explanation": ""}

Examples:
User: "What collision shops are in the system?"
{"needsQuery": true, "gremlinQuery": "V().hasLabel('Entity').has('entityTypes','Company').values('companyName').toList()", "explanation": "Lists all company names"}

User: "What vehicles does David Ramirez own?"
{"needsQuery": true, "gremlinQuery": "V().has('Entity','name','David Ramirez').out('OWNS_ASSET').has('assetType','Vehicle').valueMap('make','model','year','vin').toList()", "explanation": "Finds vehicles owned by David Ramirez"}

User: "How much does job RO-102938 cost?"
{"needsQuery": true, "gremlinQuery": "V().hasLabel('Job').has('roNumber','RO-102938').outE('HAS_LINE_ITEM').values('finalPrice').sum().next()", "explanation": "Sums the final prices of all line items on the job"}

User: "Who is the estimator for job 1?"
{"needsQuery": true, "gremlinQuery": "V('job_1').in('MANAGES_JOB').values('name').toList()", "explanation": "Finds the estimator managing job_1"}

User: "What types of data are in this graph?"
{"needsQuery": false, "answer": "The graph models a collision repair and PPF business network with: Entity vertices (Companies, Customers, Estimators, Jobbers), Asset vertices (Vehicles, Boats, JetSkis, Campers, RVs, etc.), Job vertices (repair orders), and Part vertices (PPF film pieces). Relationships include WORKS_FOR, REQUESTS_WORK, DOES_WORK_FOR, OWNS_ASSET, MANAGES_JOB, SERVICE_ON, PAYS_FOR, OFFERS_PART, HAS_LINE_ITEM, and JOBBER_FOR_JOB.", "explanation": ""}

User: "What discount does Northwest PPF Solutions give Elite Collision Center?"
{"needsQuery": true, "gremlinQuery": "V().has('Entity','companyName','Northwest PPF Solutions').outE('DOES_WORK_FOR').where(inV().has('companyName','Elite Collision Center')).values('discountPercent').toList()", "explanation": "Gets the discount percentage on the jobber-to-company relationship"}
`;
async function invokeBedrock(messages) {
    // Use AWS SDK v3 - dynamically import to work with Lambda bundling
    const { BedrockRuntimeClient, ConverseCommand } = await Promise.resolve().then(() => require("@aws-sdk/client-bedrock-runtime"));
    const client = new BedrockRuntimeClient({ region: BEDROCK_REGION });
    const command = new ConverseCommand({
        modelId: MODEL_ID,
        system: [{ text: SYSTEM_PROMPT }],
        messages: messages.map((m) => ({
            role: m.role,
            content: [{ text: m.content }],
        })),
        inferenceConfig: {
            maxTokens: 1024,
        },
    });
    const response = await client.send(command);
    const output = response.output?.message?.content;
    if (!output || output.length === 0 || !output[0].text) {
        throw new Error("Empty response from Bedrock");
    }
    return output[0].text;
}
// Gremlin steps that mutate the graph — these are not allowed in read-only mode
const MUTATION_PATTERN = /\b(addV|addE|addVertex|addEdge|drop|property|iterate|sideEffect|inject)\s*\(/i;
function validateGremlinQuery(queryString) {
    if (MUTATION_PATTERN.test(queryString)) {
        throw new Error("Query contains mutation operations which are not allowed");
    }
}
async function executeGremlin(queryString) {
    validateGremlinQuery(queryString);
    const { url, headers } = (0, utils_1.getUrlAndHeaders)(process.env.NEPTUNE_ENDPOINT, process.env.NEPTUNE_PORT, {}, "/gremlin", "wss");
    const client = new Client(url, {
        mimeType: "application/vnd.gremlin-v2.0+json",
        headers: headers,
    });
    try {
        // Submit the query string to the Gremlin server for server-side execution.
        // This avoids local JavaScript evaluation (no Function constructor / eval).
        const result = await client.submit(`g.${queryString}`);
        return result.toArray ? result.toArray() : result;
    }
    finally {
        try {
            await client.close();
        }
        catch (e) {
            console.warn("Error closing connection:", e);
        }
    }
}
const handler = async (event) => {
    console.log("AI Query event:", JSON.stringify(event));
    const question = event.arguments?.question;
    const conversationHistory = event.arguments?.history
        ? JSON.parse(event.arguments.history)
        : [];
    if (!question) {
        return {
            answer: "Please ask a question about the graph data. For example: 'What collision shops are in the system?', 'What vehicles does David Ramirez own?', or 'How much does job RO-102938 cost?'",
            query: null,
            data: null,
        };
    }
    try {
        // Build messages for Bedrock including conversation history
        const messages = [];
        for (const entry of conversationHistory) {
            messages.push({
                role: entry.role === "user" ? "user" : "assistant",
                content: entry.content,
            });
        }
        messages.push({
            role: "user",
            content: question,
        });
        // Converse API requires first message to be from "user" — strip leading assistant messages
        while (messages.length > 0 && messages[0].role !== "user") {
            messages.shift();
        }
        console.log("Sending messages to Bedrock:", JSON.stringify(messages.map(m => ({ role: m.role, len: m.content.length }))));
        // Call Bedrock to interpret the question
        const bedrockResponse = await invokeBedrock(messages);
        console.log("Bedrock response:", bedrockResponse);
        // Parse Bedrock's response - extract JSON from the text
        let parsed;
        try {
            // Try to extract JSON from the response
            const jsonMatch = bedrockResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            }
            else {
                parsed = JSON.parse(bedrockResponse);
            }
        }
        catch (parseError) {
            console.error("Failed to parse Bedrock response:", parseError);
            return {
                answer: bedrockResponse,
                query: null,
                data: null,
            };
        }
        if (!parsed.needsQuery) {
            return {
                answer: parsed.answer || bedrockResponse,
                query: null,
                data: null,
            };
        }
        // Execute the Gremlin query
        const gremlinQuery = parsed.gremlinQuery;
        console.log("Executing Gremlin query:", gremlinQuery);
        let queryResult;
        try {
            queryResult = await executeGremlin(gremlinQuery);
        }
        catch (queryError) {
            console.error("Gremlin query error:", queryError);
            const errorMessage = queryError instanceof Error ? queryError.message : String(queryError);
            return {
                answer: `I tried to query the graph but encountered an error. The query was: g.${gremlinQuery}. Error: ${errorMessage}`,
                query: `g.${gremlinQuery}`,
                data: null,
            };
        }
        // Format the result
        const resultStr = JSON.stringify(queryResult, null, 2);
        console.log("Query result:", resultStr);
        // Ask Bedrock to summarize the results
        const summaryMessages = [
            ...messages,
            {
                role: "assistant",
                content: `I executed the Gremlin query: g.${gremlinQuery}`,
            },
            {
                role: "user",
                content: `The query returned these results: ${resultStr}\n\nPlease provide a clear, concise natural language summary of these results to answer my original question. Do not return JSON, just a plain text answer.`,
            },
        ];
        const summary = await invokeBedrock(summaryMessages);
        return {
            answer: summary,
            query: `g.${gremlinQuery}`,
            data: resultStr,
        };
    }
    catch (error) {
        console.error("AI Query error:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            answer: `Sorry, I encountered an error processing your question: ${errorMessage}`,
            query: null,
            data: null,
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWlRdWVyeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFpUXVlcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsbUNBQW1DO0FBQ25DLHVEQUErRDtBQUUvRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztBQUVyQyxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsSUFBSSxXQUFXLENBQUM7QUFDakUsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLElBQUksdUJBQXVCLENBQUM7QUFFakUsTUFBTSxZQUFZLEdBQUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FvR3BCLENBQUM7QUFFRixNQUFNLGFBQWEsR0FBRzs7Ozs7Ozs7Ozs7RUFXcEIsWUFBWTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FzQ2IsQ0FBQztBQVlGLEtBQUssVUFBVSxhQUFhLENBQUMsUUFBMEI7SUFDckQsbUVBQW1FO0lBQ25FLE1BQU0sRUFBRSxvQkFBb0IsRUFBRSxlQUFlLEVBQUUsR0FBRywyQ0FDaEQsaUNBQWlDLEVBQ2xDLENBQUM7SUFFRixNQUFNLE1BQU0sR0FBRyxJQUFJLG9CQUFvQixDQUFDLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUM7SUFFcEUsTUFBTSxPQUFPLEdBQUcsSUFBSSxlQUFlLENBQUM7UUFDbEMsT0FBTyxFQUFFLFFBQVE7UUFDakIsTUFBTSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLENBQUM7UUFDakMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDN0IsSUFBSSxFQUFFLENBQUMs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QUssRUFBRSxJQUFJO1lBQ1gsSUFBSSxFQUFFLElBQUk7U0FDWCxDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQztBQTNIVyxRQUFBLE9BQU8sV0EySGxCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgSGFuZGxlciB9IGZyb20gXCJhd3MtbGFtYmRhXCI7XG5pbXBvcnQgKiBhcyBncmVtbGluIGZyb20gXCJncmVtbGluXCI7XG5pbXBvcnQgeyBnZXRVcmxBbmRIZWFkZXJzIH0gZnJvbSBcImdyZW1saW4tYXdzLXNpZ3Y0L2xpYi91dGlsc1wiO1xuXG5jb25zdCBDbGllbnQgPSBncmVtbGluLmRyaXZlci5DbGllbnQ7XG5cbmNvbnN0IEJFRFJPQ0tfUkVHSU9OID0gcHJvY2Vzcy5lbnYuQkVEUk9DS19SRUdJT04gfHwgXCJ1cy1lYXN0LTFcIjtcbmNvbnN0IE1PREVMX0lEID0gcHJvY2Vzcy5lbnYuTU9ERUxfSUQgfHwgXCJhbWF6b24ubm92YS1saXRlLXYxOjBcIjtcblxuY29uc3QgR1JBUEhfU0NIRU1BID0gYFxuR3JhcGggU2NoZW1hOlxuXG5WRVJURVggTEFCRUxTIEFORCBQUk9QRVJUSUVTOlxuXG4xLiBFbnRpdHkgKH5sYWJlbDogXCJFbnRpdHlcIilcbiAgIC0gZW50aXR5VHlwZXM6U3RyaW5nIOKAlCBvbmUgb2Y6IFwiQ29tcGFueVwiLCBcIkN1c3RvbWVyXCIsIFwiRXN0aW1hdG9yXCIsIFwiSm9iYmVyXCIsIG9yIFwiSm9iYmVyO0NvbXBhbnlcIlxuICAgLSBjb21wYW55VHlwZTpTdHJpbmcg4oCUIGUuZy4gXCJDb2xsaXNpb25TaG9wXCIsIFwiUFBGSW5zdGFsbGVyXCIgKG9ubHkgZm9yIENvbXBhbnkvSm9iYmVyO0NvbXBhbnkpXG4gICAtIG5hbWU6U3RyaW5nIOKAlCBwZXJzb24gbmFtZSAoZm9yIEN1c3RvbWVyLCBFc3RpbWF0b3IpXG4gICAtIGNvbXBhbnlOYW1lOlN0cmluZyDigJQgY29tcGFueS9idXNpbmVzcyBuYW1lIChmb3IgQ29tcGFueSwgSm9iYmVyLCBKb2JiZXI7Q29tcGFueSlcbiAgIC0gYWRkcmVzczpTdHJpbmcsIGNvdW50cnk6U3RyaW5nLCBwaG9uZTpTdHJpbmcsIGVtYWlsOlN0cmluZywgd2Vic2l0ZTpTdHJpbmdcblxuMi4gQXNzZXQgKH5sYWJlbDogXCJBc3NldFwiKVxuICAgLSBhc3NldFR5cGU6U3RyaW5nIOKAlCBvbmUgb2Y6IFwiVmVoaWNsZVwiLCBcIkJvYXRcIiwgXCJKZXRTa2lcIiwgXCJDYW1wZXJcIiwgXCJSVlwiLCBcIlBob25lXCIsIFwiRXF1aXBtZW50XCIsIFwiSG9tZVwiXG4gICAtIEZvciBWZWhpY2xlL0NhbXBlci9SVjogdmluOlN0cmluZywgeWVhcjpJbnQsIG1ha2U6U3RyaW5nLCBtb2RlbDpTdHJpbmdcbiAgIC0gRm9yIEJvYXQvSmV0U2tpOiBodWxsSWQ6U3RyaW5nLCB5ZWFyOkludCwgbWFrZTpTdHJpbmcsIG1vZGVsOlN0cmluZ1xuICAgLSBGb3IgQm9hdDogbGVuZ3RoRnQ6RG91YmxlLCBib2F0VHlwZTpTdHJpbmdcbiAgIC0gRm9yIFBob25lOiBpbWVpOlN0cmluZywgYnJhbmQ6U3RyaW5nLCBtb2RlbDpTdHJpbmcsIGNhcnJpZXI6U3RyaW5nLCBwaG9uZU51bWJlcjpTdHJpbmdcbiAgIC0gRm9yIEVxdWlwbWVudDogc2VyaWFsTnVtYmVyOlN0cmluZywgYnJhbmQ6U3RyaW5nLCBtb2RlbDpTdHJpbmcsIGVxdWlwbWVudFR5cGU6U3RyaW5nXG4gICAtIEZvciBIb21lOiBhZGRyZXNzOlN0cmluZywgc3F1YXJlRmVldDpJbnQsIHllYXJCdWlsdDpJbnRcbiAgIC0gRm9yIFJWOiBydkNsYXNzOlN0cmluZywgbGVuZ3RoRnQ6RG91YmxlXG4gICAtIEZvciBDYW1wZXI6IGxlbmd0aEZ0OkRvdWJsZVxuXG4zLiBKb2IgKH5sYWJlbDogXCJKb2JcIilcbiAgIC0gcm9OdW1iZXI6U3RyaW5nIOKAlCByZXBhaXIgb3JkZXIgbnVtYmVyIChlLmcuIFwiUk8tMTAyOTM4XCIpXG4gICAtIGpvYk5hbWU6U3RyaW5nIOKAlCBkZXNjcmlwdGlvbiAoZS5nLiBcIkZyb250IEJ1bXBlciBQUEYgUmVwbGFjZW1lbnRcIilcbiAgIC0gam9iQ2F0ZWdvcnk6U3RyaW5nIOKAlCBlLmcuIFwiUFBGXCJcbiAgIC0gcGF5ZXJUeXBlOlN0cmluZyDigJQgXCJJbnN1cmFuY2VcIiBvciBcIkN1c3RvbWVyXCJcbiAgIC0gY3JlYXRlZERhdGU6U3RyaW5nLCBzdGF0dXM6U3RyaW5nIChcIkRyYWZ0XCIsXCJBcHByb3ZlZFwiLFwiU2NoZWR1bGVkXCIpLCBzdGF0dXNEYXRlOlN0cmluZ1xuXG40LiBQYXJ0ICh+bGFiZWw6IFwiUGFydFwiKVxuICAgLSBwYXJ0SWQ6U3RyaW5nIOKAlCBwYXJ0IGlkZW50aWZpZXIgKGUuZy4gXCJqYjFfZnJvbnRfYnVtcGVyXCIpXG4gICAtIHBhcnROYW1lOlN0cmluZyDigJQgZGlzcGxheSBuYW1lIChlLmcuIFwiRnJvbnQgQnVtcGVyXCIpXG4gICAtIHJldGFpbENvc3Q6RG91YmxlIOKAlCByZXRhaWwgcHJpY2VcblxuRURHRSBMQUJFTFMgQU5EIFBST1BFUlRJRVM6XG5cbjEuIFdPUktTX0ZPUjogRW50aXR5KEVzdGltYXRvcikgLT4gRW50aXR5KENvbXBhbnkpXG4gICAtIHJvbGU6U3RyaW5nIChlLmcuIFwiZXN0aW1hdG9yXCIpXG5cbjIuIFJFUVVFU1RTX1dPUks6IEVudGl0eShDdXN0b21lcikgLT4gRW50aXR5KENvbXBhbnkpLCBvciBFbnRpdHkoQ29tcGFueSkgLT4gRW50aXR5KEpvYmJlcilcbiAgIC0gcm9sZTpTdHJpbmcgKGUuZy4gXCJjb2xsaXNpb25fcmVwYWlyXCIsIFwicHBmX2luc3RhbGxcIilcblxuMy4gRE9FU19XT1JLX0ZPUjogRW50aXR5KEpvYmJlcikgLT4gRW50aXR5KENvbXBhbnkpLCBvciBFbnRpdHkoQ29tcGFueSkgLT4gRW50aXR5KEN1c3RvbWVyKVxuICAgLSByb2xlOlN0cmluZyAoZS5nLiBcInBwZl9zdXBwbGllclwiLCBcImNvbGxpc2lvbl9yZXBhaXJcIilcbiAgIC0gZGlzY291bnRQZXJjZW50OkludCAob3B0aW9uYWwsIG9uIEpvYmJlci0+Q29tcGFueSBlZGdlcylcblxuNC4gT1dOU19BU1NFVDogRW50aXR5KEN1c3RvbWVyKSAtPiBBc3NldFxuICAgLSBObyBleHRyYSBwcm9wZXJ0aWVzXG5cbjUuIE1BTkFHRVNfSk9COiBFbnRpdHkoRXN0aW1hdG9yKSAtPiBKb2JcbiAgIC0gcm9sZTpTdHJpbmcgKGUuZy4gXCJlc3RpbWF0b3JcIilcblxuNi4gU0VSVklDRV9PTjogSm9iIC0+IEFzc2V0XG4gICAtIE5vIGV4dHJhIHByb3BlcnRpZXNcblxuNy4gUEFZU19GT1I6IEVudGl0eShDdXN0b21lcikgLT4gSm9iXG4gICAtIHBheWVyVHlwZTpTdHJpbmcgKFwiSW5zdXJhbmNlXCIgb3IgXCJDdXN0b21lclwiKVxuXG44LiBPRkZFUlNfUEFSVDogRW50aXR5KEpvYmJlcikgLT4gUGFydFxuICAgLSBObyBleHRyYSBwcm9wZXJ0aWVzXG5cbjkuIEhBU19MSU5FX0lURU06IEpvYiAtPiBQYXJ0XG4gICAtIHBhcnRQb3NpdGlvbjpTdHJpbmcgKGUuZy4gXCJGcm9udFwiLCBcIkZyb250TGVmdFwiLCBcIkZyb250UmlnaHRcIiwgXCJMZWZ0XCIsIFwiUmlnaHRcIiwgXCJBbGxEb29yc1wiLCBcIlJlYXJcIiwgXCJIdWxsXCIpXG4gICAtIGZpbmFsUHJpY2U6RG91YmxlXG4gICAtIHJldGFpbENvc3RBdFRpbWU6SW50XG4gICAtIGRpc2NvdW50UGVyY2VudEF0VGltZTpJbnRcbiAgIC0gaXNPdmVycmlkZGVuOkJvb2xcblxuMTAuIEpPQkJFUl9GT1JfSk9COiBFbnRpdHkoSm9iYmVyKSAtPiBKb2JcbiAgICAtIE5vIGV4dHJhIHByb3BlcnRpZXNcblxuVkVSVEVYIElEIFBBVFRFUk5TOlxuLSBDb21wYW5pZXM6IGVudGl0eV9jb18xLi5lbnRpdHlfY29fMTBcbi0gQ3VzdG9tZXJzOiBlbnRpdHlfY3VfMS4uZW50aXR5X2N1XzEyXG4tIEVzdGltYXRvcnM6IGVudGl0eV9lc18xLi5lbnRpdHlfZXNfMTBcbi0gSm9iYmVyczogZW50aXR5X2piXzEuLmVudGl0eV9qYl81LCBlbnRpdHlfbXJfMVxuLSBWZWhpY2xlczogYXNzZXRfdl8xLi5hc3NldF92XzEyXG4tIEJvYXRzOiBhc3NldF9iXzEuLmFzc2V0X2JfMlxuLSBKZXRTa2lzOiBhc3NldF9qc18xLi5hc3NldF9qc18yXG4tIENhbXBlcjogYXNzZXRfY21fMSwgUlY6IGFzc2V0X3J2XzEsIFBob25lOiBhc3NldF9waF8xLCBFcXVpcG1lbnQ6IGFzc2V0X2VxXzEsIEhvbWU6IGFzc2V0X2htXzFcbi0gSm9iczogam9iXzEuLmpvYl8xNVxuLSBQYXJ0czogcGFydF8xLi5wYXJ0XzIwXG5cbkV4YW1wbGUgR3JlbWxpbiBxdWVyaWVzOlxuLSBMaXN0IGFsbCBjb2xsaXNpb24gc2hvcHM6IGcuVigpLmhhc0xhYmVsKCdFbnRpdHknKS5oYXMoJ2VudGl0eVR5cGVzJywnQ29tcGFueScpLnZhbHVlcygnY29tcGFueU5hbWUnKS50b0xpc3QoKVxuLSBMaXN0IGFsbCBjdXN0b21lcnM6IGcuVigpLmhhc0xhYmVsKCdFbnRpdHknKS5oYXMoJ2VudGl0eVR5cGVzJywnQ3VzdG9tZXInKS52YWx1ZXMoJ25hbWUnKS50b0xpc3QoKVxuLSBHZXQgdmVoaWNsZXMgb3duZWQgYnkgYSBjdXN0b21lcjogZy5WKCkuaGFzKCdFbnRpdHknLCduYW1lJywnRGF2aWQgUmFtaXJleicpLm91dCgnT1dOU19BU1NFVCcpLmhhcygnYXNzZXRUeXBlJywnVmVoaWNsZScpLnZhbHVlTWFwKHRydWUpLnRvTGlzdCgpXG4tIEZpbmQgd2hpY2ggY29tcGFueSBhbiBlc3RpbWF0b3Igd29ya3MgZm9yOiBnLlYoKS5oYXMoJ0VudGl0eScsJ25hbWUnLCdTYXJhaCBNaXRjaGVsbCcpLm91dCgnV09SS1NfRk9SJykudmFsdWVzKCdjb21wYW55TmFtZScpLnRvTGlzdCgpXG4tIEdldCBhbGwgam9icyBmb3IgYSB2ZWhpY2xlOiBnLlYoJ2Fzc2V0X3ZfMScpLmluKCdTRVJWSUNFX09OJykudmFsdWVNYXAodHJ1ZSkudG9MaXN0KClcbi0gR2V0IGxpbmUgaXRlbXMgb24gYSBqb2I6IGcuVignam9iXzEnKS5vdXQoJ0hBU19MSU5FX0lURU0nKS52YWx1ZU1hcCh0cnVlKS50b0xpc3QoKVxuLSBHZXQgdG90YWwgY29zdCBvZiBhIGpvYjogZy5WKCdqb2JfMScpLm91dEUoJ0hBU19MSU5FX0lURU0nKS52YWx1ZXMoJ2ZpbmFsUHJpY2UnKS5zdW0oKS5uZXh0KClcbi0gRmluZCB3aGljaCBqb2JiZXIgc3VwcGxpZWQgYSBqb2I6IGcuVignam9iXzEnKS5pbignSk9CQkVSX0ZPUl9KT0InKS52YWx1ZXMoJ2NvbXBhbnlOYW1lJykudG9MaXN0KClcbi0gTGlzdCBhbGwgam9icyBtYW5hZ2VkIGJ5IGFuIGVzdGltYXRvcjogZy5WKCkuaGFzKCdFbnRpdHknLCduYW1lJywnU2FyYWggTWl0Y2hlbGwnKS5vdXQoJ01BTkFHRVNfSk9CJykudmFsdWVNYXAodHJ1ZSkudG9MaXN0KClcbi0gRmluZCBjdXN0b21lcnMgb2YgYSBjb2xsaXNpb24gc2hvcDogZy5WKCkuaGFzKCdFbnRpdHknLCdjb21wYW55TmFtZScsJ0VsaXRlIENvbGxpc2lvbiBDZW50ZXInKS5pbignUkVRVUVTVFNfV09SSycpLmhhcygnZW50aXR5VHlwZXMnLCdDdXN0b21lcicpLnZhbHVlcygnbmFtZScpLnRvTGlzdCgpXG4tIEdldCBwYXJ0cyBvZmZlcmVkIGJ5IGEgam9iYmVyOiBnLlYoKS5oYXMoJ0VudGl0eScsJ2NvbXBhbnlOYW1lJywnTm9ydGh3ZXN0IFBQRiBTb2x1dGlvbnMnKS5vdXQoJ09GRkVSU19QQVJUJykudmFsdWVNYXAodHJ1ZSkudG9MaXN0KClcbi0gQ291bnQgdmVydGljZXMgYnkgbGFiZWw6IGcuVigpLmdyb3VwQ291bnQoKS5ieShsYWJlbCkubmV4dCgpXG4tIENvdW50IGVkZ2VzIGJ5IGxhYmVsOiBnLkUoKS5ncm91cENvdW50KCkuYnkobGFiZWwpLm5leHQoKVxuLSBHZXQgYWxsIHZlcnRleCBsYWJlbHM6IGcuVigpLmxhYmVsKCkuZGVkdXAoKS50b0xpc3QoKVxuLSBHZXQgYWxsIGVkZ2UgbGFiZWxzOiBnLkUoKS5sYWJlbCgpLmRlZHVwKCkudG9MaXN0KClcbmA7XG5cbmNvbnN0IFNZU1RFTV9QUk9NUFQgPSBgWW91IGFyZSBhIGdyYXBoIGRhdGFiYXNlIGFzc2lzdGFudCBmb3IgYW4gQW1hem9uIE5lcHR1bmUgZ3JhcGggZGF0YWJhc2UgdGhhdCBtb2RlbHMgYSBjb2xsaXNpb24gcmVwYWlyIGFuZCBQUEYgKFBhaW50IFByb3RlY3Rpb24gRmlsbSkgYnVzaW5lc3MgbmV0d29yay5cblxuVGhlIGJ1c2luZXNzIGRvbWFpbiBpbmNsdWRlczpcbi0gKipDb2xsaXNpb24gU2hvcHMqKiAoQ29tcGFuaWVzKSB0aGF0IHJlcGFpciB2ZWhpY2xlc1xuLSAqKkN1c3RvbWVycyoqIHdobyBicmluZyB2ZWhpY2xlcyBhbmQgb3RoZXIgYXNzZXRzIGZvciBzZXJ2aWNlXG4tICoqRXN0aW1hdG9ycyoqIHdobyB3b3JrIGZvciBjb2xsaXNpb24gc2hvcHMgYW5kIG1hbmFnZSByZXBhaXIgam9ic1xuLSAqKkpvYmJlcnMqKiAoUFBGIGZpbG0gc3VwcGxpZXJzL2luc3RhbGxlcnMpIHdobyBzdXBwbHkgcGFydHMgdG8gY29sbGlzaW9uIHNob3BzXG4tICoqQXNzZXRzKiogb3duZWQgYnkgY3VzdG9tZXJzIChWZWhpY2xlcywgQm9hdHMsIEpldFNraXMsIENhbXBlcnMsIFJWcywgUGhvbmVzLCBFcXVpcG1lbnQsIEhvbWVzKVxuLSAqKkpvYnMqKiAocmVwYWlyIG9yZGVycykgdGhhdCB0cmFjayBQUEYgaW5zdGFsbGF0aW9uIHdvcmtcbi0gKipQYXJ0cyoqIChQUEYgZmlsbSBwaWVjZXMgbGlrZSBidW1wZXJzLCBmZW5kZXJzLCBob29kcykgb2ZmZXJlZCBieSBqb2JiZXJzXG5cbiR7R1JBUEhfU0NIRU1BfVxuXG5XaGVuIGEgdXNlciBhc2tzIGEgcXVlc3Rpb24gYWJvdXQgdGhlIGdyYXBoIGRhdGE6XG4xLiBEZXRlcm1pbmUgaWYgeW91IG5lZWQgdG8gcXVlcnkgdGhlIGdyYXBoIHRvIGFuc3dlclxuMi4gSWYgeWVzLCBnZW5lcmF0ZSBhIEdyZW1saW4gcXVlcnlcbjMuIFJldHVybiB5b3VyIHJlc3BvbnNlIGFzIEpTT05cblxuSU1QT1JUQU5UIFJVTEVTOlxuLSBPbmx5IGdlbmVyYXRlIFJFQUQgcXVlcmllcyAobm8gbXV0YXRpb25zL2Ryb3BzKVxuLSBVc2UgdGhlIEdyZW1saW4gdHJhdmVyc2FsIGxhbmd1YWdlXG4tIEVkZ2UgbGFiZWxzIGFyZSBVUFBFUkNBU0UgKGUuZy4gV09SS1NfRk9SLCBPV05TX0FTU0VULCBIQVNfTElORV9JVEVNKVxuLSBVc2UgJ25hbWUnIGZvciBwZW9wbGUgKEN1c3RvbWVycywgRXN0aW1hdG9ycykgYW5kICdjb21wYW55TmFtZScgZm9yIGJ1c2luZXNzZXMgKENvbXBhbmllcywgSm9iYmVycylcbi0gQWx3YXlzIHJldHVybiB2YWxpZCBKU09OIGluIHRoaXMgZXhhY3QgZm9ybWF0OlxuXG5JZiBhIHF1ZXJ5IGlzIG5lZWRlZDpcbntcIm5lZWRzUXVlcnlcIjogdHJ1ZSwgXCJncmVtbGluUXVlcnlcIjogXCI8dGhlIGdyZW1saW4gdHJhdmVyc2FsIGFmdGVyIGcuPlwiLCBcImV4cGxhbmF0aW9uXCI6IFwiPGJyaWVmIGV4cGxhbmF0aW9uIG9mIHdoYXQgdGhlIHF1ZXJ5IGRvZXM+XCJ9XG5cbklmIG5vIHF1ZXJ5IGlzIG5lZWRlZCAoZ2VuZXJhbCBxdWVzdGlvbiBhYm91dCB0aGUgc2NoZW1hLCBncmVldGluZ3MsIGV0Yy4pOlxue1wibmVlZHNRdWVyeVwiOiBmYWxzZSwgXCJhbnN3ZXJcIjogXCI8eW91ciBhbnN3ZXI+XCIsIFwiZXhwbGFuYXRpb25cIjogXCJcIn1cblxuRXhhbXBsZXM6XG5Vc2VyOiBcIldoYXQgY29sbGlzaW9uIHNob3BzIGFyZSBpbiB0aGUgc3lzdGVtP1wiXG57XCJuZWVkc1F1ZXJ5XCI6IHRydWUsIFwiZ3JlbWxpblF1ZXJ5XCI6IFwiVigpLmhhc0xhYmVsKCdFbnRpdHknKS5oYXMoJ2VudGl0eVR5cGVzJywnQ29tcGFueScpLnZhbHVlcygnY29tcGFueU5hbWUnKS50b0xpc3QoKVwiLCBcImV4cGxhbmF0aW9uXCI6IFwiTGlzdHMgYWxsIGNvbXBhbnkgbmFtZXNcIn1cblxuVXNlcjogXCJXaGF0IHZlaGljbGVzIGRvZXMgRGF2aWQgUmFtaXJleiBvd24/XCJcbntcIm5lZWRzUXVlcnlcIjogdHJ1ZSwgXCJncmVtbGluUXVlcnlcIjogXCJWKCkuaGFzKCdFbnRpdHknLCduYW1lJywnRGF2aWQgUmFtaXJleicpLm91dCgnT1dOU19BU1NFVCcpLmhhcygnYXNzZXRUeXBlJywnVmVoaWNsZScpLnZhbHVlTWFwKCdtYWtlJywnbW9kZWwnLCd5ZWFyJywndmluJykudG9MaXN0KClcIiwgXCJleHBsYW5hdGlvblwiOiBcIkZpbmRzIHZlaGljbGVzIG93bmVkIGJ5IERhdmlkIFJhbWlyZXpcIn1cblxuVXNlcjogXCJIb3cgbXVjaCBkb2VzIGpvYiBSTy0xMDI5MzggY29zdD9cIlxue1wibmVlZHNRdWVyeVwiOiB0cnVlLCBcImdyZW1saW5RdWVyeVwiOiBcIlYoKS5oYXNMYWJlbCgnSm9iJykuaGFzKCdyb051bWJlcicsJ1JPLTEwMjkzOCcpLm91dEUoJ0hBU19MSU5FX0lURU0nKS52YWx1ZXMoJ2ZpbmFsUHJpY2UnKS5zdW0oKS5uZXh0KClcIiwgXCJleHBsYW5hdGlvblwiOiBcIlN1bXMgdGhlIGZpbmFsIHByaWNlcyBvZiBhbGwgbGluZSBpdGVtcyBvbiB0aGUgam9iXCJ9XG5cblVzZXI6IFwiV2hvIGlzIHRoZSBlc3RpbWF0b3IgZm9yIGpvYiAxP1wiXG57XCJuZWVkc1F1ZXJ5XCI6IHRydWUsIFwiZ3JlbWxpblF1ZXJ5XCI6IFwiVignam9iXzEnKS5pbignTUFOQUdFU19KT0InKS52YWx1ZXMoJ25hbWUnKS50b0xpc3QoKVwiLCBcImV4cGxhbmF0aW9uXCI6IFwiRmluZHMgdGhlIGVzdGltYXRvciBtYW5hZ2luZyBqb2JfMVwifVxuXG5Vc2VyOiBcIldoYXQgdHlwZXMgb2YgZGF0YSBhcmUgaW4gdGhpcyBncmFwaD9cIlxue1wibmVlZHNRdWVyeVwiOiBmYWxzZSwgXCJhbnN3ZXJcIjogXCJUaGUgZ3JhcGggbW9kZWxzIGEgY29sbGlzaW9uIHJlcGFpciBhbmQgUFBGIGJ1c2luZXNzIG5ldHdvcmsgd2l0aDogRW50aXR5IHZlcnRpY2VzIChDb21wYW5pZXMsIEN1c3RvbWVycywgRXN0aW1hdG9ycywgSm9iYmVycyksIEFzc2V0IHZlcnRpY2VzIChWZWhpY2xlcywgQm9hdHMsIEpldFNraXMsIENhbXBlcnMsIFJWcywgZXRjLiksIEpvYiB2ZXJ0aWNlcyAocmVwYWlyIG9yZGVycyksIGFuZCBQYXJ0IHZlcnRpY2VzIChQUEYgZmlsbSBwaWVjZXMpLiBSZWxhdGlvbnNoaXBzIGluY2x1ZGUgV09SS1NfRk9SLCBSRVFVRVNUU19XT1JLLCBET0VTX1dPUktfRk9SLCBPV05TX0FTU0VULCBNQU5BR0VTX0pPQiwgU0VSVklDRV9PTiwgUEFZU19GT1IsIE9GRkVSU19QQVJULCBIQVNfTElORV9JVEVNLCBhbmQgSk9CQkVSX0ZPUl9KT0IuXCIsIFwiZXhwbGFuYXRpb25cIjogXCJcIn1cblxuVXNlcjogXCJXaGF0IGRpc2NvdW50IGRvZXMgTm9ydGh3ZXN0IFBQRiBTb2x1dGlvbnMgZ2l2ZSBFbGl0ZSBDb2xsaXNpb24gQ2VudGVyP1wiXG57XCJuZWVkc1F1ZXJ5XCI6IHRydWUsIFwiZ3JlbWxpblF1ZXJ5XCI6IFwiVigpLmhhcygnRW50aXR5JywnY29tcGFueU5hbWUnLCdOb3J0aHdlc3QgUFBGIFNvbHV0aW9ucycpLm91dEUoJ0RPRVNfV09SS19GT1InKS53aGVyZShpblYoKS5oYXMoJ2NvbXBhbnlOYW1lJywnRWxpdGUgQ29sbGlzaW9uIENlbnRlcicpKS52YWx1ZXMoJ2Rpc2NvdW50UGVyY2VudCcpLnRvTGlzdCgpXCIsIFwiZXhwbGFuYXRpb25cIjogXCJHZXRzIHRoZSBkaXNjb3VudCBwZXJjZW50YWdlIG9uIHRoZSBqb2JiZXItdG8tY29tcGFueSByZWxhdGlvbnNoaXBcIn1cbmA7XG5cbmludGVyZmFjZSBCZWRyb2NrTWVzc2FnZSB7XG4gIHJvbGU6IHN0cmluZztcbiAgY29udGVudDogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgQ29udmVyc2F0aW9uRW50cnkge1xuICByb2xlOiBzdHJpbmc7XG4gIGNvbnRlbnQ6IHN0cmluZztcbn1cblxuYXN5bmMgZnVuY3Rpb24gaW52b2tlQmVkcm9jayhtZXNzYWdlczogQmVkcm9ja01lc3NhZ2VbXSk6IFByb21pc2U8c3RyaW5nPiB7XG4gIC8vIFVzZSBBV1MgU0RLIHYzIC0gZHluYW1pY2FsbHkgaW1wb3J0IHRvIHdvcmsgd2l0aCBMYW1iZGEgYnVuZGxpbmdcbiAgY29uc3QgeyBCZWRyb2NrUnVudGltZUNsaWVudCwgQ29udmVyc2VDb21tYW5kIH0gPSBhd2FpdCBpbXBvcnQoXG4gICAgXCJAYXdzLXNkay9jbGllbnQtYmVkcm9jay1ydW50aW1lXCJcbiAgKTtcblxuICBjb25zdCBjbGllbnQgPSBuZXcgQmVkcm9ja1J1bnRpbWVDbGllbnQoeyByZWdpb246IEJFRFJPQ0tfUkVHSU9OIH0pO1xuXG4gIGNvbnN0IGNvbW1hbmQgPSBuZXcgQ29udmVyc2VDb21tYW5kKHtcbiAgICBtb2RlbElkOiBNT0RFTF9JRCxcbiAgICBzeXN0ZW06IFt7IHRleHQ6IFNZU1RFTV9QUk9NUFQgfV0sXG4gICAgbWVzc2FnZXM6IG1lc3NhZ2VzLm1hcCgobSkgPT4gKHtcbiAgICAgIHJvbGU6IG0ucm9sZSBhcyBcInVzZXJcIiB8IFwiYXNzaXN0YW50XCIsXG4gICAgICBjb250ZW50OiBbeyB0ZXh0OiBtLmNvbnRlbnQgfV0sXG4gICAgfSkpLFxuICAgIGluZmVyZW5jZUNvbmZpZzoge1xuICAgICAgbWF4VG9rZW5zOiAxMDI0LFxuICAgIH0sXG4gIH0pO1xuXG4gIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgY2xpZW50LnNlbmQoY29tbWFuZCk7XG4gIGNvbnN0IG91dHB1dCA9IHJlc3BvbnNlLm91dHB1dD8ubWVzc2FnZT8uY29udGVudDtcbiAgaWYgKCFvdXRwdXQgfHwgb3V0cHV0Lmxlbmd0aCA9PT0gMCB8fCAhb3V0cHV0WzBdLnRleHQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJFbXB0eSByZXNwb25zZSBmcm9tIEJlZHJvY2tcIik7XG4gIH1cbiAgcmV0dXJuIG91dHB1dFswXS50ZXh0O1xufVxuXG4vLyBHcmVtbGluIHN0ZXBzIHRoYXQgbXV0YXRlIHRoZSBncmFwaCDigJQgdGhlc2UgYXJlIG5vdCBhbGxvd2VkIGluIHJlYWQtb25seSBtb2RlXG5jb25zdCBNVVRBVElPTl9QQVRURVJOID1cbiAgL1xcYihhZGRWfGFkZEV8YWRkVmVydGV4fGFkZEVkZ2V8ZHJvcHxwcm9wZXJ0eXxpdGVyYXRlfHNpZGVFZmZlY3R8aW5qZWN0KVxccypcXCgvaTtcblxuZnVuY3Rpb24gdmFsaWRhdGVHcmVtbGluUXVlcnkocXVlcnlTdHJpbmc6IHN0cmluZyk6IHZvaWQge1xuICBpZiAoTVVUQVRJT05fUEFUVEVSTi50ZXN0KHF1ZXJ5U3RyaW5nKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIFwiUXVlcnkgY29udGFpbnMgbXV0YXRpb24gb3BlcmF0aW9ucyB3aGljaCBhcmUgbm90IGFsbG93ZWRcIlxuICAgICk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gZXhlY3V0ZUdyZW1saW4ocXVlcnlTdHJpbmc6IHN0cmluZyk6IFByb21pc2U8dW5rbm93bj4ge1xuICB2YWxpZGF0ZUdyZW1saW5RdWVyeShxdWVyeVN0cmluZyk7XG5cbiAgY29uc3QgeyB1cmwsIGhlYWRlcnMgfSA9IGdldFVybEFuZEhlYWRlcnMoXG4gICAgcHJvY2Vzcy5lbnYuTkVQVFVORV9FTkRQT0lOVCxcbiAgICBwcm9jZXNzLmVudi5ORVBUVU5FX1BPUlQsXG4gICAge30sXG4gICAgXCIvZ3JlbWxpblwiLFxuICAgIFwid3NzXCJcbiAgKTtcblxuICBjb25zdCBjbGllbnQgPSBuZXcgQ2xpZW50KHVybCwge1xuICAgIG1pbWVUeXBlOiBcImFwcGxpY2F0aW9uL3ZuZC5ncmVtbGluLXYyLjAranNvblwiLFxuICAgIGhlYWRlcnM6IGhlYWRlcnMsXG4gIH0pO1xuXG4gIHRyeSB7XG4gICAgLy8gU3VibWl0IHRoZSBxdWVyeSBzdHJpbmcgdG8gdGhlIEdyZW1saW4gc2VydmVyIGZvciBzZXJ2ZXItc2lkZSBleGVjdXRpb24uXG4gICAgLy8gVGhpcyBhdm9pZHMgbG9jYWwgSmF2YVNjcmlwdCBldmFsdWF0aW9uIChubyBGdW5jdGlvbiBjb25zdHJ1Y3RvciAvIGV2YWwpLlxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNsaWVudC5zdWJtaXQoYGcuJHtxdWVyeVN0cmluZ31gKTtcbiAgICByZXR1cm4gcmVzdWx0LnRvQXJyYXkgPyByZXN1bHQudG9BcnJheSgpIDogcmVzdWx0O1xuICB9IGZpbmFsbHkge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBjbGllbnQuY2xvc2UoKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBjb25zb2xlLndhcm4oXCJFcnJvciBjbG9zaW5nIGNvbm5lY3Rpb246XCIsIGUpO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgY29uc3QgaGFuZGxlcjogSGFuZGxlciA9IGFzeW5jIChldmVudCkgPT4ge1xuICBjb25zb2xlLmxvZyhcIkFJIFF1ZXJ5IGV2ZW50OlwiLCBKU09OLnN0cmluZ2lmeShldmVudCkpO1xuXG4gIGNvbnN0IHF1ZXN0aW9uID0gZXZlbnQuYXJndW1lbnRzPy5xdWVzdGlvbjtcbiAgY29uc3QgY29udmVyc2F0aW9uSGlzdG9yeTogQ29udmVyc2F0aW9uRW50cnlbXSA9IGV2ZW50LmFyZ3VtZW50cz8uaGlzdG9yeVxuICAgID8gSlNPTi5wYXJzZShldmVudC5hcmd1bWVudHMuaGlzdG9yeSlcbiAgICA6IFtdO1xuXG4gIGlmICghcXVlc3Rpb24pIHtcbiAgICByZXR1cm4ge1xuICAgICAgYW5zd2VyOlxuICAgICAgICBcIlBsZWFzZSBhc2sgYSBxdWVzdGlvbiBhYm91dCB0aGUgZ3JhcGggZGF0YS4gRm9yIGV4YW1wbGU6ICdXaGF0IGNvbGxpc2lvbiBzaG9wcyBhcmUgaW4gdGhlIHN5c3RlbT8nLCAnV2hhdCB2ZWhpY2xlcyBkb2VzIERhdmlkIFJhbWlyZXogb3duPycsIG9yICdIb3cgbXVjaCBkb2VzIGpvYiBSTy0xMDI5MzggY29zdD8nXCIsXG4gICAgICBxdWVyeTogbnVsbCxcbiAgICAgIGRhdGE6IG51bGwsXG4gICAgfTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgLy8gQnVpbGQgbWVzc2FnZXMgZm9yIEJlZHJvY2sgaW5jbHVkaW5nIGNvbnZlcnNhdGlvbiBoaXN0b3J5XG4gICAgY29uc3QgbWVzc2FnZXM6IEJlZHJvY2tNZXNzYWdlW10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgZW50cnkgb2YgY29udmVyc2F0aW9uSGlzdG9yeSkge1xuICAgICAgbWVzc2FnZXMucHVzaCh7XG4gICAgICAgIHJvbGU6IGVudHJ5LnJvbGUgPT09IFwidXNlclwiID8gXCJ1c2VyXCIgOiBcImFzc2lzdGFudFwiLFxuICAgICAgICBjb250ZW50OiBlbnRyeS5jb250ZW50LFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgbWVzc2FnZXMucHVzaCh7XG4gICAgICByb2xlOiBcInVzZXJcIixcbiAgICAgIGNvbnRlbnQ6IHF1ZXN0aW9uLFxuICAgIH0pO1xuXG4gICAgLy8gQ29udmVyc2UgQVBJIHJlcXVpcmVzIGZpcnN0IG1lc3NhZ2UgdG8gYmUgZnJvbSBcInVzZXJcIiDigJQgc3RyaXAgbGVhZGluZyBhc3Npc3RhbnQgbWVzc2FnZXNcbiAgICB3aGlsZSAobWVzc2FnZXMubGVuZ3RoID4gMCAmJiBtZXNzYWdlc1swXS5yb2xlICE9PSBcInVzZXJcIikge1xuICAgICAgbWVzc2FnZXMuc2hpZnQoKTtcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZyhcIlNlbmRpbmcgbWVzc2FnZXMgdG8gQmVkcm9jazpcIiwgSlNPTi5zdHJpbmdpZnkobWVzc2FnZXMubWFwKG0gPT4gKHsgcm9sZTogbS5yb2xlLCBsZW46IG0uY29udGVudC5sZW5ndGggfSkpKSk7XG5cbiAgICAvLyBDYWxsIEJlZHJvY2sgdG8gaW50ZXJwcmV0IHRoZSBxdWVzdGlvblxuICAgIGNvbnN0IGJlZHJvY2tSZXNwb25zZSA9IGF3YWl0IGludm9rZUJlZHJvY2sobWVzc2FnZXMpO1xuICAgIGNvbnNvbGUubG9nKFwiQmVkcm9jayByZXNwb25zZTpcIiwgYmVkcm9ja1Jlc3BvbnNlKTtcblxuICAgIC8vIFBhcnNlIEJlZHJvY2sncyByZXNwb25zZSAtIGV4dHJhY3QgSlNPTiBmcm9tIHRoZSB0ZXh0XG4gICAgbGV0IHBhcnNlZDtcbiAgICB0cnkge1xuICAgICAgLy8gVHJ5IHRvIGV4dHJhY3QgSlNPTiBmcm9tIHRoZSByZXNwb25zZVxuICAgICAgY29uc3QganNvbk1hdGNoID0gYmVkcm9ja1Jlc3BvbnNlLm1hdGNoKC9cXHtbXFxzXFxTXSpcXH0vKTtcbiAgICAgIGlmIChqc29uTWF0Y2gpIHtcbiAgICAgICAgcGFyc2VkID0gSlNPTi5wYXJzZShqc29uTWF0Y2hbMF0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFyc2VkID0gSlNPTi5wYXJzZShiZWRyb2NrUmVzcG9uc2UpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKHBhcnNlRXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gcGFyc2UgQmVkcm9jayByZXNwb25zZTpcIiwgcGFyc2VFcnJvcik7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBhbnN3ZXI6IGJlZHJvY2tSZXNwb25zZSxcbiAgICAgICAgcXVlcnk6IG51bGwsXG4gICAgICAgIGRhdGE6IG51bGwsXG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmICghcGFyc2VkLm5lZWRzUXVlcnkpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGFuc3dlcjogcGFyc2VkLmFuc3dlciB8fCBiZWRyb2NrUmVzcG9uc2UsXG4gICAgICAgIHF1ZXJ5OiBudWxsLFxuICAgICAgICBkYXRhOiBudWxsLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBFeGVjdXRlIHRoZSBHcmVtbGluIHF1ZXJ5XG4gICAgY29uc3QgZ3JlbWxpblF1ZXJ5ID0gcGFyc2VkLmdyZW1saW5RdWVyeTtcbiAgICBjb25zb2xlLmxvZyhcIkV4ZWN1dGluZyBHcmVtbGluIHF1ZXJ5OlwiLCBncmVtbGluUXVlcnkpO1xuXG4gICAgbGV0IHF1ZXJ5UmVzdWx0O1xuICAgIHRyeSB7XG4gICAgICBxdWVyeVJlc3VsdCA9IGF3YWl0IGV4ZWN1dGVHcmVtbGluKGdyZW1saW5RdWVyeSk7XG4gICAgfSBjYXRjaCAocXVlcnlFcnJvcjogdW5rbm93bikge1xuICAgICAgY29uc29sZS5lcnJvcihcIkdyZW1saW4gcXVlcnkgZXJyb3I6XCIsIHF1ZXJ5RXJyb3IpO1xuICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID1cbiAgICAgICAgcXVlcnlFcnJvciBpbnN0YW5jZW9mIEVycm9yID8gcXVlcnlFcnJvci5tZXNzYWdlIDogU3RyaW5nKHF1ZXJ5RXJyb3IpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgYW5zd2VyOiBgSSB0cmllZCB0byBxdWVyeSB0aGUgZ3JhcGggYnV0IGVuY291bnRlcmVkIGFuIGVycm9yLiBUaGUgcXVlcnkgd2FzOiBnLiR7Z3JlbWxpblF1ZXJ5fS4gRXJyb3I6ICR7ZXJyb3JNZXNzYWdlfWAsXG4gICAgICAgIHF1ZXJ5OiBgZy4ke2dyZW1saW5RdWVyeX1gLFxuICAgICAgICBkYXRhOiBudWxsLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBGb3JtYXQgdGhlIHJlc3VsdFxuICAgIGNvbnN0IHJlc3VsdFN0ciA9IEpTT04uc3RyaW5naWZ5KHF1ZXJ5UmVzdWx0LCBudWxsLCAyKTtcbiAgICBjb25zb2xlLmxvZyhcIlF1ZXJ5IHJlc3VsdDpcIiwgcmVzdWx0U3RyKTtcblxuICAgIC8vIEFzayBCZWRyb2NrIHRvIHN1bW1hcml6ZSB0aGUgcmVzdWx0c1xuICAgIGNvbnN0IHN1bW1hcnlNZXNzYWdlczogQmVkcm9ja01lc3NhZ2VbXSA9IFtcbiAgICAgIC4uLm1lc3NhZ2VzLFxuICAgICAge1xuICAgICAgICByb2xlOiBcImFzc2lzdGFudFwiLFxuICAgICAgICBjb250ZW50OiBgSSBleGVjdXRlZCB0aGUgR3JlbWxpbiBxdWVyeTogZy4ke2dyZW1saW5RdWVyeX1gLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgcm9sZTogXCJ1c2VyXCIsXG4gICAgICAgIGNvbnRlbnQ6IGBUaGUgcXVlcnkgcmV0dXJuZWQgdGhlc2UgcmVzdWx0czogJHtyZXN1bHRTdHJ9XFxuXFxuUGxlYXNlIHByb3ZpZGUgYSBjbGVhciwgY29uY2lzZSBuYXR1cmFsIGxhbmd1YWdlIHN1bW1hcnkgb2YgdGhlc2UgcmVzdWx0cyB0byBhbnN3ZXIgbXkgb3JpZ2luYWwgcXVlc3Rpb24uIERvIG5vdCByZXR1cm4gSlNPTiwganVzdCBhIHBsYWluIHRleHQgYW5zd2VyLmAsXG4gICAgICB9LFxuICAgIF07XG5cbiAgICBjb25zdCBzdW1tYXJ5ID0gYXdhaXQgaW52b2tlQmVkcm9jayhzdW1tYXJ5TWVzc2FnZXMpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFuc3dlcjogc3VtbWFyeSxcbiAgICAgIHF1ZXJ5OiBgZy4ke2dyZW1saW5RdWVyeX1gLFxuICAgICAgZGF0YTogcmVzdWx0U3RyLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkFJIFF1ZXJ5IGVycm9yOlwiLCBlcnJvcik7XG4gICAgY29uc3QgZXJyb3JNZXNzYWdlID1cbiAgICAgIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbiAgICByZXR1cm4ge1xuICAgICAgYW5zd2VyOiBgU29ycnksIEkgZW5jb3VudGVyZWQgYW4gZXJyb3IgcHJvY2Vzc2luZyB5b3VyIHF1ZXN0aW9uOiAke2Vycm9yTWVzc2FnZX1gLFxuICAgICAgcXVlcnk6IG51bGwsXG4gICAgICBkYXRhOiBudWxsLFxuICAgIH07XG4gIH1cbn07XG4iXX0=