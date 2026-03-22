"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DnsStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const cdk_nag_1 = require("cdk-nag");
class DnsStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { domainName, mxRecords, txtRecords } = props;
        // ─── Public Hosted Zone ──────────────────────────────────────────
        this.hostedZone = new aws_cdk_lib_1.aws_route53.PublicHostedZone(this, "HostedZone", {
            zoneName: domainName,
            comment: `Managed hosted zone for ${domainName}`,
        });
        // ─── MX Records (email routing) ─────────────────────────────────
        if (mxRecords && mxRecords.length > 0) {
            new aws_cdk_lib_1.aws_route53.MxRecord(this, "MxRecord", {
                zone: this.hostedZone,
                values: mxRecords,
                comment: `MX records for ${domainName}`,
            });
        }
        // ─── TXT Records (SPF, verification, etc.) ──────────────────────
        if (txtRecords) {
            txtRecords.forEach((txt, idx) => {
                new aws_cdk_lib_1.aws_route53.TxtRecord(this, `TxtRecord${idx}`, {
                    zone: this.hostedZone,
                    recordName: txt.name, // undefined = zone apex
                    values: txt.values,
                    comment: `TXT record for ${txt.name ?? domainName}`,
                });
            });
        }
        // ─── CDK Nag suppressions ────────────────────────────────────────
        cdk_nag_1.NagSuppressions.addStackSuppressions(this, [
            {
                id: "AwsSolutions-R53-1",
                reason: "Public hosted zone is intentional for mucker.io DNS management",
            },
        ]);
    }
}
exports.DnsStack = DnsStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG5zLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZG5zLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQUE2RDtBQUU3RCxxQ0FBMEM7QUFXMUMsTUFBYSxRQUFTLFNBQVEsbUJBQUs7SUFJakMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFvQjtRQUM1RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFFcEQsb0VBQW9FO1FBQ3BFLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSx5QkFBVyxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDckUsUUFBUSxFQUFFLFVBQVU7WUFDcEIsT0FBTyxFQUFFLDJCQUEyQixVQUFVLEVBQUU7U0FDakQsQ0FBQyxDQUFDO1FBRUgsbUVBQW1FO1FBQ25FLElBQUksU0FBUyxJQUFJLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDdEMsSUFBSSx5QkFBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFO2dCQUN6QyxJQUFJLEVBQUUsSUFBSSxDQUFDLFVBQVU7Z0JBQ3JCLE1BQU0sRUFBRSxTQUFTO2dCQUNqQixPQUFPLEVBQUUsa0JBQWtCLFVBQVUsRUFBRTthQUN4QyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsbUVBQW1FO1FBQ25FLElBQUksVUFBVSxFQUFFLENBQUM7WUFDZixVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO2dCQUM5QixJQUFJLHlCQUFXLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxZQUFZLEdBQUcsRUFBRSxFQUFFO29CQUNqRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFVBQVU7b0JBQ3JCLFVBQVUsRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLHdCQUF3QjtvQkFDOUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNO29CQUNsQixPQUFPLEVBQUUsa0JBQWtCLEdBQUcsQ0FBQyxJQUFJLElBQUksVUFBVSxFQUFFO2lCQUNwRCxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxvRUFBb0U7UUFDcEUseUJBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUU7WUFDekM7Z0JBQ0UsRUFBRSxFQUFFLG9CQUFvQjtnQkFDeEIsTUFBTSxFQUFFLGdFQUFnRTthQUN6RTtTQUNGLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQTVDRCw0QkE0Q0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTdGFjaywgU3RhY2tQcm9wcywgYXdzX3JvdXRlNTMgfSBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgeyBOYWdTdXBwcmVzc2lvbnMgfSBmcm9tIFwiY2RrLW5hZ1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIERuc1N0YWNrUHJvcHMgZXh0ZW5kcyBTdGFja1Byb3BzIHtcbiAgLyoqIFRoZSBkb21haW4gbmFtZSBmb3IgdGhlIGhvc3RlZCB6b25lIChlLmcuIFwibXVja2VyLmlvXCIpICovXG4gIGRvbWFpbk5hbWU6IHN0cmluZztcbiAgLyoqIE9wdGlvbmFsIE1YIHJlY29yZHMgZm9yIGVtYWlsIHJvdXRpbmcgKi9cbiAgbXhSZWNvcmRzPzogeyBob3N0TmFtZTogc3RyaW5nOyBwcmlvcml0eTogbnVtYmVyIH1bXTtcbiAgLyoqIE9wdGlvbmFsIFRYVCByZWNvcmRzIChlLmcuIFNQRiwgZG9tYWluIHZlcmlmaWNhdGlvbikgKi9cbiAgdHh0UmVjb3Jkcz86IHsgbmFtZT86IHN0cmluZzsgdmFsdWVzOiBzdHJpbmdbXSB9W107XG59XG5cbmV4cG9ydCBjbGFzcyBEbnNTdGFjayBleHRlbmRzIFN0YWNrIHtcbiAgLyoqIFRoZSBwdWJsaWMgaG9zdGVkIHpvbmUg4oCUIGV4cG9ydCBmb3IgdXNlIGJ5IG90aGVyIHN0YWNrcyAqL1xuICBwdWJsaWMgcmVhZG9ubHkgaG9zdGVkWm9uZTogYXdzX3JvdXRlNTMuUHVibGljSG9zdGVkWm9uZTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogRG5zU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgY29uc3QgeyBkb21haW5OYW1lLCBteFJlY29yZHMsIHR4dFJlY29yZHMgfSA9IHByb3BzO1xuXG4gICAgLy8g4pSA4pSA4pSAIFB1YmxpYyBIb3N0ZWQgWm9uZSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcbiAgICB0aGlzLmhvc3RlZFpvbmUgPSBuZXcgYXdzX3JvdXRlNTMuUHVibGljSG9zdGVkWm9uZSh0aGlzLCBcIkhvc3RlZFpvbmVcIiwge1xuICAgICAgem9uZU5hbWU6IGRvbWFpbk5hbWUsXG4gICAgICBjb21tZW50OiBgTWFuYWdlZCBob3N0ZWQgem9uZSBmb3IgJHtkb21haW5OYW1lfWAsXG4gICAgfSk7XG5cbiAgICAvLyDilIDilIDilIAgTVggUmVjb3JkcyAoZW1haWwgcm91dGluZykg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG4gICAgaWYgKG14UmVjb3JkcyAmJiBteFJlY29yZHMubGVuZ3RoID4gMCkge1xuICAgICAgbmV3IGF3c19yb3V0ZTUzLk14UmVjb3JkKHRoaXMsIFwiTXhSZWNvcmRcIiwge1xuICAgICAgICB6b25lOiB0aGlzLmhvc3RlZFpvbmUsXG4gICAgICAgIHZhbHVlczogbXhSZWNvcmRzLFxuICAgICAgICBjb21tZW50OiBgTVggcmVjb3JkcyBmb3IgJHtkb21haW5OYW1lfWAsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyDilIDilIDilIAgVFhUIFJlY29yZHMgKFNQRiwgdmVyaWZpY2F0aW9uLCBldGMuKSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcbiAgICBpZiAodHh0UmVjb3Jkcykge1xuICAgICAgdHh0UmVjb3Jkcy5mb3JFYWNoKCh0eHQsIGlkeCkgPT4ge1xuICAgICAgICBuZXcgYXdzX3JvdXRlNTMuVHh0UmVjb3JkKHRoaXMsIGBUeHRSZWNvcmQke2lkeH1gLCB7XG4gICAgICAgICAgem9uZTogdGhpcy5ob3N0ZWRab25lLFxuICAgICAgICAgIHJlY29yZE5hbWU6IHR4dC5uYW1lLCAvLyB1bmRlZmluZWQgPSB6b25lIGFwZXhcbiAgICAgICAgICB2YWx1ZXM6IHR4dC52YWx1ZXMsXG4gICAgICAgICAgY29tbWVudDogYFRYVCByZWNvcmQgZm9yICR7dHh0Lm5hbWUgPz8gZG9tYWluTmFtZX1gLFxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIOKUgOKUgOKUgCBDREsgTmFnIHN1cHByZXNzaW9ucyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkU3RhY2tTdXBwcmVzc2lvbnModGhpcywgW1xuICAgICAge1xuICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtUjUzLTFcIixcbiAgICAgICAgcmVhc29uOiBcIlB1YmxpYyBob3N0ZWQgem9uZSBpcyBpbnRlbnRpb25hbCBmb3IgbXVja2VyLmlvIEROUyBtYW5hZ2VtZW50XCIsXG4gICAgICB9LFxuICAgIF0pO1xuICB9XG59XG4iXX0=