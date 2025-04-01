function toggleCleaningFields() {
    const cleaningStatus = document.getElementById('CleaningStatus')?.value || '';
    const urlField = document.getElementById('URL-field');
    const descriptionField = document.getElementById('description-field');
    const pathLinkField = document.getElementById('path-link-field');
    const videoDurationField = document.getElementById('video-duration-field');
    const advertisementLevelField = document.getElementById('advertisement-level-field');
    const linkcleaningurlField = document.getElementById('LinkURL-field');
    const nextButton = document.getElementById('nextButton');
    const nextButtonURL = document.getElementById('nextButtonURL');
    const errorFieldDiv = document.getElementById('ErrorField');
    const errorSelect = document.getElementById('errorfield');
    const copyrightsField = document.getElementById('CopyrighstsField');
    const crawlMethodField = document.getElementById('CrawlmethodField');
    const cleaningurl = document.getElementById('cleaningurl');
    const linkcleaningurl = document.getElementById('linkcleaningurl');
    const pathLink = document.getElementById('pathLink');
    const videoDuration = document.getElementById('videoDuration');
    const reasonFieldDiv = document.getElementById('reason-field');
    const reasonInput = document.getElementById('reasoninput');
    const descriptionInput = document.getElementById('descriptionInput');
    const advertisementLevel = document.getElementById('advertisementLevel');
    const copyrights = document.getElementById('copyrights');
    const crawlMethod = document.getElementById('Crawlmethod');
    const contentTypeDiv = document.getElementById('contentType');
    const contentTypeReview = document.getElementById('contentTypeReview');

    // Reset all fields visibility and required attributes
    const allFields = [
        urlField, descriptionField, pathLinkField, videoDurationField, advertisementLevelField,
        linkcleaningurlField, nextButton, errorFieldDiv, copyrightsField, crawlMethodField, nextButtonURL, reasonFieldDiv, contentTypeDiv
    ];
    const allInputs = [
        cleaningurl, linkcleaningurl, pathLink, videoDuration, reasonInput, descriptionInput,
        advertisementLevel, copyrights, crawlMethod, contentTypeReview
    ];

    allFields.forEach(field => {
        if (field) field.style.display = 'none';
    });
    allInputs.forEach(input => {
        if (input) {
            input.required = false;
            if (input.id === 'videoDuration') input.value = ''; // Clear videoDuration when hidden
        }
    });

    if (cleaningStatus === 'Webpage' && errorSelect) {
        urlField.style.display = 'block';
        errorFieldDiv.style.display = 'block';
        nextButton.style.display = 'inline-block';
        cleaningurl.required = true;
        errorSelect.required = true;

        const errorValue = errorSelect.value || '';
        if (errorValue === 'error') {
            reasonFieldDiv.style.display = 'block';
            reasonInput.required = true;
        } else if (errorValue === 'notanError') {
            descriptionField.style.display = 'block';
            advertisementLevelField.style.display = 'block';
            copyrightsField.style.display = 'block';
            crawlMethodField.style.display = 'block';
            descriptionInput.required = true;
            advertisementLevel.required = true;
            copyrights.required = true;
            crawlMethod.required = true;
        }
    } else if (cleaningStatus === 'DownloadedLinkContent' && errorSelect) {
        linkcleaningurlField.style.display = 'block';
        errorFieldDiv.style.display = 'block';
        nextButtonURL.style.display = 'inline-block';
        linkcleaningurl.required = true;
        errorSelect.required = true;

        const errorValue = errorSelect.value || '';
        if (errorValue === 'error') {
            reasonFieldDiv.style.display = 'block';
            reasonInput.required = true;
        } else if (errorValue === 'notanError') {
            descriptionField.style.display = 'block';
            pathLinkField.style.display = 'block';
            contentTypeDiv.style.display = 'block';
            advertisementLevelField.style.display = 'block';
            copyrightsField.style.display = 'block';
            crawlMethodField.style.display = 'block';
            descriptionInput.required = true;
            pathLink.required = true;
            advertisementLevel.required = true;
            copyrights.required = true;
            crawlMethod.required = true;
            contentTypeReview.required = true;

            const contentType = contentTypeReview?.value || '';
            if (contentType === 'video' || contentType === 'audio') {
                videoDurationField.style.display = 'block';
                videoDuration.required = true;
                videoDuration.style.display = 'inline-block';
            } else {
                videoDurationField.style.display = 'none';
                videoDuration.required = false;
                videoDuration.value = ''; // Ensure it’s cleared
            }
        }
    }

    if (!contentTypeReview.dataset.listenerAdded) {
        contentTypeReview.addEventListener('change', () => {
            const contentType = contentTypeReview.value || '';
            if (contentType === 'video' || contentType === 'audio') {
                videoDurationField.style.display = 'block';
                videoDuration.required = true;
                videoDuration.style.display = 'inline-block';
            } else {
                videoDurationField.style.display = 'none';
                videoDuration.required = false;
                videoDuration.value = '';
            }
        });
        contentTypeReview.dataset.listenerAdded = 'true';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const cleaningStatus = document.getElementById('CleaningStatus');
    const errorSelect = document.getElementById('errorfield');
    const form = document.getElementById('cleaning-form');

    if (form) {
        form.reset();
        console.log('Form reset on page load');
    }
    toggleCleaningFields();
    clearUIDetails();

    if (cleaningStatus) cleaningStatus.addEventListener('change', toggleCleaningFields);
    else console.error('CleaningStatus not found');
    if (errorSelect) errorSelect.addEventListener('change', toggleCleaningFields);
    else console.error('errorfield not found');

    attachClickListener();
    attachDownloadClickListener();
}, { once: true });

