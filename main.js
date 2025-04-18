document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('jwtToken');
  if (!token) {
      window.location.href = 'index.html';
  } else {
      // Display masked Bidder ID
      const bidderId = localStorage.getItem('bidderId');
      if (bidderId && bidderId.length === 12) {
          const maskedId = bidderId.slice(0, 4) + '****' + bidderId.slice(8);
          document.getElementById('bidder-id-display').textContent = `Bidder ID: ${maskedId}`;
      }

      // Handle submit button click
      document.getElementById('submit-bid').addEventListener('click', () => {
          const bidderId = localStorage.getItem('bidderId');
          const shipmentCode = document.getElementById('shipment-code').textContent;
          const bidValue = document.getElementById('bid-value').value;

          if (!bidValue) {
              alert('Please enter a bid value.');
              return;
          }

          const confirmation = confirm('I have read and acknowledge the FAQ page, and I am bidding for this shipment now.');
          if (confirmation) {
              // Google Form prefilled URL with actual entry IDs (replace with your form's entry IDs)
              const formUrl = `https://docs.google.com/forms/d/e/1FAIpQLSfU6sD1MdKUT4TDxWKHtI-bosEg_eJui4-8FNHXh-1Y0z8wXQ/viewform?entry.1458778927=${bidderId}&entry.1274113256=${encodeURIComponent(shipmentCode)}&entry.1889331960=${bidValue}`;
              window.open(formUrl, '_blank');
          }
      });
  }
});