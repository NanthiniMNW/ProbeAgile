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