function switchSection(tabElement) {
    var sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.classList.remove('active-section'));

    var sectionId = tabElement.getAttribute('data-section');
    var activeSection = document.getElementById(sectionId);
    if (activeSection) activeSection.classList.add('active-section');

    var tabs = document.querySelectorAll('.navbar a');
    tabs.forEach(tab => tab.classList.remove('active-tab'));
    tabElement.classList.add('active-tab');
}

function cleaningsearchurlKeyword() {
    console.log('Button clicked, running cleaningsearchurlKeyword');
    const cleaningurl = document.getElementById('cleaningurl').value.trim();
    const cleaningURLMessage = document.getElementById('cleaningURLMessage');
    const cleaningmatchedurlDetails = document.getElementById('cleaningmatchedurlDetails');
    const cleaningmatchedurlTableContainer = document.getElementById('cleaningmatchedurlTableContainer');

    if (cleaningurl === "") {
        cleaningURLMessage.textContent = "Please enter a search keyword.";
        cleaningURLMessage.style.color = "red";
        cleaningmatchedurlDetails.style.display = "none";
        cleaningmatchedurlTableContainer.innerHTML = '';
        return;
    }

    console.log("Requesting with URL parameter:", cleaningurl);
    fetch(`/ccd/check_cleaningurl/?downloadURL=${encodeURIComponent(cleaningurl)}`)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            if (data.exists) {
                cleaningmatchedurlTableContainer.innerHTML = generateurlTable(data.results);
                cleaningmatchedurlDetails.style.display = "block";
            } else {
                cleaningURLMessage.textContent = "No matching records found.";
                cleaningURLMessage.style.color = "red";
                cleaningmatchedurlDetails.style.display = "none";
            }
        })
        .catch(error => {
            console.error('Error checking keyword:', error);
            cleaningURLMessage.textContent = "An error occurred. Please try again.";
            cleaningURLMessage.style.color = "red";
            cleaningmatchedurlDetails.style.display = "none";
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

function linkcleaningsearchurlKeyword() {
    console.log('Button clicked, running linkcleaningsearchurlKeyword');
    const inputElement = document.getElementById('linkcleaningurl');
    const linkcleaningURLMessage = document.getElementById('linkcleaningURLMessage');
    const linkcleaningmatchedurlDetails = document.getElementById('linkcleaningmatchedurlDetails');
    const linkcleaningmatchedurlTableContainer = document.getElementById('linkcleaningmatchedurlTableContainer');

    if (!inputElement) {
        console.error("Input element 'linkcleaningurl' not found!");
        linkcleaningURLMessage.textContent = "Input field not found.";
        linkcleaningURLMessage.style.color = "red";
        return;
    }

    const rawInput = inputElement.value.trim();
    if (rawInput === "") {
        linkcleaningURLMessage.textContent = "Please enter a URL.";
        linkcleaningURLMessage.style.color = "red";
        linkcleaningmatchedurlDetails.style.display = "none";
        linkcleaningmatchedurlTableContainer.innerHTML = '';
        return;
    }

    console.log("Requesting with URL parameter:", rawInput);
    fetch(`/ccd/check_downloadCleaningUrl/?linkcleaningurl=${encodeURIComponent(rawInput)}`)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            if (data.exists) {
                linkcleaningmatchedurlTableContainer.innerHTML = generateurlTable1(data.results);
                linkcleaningmatchedurlDetails.style.display = "block";
                linkcleaningURLMessage.textContent = "";
            } else {
                linkcleaningURLMessage.textContent = "No matching records found.";
                linkcleaningURLMessage.style.color = "red";
                linkcleaningmatchedurlDetails.style.display = "none";
                linkcleaningmatchedurlTableContainer.innerHTML = '';
            }
        })
        .catch(error => {
            console.error('Error checking URL:', error);
            linkcleaningURLMessage.textContent = "An error occurred. Please try again.";
            linkcleaningURLMessage.style.color = "red";
            linkcleaningmatchedurlDetails.style.display = "none";
        });
}

