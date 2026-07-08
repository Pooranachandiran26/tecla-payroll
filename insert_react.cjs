const fs = require("fs");
let content = fs.readFileSync("resources/js/Pages/Employees/EmployeeDetail.jsx", "utf8");

const docsComponent = `
const ALL_DOCUMENTS = [
    { type: "pan_card", name: "PAN Card (copy)", req: "Always Required", isMandatory: true, icon: "📄" },
    { type: "aadhaar_card", name: "Aadhaar Card (copy)", req: "Always Required", isMandatory: true, icon: "📄" },
    { type: "bank_passbook", name: "Bank Proof (cancelled cheque / passbook)", req: "Always Required", isMandatory: true, icon: "📄" },
    { type: "education_certificate", name: "Educational Certificates", req: "Optional", isMandatory: false, icon: "📄" },
    { type: "offer_letter", name: "Signed Offer Letter / Employment Contract", req: "Always Required", isMandatory: true, icon: "📄" },
    { type: "photo", name: "Photograph", req: "Always Required", isMandatory: true, icon: "🖼" },
    { type: "relieving_letter", name: "Previous Employer: Relieving Letter", req: "Conditional", isMandatory: true, conditional: true, icon: "📄" },
    { type: "previous_payslips", name: "Previous Employer: Last 3 Months Payslips", req: "Conditional", isMandatory: true, conditional: true, icon: "📄" },
    { type: "form16", name: "Previous Employer: Form 16", req: "Conditional", isMandatory: true, conditional: true, icon: "📄" }
];

const renderDocumentRows = () => {
    let requiredTypes = ["pan_card", "aadhaar_card", "bank_passbook", "offer_letter", "photo"];
    if (employee.prior_employment_flag) {
        requiredTypes.push("relieving_letter", "previous_payslips", "form16");
    }
    // Also include optional
    const displayTypes = [...requiredTypes, "education_certificate"];

    return ALL_DOCUMENTS.filter(doc => displayTypes.includes(doc.type)).map((docDef, index) => {
        const uploadedDoc = employee.documents?.find(d => d.document_type === docDef.type);
        
        let statusBadge = <span className="badge badge-danger">Not Uploaded</span>;
        if (uploadedDoc) {
            if (uploadedDoc.status === "verified") statusBadge = <span className="badge badge-success">Verified</span>;
            else if (uploadedDoc.status === "rejected") statusBadge = <span className="badge badge-danger">Rejected</span>;
            else statusBadge = <span className="badge badge-warning">Pending Verification</span>;
        }

        let requirementBadge = <span className="badge badge-neutral" style={{"fontSize":"0.75rem"}}>{docDef.req}</span>;
        if (docDef.conditional) {
            requirementBadge = <span className="badge badge-gold" style={{"fontSize":"0.75rem"}}>{docDef.req}</span>;
        }

        return (
            <tr key={docDef.type}>
                <td>
                    <div style={{"fontWeight":"600","color":"var(--primary-navy)","display":"flex","alignItems":"center","gap":"0.5rem"}}>
                        <span>{docDef.icon}</span> {docDef.name}
                    </div>
                </td>
                <td>{requirementBadge}</td>
                <td>{statusBadge}</td>
                <td style={{"textAlign":"right"}}>
                    {uploadedDoc ? (
                        <div style={{"display":"flex","gap":"0.4rem","justifyContent":"flex-end","alignItems":"center"}}>
                            {uploadedDoc.status === "pending" && (
                                <>
                                    <button className="btn btn-xs" style={{"backgroundColor":"var(--status-success)","color":"white"}} onClick={() => router.put(\`/employees/\${employee.id}/documents/\${uploadedDoc.id}/verify\`, { status: "verified" })}>✓ Verify</button>
                                    <button className="btn btn-danger btn-xs" onClick={() => {
                                        const reason = prompt("Rejection Reason:");
                                        if(reason) router.put(\`/employees/\${employee.id}/documents/\${uploadedDoc.id}/verify\`, { status: "rejected", rejection_reason: reason });
                                    }}>✕ Reject</button>
                                </>
                            )}
                            {(uploadedDoc.status === "verified" || uploadedDoc.status === "rejected") && (
                                <span style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>No actions available</span>
                            )}
                        </div>
                    ) : (
                        <div>
                            <input type="file" id={\`file_\${docDef.type}\`} style={{display: "none"}} onChange={(e) => {
                                if(e.target.files[0]) {
                                    const formData = new FormData();
                                    formData.append("document_type", docDef.type);
                                    formData.append("file", e.target.files[0]);
                                    router.post(\`/employees/\${employee.id}/documents\`, formData);
                                }
                            }} />
                            <button className="btn btn-navy btn-xs" onClick={() => document.getElementById(\`file_\${docDef.type}\`).click()}>📤 Upload Document</button>
                        </div>
                    )}
                </td>
            </tr>
        );
    });
};
`;

const replaceTarget = `{window.renderDocumentRows && window.renderDocumentRows(employee)}`;

let newContent = content.replace(replaceTarget, `{renderDocumentRows()}`);

const functionTarget = `return (
        <RoleGuard`;

newContent = newContent.replace(functionTarget, docsComponent + "\n    " + functionTarget);

newContent = newContent.replace("import { Head, Link } from '@inertiajs/react';", "import { Head, Link, router } from '@inertiajs/react';");

fs.writeFileSync("resources/js/Pages/Employees/EmployeeDetail.jsx", newContent);
console.log("Done inserting React component");
