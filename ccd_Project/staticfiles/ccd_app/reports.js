// Define functions globally
function toggleDownloadFields() {
    console.log('toggleDownloadFields called');

    const reportType = document.getElementById('reports').value;
    const scopeSection = document.getElementById('scopeSection');
    const employeeSection = document.getElementById('employeeSection');
    const dateSection = document.getElementById('dateSection');
    const toDateSection = document.getElementById('toDateSection');
    const generateBtn = document.getElementById('generateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const reportTableContainer = document.getElementById('reportTableContainer');
    const reportMessage = document.getElementById('reportMessage');
    const reportForm = document.getElementById('reportForm');

    // Reset the entire form
    // Clear table and message
    if (reportTableContainer) reportTableContainer.innerHTML = '';
    if (reportMessage) reportMessage.textContent = '';

    // Show date fields regardless of report type
    if (dateSection) dateSection.style.display = 'block';
    if (toDateSection) toDateSection.style.display = 'block';
    if (generateBtn) generateBtn.style.display = 'block';
    if (downloadBtn) downloadBtn.style.display = 'block';

    if (reportType === 'userwise_report') {
        if (employeeSection) employeeSection.style.display = 'block';
        if (scopeSection) scopeSection.style.display = 'none';
    } else if (reportType === 'overall_report') {
        if (scopeSection) scopeSection.style.display = 'block';
        if (employeeSection) employeeSection.style.display = 'none';
    } else {
        if (scopeSection) scopeSection.style.display = 'none';
        if (employeeSection) employeeSection.style.display = 'none';
        if (dateSection) dateSection.style.display = 'none';
        if (toDateSection) toDateSection.style.display = 'none';
        if (generateBtn) generateBtn.style.display = 'none';
        if (downloadBtn) downloadBtn.style.display = 'none';
    }
}

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

function generateReport() {
    console.log('Generate button clicked, running generateReport');
    const reportType = document.getElementById('reports').value;
    const scope = document.getElementById('table').value;
    const fromDate = document.getElementById('from_date').value;
    const toDate = document.getElementById('to_date').value;
    const employeeId = document.getElementById('employee_id').value;
    
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
    formData.append('csrfmiddlewaretoken', document.querySelector('[name=csrfmiddlewaretoken]').value);

    console.log("Requesting report with parameters:", { reportType, scope, fromDate, toDate, employeeId });

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

function generateReportTable(data) {
    console.log('Report data for table generation:', data);
    let tableHTML = `
        <div style="overflow-x: auto; margin-top: 10px;">
            <table id="reportTable" border="1" cellpadding="3" cellspacing="0" style="width: 100%; table-layout: auto; font-size: 12px;">
                <thead>
                    <tr>
    `;

    if (data.scope) { // Overall Report
        tableHTML += `
                        <th>Scope</th>
                        <th>From Date</th>
                        <th>To Date</th>
                        <th>Total Count</th>
                        <th>Complete Count</th>
                        <th>Pending Count</th>
        `;
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
                    <tr>
    `;

    if (data.scope) { // Overall Report
        tableHTML += `
                        <td>${data.scope}</td>
                        <td>${data.from_date}</td>
                        <td>${data.to_date}</td>
                        <td>${data.total_count}</td>
                        <td>${data.complete_count}</td>
                        <td>${data.pending_count}</td>
        `;
    } else if (data.employee_id) { // Userwise Report
        tableHTML += `
                        <td>${data.employee_id}</td>
                        <td>${data.from_date}</td>
                        <td>${data.to_date}</td>
                        <td>${data.scopes.discovery}</td>
                        <td>${data.scopes.domainreview}</td>
                        <td>${data.scopes.download}</td>
                        <td>${data.scopes.cleaning}</td>
        `;
    }

    tableHTML += `
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    console.log('Generated Report Table HTML:', tableHTML);
    return tableHTML;
}

// Ensure DOM is loaded before initial call
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
    const employeeSection = document.getElementById('employeeSection');
    const dateSection = document.getElementById('dateSection');
    const toDateSection = document.getElementById('toDateSection');
    const generateBtn = document.getElementById('generateBtn');
    const downloadBtn = document.getElementById('downloadBtn');

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
    if (employeeSection) employeeSection.style.display = 'none';
    if (dateSection) dateSection.style.display = 'none';
    if (toDateSection) toDateSection.style.display = 'none';
    if (generateBtn) generateBtn.style.display = 'none';
    if (downloadBtn) downloadBtn.style.display = 'none';
}
