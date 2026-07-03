
    function filterLog() {
      const searchTerm = document.getElementById('log-search').value.toLowerCase().trim();
      const catFilter  = document.getElementById('log-category').value;
      const rows = document.querySelectorAll('#log-tbody tr');
      let visibleCount = 0;

      rows.forEach(row => {
        const rowText     = row.textContent.toLowerCase();
        const rowCategory = row.dataset.category || '';
        const matchSearch = !searchTerm || rowText.includes(searchTerm);
        const matchCat    = !catFilter || rowCategory === catFilter;
        if (matchSearch && matchCat) {
          row.style.display = '';
          visibleCount++;
        } else {
          row.style.display = 'none';
        }
      });

      document.getElementById('log-empty').style.display = visibleCount === 0 ? 'block' : 'none';
    }

    function resetFilter() {
      document.getElementById('log-search').value = '';
      document.getElementById('log-category').value = '';
      filterLog();
    }
  