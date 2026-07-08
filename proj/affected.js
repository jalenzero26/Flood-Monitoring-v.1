fetch('affected_data.json')
  .then(response => response.json())
  .then(data => {
    const listBody = document.getElementById('affected-list-body');
    listBody.innerHTML = ''; 

    const sortedData = data.master_barangay_list.map(bName => {
      const item = data.status_data.find(d => d.barangay === bName);
      return { barangay: bName, status: item ? item.status : null, water_level: item ? item.water_level_cm : -1 };
    }).sort((a, b) => b.water_level - a.water_level);

    sortedData.forEach(item => {
      const row = document.createElement('div');
      row.className = 'affected-row';
      row.innerHTML = `<span>${item.barangay}</span><span style="text-align:center">${item.status || '-'}</span><span style="text-align:right">${item.water_level !== -1 ? item.water_level + ' cm' : 'No Data'}</span>`;
      listBody.appendChild(row);
    });
  });

function filterTable() {
    const input = document.getElementById('barangaySearch').value.toLowerCase();
    document.querySelectorAll('.affected-row').forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(input) ? 'grid' : 'none';
    });
}