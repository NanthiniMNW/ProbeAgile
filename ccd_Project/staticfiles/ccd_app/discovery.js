// Function to handle content type change
function handleContentTypeChange() {
    const contentType = document.getElementById('contentType').value;
    const approxLinkCountDiv = document.getElementById('approxLinkCount');

    // Show the 'Approximate Link Count' input if 'webpage' is selected
    if (contentType === 'webpage') {
        approxLinkCountDiv.style.display = 'block';
    } else {
        approxLinkCountDiv.style.display = 'none';
    }
}

// Function to handle search keyword functionality
let currentOffset = 0; // Track the current offset
const itemsPerPage = 15; // Number of items per page

function searchKeyword(offset = 0) {
    const keywordInput = document.getElementById('searchInput').value.trim();
    const keywordMessage = document.getElementById('keywordMessage');
    const matchedKeywordDetails = document.getElementById('matchedKeywordDetails');
    const keywordDetailsTable = document.getElementById('keywordDetailsTable');
    
    // If input is empty, clear the table and hide the section
    if (keywordInput === "") {
        keywordMessage.textContent = "";
        keywordMessage.style.color = "";
        matchedKeywordDetails.style.display = "none";
        keywordDetailsTable.innerHTML = '';
        document.getElementById('paginationControls')?.remove(); // Remove pagination if exists
        return;
    }

    // Send a request to the backend with the keyword, offset, and limit
    fetch(`/ccd/check-keyword/?keyword=${encodeURIComponent(keywordInput)}&offset=${offset}&limit=${itemsPerPage}`)
        .then(response => response.json())
        .then(data => {
            keywordDetailsTable.innerHTML = '';

            if (data.exists) {
                const totalCount = data.match_count;
                const currentPageCount = data.results.length;
                const totalPages = Math.ceil(totalCount / itemsPerPage);
                const currentPage = Math.floor(offset / itemsPerPage) + 1;

                // Update the message
                keywordMessage.textContent = `Showing ${offset + 1} to ${offset + currentPageCount} of ${totalCount} matching record(s).`;
                keywordMessage.style.color = "green";
                matchedKeywordDetails.style.display = "block";
                
                // Generate the table with the current page results
                keywordDetailsTable.innerHTML = generateKeywordTable(data.results);

                // Remove old pagination controls if they exist
                document.getElementById('paginationControls')?.remove();

                // Add pagination controls
                const paginationHTML = `
                    <div id="paginationControls" style="margin-top: 10px;">
                        <button id="prevBtn" ${offset === 0 ? 'disabled' : ''}>Previous</button>
                        <span>Page ${currentPage} of ${totalPages}</span>
                        <button id="nextBtn" ${offset + currentPageCount >= totalCount ? 'disabled' : ''}>Next</button>
                    </div>
                `;
                matchedKeywordDetails.insertAdjacentHTML('beforeend', paginationHTML);

                // Add event listeners for pagination buttons
                document.getElementById('prevBtn')?.addEventListener('click', () => {
                    currentOffset = Math.max(0, offset - itemsPerPage);
                    searchKeyword(currentOffset);
                });
                document.getElementById('nextBtn')?.addEventListener('click', () => {
                    currentOffset = offset + itemsPerPage;
                    searchKeyword(currentOffset);
                });
            } else {
                keywordMessage.textContent = "No matching records found.";
                keywordMessage.style.color = "red";
                matchedKeywordDetails.style.display = "none";
                document.getElementById('paginationControls')?.remove();
            }
        })
        .catch(error => {
            console.error('Error checking keyword:', error);
            keywordMessage.textContent = "Error occurred while searching.";
            keywordMessage.style.color = "red";
            matchedKeywordDetails.style.display = "none";
            document.getElementById('paginationControls')?.remove();
        });
}

