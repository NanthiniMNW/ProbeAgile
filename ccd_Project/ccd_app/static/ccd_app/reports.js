function toggleDownloadFields() {
    console.log('toggleDownloadFields called');

    const reportType = document.getElementById('reports').value;
    const scopeSection = document.getElementById('scopeSection');
    const contentTypeCheckboxSection = document.getElementById('contentTypeCheckboxSection');
    const contentTypeSection = document.getElementById('contentTypeSection');
    const employeeSection = document.getElementById('employeeSection');
    const dateSection = document.getElementById('dateSection');
    const toDateSection = document.getElementById('toDateSection');
    const generateBtn = document.getElementById('generateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const reportTableContainer = document.getElementById('reportTableContainer');
    const reportMessage = document.getElementById('reportMessage');
    const downloadReportBtn = document.getElementById('downloadReportBtn');

    // Reset the entire form
    if (reportTableContainer) reportTableContainer.innerHTML = '';
    if (reportMessage) reportMessage.textContent = '';

    // Show date fields and buttons regardless of report type
    if (dateSection) dateSection.style.display = 'block';
    if (toDateSection) toDateSection.style.display = 'block';
    if (generateBtn) generateBtn.style.display = 'inline-block';
    if (downloadBtn) downloadBtn.style.display = 'inline-block';
    if(downloadReportBtn) downloadReportBtn.style.display = 'block'

    // Handle display logic based on selected report type
    if (reportType === 'userwise_report') {
        if (employeeSection) employeeSection.style.display = 'block';
        if (scopeSection) scopeSection.style.display = 'none';
        if (contentTypeCheckboxSection) contentTypeCheckboxSection.style.display = 'none';
        if (contentTypeSection) contentTypeSection.style.display = 'none'; // Ensure it's hidden
    } else if (reportType === 'overall_report') {
        if (scopeSection) scopeSection.style.display = 'block';
        if (contentTypeCheckboxSection) contentTypeCheckboxSection.style.display = 'block'; // Show checkbox
        if (employeeSection) employeeSection.style.display = 'none';
        if (contentTypeSection) contentTypeSection.style.display = 'none'; // Ensure it's hidden initially
    } else {
        if (scopeSection) scopeSection.style.display = 'none';
        if (contentTypeCheckboxSection) contentTypeCheckboxSection.style.display = 'none';
        if (contentTypeSection) contentTypeSection.style.display = 'none';
        if (employeeSection) employeeSection.style.display = 'none';
        if (dateSection) dateSection.style.display = 'none';
        if (toDateSection) toDateSection.style.display = 'none';
        if (generateBtn) generateBtn.style.display = 'none';
        if (downloadBtn) downloadBtn.style.display = 'none';
        if (downloadReportBtn) downloadReportBtn.style.display = 'none';
    }

    /*Ensure the contentTypeSection visibility is controlled by the checkbox*/
    toggleContentType();
}
function toggleContentType() {
    const showContentTypeCheckbox = document.getElementById('showContentType');
    const contentTypeSection = document.getElementById('contentTypeSection');
    
    if (showContentTypeCheckbox && contentTypeSection) {
        // Show the contentTypeSection only if the checkbox is checked
        contentTypeSection.style.display = showContentTypeCheckbox.checked ? 'block' : 'none';
    }
}
document.getElementById('showContentType')?.addEventListener('change', toggleContentType);


function handleReportSubmission() {
    const reportType = document.getElementById('reports').value;
    const scope = document.getElementById('table').value;
    const fromDate = document.getElementById('from_date').value;
    const toDate = document.getElementById('to_date').value;
    const employeeId = document.getElementById('employee_id').value;

    // Rely on HTML5 required validation for empty fields
    if (reportType === 'overall_report' && !scope) {
        alert('Please select a scope for Overall Report.');
        return false;
    }

    if (reportType === 'userwise_report' && (!employeeId || employeeId === '')) {
        alert('Please select an Employee ID for Userwise Report.');
        return false;
    }

    return true;  // HTML5 will handle fromDate/toDate alerts
}


function downloadReport() {
    console.log('Download button clicked, running downloadReport');
    if (!handleReportSubmission()) {
        alert('Please fill all required fields before downloading.');
        return;
    }

    const reportType = document.getElementById('reports').value;
    const scope = document.getElementById('table').value;
    const fromDate = document.getElementById('from_date').value;
    const toDate = document.getElementById('to_date').value;
    const employeeId = document.getElementById('employee_id').value;

    const formData = new FormData();
    formData.append('reports', reportType);
    formData.append('scope', scope);
    formData.append('from_date', fromDate);
    formData.append('to_date', toDate);
    formData.append('employee_id', employeeId);
    formData.append('csrfmiddlewaretoken', document.querySelector('[name=csrfmiddlewaretoken]').value);
    formData.append('download', 'true');

    fetch('/ccd/submit_report/', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = reportType === 'overall_report' ? `${scope}_report.xlsx` : `userwise_report.xlsx`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    })
    .catch(error => {
        console.error('Error downloading report:', error);
        document.getElementById('reportMessage').textContent = "Error downloading report. Please try again.";
        document.getElementById('reportMessage').style.color = "red";
    });
}
function generateReport() {
    console.log('Generate button clicked, running generateReport');
    const reportType = document.getElementById('reports').value;
    const scope = document.getElementById('table').value;
    const fromDate = document.getElementById('from_date').value;
    const toDate = document.getElementById('to_date').value;
    const employeeId = document.getElementById('employee_id').value;
    const contentType = document.getElementById('contentType')?.value || '';

    const reportMessage = document.getElementById('reportMessage');
    const reportDetails = document.getElementById('reportDetails');
    const reportTableContainer = document.getElementById('reportTableContainer');

    if (!handleReportSubmission()) {
        reportMessage.textContent = "Please fill all required fields.";
        reportMessage.style.color = "red";
        reportDetails.style.display = "none";
        reportTableContainer.innerHTML = '';
        return;
    }

    const formData = new FormData();
    formData.append('reports', reportType);
    formData.append('scope', scope);
    formData.append('from_date', fromDate);
    formData.append('to_date', toDate);
    formData.append('employee_id', employeeId);
    if (contentType) formData.append('contentType', contentType);
    formData.append('csrfmiddlewaretoken', document.querySelector('[name=csrfmiddlewaretoken]').value);

    console.log("Requesting report with parameters:", { reportType, scope, fromDate, toDate, employeeId, contentType });

    fetch('/ccd/generate_report/', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        console.log('Report response data:', data);
        if (data.success) {
            reportTableContainer.innerHTML = generateReportTable(data.data);
            reportDetails.style.display = "block";
            reportMessage.textContent = "";
        } else {
            reportMessage.textContent = data.message || "No report data found.";
            reportMessage.style.color = "red";
            reportDetails.style.display = "none";
            reportTableContainer.innerHTML = '';
        }
    })
    .catch(error => {
        console.error('Error generating report:', error);
        reportMessage.textContent = "An error occurred. Please try again.";
        reportMessage.style.color = "red";
        reportDetails.style.display = "none";
        reportTableContainer.innerHTML = '';
    });
}

