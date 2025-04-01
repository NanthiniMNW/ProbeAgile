// Function to toggle the visibility of fields based on the download status
function toggleDownloadFields() {
    const downloadStatus = document.getElementById('downloadstatus').value;
    const downloadedField = document.getElementById('downloaded-field');
    const notDownloadedField = document.getElementById('not-downloaded-field');
    const sharePathLink = document.getElementById('Sharepathlink');
    const notDownloadedReason = document.getElementById('NotDownloadedReason');

    // Hide both fields initially
    downloadedField.style.display = 'none';
    notDownloadedField.style.display = 'none';

    // Reset the 'required' attributes for both fields
    sharePathLink.required = false;
    notDownloadedReason.required = false;

    // Show or hide fields based on the selected download status
    if (downloadStatus === 'downloaded') {
        downloadedField.style.display = 'block';  // Show Sharepathlink input
        sharePathLink.required = true;  // Make Sharepathlink required
    } else if (downloadStatus === 'not_downloaded') {
        notDownloadedField.style.display = 'block';  // Show NotDownloadedReason input
        notDownloadedReason.required = true;  // Make NotDownloadedReason required
    }
}


// Switch between sections based on the tab clicked
function switchSection(tabElement) {
    var sections = document.querySelectorAll('.content-section');

    // Hide all sections first
    sections.forEach(function(section) {
        section.classList.remove('active-section');
    });

    var sectionId = tabElement.getAttribute('data-section');
    var activeSection = document.getElementById(sectionId);

    if (activeSection) {
        activeSection.classList.add('active-section');
    }

    // Optional: Highlight the active tab (add a class to the clicked tab)
    var tabs = document.querySelectorAll('.navbar a');
    tabs.forEach(function(tab) {
        tab.classList.remove('active-tab');
    });

    tabElement.classList.add('active-tab');
}

function handleDownloadSubmission(event) {
    event.preventDefault();

    const csrfToken = getCookie('csrftoken');
    const downloadStatus = document.querySelector('[name="downloadstatus"]').value;
    const url = document.querySelector('[name="downloadURL"]').value;
    let formData = { url, download_status: downloadStatus };

    if (downloadStatus === "downloaded") {
        formData.path_link = document.querySelector('[name="Sharepathlink"]').value;
        formData.reason = "";
    } else if (downloadStatus === "not_downloaded") {
        formData.reason = document.querySelector('[name="NotDownloadedReason"]').value;
        formData.path_link = "";
    }

    console.log("Form Data:", formData);

    const submitButton = document.querySelector('[type="submit"]');
    submitButton.disabled = true;
    const loadingMessage = document.createElement('span');
    loadingMessage.innerText = 'Submitting...';
    document.body.appendChild(loadingMessage);

    fetch('/ccd/submit_download/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify(formData),
    })
    .then(response => response.json())
    .then(data => {
        console.log("Response Data:", data);
        submitButton.disabled = false;
        loadingMessage.remove();

        if (data.success) {
            alert('Form submitted successfully!');
            markUrlAsProcessed(); // Mark as processed
            document.querySelector('form').reset();
            toggleDownloadFields(); // Reset visibility
            setTimeout(() => {
                clearTableAndMessage();
                fetchNextUrl(); // Fetch next URL
            }, 500);
        } else {
            alert(`Error: ${data.message || 'Something went wrong!'}`);
        }
    })
    .catch(error => {
        console.error('Request failed:', error);
        alert('Something went wrong. Please try again later.');
        submitButton.disabled = false;
        loadingMessage.remove();
    });
}

function fetchNextUrl() {
    const nextButton = document.getElementById('nextButton');
    if (nextButton) nextButton.click();
}

// Clear the table and message
function clearTableAndMessage() {
    const domainURLMessage = document.getElementById('domainURLMessage');
    const matchedurlDetails = document.getElementById('matchedurlDetails');
    const matchedurlTable = document.getElementById('matchedurlTable');

    // Ensure the elements exist before trying to access them
    if (domainURLMessage !== null) {
        domainURLMessage.textContent = "";  // Clear the message
        domainURLMessage.style.color = "";  // Reset the message color
    }

    if (matchedurlDetails !== null) {
        matchedurlDetails.style.display = "none";  // Hide the matched URL details section
    }

    if (matchedurlTable !== null) {
        matchedurlTable.innerHTML = "";  // Clear the table content
    }
}

let hasClickListener = false;

