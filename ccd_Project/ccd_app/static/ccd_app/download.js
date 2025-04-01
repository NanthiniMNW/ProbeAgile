// Constants for download status
const DOWNLOAD_STATUS_DOWNLOADED = 'downloaded';
const DOWNLOAD_STATUS_NOT_DOWNLOADED = 'not_downloaded';

// Function to toggle the visibility of fields based on the download status
function toggleDownloadFields() {
    const downloadStatus = document.getElementById('downloadstatus').value;
    const downloadedField = document.getElementById('downloaded-field');
    const notDownloadedField = document.getElementById('not-downloaded-field');
    const sharePathLink = document.getElementById('Sharepathlink');
    const notDownloadedReason = document.getElementById('NotDownloadedReason');

    downloadedField.style.display = 'none';
    notDownloadedField.style.display = 'none';

    sharePathLink.required = false;
    notDownloadedReason.required = false;

    if (downloadStatus === DOWNLOAD_STATUS_DOWNLOADED) {
        downloadedField.style.display = 'block';
        sharePathLink.required = true;
    } else if (downloadStatus === DOWNLOAD_STATUS_NOT_DOWNLOADED) {
        notDownloadedField.style.display = 'block';
        notDownloadedReason.required = true;
    }
}

// Switch between sections based on the tab clicked
function switchSection(tabElement) {
    var sections = document.querySelectorAll('.content-section');
    sections.forEach(function(section) {
        section.classList.remove('active-section');
    });

    var sectionId = tabElement.getAttribute('data-section');
    var activeSection = document.getElementById(sectionId);

    if (activeSection) {
        activeSection.classList.add('active-section');
    }

    var tabs = document.querySelectorAll('.navbar a');
    tabs.forEach(function(tab) {
        tab.classList.remove('active-tab');
    });

    tabElement.classList.add('active-tab');
}

// Handle form submission
let isSubmitting = false;

function handleDownloadSubmission(event) {
    event.preventDefault();
    if (isSubmitting) return;

    const downloadStatus = document.querySelector('[name="downloadstatus"]').value;
    const url = document.querySelector('[name="downloadURL"]').value;
    let formData = { url, download_status: downloadStatus };

    if (downloadStatus === DOWNLOAD_STATUS_DOWNLOADED) {
        formData.path_link = document.querySelector('[name="Sharepathlink"]').value;
        formData.reason = "";
    } else if (downloadStatus === DOWNLOAD_STATUS_NOT_DOWNLOADED) {
        formData.reason = document.querySelector('[name="NotDownloadedReason"]').value;
        formData.path_link = "";
    }

    console.log("Form Data:", formData);
    submitFormData(formData);
}

async function submitFormData(formData) {
    if (isSubmitting) return;
    isSubmitting = true;

    const csrfToken = getCookie('csrftoken');
    const submitButton = document.querySelector('[type="submit"]');
    submitButton.disabled = true;
    const loadingMessage = document.createElement('span');
    loadingMessage.innerText = 'Submitting...';
    document.body.appendChild(loadingMessage);

    try {
        const response = await fetch('/ccd/submit_download/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
            },
            body: JSON.stringify(formData),
        });

        const data = await response.json();
        handleSubmissionResponse(data, submitButton, loadingMessage);
    } catch (error) {
        handleSubmissionError(error, submitButton, loadingMessage);
    } finally {
        isSubmitting = false;
    }
}

function handleSubmissionResponse(data, submitButton, loadingMessage) {
    console.log("handleSubmissionResponse called with data:", data);
    submitButton.disabled = false;
    loadingMessage.remove();

    if (data.success) {
        alert('Form submitted successfully!');
        markUrlAsProcessed();
        document.querySelector('form').reset();
        toggleDownloadFields();
        clearTableAndMessage();
        localStorage.removeItem('lastFetchedUrl');
        localStorage.removeItem('isProcessed');
        localStorage.removeItem('uniqueCode');
    } else {
        alert(`Error: ${data.message || 'Something went wrong!'}`);
    }
}

function handleSubmissionError(error, submitButton, loadingMessage) {
    console.error('Request failed:', error);
    alert('Something went wrong. Please try again later.');
    submitButton.disabled = false;
    loadingMessage.remove();
}

function clearTableAndMessage() {
    const domainURLMessage = document.getElementById('domainURLMessage');
    const matchedurlDetails = document.getElementById('matchedurlDetails');
    const matchedurlTable = document.getElementById('matchedurlTable');

    if (domainURLMessage) {
        domainURLMessage.textContent = "";
        domainURLMessage.style.color = "";
    }

    if (matchedurlDetails) {
        matchedurlDetails.style.display = "none";
    }

    if (matchedurlTable) {
        matchedurlTable.innerHTML = "";
    }
}

function markUrlAsProcessed() {
    localStorage.setItem('isProcessed', 'true');
}