// Assuming generateReportTable remains as previously updated
function generateReportTable(data) {
    console.log('Report data for table generation:', data);
    let tableHTML = `
        <div style="overflow-x: auto; margin-top: 10px;">
            <table id="reportTable" border="1" cellpadding="3" cellspacing="0" style="width: 100%; table-layout: auto; font-size: 12px;">
                <thead>
                    <tr>
    `;

    if (data.scope) { // Overall Report
        const scope = data.scope;
        tableHTML += `
            <th>Scope</th>
            <th>From Date</th>
            <th>To Date</th>
            <th>Total Count</th>
        `;
        if (scope === 'discovery') {
            tableHTML += `
                <th>Open Links</th>
                <th>Not Open Links</th>
            `;
        } else if (scope === 'domainreview') {
            tableHTML += `
                <th>Open Links</th>
                <th>Not Open Links</th>
                <th>Valid Content</th>
                <th>Not Valid Content</th>
            `;
        } else if (scope === 'download') {
            tableHTML += `
                <th>Downloaded</th>
                <th>Not Downloaded</th>
            `;
        } else if (scope === 'cleaning') {
            tableHTML += `
                <th>Errors</th>
                <th>Not Errors</th>
            `;
        }
        tableHTML += `
            <th>Pending Count</th>
        `;

        if (data.content_type_counts && Object.keys(data.content_type_counts).length > 0) {
            for (const contentType in data.content_type_counts) {
                tableHTML += `<th>${contentType} Count</th>`;
            }
        }
    } else if (data.employee_id) { // Userwise Report
        tableHTML += `
            <th>Employee ID</th>
            <th>From Date</th>
            <th>To Date</th>
            <th>Discovery</th>
            <th>Domain Review</th>
            <th>Download</th>
            <th>Cleaning</th>
        `;
    }

    tableHTML += `
                    </tr>
                </thead>
                <tbody>
    `;

    if (data.scope) { // Overall Report
        tableHTML += `
                    <tr>
                        <td>${data.scope}</td>
                        <td>${data.from_date}</td>
                        <td>${data.to_date}</td>
                        <td>${data.total_count}</td>
        `;
        if (data.scope === 'discovery') {
            tableHTML += `
                <td>${data.complete_count.open_links}</td>
                <td>${data.complete_count.not_open_links}</td>
            `;
        } else if (data.scope === 'domainreview') {
            tableHTML += `
                <td>${data.complete_count.open_links}</td>
                <td>${data.complete_count.not_open_links}</td>
                <td>${data.complete_count.valid_content}</td>
                <td>${data.complete_count.not_valid_content}</td>
            `;
        } else if (data.scope === 'download') {
            tableHTML += `
                <td>${data.complete_count.downloaded}</td>
                <td>${data.complete_count.not_downloaded}</td>
            `;
        } else if (data.scope === 'cleaning') {
            tableHTML += `
                <td>${data.complete_count.errors}</td>
                <td>${data.complete_count.not_errors}</td>
            `;
        }
        tableHTML += `
                        <td>${data.pending_count}</td>
        `;

        if (data.content_type_counts && Object.keys(data.content_type_counts).length > 0) {
            for (const contentType in data.content_type_counts) {
                tableHTML += `<td>${data.content_type_counts[contentType]}</td>`;
            }
        }
        tableHTML += `
                    </tr>
        `;
    } else if (data.employee_id) { // Userwise Report
        if (data.employee_id === 'all' && data.employee_breakdown) {
            // Multiple rows for each employee
            for (const empId in data.employee_breakdown) {
                const empData = data.employee_breakdown[empId];
                tableHTML += `
                    <tr>
                        <td>${empId}</td>
                        <td>${data.from_date}</td>
                        <td>${data.to_date}</td>
                        <td>${empData.discovery || 0}</td>
                        <td>${empData.domainreview || 0}</td>
                        <td>${empData.download || 0}</td>
                        <td>${empData.cleaning || 0}</td>
                    </tr>
                `;
            }
        } else {
            // Single row for a specific employee
            tableHTML += `
                    <tr>
                        <td>${data.employee_id}</td>
                        <td>${data.from_date}</td>
                        <td>${data.to_date}</td>
                        <td>${data.scopes.discovery || 0}</td>
                        <td>${data.scopes.domainreview || 0}</td>
                        <td>${data.scopes.download || 0}</td>
                        <td>${data.scopes.cleaning || 0}</td>
                    </tr>
            `;
        }
    }

    tableHTML += `
                </tbody>
            </table>
        </div>
    `;
    console.log('Generated Report Table HTML:', tableHTML);
    return tableHTML;
}