// Generate table for keyword search results (unchanged)
function generateKeywordTable(results) {
    const rows = results.map(details => `
        <tr>
            <td style="word-wrap: break-word; white-space: normal;">${details.unique_code}</td>
            <td style="word-wrap: break-word; white-space: normal;">${details.url}</td>
            <td style="word-wrap: break-word; white-space: normal;">${details.title}</td>
            <td style="word-wrap: break-word; white-space: normal;">${details.keyword}</td>
            <td style="word-wrap: break-word; white-space: normal;">${details.course}</td>
            <td style="word-wrap: break-word; white-space: normal;">${details.content_type}</td>
            <td style="word-wrap: break-word; white-space: normal;">${details.link_count}</td>
            <td style="word-wrap: break-word; white-space: normal;">${details.copyright_status}</td>
            <td style="word-wrap: break-word; white-space: normal;">${details.link_status}</td>
        </tr>
    `).join('');

    return `
        <div style="overflow-x: auto; margin-top: 10px;">
            <table border="1" cellpadding="3" cellspacing="0" style="width: 100%; table-layout: auto; font-size: 12px;">
                <thead>
                    <tr>
                        <th>Unique id</th>
                        <th>URL</th>
                        <th>Title</th>
                        <th>Keyword</th>
                        <th>Course Name</th>
                        <th>Content Type</th>
                        <th>Link Count</th>
                        <th>Copy Rights</th>
                        <th>Link Status</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

// Attach the initial search trigger to a button or event
document.querySelector('button[onclick="searchKeyword()"]').addEventListener('click', () => {
    currentOffset = 0; // Reset offset on new search
    searchKeyword(currentOffset);
});

// Handle form submission
function handleFormSubmission(event) {
    event.preventDefault();
    const csrfToken = getCookie('csrftoken');

    const formData = {
        url: document.querySelector('[name="url"]').value,
        title: document.querySelector('[name="title"]').value,
        keyword: document.querySelector('[name="keyword"]').value,
        course: document.querySelector('[name="course"]').value,
        content_type: document.querySelector('[name="content_type"]').value,
        link_count: document.querySelector('[name="link_count"]')?.value || null,
        copyright_status: document.querySelector('[name="copyright_status"]').value,
        link_status: document.querySelector('[name="link_status"]').value
    };

    fetch('/ccd/submit-discovery/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify(formData),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Form submitted successfully!');
            document.querySelector('form').reset();
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(error => console.error('Error:', error));
}

// Get CSRF token from cookies
function getCookie(name) {
    const cookieValue = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        return key === name ? decodeURIComponent(value) : acc;
    }, null);
    return cookieValue;
}
function displayMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.className = type === 'error' ? 'error-message' : 'success-message'; // Style accordingly
    document.body.appendChild(messageDiv); // Append to body or a specific container
    setTimeout(() => messageDiv.remove(), 3000); // Remove after 3 seconds
}

// Event listener for form submission
//document.getElementById('form').addEventListener('submit', handleFormSubmission);



function switchSection(tabElement) {
    // Get all sections with class 'content-section'
    var sections = document.querySelectorAll('.content-section');

    // Hide all sections first
    sections.forEach(function(section) {
        section.classList.remove('active-section');
    });

    // Get the section corresponding to the clicked tab
    var sectionId = tabElement.getAttribute('data-section');
    var activeSection = document.getElementById(sectionId);

    // Show the selected section
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

// Variable to store the timeout ID
let timeoutId = null;

function checkUrlExistence() {
    const urlInput = document.getElementById('urlInput').value.trim();
    const urlMessage = document.getElementById('urlMessage');
    
    // Clear any existing timeout
    if (timeoutId) {
        clearTimeout(timeoutId);
    }

    // Clear the message when the input is empty
    if (urlInput === "") {
        urlMessage.textContent = "";
        urlMessage.style.color = "";
        return;
    }

    // Send the URL to the backend to check if it already exists in the database
    fetch(`/ccd/check-url/?url=${encodeURIComponent(urlInput)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.exists) {
                urlMessage.textContent = "This URL already exists.";
                urlMessage.style.color = "red";
                // Set a timeout to clear the message after 3 seconds
                timeoutId = setTimeout(() => {
                    urlMessage.textContent = "";
                    urlMessage.style.color = "";
                    timeoutId = null; // Reset timeoutId after clearing
                }, 5000);
            }
        })
        .catch(error => {
            console.error('Error checking URL:', error);
            urlMessage.textContent = "Error checking URL.";
            urlMessage.style.color = "red";
            // Set a timeout to clear the message after 3 seconds
            timeoutId = setTimeout(() => {
                urlMessage.textContent = "";
                urlMessage.style.color = "";
                timeoutId = null; // Reset timeoutId after clearing
            }, 5000);
            console.error('Details:', error.message);
        });
}

// Add an event listener to clear the message when the input changes
document.getElementById('urlInput').addEventListener('input', function() {
    const urlMessage = document.getElementById('urlMessage');
    if (timeoutId) {
        clearTimeout(timeoutId); // Cancel any pending timeout
        timeoutId = null;
    }
    urlMessage.textContent = ""; // Clear the message immediately
    urlMessage.style.color = ""; // Reset color
});





