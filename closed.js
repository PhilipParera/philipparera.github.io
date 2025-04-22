document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
      window.location.href = 'index.html';
    } else {
      fetch('https://us-central1-key-line-454113-g0.cloudfunctions.net/getShipmentCodes?sheet=Closed', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch closed shipments');
        }
        return response.json();
      })
      .then(data => {
        const shipments = data.shipments;
  
        // Process freightMethod to extract method and POD
        shipments.forEach(shipment => {
          if (shipment.freightMethod) {
            const parts = shipment.freightMethod.split(' - ');
            shipment.freightMethodOnly = parts[0] ? parts[0].substring(0, 3) : 'N/A';
            shipment.pod = parts[1] || 'N/A';
          } else {
            shipment.freightMethodOnly = 'N/A';
            shipment.pod = 'N/A';
          }
        });
  
        // Get unique values for filters
        const uniqueWinners = [...new Set(shipments.map(s => s.firstId || 'N/A'))].sort();
        const uniqueVendors = [...new Set(shipments.map(s => s.vendorDivision || 'N/A'))].sort();
        const uniqueMethods = [...new Set(shipments.map(s => s.freightMethodOnly))].sort();
        const uniquePods = [...new Set(shipments.map(s => s.pod))].sort();
  
        // Populate drop-downs
        const winnerSelect = document.getElementById('winner-filter');
        uniqueWinners.forEach(winner => {
          const option = document.createElement('option');
          option.value = winner;
          option.textContent = maskId(winner);
          winnerSelect.appendChild(option);
        });
  
        const vendorSelect = document.getElementById('vendor-filter');
        uniqueVendors.forEach(vendor => {
          const option = document.createElement('option');
          option.value = vendor;
          option.textContent = vendor;
          vendorSelect.appendChild(option);
        });
  
        const methodSelect = document.getElementById('method-filter');
        uniqueMethods.forEach(method => {
          const option = document.createElement('option');
          option.value = method;
          option.textContent = method;
          methodSelect.appendChild(option);
        });
  
        const podSelect = document.getElementById('pod-filter');
        uniquePods.forEach(pod => {
          const option = document.createElement('option');
          option.value = pod;
          option.textContent = pod;
          podSelect.appendChild(option);
        });
  
        // Add event listeners to filters
        winnerSelect.addEventListener('change', () => updateTable(shipments));
        vendorSelect.addEventListener('change', () => updateTable(shipments));
        methodSelect.addEventListener('change', () => updateTable(shipments));
        podSelect.addEventListener('change', () => updateTable(shipments));
  
        // Initial table rendering
        updateTable(shipments);
      })
      .catch(error => {
        console.error('Error fetching closed shipments:', error);
        alert('Failed to load closed shipments. Please try again later.');
      });
    }
  
    function updateTable(shipments) {
      const winnerSelect = document.getElementById('winner-filter');
      const vendorSelect = document.getElementById('vendor-filter');
      const methodSelect = document.getElementById('method-filter');
      const podSelect = document.getElementById('pod-filter');
  
      const selectedWinner = winnerSelect.value;
      const selectedVendor = vendorSelect.value;
      const selectedMethod = methodSelect.value;
      const selectedPod = podSelect.value;
  
      const filteredShipments = shipments.filter(shipment => {
        return (selectedWinner === '' || shipment.firstId === selectedWinner) &&
               (selectedVendor === '' || shipment.vendorDivision === selectedVendor) &&
               (selectedMethod === '' || shipment.freightMethodOnly === selectedMethod) &&
               (selectedPod === '' || shipment.pod === selectedPod);
      });
  
      const tbody = document.querySelector('#closed-bid-table tbody');
      tbody.innerHTML = '';
  
      filteredShipments.forEach(shipment => {
        const winner = maskId(shipment.firstId);
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${shipment.closingDate || 'N/A'}</td>
          <td>${winner}</td>
          <td>${shipment.vendorDivision || 'N/A'}</td>
          <td>${shipment.freightMethod || 'N/A'}</td>
          <td>${shipment.incoterm || 'N/A'}</td>
          <td>${shipment.pol || 'N/A'}</td>
          <td>${shipment.gwKg || 'N/A'}</td>
          <td>${shipment.volCbm || 'N/A'}</td>
          <td class="wrapped-text">${shipment.shipperAddress || 'N/A'}</td>
          <td>${shipment.shipmentCode}</td>
        `;
        tbody.appendChild(row);
      });
    }
  
    function maskId(id) {
      if (id && id.length === 12) {
        return id.slice(0, 4) + '****' + id.slice(8);
      }
      return id || 'N/A';
    }
  });