document.addEventListener('DOMContentLoaded', function() {
    // Initial call to set field visibility and reset form
    toggleDownloadFields();
});

function clearForm() {
    console.log('Clear button clicked, running clearForm');
    
    const reportForm = document.getElementById('reportForm');
    const reportTableContainer = document.getElementById('reportTableContainer');
    const reportMessage = document.getElementById('reportMessage');
    const scopeSection = document.getElementById('scopeSection');
    const contentTypeSection = document.getElementById('contentTypeSection');
    const employeeSection = document.getElementById('employeeSection');
    const dateSection = document.getElementById('dateSection');
    const toDateSection = document.getElementById('toDateSection');
    const generateBtn = document.getElementById('generateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const downloadReportBtn = document.getElementById('downloadReportBtn');

    // Reset the form
    if (reportForm) {
        reportForm.reset();
    } else {
        console.error('reportForm not found');
    }

    // Clear table and message
    if (reportTableContainer) reportTableContainer.innerHTML = '';
    if (reportMessage) reportMessage.textContent = '';

    // Reset visibility to initial state (all hidden except reports dropdown)
    if (scopeSection) scopeSection.style.display = 'none';
    if(contentTypeSection) contentTypeSection.style.display =  'none';
    if (employeeSection) employeeSection.style.display = 'none';
    if (dateSection) dateSection.style.display = 'none';
    if (toDateSection) toDateSection.style.display = 'none';
    if (generateBtn) generateBtn.style.display = 'none';
    if (downloadBtn) downloadBtn.style.display = 'none';
    if (downloadReportBtn) downloadReportBtn.style.display = 'none';
}

function downloadGeneratedReport() {
    console.log('Download Report button clicked, running downloadGeneratedReport');

    // Get form elements
    const reportType = document.getElementById('reports').value;
    const scope = document.getElementById('table')?.value || '';
    const employeeId = document.getElementById('employee_id')?.value || '';
    const fromDate = document.getElementById('from_date').value;
    const toDate = document.getElementById('to_date').value;
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Basic form validation
    if (!reportType) {
        displayError('Please select a report type.');
        return;
    }
    if (reportType === 'overall_report' && !scope) {
        displayError('Please select a scope for Overall Report.');
        return;
    }
    if (reportType === 'userwise_report' && !employeeId) {
        displayError('Please select an employee ID for Userwise Report.');
        return;
    }
    if (!fromDate || !toDate) {
        displayError('Please fill in both From Date and To Date.');
        return;
    }

    // Log form data for debugging
    console.log('Form data:', { reportType, scope, fromDate, toDate, employeeId });

    // Prepare FormData
    const formData = new FormData();
    formData.append('reports', reportType);
    formData.append('scope', scope);
    formData.append('from_date', fromDate);
    formData.append('to_date', toDate);
    formData.append('employee_id', employeeId);
    formData.append('download', 'true');
    formData.append('csrfmiddlewaretoken', csrfToken);

    // Fetch request to download the report
    fetch('/ccd/downloadGeneratedReport/', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            return response.text().then(text => {
                try {
                    const json = JSON.parse(text);
                    throw new Error(json.message || `Server error: ${text}`);
                } catch {
                    throw new Error(`Network response was not ok: ${text}`);
                }
            });
        }

        const contentType = response.headers.get('Content-Type');
        if (!contentType || !contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
            return response.text().then(text => {
                throw new Error(`Unexpected content type: ${contentType}. Response: ${text}`);
            });
        }

        const contentDisposition = response.headers.get('Content-Disposition');
        let filename;
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="(.+)"/);
            if (match) {
                filename = match[1]; // Use backend-provided filename
            }
        }
        if (!filename) {
            const dateFrom = fromDate.replace(/-/g, '');
            const dateTo = toDate.replace(/-/g, '');
            filename = reportType === 'overall_report'
                ? `overall_${scope}_generatedreport_${dateFrom}_to_${dateTo}.xlsx`
                : `userwise_${employeeId || 'all'}_generatedreport_${dateFrom}_to_${dateTo}.xlsx`;
        }

        return response.blob().then(blob => {
            console.log('Blob size:', blob.size, 'bytes');
            return { blob, filename };
        });
    })
    .then(({ blob, filename }) => {
        if (blob.size === 0) {
            throw new Error('Downloaded file is empty.');
        }

        // Trigger download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        console.log(`File ${filename} downloaded successfully`);
        displayMessage('Report downloaded successfully!', 'green');
    })
    .catch(error => {
        console.error('Error downloading report:', error);
        displayError(`Error downloading report: ${error.message}`);
    });
}