function generateurlTable1(results) {
    let tableHTML = `
        <div style="overflow-x: auto; margin-top: 10px;">
            <table id="matchedurlTable" border="1" cellpadding="3" cellspacing="0" style="width: 100%; table-layout: auto; font-size: 12px;">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>URL ID</th>
                        <th>Download Status</th>
                        <th>Path Link</th>
                        <th>Reason for Not Downloaded</th>
                    </tr>
                </thead>
                <tbody>
    `;
    results.forEach(result => {
        tableHTML += `
            <tr>
                <td>${result.id}</td>
                <td>${result.url}</td>
                <td>${result.download_status}</td>
                <td>${result.path_link}</td>
                <td>${result.reason_for_notdownloaded || 'N/A'}</td>
            </tr>
        `;
    });
    tableHTML += `</tbody></table></div>`;
    return tableHTML;
}

let alertShown = false;
let isListenerAttached = false;

function handleNextButtonWebpageClick(event) {
    event.preventDefault();
    event.stopPropagation();

    if (alertShown) return;

    const nextButton = document.getElementById('nextButton');
    if (nextButton) nextButton.disabled = true;

    fetch('/ccd/fetch-next-webpage-url/', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log("Fetched Data:", data);
        if (data.success && data.url) {
            const cleaningUrlInput = document.getElementById('cleaningurl');
            if (cleaningUrlInput) {
                cleaningUrlInput.value = data.url;
                // Automatically fetch details after setting the URL
                cleaningsearchurlKeyword();
            } else {
                showAlert("Input box not found.");
            }
        } else {
            showAlert(data.message || 'No URL found.');
        }
    })
    .catch(error => {
        console.error('Error fetching next URL:', error);
        showAlert('An error occurred.');
    })
    .finally(() => {
        if (nextButton) nextButton.disabled = false;
        alertShown = false;
    });
}

function attachClickListener() {
    const webpageButton = document.getElementById('nextButton');
    if (webpageButton && !isListenerAttached) {
        webpageButton.removeEventListener('click', handleNextButtonWebpageClick);
        webpageButton.addEventListener('click', handleNextButtonWebpageClick);
        isListenerAttached = true;
        console.log("Event listener attached to nextButton");
    }
}

let isDownloadListenerAttached = false;