function handleNextButtonClick() {
    function setupButtonListener(button) {
        if (!hasClickListener) {
            button.addEventListener('click', function(event) {
                event.preventDefault();
                console.log("Next button clicked");
                const csrfToken = getCookie('csrftoken');

                const previousUrl = localStorage.getItem('lastFetchedUrl');
                const isProcessed = localStorage.getItem('isProcessed') === 'true';

                if (previousUrl && !isProcessed) {
                    console.log('Reusing previous unsubmitted URL:', previousUrl);
                    updateDownloadInput(previousUrl);
                } else {
                    fetch('/ccd/fetch-next-url/', {
                        method: 'GET',
                        headers: {
                            'X-CSRFToken': csrfToken,
                        },
                    })
                    .then(response => {
                        if (!response.ok) throw new Error('Network response was not ok');
                        return response.text();
                    })
                    .then(text => {
                        console.log("Server response text:", text);
                        try {
                            const data = JSON.parse(text);
                            if (data.success && data.url) {
                                const url = data.url;
                                const uniqueCode = data.unique_code;
                                console.log('Fetched URL:', url);
                                console.log('Unique Code:', uniqueCode);

                                localStorage.setItem('lastFetchedUrl', url);
                                localStorage.setItem('isProcessed', 'false');
                                localStorage.setItem('uniqueCode', uniqueCode);

                                updateDownloadInput(url);
                            } else {
                                alert(data.message || 'No more unsubmitted URLs available.');
                                clearDownloadInput();
                                localStorage.removeItem('lastFetchedUrl');
                                localStorage.removeItem('isProcessed');
                                localStorage.removeItem('uniqueCode');
                            }
                        } catch (error) {
                            console.error("Error parsing response JSON:", error);
                            alert('Unexpected response from server, please try again later.');
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching URL:', error);
                        alert('Error fetching URL: ' + error.message);
                    });
                }
            });
            hasClickListener = true;
        }
    }
    function updateDownloadInput(url) {
        const downloadURLInput = document.getElementById('downloadURLInput');
        if (downloadURLInput) downloadURLInput.value = url;
        else console.error('downloadURLInput not found');
    }

    function clearDownloadInput() {
        const downloadURLInput = document.getElementById('downloadURLInput');
        if (downloadURLInput) downloadURLInput.value = '';
    }

    let immediateButton = document.getElementById('nextButton');
    if (immediateButton) {
        console.log("Button found immediately");
        setupButtonListener(immediateButton);
    }

    document.addEventListener('DOMContentLoaded', function() {
        console.log("DOMContentLoaded fired");
        const observer = new MutationObserver(function(mutations) {
            let nextButton = document.getElementById('nextButton');
            if (nextButton && !hasClickListener) {
                console.log("Dynamically added button detected");
                setupButtonListener(nextButton);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        const previousUrl = localStorage.getItem('lastFetchedUrl');
        const isProcessed = localStorage.getItem('isProcessed') === 'true';
        if (previousUrl && !isProcessed) {
            console.log("Populating input with unsubmitted URL:", previousUrl);
            updateDownloadInput(previousUrl);
        } else {
            clearDownloadInput();
        }
    });
}

// Get CSRF token from cookies
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

// Mark URL as processed
function markUrlAsProcessed() {
    localStorage.setItem('isProcessed', 'true');
}

// Function to search for keyword and generate table based on results
function downloadsearchurlKeyword() {
    console.log('Button clicked, running downloadsearchurlKeyword');
    const keywordInput = document.getElementById('downloadURLInput').value.trim();
    const domainURLMessage = document.getElementById('domainURLMessage');
    const matchedurlDetails = document.getElementById('matchedurlDetails');
    const matchedurlTableContainer = document.getElementById('matchedurlTableContainer');

    // Clear previous table if input is empty
    if (keywordInput === "") {
        domainURLMessage.textContent = "Please enter a search keyword.";
        domainURLMessage.style.color = "red";
        matchedurlDetails.style.display = "none";
        matchedurlTableContainer.innerHTML = '';  // Clear table
        return;
    }

    // Log the URL to confirm it's correct
    console.log("Requesting with URL parameter:", keywordInput);

    // Make an AJAX request to search for the keyword
    fetch(`/ccd/check_downloadurl/?downloadURL=${encodeURIComponent(keywordInput)}`)
        .then(response => response.json())
        .then(data => {
            console.log(data); // Log the full response data to ensure it contains 'results'

            if (data.exists) {
                matchedurlTableContainer.innerHTML = generateurlTable(data.results);
                matchedurlDetails.style.display = "block";  // Ensure the table container is displayed
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


// Function to generate HTML for the URL table
function generateurlTable(results) {
    console.log('Results for table generation:', results); // Log results
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
    console.log('Generated Table HTML:', tableHTML); // Log the table HTML to check it
    return tableHTML;
}


// Event listener to handle button click
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM fully loaded and parsed');
    
    // Select the button (or form) and add an event listener to it
    const searchButton = document.getElementById('downloadfetchDetailsButton');
    if (searchButton) {
        console.log('Button found!');
        searchButton.addEventListener('click', function (event) {
            event.preventDefault();  // Prevent any default form action if necessary
            console.log('Button clicked');
            downloadsearchurlKeyword();  // Call the function when the button is clicked
        });
    } else {
        console.log('Button not found!');
    }
});