async function fetchNextUrl() {
    const lastFetchedUrl = localStorage.getItem('lastFetchedUrl');
    const isProcessed = localStorage.getItem('isProcessed');

    if (lastFetchedUrl && isProcessed === 'false') {
        console.log("Showing unsubmitted URL:", lastFetchedUrl);
        updateDownloadInput(lastFetchedUrl);
        downloadsearchurlKeyword();
        return;
    }

    const csrfToken = getCookie('csrftoken');
    try {
        const response = await fetch('/ccd/fetch-next-url/', {
            method: 'GET',
            headers: {
                'X-CSRFToken': csrfToken,
            },
        });

        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        handleFetchNextUrlResponse(data);
    } catch (error) {
        handleFetchNextUrlError(error);
    }
}

function handleFetchNextUrlResponse(data) {
    if (data.success && data.url) {
        const url = data.url;
        const uniqueCode = data.unique_code;
        console.log('Fetched URL:', url);
        console.log('Unique Code:', uniqueCode);

        localStorage.setItem('lastFetchedUrl', url);
        localStorage.setItem('isProcessed', 'false');
        localStorage.setItem('uniqueCode', uniqueCode);

        updateDownloadInput(url);
        downloadsearchurlKeyword();
    } else {
        alert(data.message || 'No more unsubmitted URLs available.');
        clearDownloadInput();
        localStorage.removeItem('lastFetchedUrl');
        localStorage.removeItem('isProcessed');
        localStorage.removeItem('uniqueCode');
    }
}

function handleFetchNextUrlError(error) {
    console.error('Error fetching URL:', error);
    alert('Error fetching URL: ' + error.message);
}

function updateDownloadInput(url) {
    const downloadURLInput = document.getElementById('downloadURLInput');
    if (downloadURLInput) {
        downloadURLInput.value = url;
        console.log('Updated downloadURLInput with:', url);
    } else {
        console.error('downloadURLInput not found');
    }
}

function clearDownloadInput() {
    const downloadURLInput = document.getElementById('downloadURLInput');
    if (downloadURLInput) {
        downloadURLInput.value = '';
        console.log('Cleared downloadURLInput');
    }
}

function downloadsearchurlKeyword() {
    const keywordInput = document.getElementById('downloadURLInput').value.trim();
    const domainURLMessage = document.getElementById('domainURLMessage');
    const matchedurlDetails = document.getElementById('matchedurlDetails');
    const matchedurlTableContainer = document.getElementById('matchedurlTableContainer');

    domainURLMessage.textContent = "Loading...";
    domainURLMessage.style.color = "blue";

    if (keywordInput === "") {
        domainURLMessage.textContent = "Please enter a search keyword.";
        domainURLMessage.style.color = "red";
        matchedurlDetails.style.display = "none";
        matchedurlTableContainer.innerHTML = '';
        return;
    }

    fetch(`/ccd/check_downloadurl/?downloadURL=${encodeURIComponent(keywordInput)}`)
        .then(response => response.json())
        .then(data => {
            if (data.exists) {
                matchedurlTableContainer.innerHTML = generateurlTable(data.results);
                matchedurlDetails.style.display = "block";
                domainURLMessage.textContent = "";
            } else {
                domainURLMessage.textContent = "No matching records found.";
                domainURLMessage.style.color = "red";
                matchedurlDetails.style.display = "none";
            }
        })
        .catch(error => {
            console.error('Error checking keyword:', error);
            domainURLMessage.textContent = "An error occurred. Please try again.";
            domainURLMessage.style.color = "red";
            matchedurlDetails.style.display = "none";
        });
}

function generateurlTable(results) {
    let tableHTML = `
        <div style="overflow-x: auto; margin-top: 10px;">
            <table id="matchedurlTable" border="1" cellpadding="3" cellspacing="0" style="width: 100%; table-layout: auto; font-size: 12px;">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>URL ID</th>
                        <th>Link Status</th>
                        <th>Content Status</th>
                        <th>Invalid Reason</th>
                        <th>Content Type</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    results.forEach(result => {
        tableHTML += `
            <tr>
                <td>${result.id}</td>
                <td>${result.url_id}</td>
                <td>${result.link_status}</td>
                <td>${result.content_status}</td>
                <td>${result.invalid_reason || 'N/A'}</td>
                <td>${result.content_type}</td>
            </tr>
        `;
    });

    tableHTML += `</tbody></table></div>`;
    return tableHTML;
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Single DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    if (!form.dataset.listenerAdded) {
        form.addEventListener('submit', handleDownloadSubmission);
        form.dataset.listenerAdded = 'true';
    }
    document.getElementById('downloadstatus').addEventListener('change', toggleDownloadFields);
    document.getElementById('nextButton').addEventListener('click', fetchNextUrl);
});