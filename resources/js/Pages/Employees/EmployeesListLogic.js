// Auto-extracted logic for EmployeesList

// Expose functions globally for React inline handlers





// Re-injected Tab Logic from legacy global script
function setupTabs() {
  const tabContainers = document.querySelectorAll(".tab-container");
  tabContainers.forEach(container => {
    const headers = container.querySelectorAll(".tab-headers li");
    const contents = container.querySelectorAll(".tab-content");

    headers.forEach(header => {
      header.addEventListener("click", () => {
        const targetTab = header.getAttribute("data-tab");
        
        headers.forEach(h => h.classList.remove("active"));
        contents.forEach(c => c.classList.remove("active"));

        header.classList.add("active");
        const targetContent = container.querySelector('.tab-content[data-tab="' + targetTab + '"]');
        if (targetContent) {
          targetContent.classList.add("active");
        }
      });
    });
  });
}
// Execute it dynamically on load
setTimeout(setupTabs, 100);