function handleNextButtonDownloadClick(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    } else {
        console.warn('Event object is undefined in handleNextButtonDownloadClick');
    }

    if (alertShown) return;

    const nextButton = document.getElementById('nextButtonURL');
    if (nextButton) nextButton.disabled = true;

    const storedCleaningStatus = localStorage.getItem('cleaningStatus');
    const storedURL = localStorage.getItem('currentURL');
    const inputElement = document.getElementById('linkcleaningurl');
    const cleaningStatusSelect = document.getElementById('CleaningStatus');

    if (storedCleaningStatus === 'DownloadedLinkContent' && storedURL && inputElement) {
        if (cleaningStatusSelect) cleaningStatusSelect.value = 'DownloadedLinkContent';
        inputElement.value = storedURL;
        toggleCleaningFields();
        linkcleaningsearchurlKeyword();
        console.log(`Restored unsubmitted DownloadedLinkContent URL: ${storedURL}`);
        if (nextButton) nextButton.disabled = false;
        return;
    }

    fetch('/ccd/fetch-next-downloaded-url/', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log("Fetched Data:", data);
        if (data.success && data.cleaning_data?.url) {
            if (inputElement) {
                if (cleaningStatusSelect) cleaningStatusSelect.value = 'DownloadedLinkContent';
                inputElement.value = data.cleaning_data.url;
                localStorage.setItem('currentURL', data.cleaning_data.url);
                localStorage.setItem('cleaningStatus', 'DownloadedLinkContent');
                toggleCleaningFields();
                linkcleaningsearchurlKeyword();
            } else {
                showAlert("Input box not found.");
            }
        } else {
            showAlert(data.message || 'No URL found.');
        }
    })
    .catch(error => {
        console.error('Error fetching next URL:', error);
        showAlert('An error occurred.');
    })
    .finally(() => {
        if (nextButton) nextButton.disabled = false;
        alertShown = false;
    });
}

function attachDownloadClickListener() {
    const downloadButton = document.getElementById('nextButtonURL');
    if (downloadButton && !isDownloadListenerAttached) {
        // Remove any existing listener to avoid duplicates
        downloadButton.removeEventListener('click', handleNextButtonDownloadClick);
        downloadButton.addEventListener('click', handleNextButtonDownloadClick);
        isDownloadListenerAttached = true;
        console.log("Download event listener attached to nextButtonURL");
    } else if (!downloadButton) {
        console.error("nextButtonURL not found in the DOM");
    }
}

// Ensure listener is attached on DOM load
document.addEventListener('DOMContentLoaded', function() {
    // Other initialization code...
    attachDownloadClickListener();
}, { once: true });

function showAlert(message) {
    if (!alertShown) {
        alert(message);
        alertShown = true;
    }
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

function handleCleaningSubmission(event) {
    event.preventDefault();
    const form = document.getElementById('cleaning-form');

    if (!form.checkValidity()) {
        console.log('Form validation failed');
        form.reportValidity();
        return;
    }

    const csrfToken = getCookie('csrftoken');
    const errorFieldValue = document.getElementById('errorfield').value;
    const cleaningData = {
        CleaningStatus: document.getElementById('CleaningStatus').value,
        error: errorFieldValue
    };

    if (cleaningData.CleaningStatus === 'Webpage') {
        cleaningData.cleaningurl = document.getElementById('cleaningurl').value || '';
        if (errorFieldValue === 'notanError') {
            cleaningData.descriptionInput = document.getElementById('descriptionInput').value || '';
            cleaningData.advertisementLevel = document.getElementById('advertisementLevel').value || '';
            cleaningData.copyrights = document.getElementById('copyrights').value || '';
            cleaningData.Crawlmethod = document.getElementById('Crawlmethod').value || '';
        } else if (errorFieldValue === 'error') {
            cleaningData.reason = document.getElementById('reasoninput').value || '';
        }
    } else if (cleaningData.CleaningStatus === 'DownloadedLinkContent') {
        cleaningData.linkcleaningurl = document.getElementById('linkcleaningurl').value || '';
        if (errorFieldValue === 'notanError') {
            cleaningData.pathLink = document.getElementById('pathLink').value || '';
            cleaningData.descriptionInput = document.getElementById('descriptionInput').value || '';
            cleaningData.advertisementLevel = document.getElementById('advertisementLevel').value || '';
            cleaningData.copyrights = document.getElementById('copyrights').value || '';
            cleaningData.Crawlmethod = document.getElementById('Crawlmethod').value || '';
            const contentType = document.getElementById('contentTypeReview').value;
            cleaningData.contentType = contentType;  // Add contentType to the payload

            // Only require duration for video or audio content types
            if (contentType === 'video' || contentType === 'audio') {
                const videoDurationInput = document.getElementById('videoDuration').value.trim();
                if (!videoDurationInput) {
                    alert('Video duration is required for video or audio content.');
                    return;
                }
                try {
                    cleaningData.duration = formatDuration(videoDurationInput);  // Use 'duration' to match server
                } catch (e) {
                    alert('Video duration must be in a valid format (e.g., HH:MM:SS)');
                    return;
                }
            }
        } else if (errorFieldValue === 'error') {
            cleaningData.reason = document.getElementById('reasoninput').value || '';
        }
    }

    console.log('Submitting data:', cleaningData);

    fetch('/ccd/submit_cleaning/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify(cleaningData)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Server response:', data);
        if (data.success === true) {
            alert('Form submitted successfully.');
            form.reset();
            toggleCleaningFields();
            localStorage.removeItem('currentURL');
            localStorage.removeItem('cleaningStatus');
            clearUIDetails();
        } else {
            alert('Error: ' + (data.message || 'Submission failed'));
        }
    })
    .catch(error => {
        console.error('Submission error:', error);
        alert('Error: Could not submit cleaning data.');
    });
}

// formatDuration remains unchanged

function formatDuration(input) {
    const trimmedInput = input.trim();
    const timeParts = trimmedInput.split(':');

    if (timeParts.length === 1) {
        const minutes = parseInt(trimmedInput, 10);
        if (isNaN(minutes) || minutes < 0) throw new Error('Invalid duration format');
        const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
        const remainingMinutes = (minutes % 60).toString().padStart(2, '0');
        return `${hours}:${remainingMinutes}:00`;
    } else if (timeParts.length === 2) {
        const [hours, minutes] = timeParts.map(part => part.padStart(2, '0'));
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || minutes >= 60) throw new Error('Invalid duration format');
        return `${hours}:${minutes}:00`;
    } else if (timeParts.length === 3) {
        const [hours, minutes, seconds] = timeParts.map(part => part.padStart(2, '0'));
        if (isNaN(hours) || isNaN(minutes) || isNaN(seconds) || hours < 0 || minutes >= 60 || seconds >= 60) throw new Error('Invalid duration format');
        return `${hours}:${minutes}:${seconds}`;
    } else {
        throw new Error('Invalid duration format');
    }
}
// Placeholder functions (implement as needed)
function clearUIDetails() {
    const cleaningTableContainer = document.getElementById('cleaningmatchedurlTableContainer');
    const linkCleaningTableContainer = document.getElementById('linkcleaningmatchedurlTableContainer');
    const cleaningDetails = document.getElementById('cleaningmatchedurlDetails');
    const linkCleaningDetails = document.getElementById('linkcleaningmatchedurlDetails');
    const cleaningURLMessage = document.getElementById('cleaningURLMessage');
    const linkCleaningURLMessage = document.getElementById('linkcleaningURLMessage');

    if (cleaningTableContainer) cleaningTableContainer.innerHTML = '';
    if (linkCleaningTableContainer) linkCleaningTableContainer.innerHTML = '';
    if (cleaningDetails) cleaningDetails.style.display = 'none';
    if (linkCleaningDetails) linkCleaningDetails.style.display = 'none';
    if (cleaningURLMessage) cleaningURLMessage.textContent = '';
    if (linkCleaningURLMessage) linkCleaningURLMessage.textContent = '';
    console.log('UI details cleared');
}